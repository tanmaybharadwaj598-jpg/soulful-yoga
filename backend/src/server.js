require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");

const required = ["SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","JWT_SECRET","ADMIN_USERNAME","ADMIN_PASSWORD"];
for (const key of required) if (!process.env[key]) console.warn(`WARNING: ${key} is not configured.`);
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase configuration is required. Copy .env.example to .env and fill it in.");
  process.exit(1);
}
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken:false, persistSession:false }
});
const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || "").split(",").map(x=>x.trim()).filter(Boolean);
app.use(helmet());
app.use(cors({ origin(origin, cb) {
  if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") return cb(null,true);
  return cb(new Error("Origin not allowed by CORS"));
}}));
app.use(express.json({limit:"30kb"}));
app.use("/api", rateLimit({windowMs:15*60*1000,max:180,standardHeaders:true,legacyHeaders:false}));
app.use("/api/admin/login", rateLimit({windowMs:15*60*1000,max:8,standardHeaders:true,legacyHeaders:false}));

const asyncRoute = fn => (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
function adminOnly(req,res,next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") throw new Error("Invalid role");
    req.admin = decoded; next();
  } catch (_) { res.status(401).json({error:"Please sign in again."}); }
}
function cleanString(v,max=1000) { return typeof v === "string" ? v.trim().slice(0,max) : ""; }
async function getSetting(key, fallback="") {
  const {data,error}=await supabase.from("site_settings").select("value").eq("key",key).maybeSingle();
  if(error) throw error; return data?.value ?? fallback;
}
async function allSettings() {
  const {data,error}=await supabase.from("site_settings").select("key,value");
  if(error) throw error; return Object.fromEntries((data||[]).map(x=>[x.key,x.value]));
}

app.get("/health", (req,res)=>res.json({status:"ok",service:"yoga-studio-api"}));
app.get("/api/public/settings", asyncRoute(async(req,res)=>{
  const s=await allSettings();
  const safe={studio_name:s.studio_name||"Soulful Yoga Classes",instructor_name:s.instructor_name||"",
    phone_display:s.phone_display||"",whatsapp_number:s.whatsapp_number||"",location:s.location||"",
    about_text:s.about_text||"",instructor_bio:s.instructor_bio||""};
  res.json(safe);
}));
app.get("/api/public/classes", asyncRoute(async(req,res)=>{
  const {data,error}=await supabase.from("yoga_classes").select("id,name,category,description,timing").eq("active",true).order("created_at");
  if(error) throw error; res.json(data||[]);
}));
app.post("/api/inquiries", asyncRoute(async(req,res)=>{
  const name=cleanString(req.body.name,100), phone=cleanString(req.body.phone,25);
  if(name.length<2 || phone.replace(/\D/g,"").length<7) return res.status(400).json({error:"Please enter a valid name and phone number."});
  const row={name,phone,class_name:cleanString(req.body.class_name,100),preferred_batch:cleanString(req.body.preferred_batch,50),message:cleanString(req.body.message,1000),status:"New"};
  const {error}=await supabase.from("student_inquiries").insert(row);
  if(error) throw error; res.status(201).json({ok:true,message:"Enquiry received."});
}));
app.post("/api/admin/login", asyncRoute(async(req,res)=>{
  const username=cleanString(req.body.username,100), password=String(req.body.password||"");
  const expectedUser=process.env.ADMIN_USERNAME, expectedPassword=process.env.ADMIN_PASSWORD;
  const userOk=username===expectedUser;
  // Supports a bcrypt hash in ADMIN_PASSWORD as well as a plain environment secret.
  const passOk=expectedPassword.startsWith("$2") ? await bcrypt.compare(password,expectedPassword) : password===expectedPassword;
  if(!userOk || !passOk) return res.status(401).json({error:"Incorrect username or password."});
  const token=jwt.sign({role:"admin",username},process.env.JWT_SECRET,{expiresIn:"8h"});
  res.json({token,expiresIn:"8h"});
}));
app.get("/api/admin/inquiries",adminOnly,asyncRoute(async(req,res)=>{
  const {data,error}=await supabase.from("student_inquiries").select("*").order("created_at",{ascending:false}).limit(1000);
  if(error) throw error; res.json(data||[]);
}));
app.patch("/api/admin/inquiries/:id",adminOnly,asyncRoute(async(req,res)=>{
  const status=cleanString(req.body.status,30);
  if(!["New","Contacted","Registered","Closed"].includes(status)) return res.status(400).json({error:"Invalid status."});
  const {error}=await supabase.from("student_inquiries").update({status}).eq("id",req.params.id);
  if(error) throw error; res.json({ok:true});
}));
app.get("/api/admin/settings",adminOnly,asyncRoute(async(req,res)=>res.json(await allSettings())));
app.put("/api/admin/settings",adminOnly,asyncRoute(async(req,res)=>{
  const keys=["studio_name","instructor_name","whatsapp_number","phone_display","location","instructor_bio","about_text"];
  const rows=keys.filter(k=>req.body[k]!==undefined).map(k=>({key:k,value:cleanString(req.body[k],1200)}));
  if(rows.length){const {error}=await supabase.from("site_settings").upsert(rows,{onConflict:"key"});if(error)throw error;}
  res.json({ok:true});
}));
app.get("/api/admin/classes",adminOnly,asyncRoute(async(req,res)=>{
  const {data,error}=await supabase.from("yoga_classes").select("*").order("created_at",{ascending:false});
  if(error)throw error;res.json(data||[]);
}));
app.post("/api/admin/classes",adminOnly,asyncRoute(async(req,res)=>{
  const row={name:cleanString(req.body.name,100),category:cleanString(req.body.category,60),description:cleanString(req.body.description,500),timing:cleanString(req.body.timing,100),active:true};
  if(!row.name||!row.description)return res.status(400).json({error:"Class name and description are required."});
  const {data,error}=await supabase.from("yoga_classes").insert(row).select().single();if(error)throw error;res.status(201).json(data);
}));
app.put("/api/admin/classes/:id",adminOnly,asyncRoute(async(req,res)=>{
  const row={name:cleanString(req.body.name,100),category:cleanString(req.body.category,60),description:cleanString(req.body.description,500),timing:cleanString(req.body.timing,100)};
  const {error}=await supabase.from("yoga_classes").update(row).eq("id",req.params.id);if(error)throw error;res.json({ok:true});
}));
app.delete("/api/admin/classes/:id",adminOnly,asyncRoute(async(req,res)=>{
  const {error}=await supabase.from("yoga_classes").delete().eq("id",req.params.id);if(error)throw error;res.json({ok:true});
}));
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:"Something went wrong. Please try again later."});});
const port=process.env.PORT||4000;
app.listen(port,()=>console.log(`Yoga API listening on ${port}`));
