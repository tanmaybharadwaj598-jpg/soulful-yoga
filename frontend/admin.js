const API = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
const $ = id => document.getElementById(id);
let token = sessionStorage.getItem("yoga_admin_token") || "";
let inquiries = [];

async function request(path, options={}) {
  const headers = { "Content-Type":"application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`${API}${path}`, { ...options, headers });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401) { logout(); throw new Error(data.error || "Please sign in again."); }
  if (!r.ok) throw new Error(data.error || "Request failed.");
  return data;
}
function esc(v="") { return String(v).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])); }
function showDashboard(show) { $("loginPanel").hidden = show; $("dashboardPanel").hidden = !show; }
function logout() { token = ""; sessionStorage.removeItem("yoga_admin_token"); showDashboard(false); }
$("loginForm").addEventListener("submit", async e => {
  e.preventDefault(); const msg = $("loginMessage");
  const data = Object.fromEntries(new FormData(e.currentTarget).entries());
  try {
    const result = await request("/api/admin/login", { method:"POST", body:JSON.stringify(data) });
    token = result.token; sessionStorage.setItem("yoga_admin_token", token); showDashboard(true); await refreshAll();
  } catch (err) { msg.textContent = err.message; }
});
$("logoutButton").addEventListener("click", logout);

async function refreshAll() {
  try { await Promise.all([loadInquiries(), loadSettings(), loadClasses()]); }
  catch (e) { alert(e.message); }
}
async function loadInquiries() {
  inquiries = await request("/api/admin/inquiries");
  $("totalCount").textContent = inquiries.length;
  $("newCount").textContent = inquiries.filter(x => x.status === "New").length;
  $("contactedCount").textContent = inquiries.filter(x => x.status === "Contacted").length;
  $("inquiryRows").innerHTML = inquiries.length ? inquiries.map(x => `<tr>
    <td><strong>${esc(x.name)}</strong></td><td>${esc(x.phone)}</td><td>${esc(x.class_name || "—")}<br><small>${esc(x.preferred_batch || "")}</small></td>
    <td class="message-cell">${esc(x.message || "—")}</td>
    <td><select class="status-select" data-id="${x.id}">${["New","Contacted","Registered","Closed"].map(s=>`<option ${x.status===s?"selected":""}>${s}</option>`).join("")}</select></td>
    <td>${new Date(x.created_at).toLocaleDateString()}</td><td><a class="table-link" href="https://wa.me/${String(x.phone).replace(/\D/g,"")}" target="_blank" rel="noopener">WhatsApp ↗</a></td>
  </tr>`).join("") : '<tr><td colspan="7">No enquiries yet.</td></tr>';
  document.querySelectorAll(".status-select").forEach(el => el.addEventListener("change", async e => {
    try { await request(`/api/admin/inquiries/${e.target.dataset.id}`, {method:"PATCH",body:JSON.stringify({status:e.target.value})}); await loadInquiries(); }
    catch(err) { alert(err.message); }
  }));
}
async function loadSettings() {
  const s = await request("/api/admin/settings");
  const form = $("settingsForm");
  Object.keys(s).forEach(k => { if (form.elements[k]) form.elements[k].value = s[k] ?? ""; });
}
$("settingsForm").addEventListener("submit", async e => {
  e.preventDefault(); const msg = $("settingsMessage");
  try { await request("/api/admin/settings", {method:"PUT",body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget).entries()))}); msg.textContent = "Settings saved."; }
  catch(err) { msg.textContent = err.message; }
});
async function loadClasses() {
  const classes = await request("/api/admin/classes");
  $("adminClassList").innerHTML = classes.map(c => `<div class="admin-class-row"><div><strong>${esc(c.name)}</strong><small>${esc(c.timing || "")} · ${esc(c.category || "")}</small></div><div><button class="mini-button" data-edit="${c.id}">Edit</button><button class="mini-button danger" data-delete="${c.id}">Delete</button></div></div>`).join("") || "<p>No classes added yet.</p>";
  document.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => {
    const c = classes.find(x => x.id === b.dataset.edit), f = $("classForm");
    Object.keys(c).forEach(k => { if (f.elements[k]) f.elements[k].value = c[k] ?? ""; });
  });
  document.querySelectorAll("[data-delete]").forEach(b => b.onclick = async () => {
    if (!confirm("Delete this class?")) return;
    try { await request(`/api/admin/classes/${b.dataset.delete}`, {method:"DELETE"}); await loadClasses(); }
    catch(err) { alert(err.message); }
  });
}
$("classForm").addEventListener("submit", async e => {
  e.preventDefault(); const f = e.currentTarget, data = Object.fromEntries(new FormData(f).entries()), id = data.id;
  delete data.id;
  try { await request(id ? `/api/admin/classes/${id}` : "/api/admin/classes", {method:id?"PUT":"POST",body:JSON.stringify(data)}); f.reset(); await loadClasses(); $("classMessage").textContent = "Class saved."; }
  catch(err) { $("classMessage").textContent = err.message; }
});
$("exportButton").addEventListener("click", () => {
  const cols = ["name","phone","class_name","preferred_batch","message","status","created_at"];
  const csv = [cols.join(","), ...inquiries.map(x => cols.map(k => `"${String(x[k] ?? "").replace(/"/g,'""')}"`).join(","))].join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download = "yoga-enquiries.csv"; a.click(); URL.revokeObjectURL(a.href);
});
if (token) { showDashboard(true); refreshAll().catch(() => logout()); }
