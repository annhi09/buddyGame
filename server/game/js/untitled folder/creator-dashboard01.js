const q = (id) => document.getElementById(id);

function getToken(){ return localStorage.getItem("sb_token") || ""; }
function getCurrentUser(){ try{return JSON.parse(localStorage.getItem("sb_user") || "null");}catch{return null;} }

function setText(id, text){ const el=q(id); if(el) el.textContent=text; }
function setStatus(id, text, type="muted"){
  const el=q(id); if(!el) return;
  el.textContent=text;
  el.style.color = type==="error" ? "#c62828" : type==="success" ? "#0e9c62" : "#66728c";
}
function money(cents){ return `$${(Number(cents||0)/100).toFixed(2)}`; }

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

function openModal(id){ q(id)?.classList.add("open"); q(id)?.setAttribute("aria-hidden","false"); }
function closeModal(id){ q(id)?.classList.remove("open"); q(id)?.setAttribute("aria-hidden","true"); }

function bindModalButtons(){
  q("open-auth-btn")?.addEventListener("click", ()=>openModal("auth-modal"));
  q("open-profile-btn")?.addEventListener("click", ()=>openModal("profile-modal"));
  q("open-lesson-editor-btn")?.addEventListener("click", ()=>window.CreatorWorkspace?.openLegacyLessonEditor?.());
  q("new-lesson-btn")?.addEventListener("click", ()=>window.CreatorWorkspace?.openLegacyLessonEditor?.());
  q("open-market-pack-btn")?.addEventListener("click", ()=>{ fillPackForm(null); openModal("market-pack-modal"); });
  q("new-market-btn")?.addEventListener("click", ()=>{ fillPackForm(null); openModal("market-pack-modal"); });
  document.querySelectorAll("[data-close-modal]").forEach(btn=>btn.addEventListener("click", ()=>closeModal(btn.getAttribute("data-close-modal"))));
  document.querySelectorAll(".modal").forEach(modal=>modal.addEventListener("click",(e)=>{ if(e.target===modal) closeModal(modal.id); }));
}

function readProfileForm(){
  return {
    studio_name: q("market-studio-name")?.value?.trim() || "",
    bio: q("market-bio")?.value?.trim() || "",
    country: q("market-country")?.value?.trim() || "",
  };
}
function fillProfileForm(profile={}){
  if(q("market-studio-name")) q("market-studio-name").value = profile.studio_name || "";
  if(q("market-bio")) q("market-bio").value = profile.bio || "";
  if(q("market-country")) q("market-country").value = profile.country || "";
}

function readPackForm(){
  return {
    type: q("market-pack-type")?.value || "reading",
    title: q("market-pack-title")?.value?.trim() || "",
    short_description: q("market-pack-short")?.value?.trim() || "",
    long_description: q("market-pack-long")?.value?.trim() || "",
    age_min: Number(q("market-pack-age-min")?.value || 3),
    age_max: Number(q("market-pack-age-max")?.value || 6),
    category: q("market-pack-category")?.value?.trim() || "",
    language: q("market-pack-language")?.value || "en",
    price_cents: Number(q("market-pack-price")?.value || 299),
  };
}
function fillPackForm(pack=null){
  if(!pack){
    q("market-pack-id").value = "";
    q("market-pack-type").value = "reading";
    q("market-pack-title").value = "";
    q("market-pack-short").value = "";
    q("market-pack-long").value = "";
    q("market-pack-age-min").value = 3;
    q("market-pack-age-max").value = 6;
    q("market-pack-category").value = "";
    q("market-pack-language").value = "en";
    q("market-pack-price").value = "299";
    setStatus("market-pack-status","New marketplace draft ready.","success");
    return;
  }
  q("market-pack-id").value = pack.id || "";
  q("market-pack-type").value = pack.type || "reading";
  q("market-pack-title").value = pack.title || "";
  q("market-pack-short").value = pack.short_description || "";
  q("market-pack-long").value = pack.long_description || "";
  q("market-pack-age-min").value = pack.age_min ?? 3;
  q("market-pack-age-max").value = pack.age_max ?? 6;
  q("market-pack-category").value = pack.category || "";
  q("market-pack-language").value = pack.language || "en";
  q("market-pack-price").value = String(pack.price_cents ?? 299);
  setStatus("market-pack-status",`Editing draft: ${pack.title || "Untitled"}`,"success");
}

function updateSummaryPills(profile=null){
  const user = getCurrentUser();
  setText("auth-summary-pill", user ? `✅ ${user.display_name || user.email}` : "🔒 Not logged in");
  setText("creator-summary-pill", profile?.studio_name ? `🧑‍🎨 ${profile.studio_name}` : "🧑‍🎨 Creator profile not saved");
}

async function loadCreatorProfile(){
  if(!getToken()){
    fillProfileForm({});
    updateSummaryPills(null);
    setStatus("market-profile-status","Login to save your creator profile.","error");
    return null;
  }
  try{
    const data = await api("/api/creator/profile");
    fillProfileForm(data.profile || {});
    updateSummaryPills(data.profile || null);
    setStatus("market-profile-status","Creator profile loaded.","success");
    return data.profile || null;
  }catch(err){
    fillProfileForm({});
    updateSummaryPills(null);
    setStatus("market-profile-status", err.message || "Load creator profile failed","error");
    return null;
  }
}
async function saveCreatorProfile(){
  if(!getToken()){ setStatus("market-profile-status","Login required.","error"); openModal("auth-modal"); return; }
  try{
    const data = await api("/api/creator/profile",{ method:"PATCH", body:JSON.stringify(readProfileForm()) });
    fillProfileForm(data.profile || {});
    updateSummaryPills(data.profile || null);
    setStatus("market-profile-status","Creator profile saved.","success");
    closeModal("profile-modal");
  }catch(err){
    setStatus("market-profile-status", err.message || "Save creator profile failed","error");
  }
}

function statusTag(status=""){
  const safe = String(status || "draft").toLowerCase();
  return `<span class="tag ${safe}">${safe}</span>`;
}
function renderMarketPackList(packs=[]){
  const wrap=q("market-pack-list"); if(!wrap) return;
  if(!packs.length){ wrap.innerHTML = `<div class="empty">No marketplace packs yet.</div>`; return; }
  wrap.innerHTML = packs.map(pack=>`
    <div class="item-card">
      <div class="item-top">
        <div>
          <div class="item-title">${pack.title || "Untitled Pack"}</div>
          <div class="muted" style="margin-top:6px;">${pack.short_description || "No short description yet."}</div>
        </div>
        <div class="tag">${money(pack.price_cents)}</div>
      </div>
      <div class="item-meta">
        <span class="tag">${pack.type || "reading"}</span>
        <span class="tag">${pack.language || "en"}</span>
        <span class="tag">${pack.category || "General"}</span>
        ${statusTag(pack.status)}
        <span class="tag">Ages ${pack.age_min ?? 3}-${pack.age_max ?? 6}</span>
      </div>
      <div class="card-actions" style="margin-top:12px;">
        <button class="btn btn-primary market-edit-btn" data-id="${pack.id}">Edit</button>
        <button class="btn btn-soft market-preview-btn" data-id="${pack.id}">Preview</button>
        <button class="btn btn-green market-submit-btn" data-id="${pack.id}">Submit</button>
      </div>
    </div>
  `).join("");

  wrap.querySelectorAll(".market-edit-btn").forEach(btn=>btn.addEventListener("click",()=>{
    const pack = packs.find(p=>String(p.id)===String(btn.dataset.id));
    if(pack){ fillPackForm(pack); openModal("market-pack-modal"); }
  }));
  wrap.querySelectorAll(".market-submit-btn").forEach(btn=>btn.addEventListener("click",async()=>{ await submitPack(btn.dataset.id); }));
  wrap.querySelectorAll(".market-preview-btn").forEach(btn=>btn.addEventListener("click",()=>{
    const pack = packs.find(p=>String(p.id)===String(btn.dataset.id));
    if(!pack) return;
    setText("lesson-preview-title", `${pack.title || "Marketplace Pack"} Preview`);
    q("lesson-preview-list").innerHTML = `
      <div class="preview-row"><div><div><strong>Type:</strong> ${pack.type || "reading"}</div><div><strong>Price:</strong> ${money(pack.price_cents)}</div><div><strong>Status:</strong> ${pack.status || "draft"}</div><div><strong>Language:</strong> ${pack.language || "en"}</div><div><strong>Category:</strong> ${pack.category || "General"}</div></div></div>
      <div class="preview-row"><div>${pack.long_description || pack.short_description || "No description yet."}</div></div>`;
    openModal("lesson-preview-modal");
  }));
}
async function loadCreatorPacks(){
  if(!getToken()){ renderMarketPackList([]); setStatus("market-packs-status","Login to load marketplace packs.","error"); return []; }
  try{
    const data = await api("/api/creator/packs");
    renderMarketPackList(data.packs || []);
    setStatus("market-packs-status", `${(data.packs || []).length} marketplace pack(s) loaded.`,"success");
    return data.packs || [];
  }catch(err){
    renderMarketPackList([]);
    setStatus("market-packs-status", err.message || "Load marketplace packs failed","error");
    return [];
  }
}
async function savePackDraft(){
  if(!getToken()){ setStatus("market-pack-status","Login required.","error"); openModal("auth-modal"); return; }
  const payload = readPackForm();
  if(!payload.title){ setStatus("market-pack-status","Title is required.","error"); return; }
  try{
    const packId = q("market-pack-id")?.value?.trim() || "";
    let pack;
    if(packId){
      const data = await api(`/api/creator/packs/${packId}`, { method:"PATCH", body:JSON.stringify(payload) });
      pack = data.pack;
      setStatus("market-pack-status","Marketplace draft updated.","success");
    }else{
      const data = await api("/api/creator/packs", { method:"POST", body:JSON.stringify(payload) });
      pack = data.pack;
      setStatus("market-pack-status","Marketplace draft created.","success");
    }
    fillPackForm(pack);
    await loadCreatorPacks();
    closeModal("market-pack-modal");
  }catch(err){
    setStatus("market-pack-status", err.message || "Save marketplace draft failed","error");
  }
}
async function submitPack(packIdFromButton=""){
  if(!getToken()){ setStatus("market-pack-status","Login required.","error"); openModal("auth-modal"); return; }
  try{
    const packId = String(packIdFromButton || q("market-pack-id")?.value || "").trim();
    if(!packId){ setStatus("market-pack-status","Save the draft first.","error"); return; }
    await api(`/api/creator/packs/${packId}/submit`, { method:"POST" });
    setStatus("market-pack-status","Pack submitted for review.","success");
    await loadCreatorPacks();
    closeModal("market-pack-modal");
  }catch(err){
    setStatus("market-pack-status", err.message || "Submit for review failed","error");
  }
}

async function login(){
  try{
    const email = q("auth-email")?.value?.trim() || "";
    const password = q("auth-password")?.value || "";
    if(!email || !password){ setStatus("auth-modal-status","Email and password are required.","error"); return; }
    const data = await fetch("/api/auth/login", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ email, password }) }).then(r=>r.json());
    if(!data?.ok) throw new Error(data?.error || "Login failed");
    localStorage.setItem("sb_token", data.token || "");
    localStorage.setItem("sb_user", JSON.stringify(data.user || {}));
    setStatus("auth-modal-status","Login successful.","success");
    updateSummaryPills(await loadCreatorProfile());
    await loadCreatorPacks();
    closeModal("auth-modal");
  }catch(err){
    setStatus("auth-modal-status", err.message || "Login failed","error");
  }
}
async function registerUser(){
  try{
    const email = q("auth-email")?.value?.trim() || "";
    const password = q("auth-password")?.value || "";
    const displayName = q("auth-display-name")?.value?.trim() || "";
    if(!email || !password){ setStatus("auth-modal-status","Email and password are required.","error"); return; }
    const data = await fetch("/api/auth/register", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ email, password, displayName }) }).then(r=>r.json());
    if(!data?.ok) throw new Error(data?.error || "Register failed");
    localStorage.setItem("sb_token", data.token || "");
    localStorage.setItem("sb_user", JSON.stringify(data.user || {}));
    setStatus("auth-modal-status","Registration successful.","success");
    updateSummaryPills(await loadCreatorProfile());
    await loadCreatorPacks();
    closeModal("auth-modal");
  }catch(err){
    setStatus("auth-modal-status", err.message || "Register failed","error");
  }
}
function logoutUser(){
  localStorage.removeItem("sb_token");
  localStorage.removeItem("sb_user");
  updateSummaryPills(null);
  renderMarketPackList([]);
  setStatus("auth-modal-status","Logged out.","success");
  setStatus("market-profile-status","Login to save your creator profile.","error");
  setStatus("market-packs-status","Login to load marketplace packs.","error");
}

function renderLessonsFromExistingState(){
  const wrap=q("lessons-list"); if(!wrap) return;
  const lessons = window.lessons || window.creatorLessons || window.CreatorWorkspace?.lessons || [];
  if(!Array.isArray(lessons) || !lessons.length){
    wrap.innerHTML = `<div class="empty">No lesson packs loaded yet.</div>`;
    setStatus("lessons-status","Use New Lesson or Import to start building lesson packs.","muted");
    return;
  }
  wrap.innerHTML = lessons.map((lesson,index)=>`
    <div class="item-card">
      <div class="item-top">
        <div>
          <div class="item-title">${lesson.title || "Untitled Lesson"}</div>
          <div class="muted" style="margin-top:6px;">${(lesson.items || []).length} item(s)</div>
        </div>
        <div class="tag">${(lesson.items || []).length} items</div>
      </div>
      <div class="item-meta"><span class="tag">Lesson Pack</span><span class="tag">${lesson.updatedAt ? new Date(lesson.updatedAt).toLocaleDateString() : "Local"}</span></div>
      <div class="card-actions" style="margin-top:12px;">
        <button class="btn btn-primary lesson-edit-btn" data-index="${index}">Edit</button>
        <button class="btn btn-soft lesson-preview-btn" data-index="${index}">Preview</button>
      </div>
    </div>
  `).join("");

  wrap.querySelectorAll(".lesson-edit-btn").forEach(btn=>btn.addEventListener("click", ()=>{
    const index = Number(btn.dataset.index);
    if(window.editLesson) return window.editLesson(index);
    if(window.CreatorWorkspace?.editLesson) return window.CreatorWorkspace.editLesson(index);
    alert("Lesson editor hook is not wired yet.");
  }));
  wrap.querySelectorAll(".lesson-preview-btn").forEach(btn=>btn.addEventListener("click", ()=>{
    const lesson = lessons[Number(btn.dataset.index)];
    openLessonPreview(lesson);
  }));
  setStatus("lessons-status", `${lessons.length} lesson pack(s) loaded.`,"success");
}
function openLessonPreview(lesson){
  if(!lesson) return;
  setText("lesson-preview-title", lesson.title || "Lesson Preview");
  const list=q("lesson-preview-list");
  const items = Array.isArray(lesson.items) ? lesson.items : [];
  if(!items.length){
    list.innerHTML = `<div class="empty">This lesson has no items yet.</div>`;
  }else{
    list.innerHTML = items.map((item,idx)=>`
      <div class="preview-row">
        ${item.image ? `<img class="preview-thumb" src="${item.image}" alt="" onerror="this.style.display='none'" />` : ``}
        <div><div><strong>${idx+1}.</strong> ${item.word || item.text || "Untitled item"}</div><div class="muted" style="margin-top:4px;">${item.image ? "Has image" : "No image"}</div></div>
      </div>
    `).join("");
  }
  openModal("lesson-preview-modal");
}
function bindWorkspaceActions(){
  q("refresh-workspace-btn")?.addEventListener("click", async()=>{ renderLessonsFromExistingState(); await loadCreatorProfile(); await loadCreatorPacks(); });
  q("refresh-market-btn")?.addEventListener("click", loadCreatorPacks);
  q("import-lessons-btn")?.addEventListener("click", ()=>{
    if(q("import-file")) return q("import-file").click();
    if(window.CreatorWorkspace?.openImport) return window.CreatorWorkspace.openImport();
    alert("Import hook not wired yet.");
  });
  q("market-save-profile-btn")?.addEventListener("click", saveCreatorProfile);
  q("market-new-pack-btn")?.addEventListener("click", ()=>fillPackForm(null));
  q("market-save-pack-btn")?.addEventListener("click", savePackDraft);
  q("market-submit-pack-btn")?.addEventListener("click", ()=>submitPack(""));
  q("auth-login-btn")?.addEventListener("click", login);
  q("auth-register-btn")?.addEventListener("click", registerUser);
  q("auth-logout-btn")?.addEventListener("click", logoutUser);
  window.addEventListener("storage", async(e)=>{ if(e.key==="sb_token" || e.key==="sb_user"){ await initWorkspace(); } });
}
async function initWorkspace(){
  renderLessonsFromExistingState();
  const profile = await loadCreatorProfile();
  updateSummaryPills(profile);
  await loadCreatorPacks();
  const user = getCurrentUser();
  setStatus("auth-modal-status", user ? `Logged in as ${user.display_name || user.email}` : "Not logged in.", user ? "success" : "muted");
}

function emptyLessonDraft(){
  return {
    id: "",
    title: "",
    type: "words",
    visibility: "private",
    notes: "",
    items: []
  };
}

let currentLessonDraft = emptyLessonDraft();

function fillLessonForm(lesson = null){
  const data = lesson || emptyLessonDraft();

  q("lesson-id").value = data.id || "";
  q("lesson-title").value = data.title || "";
  q("lesson-type").value = data.type || "words";
  q("lesson-visibility").value = data.visibility || "private";
  q("lesson-notes").value = data.notes || "";

  currentLessonDraft = {
    id: data.id || "",
    title: data.title || "",
    type: data.type || "words",
    visibility: data.visibility || "private",
    notes: data.notes || "",
    items: Array.isArray(data.items) ? [...data.items] : []
  };

  renderLessonItems();
  setStatus("lesson-editor-status", "New lesson draft ready.", "success");
}

function startLessonDraft(){
  fillLessonForm(null);
  openModal("lesson-editor-modal");
}

bindModalButtons();
bindWorkspaceActions();
initWorkspace();

window.CreatorWorkspace = window.CreatorWorkspace || {};

window.CreatorWorkspace.openLegacyLessonEditor = function(){
  startNewDraft();
};

window.CreatorWorkspace.startNewDraft = startNewDraft;
window.CreatorWorkspace.openEditorModal = openModal;
window.CreatorWorkspace.closeEditorModal = closeModal;
window.CreatorWorkspace.editLesson = openLessonForEdit;
window.CreatorWorkspace.renderLessons = renderExistingLessons;
window.CreatorWorkspace.loadLessons = loadExistingLessons;

window.startNewDraft = startNewDraft;
window.openModal = openModal;

// window.CreatorWorkspace = window.CreatorWorkspace || {};
// window.CreatorWorkspace.openLegacyLessonEditor = window.CreatorWorkspace.openLegacyLessonEditor || function(){
//   if(window.openNewLesson) return window.openNewLesson();
//   alert("Hook this button to your existing lesson editor modal.");
// };
// window.CreatorWorkspace.renderLessons = renderLessonsFromExistingState;
