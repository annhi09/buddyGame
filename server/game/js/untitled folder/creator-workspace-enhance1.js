
const qs = (id) => document.getElementById(id);

function getToken(){ return localStorage.getItem("sb_token") || ""; }
function getUser(){
  try{ return JSON.parse(localStorage.getItem("sb_user") || "null"); }catch{ return null; }
}
async function api(path, options = {}){
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type":"application/json",
      ...(token ? { Authorization:`Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(()=>({}));
  if(!res.ok || data.ok === false) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}
function money(c){ return `$${(Number(c||0)/100).toFixed(2)}`; }

function createModal(id, title){
  const back = document.createElement("div");
  back.className = "cw-modal-backdrop";
  back.id = id;
  back.innerHTML = `
    <div class="cw-modal-shell">
      <div class="cw-modal-head">
        <div>
          <div class="pill">${title}</div>
        </div>
        <button class="btn btn-soft" type="button">Close</button>
      </div>
      <div class="cw-modal-body"></div>
    </div>
  `;
  back.querySelector(".btn").addEventListener("click", ()=>closeModal(id));
  back.addEventListener("click", (e)=>{ if(e.target === back) closeModal(id); });
  document.body.appendChild(back);
  return back.querySelector(".cw-modal-body");
}
function openModal(id){ qs(id)?.classList.add("open"); }
function closeModal(id){ qs(id)?.classList.remove("open"); }

function mountAuthIntoModal(){
  const authPanel = document.querySelector(".side-panel");
  if(!authPanel) return;
  authPanel.classList.add("cw-hidden");
  const body = createModal("cw-auth-modal", "🔐 Account");
  authPanel.classList.remove("cw-hidden");
  body.appendChild(authPanel);
  const hero = document.querySelector(".hero");
  if(hero) hero.style.gridTemplateColumns = "1fr";
}
function mountPreviewIntoModal(){
  const previewCard = document.querySelector(".page-grid > main.card");
  if(!previewCard) return;
  previewCard.classList.add("cw-hidden");
  const body = createModal("cw-preview-modal", "👀 Lesson Preview");
  previewCard.classList.remove("cw-hidden");
  body.appendChild(previewCard);
  const pageGrid = document.querySelector(".page-grid");
  if(pageGrid){
    pageGrid.style.gridTemplateColumns = "1fr 1fr";
  }
}

function injectTopbarActions(){
  const topbar = document.querySelector(".topbar");
  if(!topbar) return;
  const actions = document.createElement("div");
  actions.className = "topbar-actions";
  actions.innerHTML = `
    <button id="cw-auth-btn" class="btn btn-soft" type="button">🔐 Auth</button>
    <button id="cw-profile-btn" class="btn btn-soft" type="button">🧑‍🎨 Creator Profile</button>
    <button id="cw-preview-btn" class="btn btn-soft" type="button">👀 Preview</button>
    <button id="cw-new-market-btn" class="btn btn-primary" type="button">🛍️ New Marketplace Pack</button>
  `;
  topbar.appendChild(actions);
  qs("cw-auth-btn")?.addEventListener("click", ()=>openModal("cw-auth-modal"));
  qs("cw-preview-btn")?.addEventListener("click", ()=>openModal("cw-preview-modal"));
  qs("cw-profile-btn")?.addEventListener("click", ()=>openModal("cw-profile-modal"));
  qs("cw-new-market-btn")?.addEventListener("click", ()=>{
    fillMarketForm(null);
    openModal("cw-market-modal");
  });
}

function addMarketplaceCard(){
  const pageGrid = document.querySelector(".page-grid");
  if(!pageGrid) return;
  const market = document.createElement("main");
  market.className = "card cw-market-card";
  market.innerHTML = `
    <h3>My Marketplace Creations</h3>
    <p>Create marketplace drafts, edit metadata, and submit packs for review.</p>
    <div class="toolbar">
      <button id="cw-refresh-market-btn" class="btn btn-soft" type="button">🔄 Refresh Packs</button>
      <button id="cw-open-market-btn" class="btn btn-primary" type="button">🛍️ New Draft</button>
    </div>
    <div id="cw-market-status" class="cw-market-status">Login to load marketplace packs.</div>
    <div id="cw-market-list" class="lessons-grid"></div>
  `;
  pageGrid.appendChild(market);
  qs("cw-refresh-market-btn")?.addEventListener("click", loadMarketPacks);
  qs("cw-open-market-btn")?.addEventListener("click", ()=>{
    fillMarketForm(null);
    openModal("cw-market-modal");
  });
}

function buildProfileModal(){
  const body = createModal("cw-profile-modal", "🧑‍🎨 Creator Profile");
  body.innerHTML = `
    <div class="cw-form-grid">
      <div class="cw-field">
        <label for="cw-profile-name">Publisher Name</label>
        <input id="cw-profile-name" type="text" placeholder="Athena & Aria Studio" />
      </div>
      <div class="cw-field">
        <label for="cw-profile-bio">Bio</label>
        <textarea id="cw-profile-bio" placeholder="Short creator bio..."></textarea>
      </div>
      <div class="cw-field">
        <label for="cw-profile-country">Country</label>
        <input id="cw-profile-country" type="text" placeholder="US" />
      </div>
      <div class="btn-row">
        <button id="cw-save-profile-btn" class="btn btn-primary" type="button">💾 Save Profile</button>
      </div>
      <div id="cw-profile-status" class="status">Login to save your creator profile.</div>
    </div>
  `;
  qs("cw-save-profile-btn")?.addEventListener("click", saveProfile);
}
function buildMarketModal(){
  const body = createModal("cw-market-modal", "🛍️ Marketplace Pack");
  body.innerHTML = `
    <div class="cw-form-grid">
      <input id="cw-pack-id" type="hidden" />
      <div class="cw-grid-2">
        <div class="cw-field">
          <label for="cw-pack-type">Pack Type</label>
          <select id="cw-pack-type">
            <option value="reading">Reading</option>
            <option value="words">Words</option>
          </select>
        </div>
        <div class="cw-field">
          <label for="cw-pack-language">Language</label>
          <select id="cw-pack-language">
            <option value="en">English</option>
            <option value="vi">Vietnamese</option>
          </select>
        </div>
      </div>
      <div class="cw-field">
        <label for="cw-pack-title">Title</label>
        <input id="cw-pack-title" type="text" placeholder="The Blue Cat" />
      </div>
      <div class="cw-field">
        <label for="cw-pack-short">Short Description</label>
        <input id="cw-pack-short" type="text" placeholder="A gentle bedtime reading pack." />
      </div>
      <div class="cw-field">
        <label for="cw-pack-long">Long Description</label>
        <textarea id="cw-pack-long" placeholder="Describe the pack for buyers..."></textarea>
      </div>
      <div class="cw-grid-2">
        <div class="cw-field">
          <label for="cw-pack-age-min">Age Min</label>
          <input id="cw-pack-age-min" type="number" min="1" max="18" value="3" />
        </div>
        <div class="cw-field">
          <label for="cw-pack-age-max">Age Max</label>
          <input id="cw-pack-age-max" type="number" min="1" max="18" value="6" />
        </div>
      </div>
      <div class="cw-grid-2">
        <div class="cw-field">
          <label for="cw-pack-category">Category</label>
          <input id="cw-pack-category" type="text" placeholder="Stories" />
        </div>
        <div class="cw-field">
          <label for="cw-pack-price">Price (USD)</label>
          <select id="cw-pack-price">
            <option value="99">$0.99</option>
            <option value="199">$1.99</option>
            <option value="299" selected>$2.99</option>
            <option value="399">$3.99</option>
            <option value="499">$4.99</option>
            <option value="599">$5.99</option>
          </select>
        </div>
      </div>
      <div class="btn-row">
        <button id="cw-save-pack-btn" class="btn btn-primary" type="button">💾 Save Draft</button>
        <button id="cw-submit-pack-btn" class="btn btn-green" type="button">📨 Submit for Review</button>
      </div>
      <div id="cw-pack-status" class="status">No marketplace draft selected yet.</div>
    </div>
  `;
  qs("cw-save-pack-btn")?.addEventListener("click", saveMarketPack);
  qs("cw-submit-pack-btn")?.addEventListener("click", ()=>submitMarketPack(""));
}

function profileFields(){
  return {
    studio_name: qs("cw-profile-name")?.value?.trim() || "",
    bio: qs("cw-profile-bio")?.value?.trim() || "",
    country: qs("cw-profile-country")?.value?.trim() || "",
  };
}
function setProfileForm(profile={}){
  if(qs("cw-profile-name")) qs("cw-profile-name").value = profile.studio_name || "";
  if(qs("cw-profile-bio")) qs("cw-profile-bio").value = profile.bio || "";
  if(qs("cw-profile-country")) qs("cw-profile-country").value = profile.country || "";
}
async function loadProfile(){
  if(!getToken()){
    setProfileForm({});
    setStatus("cw-profile-status","Login to save your creator profile.","error");
    return null;
  }
  try{
    const data = await api("/api/creator/profile");
    setProfileForm(data.profile || {});
    setStatus("cw-profile-status","Creator profile loaded.","success");
    return data.profile || null;
  }catch(err){
    setStatus("cw-profile-status", err.message || "Load creator profile failed","error");
    return null;
  }
}
async function saveProfile(){
  if(!getToken()){
    setStatus("cw-profile-status","Login required.","error");
    openModal("cw-auth-modal");
    return;
  }
  try{
    const data = await api("/api/creator/profile", { method:"PATCH", body:JSON.stringify(profileFields()) });
    setProfileForm(data.profile || {});
    setStatus("cw-profile-status","Creator profile saved.","success");
    closeModal("cw-profile-modal");
  }catch(err){
    setStatus("cw-profile-status", err.message || "Save creator profile failed","error");
  }
}

function packFields(){
  return {
    type: qs("cw-pack-type")?.value || "reading",
    title: qs("cw-pack-title")?.value?.trim() || "",
    short_description: qs("cw-pack-short")?.value?.trim() || "",
    long_description: qs("cw-pack-long")?.value?.trim() || "",
    age_min: Number(qs("cw-pack-age-min")?.value || 3),
    age_max: Number(qs("cw-pack-age-max")?.value || 6),
    category: qs("cw-pack-category")?.value?.trim() || "",
    language: qs("cw-pack-language")?.value || "en",
    price_cents: Number(qs("cw-pack-price")?.value || 299),
  };
}
function fillMarketForm(pack=null){
  if(!pack){
    qs("cw-pack-id").value = "";
    qs("cw-pack-type").value = "reading";
    qs("cw-pack-title").value = "";
    qs("cw-pack-short").value = "";
    qs("cw-pack-long").value = "";
    qs("cw-pack-age-min").value = 3;
    qs("cw-pack-age-max").value = 6;
    qs("cw-pack-category").value = "";
    qs("cw-pack-language").value = "en";
    qs("cw-pack-price").value = "299";
    setStatus("cw-pack-status","New marketplace draft ready.","success");
    return;
  }
  qs("cw-pack-id").value = pack.id || "";
  qs("cw-pack-type").value = pack.type || "reading";
  qs("cw-pack-title").value = pack.title || "";
  qs("cw-pack-short").value = pack.short_description || "";
  qs("cw-pack-long").value = pack.long_description || "";
  qs("cw-pack-age-min").value = pack.age_min ?? 3;
  qs("cw-pack-age-max").value = pack.age_max ?? 6;
  qs("cw-pack-category").value = pack.category || "";
  qs("cw-pack-language").value = pack.language || "en";
  qs("cw-pack-price").value = String(pack.price_cents ?? 299);
  setStatus("cw-pack-status", `Editing draft: ${pack.title || "Untitled"}`, "success");
}
async function saveMarketPack(){
  if(!getToken()){
    setStatus("cw-pack-status","Login required.","error");
    openModal("cw-auth-modal");
    return;
  }
  const payload = packFields();
  if(!payload.title){
    setStatus("cw-pack-status","Title is required.","error");
    return;
  }
  try{
    const id = qs("cw-pack-id")?.value?.trim() || "";
    let pack;
    if(id){
      const data = await api(`/api/creator/packs/${id}`, { method:"PATCH", body:JSON.stringify(payload) });
      pack = data.pack;
      setStatus("cw-pack-status","Marketplace draft updated.","success");
    }else{
      const data = await api("/api/creator/packs", { method:"POST", body:JSON.stringify(payload) });
      pack = data.pack;
      setStatus("cw-pack-status","Marketplace draft created.","success");
    }
    fillMarketForm(pack);
    await loadMarketPacks();
    closeModal("cw-market-modal");
  }catch(err){
    setStatus("cw-pack-status", err.message || "Save marketplace draft failed","error");
  }
}
async function submitMarketPack(idFromButton=""){
  if(!getToken()){
    setStatus("cw-pack-status","Login required.","error");
    openModal("cw-auth-modal");
    return;
  }
  try{
    const id = String(idFromButton || qs("cw-pack-id")?.value || "").trim();
    if(!id){
      setStatus("cw-pack-status","Save the draft first.","error");
      return;
    }
    await api(`/api/creator/packs/${id}/submit`, { method:"POST" });
    setStatus("cw-pack-status","Pack submitted for review.","success");
    await loadMarketPacks();
    closeModal("cw-market-modal");
  }catch(err){
    setStatus("cw-pack-status", err.message || "Submit for review failed","error");
  }
}
function renderMarketPacks(packs=[]){
  const wrap = qs("cw-market-list");
  if(!wrap) return;
  if(!packs.length){
    wrap.innerHTML = `<div class="preview-empty">No marketplace packs yet.</div>`;
    setStatus("cw-market-status","0 marketplace pack(s) loaded.","muted");
    return;
  }
  wrap.innerHTML = "";
  packs.forEach(pack=>{
    const div = document.createElement("div");
    div.className = "lesson-card";
    div.innerHTML = `
      <div class="lesson-top">
        <div>
          <div class="lesson-title">${pack.title || "Untitled"}</div>
          <div style="color:#66728c; font-weight:700;">${pack.short_description || "No short description yet."}</div>
        </div>
        <div class="badge">${money(pack.price_cents)}</div>
      </div>
      <div class="cw-badge-row">
        <span class="cw-badge">${pack.type || "reading"}</span>
        <span class="cw-badge">${pack.language || "en"}</span>
        <span class="cw-badge">${pack.category || "General"}</span>
        <span class="cw-badge ${String(pack.status||'draft').toLowerCase()}">${String(pack.status||'draft')}</span>
      </div>
      <div class="lesson-actions">
        <button class="btn btn-primary" type="button">Edit</button>
        <button class="btn btn-green" type="button">Submit</button>
      </div>
    `;
    const [editBtn, submitBtn] = div.querySelectorAll("button");
    editBtn.addEventListener("click", ()=>{ fillMarketForm(pack); openModal("cw-market-modal"); });
    submitBtn.addEventListener("click", ()=>submitMarketPack(pack.id));
    wrap.appendChild(div);
  });
  setStatus("cw-market-status", `${packs.length} marketplace pack(s) loaded.`, "success");
}
async function loadMarketPacks(){
  if(!getToken()){
    renderMarketPacks([]);
    setStatus("cw-market-status","Login to load marketplace packs.","error");
    return [];
  }
  try{
    const data = await api("/api/creator/packs");
    renderMarketPacks(data.packs || []);
    return data.packs || [];
  }catch(err){
    renderMarketPacks([]);
    setStatus("cw-market-status", err.message || "Load marketplace packs failed","error");
    return [];
  }
}

function wireExistingButtons(){
  const newBtn = qs("new-lesson-btn");
  const importBtn = qs("import-btn");
  if(newBtn){
    const topNew = document.getElementById("cw-top-new-lesson");
    topNew?.addEventListener("click", ()=>newBtn.click());
  }
  if(importBtn){
    const topImport = document.getElementById("cw-top-import");
    topImport?.addEventListener("click", ()=>importBtn.click());
  }
}

function injectExtraTopButtons(){
  const actionHost = document.querySelector(".topbar-actions");
  if(!actionHost) return;
  const extra = document.createElement("div");
  extra.className = "topbar-actions";
  extra.innerHTML = `
    <button id="cw-top-new-lesson" class="btn btn-primary" type="button">➕ New Lesson</button>
    <button id="cw-top-import" class="btn btn-soft" type="button">📥 Import</button>
  `;
  actionHost.appendChild(extra);
}

async function init(){
  mountAuthIntoModal();
  mountPreviewIntoModal();
  injectTopbarActions();
  injectExtraTopButtons();
  addMarketplaceCard();
  buildProfileModal();
  buildMarketModal();
  wireExistingButtons();
  await loadProfile();
  await loadMarketPacks();
}
window.addEventListener("load", init);
