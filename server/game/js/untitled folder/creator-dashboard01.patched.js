

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

function openModal(id){
  const el = q(id);
  if(!el) return;
  el.classList.add("open");
  el.setAttribute("aria-hidden","false");
}
function closeModal(id){
  const el = q(id);
  if(!el) return;
  el.classList.remove("open");
  el.setAttribute("aria-hidden","true");
}
function openEditorModal(){ openModal("editor-modal"); }
function closeEditorModal(){ closeModal("editor-modal"); }

function bindModalButtons(){
  q("open-auth-btn")?.addEventListener("click", ()=>openModal("auth-modal"));
  q("open-profile-btn")?.addEventListener("click", ()=>openModal("profile-modal"));
  q("open-lesson-editor-btn")?.addEventListener("click", ()=>startNewDraft());
  q("new-lesson-btn")?.addEventListener("click", ()=>startNewDraft());
  q("open-market-pack-btn")?.addEventListener("click", ()=>{ fillPackForm(null); openModal("market-pack-modal"); });
  q("new-market-btn")?.addEventListener("click", ()=>{ fillPackForm(null); openModal("market-pack-modal"); });
  q("close-modal-btn")?.addEventListener("click", closeEditorModal);

  document.querySelectorAll("[data-close-modal]").forEach(btn=>btn.addEventListener("click", ()=>closeModal(btn.getAttribute("data-close-modal"))));
  document.querySelectorAll(".modal").forEach(modal=>modal.addEventListener("click",(e)=>{ if(e.target===modal) closeModal(modal.id); }));
  q("editor-modal")?.addEventListener("click", (e)=>{ if(e.target === q("editor-modal")) closeEditorModal(); });
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
    await loadExistingLessons(true);
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
    await loadExistingLessons(true);
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
  lessonsCache = loadLocalCache();
  renderExistingLessons();
}

// -------- lesson editor logic copied/adapted from creator01 --------
const CACHE_KEY = "SB_CREATOR_CACHE_V2";
let currentLessonId = null;
let currentItems = [];
let lessonsCache = [];
let currentDraft = null;

function saveLocalCache(){
  try{
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), lessons: lessonsCache }));
  }catch{}
}
function loadLocalCache(){
  try{
    const raw = localStorage.getItem(CACHE_KEY);
    if(!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.lessons) ? parsed.lessons : [];
  }catch{
    return [];
  }
}
function uid(prefix = "local"){
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
}
function toItemKey(word){
  return String(word || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
function makeItem(word = "", image = null){
  return { word, image, imageKey: word ? toItemKey(word) : "", imageVersion: "" };
}
function cloneItems(items){
  return (items || []).map(item => ({
    word: item.word || item.text || "",
    image: item.image || null,
    imageKey: item.imageKey || item.image_key || toItemKey(item.word || item.text || ""),
    imageVersion: item.imageVersion || item.image_version || ""
  }));
}
function normalizeLesson(lesson){
  const items = cloneItems(lesson?.items || lesson?.data_json?.items || []);
  return {
    id: lesson?.id || "",
    title: lesson?.title || "",
    type: lesson?.type || "words",
    visibility: lesson?.visibility || "private",
    notes: lesson?.notes || "",
    updatedAt: lesson?.updatedAt || lesson?.updated_at || Date.now(),
    items
  };
}
function getCurrentLessonFromState(){
  return {
    id: currentLessonId || null,
    title: q("lesson-title")?.value?.trim() || "Untitled",
    type: q("lesson-type")?.value || "words",
    visibility: q("lesson-visibility")?.value || "private",
    notes: q("lesson-notes")?.value?.trim() || "",
    data_json: { items: cloneItems(currentItems) }
  };
}
function fillLessonForm(lesson = {}){
  q("lesson-title").value = lesson.title || "";
  q("lesson-type").value = lesson.type || "words";
  q("lesson-visibility").value = lesson.visibility || "private";
  q("lesson-notes").value = lesson.notes || "";
  setText("editor-headline", lesson.id ? `Editing: ${lesson.title || "Lesson"}` : "New Lesson");
}
function getImageSrc(item){
  if(!item?.image) return "";
  if(typeof item.image === "string") return item.image;
  return item.image.thumb || item.image.medium || item.image.original || "";
}
function renderItemsEditor(){
  const wrap = q("items-wrap");
  if(!wrap) return;
  wrap.innerHTML = "";
  if(!currentItems.length){
    wrap.innerHTML = `<div class="empty">No items yet. Click <strong>+ Add Item</strong> to begin.</div>`;
    return;
  }
  currentItems.forEach((item, index) => {
    const imageSrc = getImageSrc(item);
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item-head">
        <strong>Item ${index + 1}</strong>
        <button class="btn btn-danger remove-btn" data-index="${index}" type="button">Remove</button>
      </div>
      <div class="item-grid">
        <div>
          ${imageSrc ? `<img class="item-thumb" src="${imageSrc}?v=${item.imageVersion || ""}" alt="${item.word || ""}" />` : `<div class="empty" style="padding:20px;min-height:110px;">No image</div>`}
        </div>
        <div>
          <div class="field">
            <label>Word</label>
            <input type="text" class="item-word" data-index="${index}" value="${(item.word || "").replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}" placeholder="cat" />
          </div>
          <div class="field">
            <label>Image</label>
            <input type="file" class="item-image" data-index="${index}" accept="image/png,image/jpeg,image/webp" />
          </div>
          <div class="item-actions">
            <button class="btn btn-soft upload-btn" data-index="${index}" type="button">Upload Image</button>
            <button class="btn btn-soft delete-image-btn" data-index="${index}" type="button">Delete Image</button>
          </div>
        </div>
      </div>
    `;
    wrap.appendChild(div);
  });
}
function renderExistingLessons(){
  const wrap=q("lessons-list"); if(!wrap) return;
  if(!lessonsCache.length){
    wrap.innerHTML = `<div class="empty">No lesson packs loaded yet.</div>`;
    setStatus("lessons-status","Use New Lesson or Import to start building lesson packs.","muted");
    return;
  }
  wrap.innerHTML = lessonsCache.map((lesson,index)=>`
    <div class="item-card">
      <div class="item-top">
        <div>
          <div class="item-title">${lesson.title || "Untitled Lesson"}</div>
          <div class="muted" style="margin-top:6px;">${(lesson.items || []).length} item(s)</div>
        </div>
        <div class="tag">${(lesson.items || []).length} items</div>
      </div>
      <div class="item-meta"><span class="tag">${lesson.type || "words"}</span><span class="tag">${lesson.updatedAt ? new Date(lesson.updatedAt).toLocaleDateString() : "Local"}</span></div>
      <div class="card-actions" style="margin-top:12px;">
        <button class="btn btn-primary lesson-edit-btn" data-id="${lesson.id}">Edit</button>
        <button class="btn btn-soft lesson-preview-btn" data-id="${lesson.id}">Preview</button>
      </div>
    </div>
  `).join("");

  wrap.querySelectorAll(".lesson-edit-btn").forEach(btn=>btn.addEventListener("click", ()=>openLessonForEdit(btn.dataset.id)));
  wrap.querySelectorAll(".lesson-preview-btn").forEach(btn=>btn.addEventListener("click", ()=>{
    const lesson = lessonsCache.find(l=>String(l.id)===String(btn.dataset.id));
    openLessonPreview(lesson);
  }));
  setStatus("lessons-status", `${lessonsCache.length} lesson pack(s) loaded.`,"success");
}
async function loadExistingLessons(fromServer = true){
  lessonsCache = loadLocalCache();
  renderExistingLessons();
  if(!fromServer || !getToken()) return lessonsCache;
  try{
    const data = await api("/api/lessons");
    lessonsCache = (data.lessons || []).map(normalizeLesson);
    saveLocalCache();
    renderExistingLessons();
    return lessonsCache;
  }catch(err){
    setStatus("lessons-status", err.message || "Could not load cloud lessons.", "error");
    return lessonsCache;
  }
}
function startNewDraft(){
  currentLessonId = null;
  currentItems = [];
  currentDraft = { title:"", type:"words", visibility:"private", notes:"", data_json:{ items:[] }, localOnly:true };
  fillLessonForm(currentDraft);
  renderItemsEditor();
  setStatus("lessons-status", "New draft started.", "success");
  openEditorModal();
}
function openLessonForEdit(idOrIndex){
  let lesson = lessonsCache.find(l => String(l.id) === String(idOrIndex));
  if(!lesson && Number.isFinite(Number(idOrIndex))) lesson = lessonsCache[Number(idOrIndex)];
  if(!lesson) return;
  currentLessonId = lesson.id || null;
  currentDraft = normalizeLesson(lesson);
  currentItems = cloneItems(currentDraft.items);
  fillLessonForm(currentDraft);
  renderItemsEditor();
  openEditorModal();
}
async function doCreateLesson(){
  const payload = getCurrentLessonFromState();
  if(!payload.title){ setStatus("lessons-status", "Lesson title is required.", "error"); return; }
  if(!getToken()){
    const localLesson = normalizeLesson({ ...payload, id: uid(), items: payload.data_json.items, updatedAt: Date.now() });
    lessonsCache.unshift(localLesson);
    currentLessonId = localLesson.id;
    saveLocalCache();
    renderExistingLessons();
    setStatus("lessons-status", "Saved locally. Login to sync to cloud.", "success");
    closeEditorModal();
    return;
  }
  try{
    const data = await api("/api/lessons", { method:"POST", body: JSON.stringify(payload) });
    const lesson = normalizeLesson(data.lesson);
    currentLessonId = lesson.id;
    const idx = lessonsCache.findIndex(l => String(l.id) === String(lesson.id));
    if(idx >= 0) lessonsCache[idx] = lesson; else lessonsCache.unshift(lesson);
    saveLocalCache();
    renderExistingLessons();
    setStatus("lessons-status", "Lesson created.", "success");
    closeEditorModal();
  }catch(err){
    setStatus("lessons-status", err.message || "Create lesson failed", "error");
  }
}
async function doSaveLessonInfo(){
  if(!currentLessonId) return doCreateLesson();
  const payload = getCurrentLessonFromState();
  try{
    if(!getToken()){
      const idx = lessonsCache.findIndex(l => String(l.id) === String(currentLessonId));
      if(idx >= 0) lessonsCache[idx] = normalizeLesson({ ...lessonsCache[idx], ...payload, items: currentItems, updatedAt: Date.now() });
      saveLocalCache();
      renderExistingLessons();
      setStatus("lessons-status", "Lesson info saved locally.", "success");
      return;
    }
    const data = await api(`/api/lessons/${currentLessonId}`, { method:"PATCH", body: JSON.stringify(payload) });
    const lesson = normalizeLesson(data.lesson);
    const idx = lessonsCache.findIndex(l => String(l.id) === String(lesson.id));
    if(idx >= 0) lessonsCache[idx] = lesson; else lessonsCache.unshift(lesson);
    saveLocalCache();
    renderExistingLessons();
    setStatus("lessons-status", "Lesson info saved.", "success");
  }catch(err){
    setStatus("lessons-status", err.message || "Save lesson info failed", "error");
  }
}
async function doSaveItems(){
  if(!currentLessonId) return doCreateLesson();
  const payload = getCurrentLessonFromState();
  try{
    if(!getToken()){
      const idx = lessonsCache.findIndex(l => String(l.id) === String(currentLessonId));
      if(idx >= 0) lessonsCache[idx] = normalizeLesson({ ...lessonsCache[idx], ...payload, items: currentItems, updatedAt: Date.now() });
      saveLocalCache();
      renderExistingLessons();
      setStatus("lessons-status", "Items saved locally.", "success");
      closeEditorModal();
      return;
    }
    const data = await api(`/api/lessons/${currentLessonId}`, { method:"PATCH", body: JSON.stringify(payload) });
    const lesson = normalizeLesson(data.lesson);
    const idx = lessonsCache.findIndex(l => String(l.id) === String(lesson.id));
    if(idx >= 0) lessonsCache[idx] = lesson; else lessonsCache.unshift(lesson);
    saveLocalCache();
    renderExistingLessons();
    setStatus("lessons-status", "Items saved.", "success");
    closeEditorModal();
  }catch(err){
    setStatus("lessons-status", err.message || "Save items failed", "error");
  }
}
async function doDeleteLesson(){
  if(!currentLessonId) return;
  if(!window.confirm("Delete this lesson?")) return;
  try{
    if(getToken()) await api(`/api/lessons/${currentLessonId}`, { method:"DELETE" });
    lessonsCache = lessonsCache.filter(l => String(l.id) !== String(currentLessonId));
    saveLocalCache();
    renderExistingLessons();
    currentLessonId = null;
    currentItems = [];
    currentDraft = null;
    closeEditorModal();
    setStatus("lessons-status", "Lesson deleted.", "success");
  }catch(err){
    setStatus("lessons-status", err.message || "Delete lesson failed", "error");
  }
}
async function doUploadImage(index){
  if(!currentLessonId){ setStatus("lessons-status", "Create the lesson first, then upload images.", "error"); return; }
  const item = currentItems[index];
  const input = document.querySelector(`.item-image[data-index="${index}"]`);
  const file = input?.files?.[0];
  if(!file){ setStatus("lessons-status", "Choose an image first.", "error"); return; }
  if(!getToken()){
    const reader = new FileReader();
    reader.onload = () => {
      currentItems[index].image = String(reader.result || "");
      currentItems[index].imageVersion = Date.now();
      renderItemsEditor();
      setStatus("lessons-status", `Image added locally for "${item.word || `Item ${index+1}`}"`, "success");
    };
    reader.readAsDataURL(file);
    return;
  }
  try{
    const fd = new FormData();
    fd.append("lessonId", currentLessonId);
    fd.append("kind", "item");
    fd.append("itemKey", item.imageKey || toItemKey(item.word) || `item-${index+1}`);
    fd.append("image", file);
    const token = getToken();
    const res = await fetch("/api/uploads/lesson-image", { method:"POST", headers: token ? { Authorization:`Bearer ${token}` } : {}, body: fd });
    const data = await res.json().catch(()=>({}));
    if(!res.ok || data.ok === false) throw new Error(data.error || "Image upload failed");
    currentItems[index].image = {
      original: data.image.originalUrl,
      medium: data.image.mediumUrl,
      thumb: data.image.thumbUrl
    };
    currentItems[index].imageKey = data.image.item_key || item.imageKey;
    currentItems[index].imageVersion = Date.now();
    renderItemsEditor();
    setStatus("lessons-status", `Image uploaded for "${item.word || `Item ${index+1}`}"`, "success");
  }catch(err){
    setStatus("lessons-status", err.message || "Image upload failed.", "error");
  }
}
async function doDeleteItemImage(index){
  const item = currentItems[index];
  if(!item?.image){ setStatus("lessons-status", "This item has no image.", "error"); return; }
  const itemKey = item.imageKey || toItemKey(item.word);
  if(getToken() && currentLessonId && typeof item.image === "object"){
    try{
      const token = getToken();
      const url = `/api/uploads/lesson-image?lessonId=${encodeURIComponent(currentLessonId)}&itemKey=${encodeURIComponent(itemKey)}`;
      const res = await fetch(url, { method:"DELETE", headers: token ? { Authorization:`Bearer ${token}` } : {} });
      const data = await res.json().catch(()=>({}));
      if(!res.ok || data.ok === false) throw new Error(data.error || "Delete image failed");
    }catch(err){
      setStatus("lessons-status", err.message || "Delete image failed.", "error");
      return;
    }
  }
  currentItems[index].image = null;
  currentItems[index].imageVersion = "";
  renderItemsEditor();
  setStatus("lessons-status", `Image removed for "${item.word || `Item ${index+1}`}"`, "success");
}

function openLessonPreview(lesson){
  if(!lesson) return;
  setText("lesson-preview-title", lesson.title || "Lesson Preview");
  const list=q("lesson-preview-list");
  const items = Array.isArray(lesson.items) ? lesson.items : [];
  if(!items.length){
    list.innerHTML = `<div class="empty">This lesson has no items yet.</div>`;
  }else{
    list.innerHTML = items.map((item,idx)=>{
      const src = getImageSrc(item);
      return `
      <div class="preview-row">
        ${src ? `<img class="preview-thumb" src="${src}" alt="" onerror="this.style.display='none'" />` : ``}
        <div><div><strong>${idx+1}.</strong> ${item.word || item.text || "Untitled item"}</div><div class="muted" style="margin-top:4px;">${src ? "Has image" : "No image"}</div></div>
      </div>`;
    }).join("");
  }
  openModal("lesson-preview-modal");
}

function bindEditorEvents(){
  document.addEventListener("input", (e)=>{
    if(e.target.classList.contains("item-word")){
      const index = Number(e.target.dataset.index);
      currentItems[index].word = e.target.value;
      currentItems[index].imageKey = toItemKey(e.target.value);
    }
  });
  document.addEventListener("click", async (e)=>{
    const uploadBtn = e.target.closest(".upload-btn");
    if(uploadBtn) return void doUploadImage(Number(uploadBtn.dataset.index));
    const deleteImageBtn = e.target.closest(".delete-image-btn");
    if(deleteImageBtn) return void doDeleteItemImage(Number(deleteImageBtn.dataset.index));
    const removeBtn = e.target.closest(".remove-btn");
    if(removeBtn){
      currentItems.splice(Number(removeBtn.dataset.index), 1);
      renderItemsEditor();
      return;
    }
  });
  q("create-lesson-btn")?.addEventListener("click", doCreateLesson);
  q("save-lesson-info-btn")?.addEventListener("click", doSaveLessonInfo);
  q("save-items-btn")?.addEventListener("click", doSaveItems);
  q("add-item-btn")?.addEventListener("click", ()=>{ currentItems.push(makeItem()); renderItemsEditor(); });
}

function bindWorkspaceActions(){
  q("refresh-workspace-btn")?.addEventListener("click", async()=>{ await initWorkspace(); });
  q("refresh-market-btn")?.addEventListener("click", loadCreatorPacks);
  q("import-lessons-btn")?.addEventListener("click", ()=>{ if(q("import-file")) q("import-file").click(); });
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
  await loadExistingLessons(true);
  const profile = await loadCreatorProfile();
  updateSummaryPills(profile);
  await loadCreatorPacks();
  const user = getCurrentUser();
  setStatus("auth-modal-status", user ? `Logged in as ${user.display_name || user.email}` : "Not logged in.", user ? "success" : "muted");
}

bindModalButtons();
bindWorkspaceActions();
bindEditorEvents();
initWorkspace();

window.CreatorWorkspace = window.CreatorWorkspace || {};
window.CreatorWorkspace.openLegacyLessonEditor = startNewDraft;
window.CreatorWorkspace.startNewDraft = startNewDraft;
window.CreatorWorkspace.openEditorModal = openEditorModal;
window.CreatorWorkspace.closeEditorModal = closeEditorModal;
window.CreatorWorkspace.editLesson = openLessonForEdit;
window.CreatorWorkspace.renderLessons = renderExistingLessons;
window.CreatorWorkspace.loadLessons = loadExistingLessons;
window.startNewDraft = startNewDraft;
window.openModal = openEditorModal;
window.closeModal = closeEditorModal;
window.openLessonForEdit = openLessonForEdit;
