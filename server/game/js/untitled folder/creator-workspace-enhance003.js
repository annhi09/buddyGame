const q = (id) => document.getElementById(id);

function getToken(){ return localStorage.getItem("sb_token") || ""; }
function getCurrentUser(){ try{return JSON.parse(localStorage.getItem("sb_user") || "null");}catch{return null;} }

function setText(id, text){
  const el = q(id);
  if (el) el.textContent = text;
}

function setStatus(id, text, type="muted"){
  const el = q(id);
  if (!el) return;
  el.textContent = text;
  el.style.color =
    type === "error" ? "#c62828" :
    type === "success" ? "#0e9c62" :
    "#66728c";
}

async function api(path, options = {}){
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type":"application/json",
      ...(token ? { Authorization:`Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(()=>({}));
  if(!res.ok || data.ok === false) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

function money(cents){ return `$${(Number(cents || 0) / 100).toFixed(2)}`; }

function openModalById(id){
  const modal = q(id);
  if (!modal) return;
  modal.style.display = "flex";
  modal.classList.add("open");
}

function closeModalById(id){
  const modal = q(id);
  if (!modal) return;
  modal.style.display = "none";
  modal.classList.remove("open");
}

function hideLegacyAuthPanel(){
  const candidates = [
    "#auth-panel",
    "#login-panel",
    "#session-panel",
    "#legacy-auth-panel",
    ".auth-panel",
    ".login-panel"
  ];
  candidates.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      el.style.display = "none";
    });
  });

  const email = q("login-email");
  const password = q("login-password");
  const loginBtn = q("login-btn");
  const sessionNote = q("session-note");
  [email, password, loginBtn, sessionNote].forEach(el => {
    if (el && el.closest("section, .card, .panel, .market-card, .auth-box, div")) {
      const box = el.closest("section, .card, .panel, .market-card, .auth-box, div");
      if (box) box.style.display = "none";
    }
  });
}

function ensureModalStructure(){
  if (q("workspace-auth-modal")) return;

  const authModal = document.createElement("div");
  authModal.id = "workspace-auth-modal";
  authModal.className = "modal";
  authModal.innerHTML = `
    <div class="modal-card" style="max-width:560px;">
      <div class="modal-head">
        <div>
          <h3>Account</h3>
          <div class="muted-line">Login, register, or logout here.</div>
        </div>
        <button class="close-btn" data-close-modal="workspace-auth-modal">✕</button>
      </div>
      <div class="field">
        <label>Email</label>
        <input id="workspace-auth-email" type="email" placeholder="you@example.com" />
      </div>
      <div class="field">
        <label>Password</label>
        <input id="workspace-auth-password" type="password" placeholder="••••••••" />
      </div>
      <div class="field">
        <label>Display Name</label>
        <input id="workspace-auth-name" type="text" placeholder="Your display name" />
      </div>
      <div class="btn-row" style="margin-top:12px;">
        <button id="workspace-login-btn" class="btn btn-primary" type="button">Login</button>
        <button id="workspace-register-btn" class="btn btn-soft" type="button">Register</button>
        <button id="workspace-logout-btn" class="btn btn-soft" type="button">Logout</button>
      </div>
      <div id="workspace-auth-status" class="market-status" style="margin-top:10px;">Not logged in.</div>
    </div>
  `;
  document.body.appendChild(authModal);

  const profileModal = document.createElement("div");
  profileModal.id = "workspace-profile-modal";
  profileModal.className = "modal";
  profileModal.innerHTML = `
    <div class="modal-card" style="max-width:560px;">
      <div class="modal-head">
        <div>
          <h3>Creator Profile</h3>
          <div class="muted-line">Public creator or publisher identity for your marketplace packs.</div>
        </div>
        <button class="close-btn" data-close-modal="workspace-profile-modal">✕</button>
      </div>
      <div class="field">
        <label>Publisher Name</label>
        <input id="market-studio-name" type="text" placeholder="Athena & Aria Studio" />
      </div>
      <div class="field">
        <label>Bio</label>
        <textarea id="market-bio" rows="4" placeholder="Short creator bio..."></textarea>
      </div>
      <div class="field">
        <label>Country</label>
        <input id="market-country" type="text" placeholder="US" />
      </div>
      <div class="btn-row" style="margin-top:12px;">
        <button id="market-save-profile-btn" class="btn btn-primary" type="button">Save Profile</button>
      </div>
      <div id="market-profile-status" class="market-status" style="margin-top:10px;">Login to save your creator profile.</div>
    </div>
  `;
  document.body.appendChild(profileModal);

  const marketModal = document.createElement("div");
  marketModal.id = "workspace-market-modal";
  marketModal.className = "modal";
  marketModal.innerHTML = `
    <div class="modal-card" style="max-width:760px;">
      <div class="modal-head">
        <div>
          <h3>Marketplace Pack</h3>
          <div class="muted-line">Create and manage marketplace draft metadata.</div>
        </div>
        <button class="close-btn" data-close-modal="workspace-market-modal">✕</button>
      </div>
      <input id="market-pack-id" type="hidden" />
      <div class="market-grid2">
        <div class="field">
          <label>Pack Type</label>
          <select id="market-pack-type">
            <option value="reading">Reading</option>
            <option value="words">Words</option>
          </select>
        </div>
        <div class="field">
          <label>Language</label>
          <select id="market-pack-language">
            <option value="en">English</option>
            <option value="vi">Vietnamese</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>Title</label>
        <input id="market-pack-title" type="text" placeholder="The Blue Cat" />
      </div>
      <div class="field">
        <label>Short Description</label>
        <input id="market-pack-short" type="text" placeholder="A gentle bedtime reading pack." />
      </div>
      <div class="field">
        <label>Long Description</label>
        <textarea id="market-pack-long" rows="5" placeholder="Describe the pack for buyers..."></textarea>
      </div>
      <div class="market-grid2">
        <div class="field">
          <label>Age Min</label>
          <input id="market-pack-age-min" type="number" min="1" max="18" value="3" />
        </div>
        <div class="field">
          <label>Age Max</label>
          <input id="market-pack-age-max" type="number" min="1" max="18" value="6" />
        </div>
      </div>
      <div class="market-grid2">
        <div class="field">
          <label>Category</label>
          <input id="market-pack-category" type="text" placeholder="Stories" />
        </div>
        <div class="field">
          <label>Price</label>
          <select id="market-pack-price">
            <option value="99">$0.99</option>
            <option value="199">$1.99</option>
            <option value="299" selected>$2.99</option>
            <option value="399">$3.99</option>
            <option value="499">$4.99</option>
            <option value="599">$5.99</option>
          </select>
        </div>
      </div>
      <div class="btn-row" style="margin-top:12px;">
        <button id="market-new-pack-btn" class="btn btn-soft" type="button">New Draft</button>
        <button id="market-save-pack-btn" class="btn btn-primary" type="button">Save Draft</button>
        <button id="market-submit-pack-btn" class="btn btn-green" type="button">Submit for Review</button>
      </div>
      <div id="market-pack-status" class="market-status" style="margin-top:10px;">No marketplace draft selected yet.</div>
    </div>
  `;
  document.body.appendChild(marketModal);

  document.querySelectorAll("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", () => closeModalById(btn.getAttribute("data-close-modal")));
  });

  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModalById(modal.id);
    });
  });
}

function buildWorkspaceShell(){
  const root = document.querySelector(".wrap") || document.body;
  if (q("creator-workspace-shell")) return;

  const shell = document.createElement("section");
  shell.id = "creator-workspace-shell";
  shell.className = "market-grid";
  shell.style.gridTemplateColumns = "1fr 1fr";
  shell.innerHTML = `
    <div class="market-card">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start;">
        <div>
          <div class="pill">📚 Lesson Packs</div>
          <h3 style="margin-top:10px;">My Lessons</h3>
          <p class="empty-line">Use your existing creator flow, but keep the workspace neat.</p>
        </div>
        <div class="btn-row">
          <button id="workspace-auth-open-btn" class="btn btn-soft" type="button">Login</button>
          <button id="workspace-new-lesson-btn" class="btn btn-primary" type="button">New Lesson</button>
          <button id="workspace-import-btn" class="btn btn-soft" type="button">Import</button>
        </div>
      </div>
      <div id="workspace-auth-summary" class="market-status">Not logged in.</div>
      <div id="workspace-lessons-status" class="market-status">Your lesson list is managed by the original creator page.</div>
    </div>

    <div class="market-card">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start;">
        <div>
          <div class="pill">🛍️ Marketplace Creations</div>
          <h3 style="margin-top:10px;">My Marketplace Creations</h3>
          <p class="empty-line">Create marketplace drafts and submit them for review.</p>
        </div>
        <div class="btn-row">
          <button id="workspace-profile-open-btn" class="btn btn-soft" type="button">Creator Profile</button>
          <button id="workspace-market-refresh-btn" class="btn btn-soft" type="button">Refresh Packs</button>
          <button id="workspace-market-new-btn" class="btn btn-primary" type="button">New Draft</button>
        </div>
      </div>
      <div id="market-pack-list" class="market-pack-list"><div class="empty-line">No marketplace packs yet.</div></div>
      <div id="market-packs-status" class="market-status">Login to load marketplace packs.</div>
    </div>
  `;

  const editorSection = q("editor-section");
  if (editorSection && editorSection.parentElement === root) {
    root.insertBefore(shell, editorSection);
  } else {
    root.prepend(shell);
  }

  document.querySelectorAll("#profile-panel, #preview-pane, #marketplace-panel").forEach(el => {
    if (el) el.style.display = "none";
  });
  hideLegacyAuthPanel();
}

let workspaceBound = false;

function refreshAuthButton(){
  const btn = q("workspace-auth-open-btn");
  if (!btn) return;
  btn.textContent = getToken() ? "Logout" : "Login";
}

function bindWorkspaceButtons(){
  if (workspaceBound) return;
  workspaceBound = true;

  q("workspace-auth-open-btn")?.addEventListener("click", () => {
    if (getToken()) {
      logoutUser();
    } else {
      openModalById("workspace-auth-modal");
    }
  });

  q("workspace-profile-open-btn")?.addEventListener("click", () => openModalById("workspace-profile-modal"));

  q("workspace-market-new-btn")?.addEventListener("click", () => {
    fillMarketForm(null);
    openModalById("workspace-market-modal");
  });

  q("workspace-market-refresh-btn")?.addEventListener("click", loadMarketPacks);

  q("workspace-new-lesson-btn")?.addEventListener("click", () => {
    if (typeof window.startNewDraft === "function") return window.startNewDraft();
    if (typeof window.openModal === "function") return window.openModal();
    alert("Your original lesson editor hook was not found.");
  });

  q("workspace-import-btn")?.addEventListener("click", () => {
    const input = q("import-file");
    if (input) input.click();
  });

  q("workspace-login-btn")?.addEventListener("click", login);
  q("workspace-register-btn")?.addEventListener("click", registerUser);
  q("workspace-logout-btn")?.addEventListener("click", logoutUser);
  q("market-save-profile-btn")?.addEventListener("click", saveProfile);
  q("market-new-pack-btn")?.addEventListener("click", () => fillMarketForm(null));
  q("market-save-pack-btn")?.addEventListener("click", saveMarketDraft);
  q("market-submit-pack-btn")?.addEventListener("click", () => submitMarketPack(""));
}

async function login(){
  try{
    const email = q("workspace-auth-email")?.value?.trim() || "";
    const password = q("workspace-auth-password")?.value || "";
    if(!email || !password){
      setStatus("workspace-auth-status", "Email and password are required.", "error");
      return;
    }
    const data = await fetch("/api/auth/login", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ email, password }),
    }).then(r => r.json());
    if(!data?.ok) throw new Error(data?.error || "Login failed");
    localStorage.setItem("sb_token", data.token || "");
    localStorage.setItem("sb_user", JSON.stringify(data.user || {}));
    setStatus("workspace-auth-status", "Login successful.", "success");
    refreshAuthButton();
    await init();
    closeModalById("workspace-auth-modal");
  }catch(err){
    setStatus("workspace-auth-status", err.message || "Login failed", "error");
  }
}

async function registerUser(){
  try{
    const email = q("workspace-auth-email")?.value?.trim() || "";
    const password = q("workspace-auth-password")?.value || "";
    const displayName = q("workspace-auth-name")?.value?.trim() || "";
    if(!email || !password){
      setStatus("workspace-auth-status", "Email and password are required.", "error");
      return;
    }
    const data = await fetch("/api/auth/register", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ email, password, displayName }),
    }).then(r => r.json());
    if(!data?.ok) throw new Error(data?.error || "Register failed");
    localStorage.setItem("sb_token", data.token || "");
    localStorage.setItem("sb_user", JSON.stringify(data.user || {}));
    setStatus("workspace-auth-status", "Registration successful.", "success");
    refreshAuthButton();
    await init();
    closeModalById("workspace-auth-modal");
  }catch(err){
    setStatus("workspace-auth-status", err.message || "Register failed", "error");
  }
}

function logoutUser(){
  localStorage.removeItem("sb_token");
  localStorage.removeItem("sb_user");
  setStatus("workspace-auth-status", "Logged out.", "success");
  setStatus("workspace-auth-summary", "Not logged in.");
  setStatus("market-profile-status", "Login to save your creator profile.", "error");
  setStatus("market-packs-status", "Login to load marketplace packs.", "error");
  q("market-pack-list").innerHTML = `<div class="empty-line">No marketplace packs yet.</div>`;
  refreshAuthButton();
}

function fillProfile(profile = {}){
  if (q("market-studio-name")) q("market-studio-name").value = profile.studio_name || "";
  if (q("market-bio")) q("market-bio").value = profile.bio || "";
  if (q("market-country")) q("market-country").value = profile.country || "";
}

async function loadProfile(){
  if(!getToken()){
    fillProfile({});
    setStatus("market-profile-status", "Login to save your creator profile.", "error");
    return null;
  }
  try{
    const data = await api("/api/creator/profile");
    fillProfile(data.profile || {});
    setStatus("market-profile-status", "Creator profile loaded.", "success");
    return data.profile || null;
  }catch(err){
    fillProfile({});
    setStatus("market-profile-status", err.message || "Load creator profile failed", "error");
    return null;
  }
}

async function saveProfile(){
  if(!getToken()){
    setStatus("market-profile-status", "Login required.", "error");
    openModalById("workspace-auth-modal");
    return;
  }
  try{
    await api("/api/creator/profile", {
      method:"PATCH",
      body: JSON.stringify({
        studio_name: q("market-studio-name")?.value?.trim() || "",
        bio: q("market-bio")?.value?.trim() || "",
        country: q("market-country")?.value?.trim() || "",
      }),
    });
    setStatus("market-profile-status", "Creator profile saved.", "success");
    closeModalById("workspace-profile-modal");
    await init();
  }catch(err){
    setStatus("market-profile-status", err.message || "Save creator profile failed", "error");
  }
}

function fillMarketForm(pack = null){
  if(!pack){
    q("market-pack-id").value = "";
    q("market-pack-type").value = "reading";
    q("market-pack-language").value = "en";
    q("market-pack-title").value = "";
    q("market-pack-short").value = "";
    q("market-pack-long").value = "";
    q("market-pack-age-min").value = 3;
    q("market-pack-age-max").value = 6;
    q("market-pack-category").value = "";
    q("market-pack-price").value = "299";
    setStatus("market-pack-status", "New marketplace draft ready.", "success");
    return;
  }

  q("market-pack-id").value = pack.id || "";
  q("market-pack-type").value = pack.type || "reading";
  q("market-pack-language").value = pack.language || "en";
  q("market-pack-title").value = pack.title || "";
  q("market-pack-short").value = pack.short_description || "";
  q("market-pack-long").value = pack.long_description || "";
  q("market-pack-age-min").value = pack.age_min ?? 3;
  q("market-pack-age-max").value = pack.age_max ?? 6;
  q("market-pack-category").value = pack.category || "";
  q("market-pack-price").value = String(pack.price_cents ?? 299);
  setStatus("market-pack-status", `Editing draft: ${pack.title || "Untitled"}`, "success");
}

function statusTag(status = ""){
  const s = String(status || "draft").toLowerCase();
  return `<span class="market-pill">${s}</span>`;
}

function renderMarketPacks(packs = []){
  const wrap = q("market-pack-list");
  if (!wrap) return;

  if (!packs.length){
    wrap.innerHTML = `<div class="empty-line">No marketplace packs yet.</div>`;
    return;
  }

  wrap.innerHTML = packs.map(pack => `
    <div class="market-pack">
      <div class="market-pack-top">
        <div>
          <div class="market-pack-title">${pack.title || "Untitled Pack"}</div>
          <div class="muted-line">${pack.short_description || "No short description yet."}</div>
        </div>
        <div class="market-pill">${money(pack.price_cents)}</div>
      </div>
      <div class="market-pack-meta">
        <span class="market-pill">${pack.type || "reading"}</span>
        <span class="market-pill">${pack.language || "en"}</span>
        <span class="market-pill">${pack.category || "General"}</span>
        ${statusTag(pack.status)}
      </div>
      <div class="market-pack-actions">
        <button class="btn btn-primary market-edit-btn" data-id="${pack.id}">Edit</button>
        <button class="btn btn-green market-submit-btn" data-id="${pack.id}">Submit</button>
      </div>
    </div>
  `).join("");

  wrap.querySelectorAll(".market-edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const pack = packs.find(p => String(p.id) === String(btn.dataset.id));
      if (pack){
        fillMarketForm(pack);
        openModalById("workspace-market-modal");
      }
    });
  });

  wrap.querySelectorAll(".market-submit-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await submitMarketPack(btn.dataset.id);
    });
  });
}

async function loadMarketPacks(){
  if(!getToken()){
    renderMarketPacks([]);
    setStatus("market-packs-status", "Login to load marketplace packs.", "error");
    return [];
  }
  try{
    const data = await api("/api/creator/packs");
    renderMarketPacks(data.packs || []);
    setStatus("market-packs-status", `${(data.packs || []).length} marketplace pack(s) loaded.`, "success");
    return data.packs || [];
  }catch(err){
    renderMarketPacks([]);
    setStatus("market-packs-status", err.message || "Load marketplace packs failed", "error");
    return [];
  }
}

async function saveMarketDraft(){
  if(!getToken()){
    setStatus("market-pack-status", "Login required.", "error");
    openModalById("workspace-auth-modal");
    return;
  }

  const payload = {
    type: q("market-pack-type")?.value || "reading",
    language: q("market-pack-language")?.value || "en",
    title: q("market-pack-title")?.value?.trim() || "",
    short_description: q("market-pack-short")?.value?.trim() || "",
    long_description: q("market-pack-long")?.value?.trim() || "",
    age_min: Number(q("market-pack-age-min")?.value || 3),
    age_max: Number(q("market-pack-age-max")?.value || 6),
    category: q("market-pack-category")?.value?.trim() || "",
    price_cents: Number(q("market-pack-price")?.value || 299),
  };

  if(!payload.title){
    setStatus("market-pack-status", "Title is required.", "error");
    return;
  }

  try{
    const packId = q("market-pack-id")?.value?.trim() || "";
    let data;
    if(packId){
      data = await api(`/api/creator/packs/${packId}`, { method:"PATCH", body: JSON.stringify(payload) });
    }else{
      data = await api("/api/creator/packs", { method:"POST", body: JSON.stringify(payload) });
    }
    fillMarketForm(data.pack || null);
    setStatus("market-pack-status", "Marketplace draft saved.", "success");
    await loadMarketPacks();
    closeModalById("workspace-market-modal");
  }catch(err){
    setStatus("market-pack-status", err.message || "Save marketplace draft failed", "error");
  }
}

async function submitMarketPack(packIdFromButton = ""){
  if(!getToken()){
    setStatus("market-pack-status", "Login required.", "error");
    openModalById("workspace-auth-modal");
    return;
  }
  try{
    const packId = String(packIdFromButton || q("market-pack-id")?.value || "").trim();
    if(!packId){
      setStatus("market-pack-status", "Save the draft first.", "error");
      return;
    }
    await api(`/api/creator/packs/${packId}/submit`, { method:"POST" });
    setStatus("market-pack-status", "Pack submitted for review.", "success");
    await loadMarketPacks();
    closeModalById("workspace-market-modal");
  }catch(err){
    setStatus("market-pack-status", err.message || "Submit for review failed", "error");
  }
}

async function init(){
  ensureModalStructure();
  buildWorkspaceShell();
  bindWorkspaceButtons();
  hideLegacyAuthPanel();
  refreshAuthButton();

  const user = getCurrentUser();
  setStatus("workspace-auth-summary", user ? `Logged in as ${user.display_name || user.email}` : "Not logged in.");
  await loadProfile();
  await loadMarketPacks();
}

init();
