const API = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
const $ = (id) => document.getElementById(id);
const fallbackSettings = {
  studio_name: "Soulful Yoga Classes", instructor_name: "",
  whatsapp_number: "919024130300", phone_display: "9024130300",
  location: "Soulful Yoga Classes, Chetak Marg, near Gopinath Hospital, Sector 8, Pratap Nagar, Sanganer, Jaipur – 302033",
  about_text: "Our classes bring together mindful movement, breathing and relaxation in a welcoming environment.",
  instructor_bio: "Contact Soulful Yoga Classes to learn more about the instructor and available batches."
};
let classes = [];

function waLink(message = "Hello, I would like to know more about your yoga classes.") {
  const n = (window.siteSettings?.whatsapp_number || "").replace(/\D/g, "");
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(message)}` : "#contact";
}
function setText(id, value) { const el = $(id); if (el && value) el.textContent = value; }

async function loadPublicContent() {
  let settings = fallbackSettings;
  try {
    const [s, c] = await Promise.all([fetch(`${API}/api/public/settings`), fetch(`${API}/api/public/classes`)]);
    if (s.ok) settings = { ...settings, ...(await s.json()) };
    if (c.ok) classes = await c.json();
  } catch (_) {}
  window.siteSettings = settings;
  setText("brandName", settings.studio_name); setText("footerBrand", settings.studio_name);
  setText("aboutText", settings.about_text); setText("instructorBio", settings.instructor_bio);
  setText("contactPhone", settings.phone_display || settings.whatsapp_number || fallbackSettings.phone_display);
  setText("contactLocation", settings.location || fallbackSettings.location);
  $("heroWhatsapp").href = waLink(); $("contactWhatsapp").href = waLink();
  if (classes.length) {
    $("classGrid").innerHTML = classes.map((c, i) => `<article class="class-card"><span class="class-number">${String(i+1).padStart(2,"0")}</span><h3>${esc(c.name)}</h3><p>${esc(c.description)}</p><span class="class-tag">${esc(c.category || "YOGA")}</span></article>`).join("");
    $("classSelect").innerHTML = '<option value="">Select a class</option>' + classes.map(c => `<option>${esc(c.name)}</option>`).join("");
    const schedule = classes.filter(c => c.timing);
    if (schedule.length) $("scheduleList").innerHTML = schedule.map(c => `<div class="schedule-row"><span>${esc(c.name)}</span><strong>${esc(c.timing)}</strong><span class="schedule-type">${esc(c.category || "Yoga class")}</span></div>`).join("");
  }
}
function esc(v="") { return String(v).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])); }

$("menuToggle").addEventListener("click", () => $("mainNav").classList.toggle("open"));
$("inquiryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget, msg = $("formMessage"), button = form.querySelector("button");
  const data = Object.fromEntries(new FormData(form).entries());
  button.disabled = true; msg.textContent = "Sending your enquiry…";
  try {
    const r = await fetch(`${API}/api/inquiries`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) });
    const result = await r.json();
    if (!r.ok) throw new Error(result.error || "Could not send enquiry.");
    msg.textContent = "Thank you! Your enquiry has been received. You can also message us directly on WhatsApp.";
    const message = `Hello, I submitted a yoga class enquiry. Name: ${data.name}. Preferred class: ${data.class_name || "Not selected"}.`;
    if (window.siteSettings?.whatsapp_number) window.open(waLink(message), "_blank", "noopener");
    form.reset();
  } catch (err) { msg.textContent = err.message || "Please try again or contact us on WhatsApp."; }
  finally { button.disabled = false; }
});
loadPublicContent();
