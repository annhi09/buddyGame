let marketplacePacksCache = [];
let currentMarketplaceFilter = "all";
let currentLessonsSearch = "";
let currentMarketplaceSearch = "";
let currentLessonsSort = "newest";
let currentMarketplaceSort = "newest";
let modalBindingsReady = false;
let workspaceBindingsReady = false;

let currentWorkspaceTab = "lessons";

function setWorkspaceTab(tab = "lessons"){
  currentWorkspaceTab = tab;

  document.querySelectorAll(".workspace-tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.workspaceTab === tab);
  });

  document.querySelectorAll(".workspace-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === `workspace-panel-${tab}`);
  });
}

const q = (id) => document.getElementById(id);

function getToken(){ return localStorage.getItem("sb_token") || ""; }
function getCurrentUser(){ try{return JSON.parse(localStorage.getItem("sb_user") || "null");}catch{return null;} }

function setText(id, text){ const el=q(id); if(el) el.textContent=text; }
function setStatus(id, text, type="muted"){
  const el=q(id); if(!el) return;
  el.textContent=text;
  el.style.color = type==="error" ? "#c62828" : type==="success" ? "#0e9c62" : "#66728c";
}
// function money(cents){ return `$${(Number(cents||0)/100).toFixed(2)}`; }

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
  const stableKey = uid("item");
  return {
    word,
    image,
    imageKey: stableKey,
    imageVersion: ""
  };
}

function cloneItems(items){
  return (items || []).map(item => ({
    word: item.word || item.text || "",
    image: item.image || null,
    imageKey: item.imageKey || item.image_key || toItemKey(item.word || item.text || ""),
    imageVersion: item.imageVersion || item.image_version || ""
  }));
}

function cloneSingleItem(item = {}){
  return {
    word: item.word || item.text || "",
    image: item.image
      ? (typeof item.image === "string"
          ? item.image
          : { ...item.image })
      : null,
    imageKey: item.imageKey || item.image_key || toItemKey(item.word || item.text || ""),
    imageVersion: item.imageVersion || item.image_version || ""
  };
}

function getLessonType(){
  return q("lesson-type")?.value || "words";
}

function isReadingLessonType(){
  return getLessonType() === "reading";
}

function getLessonItemNoun(){
  return isReadingLessonType() ? "Page" : "Item";
}

function getLessonPrimaryFieldLabel(){
  return isReadingLessonType() ? "Sentence" : "Word";
}

function getLessonPrimaryFieldPlaceholder(){
  return isReadingLessonType()
    ? "The blue cat is sleeping under the tree."
    : "cat";
}

function getLessonItemsEmptyText(){
  return isReadingLessonType()
    ? "No story pages yet. Click + Add Item to begin building your story."
    : "No items yet. Click + Add Item to start building this lesson pack.";
}

function getLessonItemsHintText(){
  return isReadingLessonType()
    ? "Add sentences and images for your story pages."
    : "Add words and images for your pack.";
}

let currentLessonStep = 1;

function setLessonStep(step){
  currentLessonStep = Math.max(1, Math.min(3, Number(step) || 1));

  q("lesson-step-1")?.classList.toggle("hidden", currentLessonStep !== 1);
  q("lesson-step-2")?.classList.toggle("hidden", currentLessonStep !== 2);
  q("lesson-step-3")?.classList.toggle("hidden", currentLessonStep !== 3);

  document.querySelectorAll(".lesson-step").forEach(btn => {
    btn.classList.toggle("active", Number(btn.dataset.step) === currentLessonStep);
  });

  const backBtn = q("lesson-back-btn");
  const nextBtn = q("lesson-next-btn");
  const finishBtn = q("finish-lesson-btn");

  if(backBtn) backBtn.disabled = currentLessonStep === 1;
  if(nextBtn) nextBtn.style.display = currentLessonStep === 3 ? "none" : "inline-flex";
  if(finishBtn) finishBtn.style.display = currentLessonStep === 3 ? "inline-flex" : "none";

  if(currentLessonStep === 2){
    renderLessonReview();
  }
}

function renderLessonReview(){
  const box = q("lesson-review-box");
  if(!box) return;

  const cover = getCurrentCoverImage();
  const title = q("lesson-title")?.value?.trim() || "Untitled";
  const type = q("lesson-type")?.value || "words";
  const visibility = q("lesson-visibility")?.value || "private";
  const notes = q("lesson-notes")?.value?.trim() || "No notes";
  const itemCount = currentItems.length;

  box.innerHTML = `
    <div class="lesson-review-row"><strong>Title:</strong> ${title}</div>
    <div class="lesson-review-row"><strong>Type:</strong> ${type}</div>
    <div class="lesson-review-row"><strong>Visibility:</strong> ${visibility}</div>
    <div class="lesson-review-row"><strong>Items:</strong> ${itemCount}</div>
    <div class="lesson-review-row"><strong>Cover:</strong> ${cover ? "Uploaded" : "No cover yet"}</div>
    <div class="lesson-review-row"><strong>Notes:</strong> ${notes}</div>
  `;
}

async function handleLessonNext(){
  if(currentLessonStep === 1){
    if(!currentLessonId){
      await doCreateLesson();
      if(!currentLessonId) return;
    }
    setLessonStep(2);
    return;
  }

  if(currentLessonStep === 2){
    await doSaveLessonInfo();
    setLessonStep(3);
  }
}

function handleLessonBack(){
  setLessonStep(currentLessonStep - 1);
}

async function handleLessonFinish(){
  await doSaveItems();
  closeModal("editor-modal");
}

function refreshLessonTypeUI(){
  const noun = getLessonItemNoun();
  const label = getLessonPrimaryFieldLabel();
  const help = getLessonItemsHintText();

  const helpLine = q("items-help-line");
  if(helpLine) helpLine.textContent = help;

  const addBtn = q("add-item-btn");
  if(addBtn) addBtn.textContent = isReadingLessonType() ? "+ Add Page" : "+ Add Item";

  const headline = q("editor-headline");
  if(headline && !currentLessonId){
    const title = q("lesson-title")?.value?.trim();
    if(title){
      headline.textContent = `New ${getLessonType() === "reading" ? "Story Lesson" : "Lesson"}: ${title}`;
    }
  }
}

function moveItemUp(index){
  if(index <= 0 || index >= currentItems.length) return;
  [currentItems[index - 1], currentItems[index]] = [currentItems[index], currentItems[index - 1]];
  renderItemsEditor();
}

function moveItemDown(index){
  if(index < 0 || index >= currentItems.length - 1) return;
  [currentItems[index], currentItems[index + 1]] = [currentItems[index + 1], currentItems[index]];
  renderItemsEditor();
}

function duplicateItem(index){
  if(index < 0 || index >= currentItems.length) return;

  const source = currentItems[index];
  const copy = cloneSingleItem(source);

  if(copy.word){
    copy.word = `${copy.word} Copy`;
  }

  copy.imageKey = uid("item");

  copy.imageVersion = "";

  currentItems.splice(index + 1, 0, copy);
  renderItemsEditor();
}

function getCurrentLessonFromState(){
  return {
    id: currentLessonId || null,
    title: q("lesson-title")?.value?.trim() || "Untitled",
    type: q("lesson-type")?.value || "words",
    visibility: q("lesson-visibility")?.value || "private",
    notes: q("lesson-notes")?.value?.trim() || "",
    data_json: {
      items: cloneItems(currentItems),
      coverImage: getCurrentCoverImage()
    },
    localOnly: !currentLessonId
  };
}

function getLessonCoverImage(lesson = {}){
  return (
    lesson?.data_json?.coverImage ||
    lesson?.dataJson?.coverImage ||
    lesson.coverImage ||
    lesson.cover_image ||
    ""
  );
}

function resolveLessonCardCover(lesson = {}){
  const directCover = getLessonCoverImage(lesson);
  if(directCover) return directCover;

  const items = cloneItems(lesson?.data_json?.items || lesson?.dataJson?.items || lesson?.items || []);
  const firstImage = items?.[0]?.image;

  if(typeof firstImage === "string") return firstImage || "";
  if(firstImage && typeof firstImage === "object"){
    return firstImage.thumb || firstImage.medium || firstImage.original || "";
  }

  return "";
}

function setLessonCoverPreview(src = ""){
  const img = q("lesson-cover-preview");
  const empty = q("lesson-cover-empty");
  const hidden = q("lesson-cover-image");

  if(hidden) hidden.value = src || "";

  if(img){
    img.src = src || "";
    img.style.display = src ? "block" : "none";
  }

  if(empty){
    empty.style.display = src ? "none" : "flex";
  }
}

function getCurrentCoverImage(){
  return q("lesson-cover-image")?.value?.trim() || "";
}

function renderLessonPreviewSummary({
  title = "Untitled",
  type = "reading",
  priceText = "",
  status = "",
  language = "",
  category = "",
  linkedLessonTitle = "",
  itemCount = 0,
  description = ""
} = {}){
  const box = q("lesson-preview-summary");
  if(!box) return;

  const tags = [
    type ? `<span class="tag">${type}</span>` : "",
    priceText ? `<span class="tag">${priceText}</span>` : "",
    status ? `<span class="tag">${status}</span>` : "",
    language ? `<span class="tag">${language}</span>` : "",
    category ? `<span class="tag">${category}</span>` : "",
    itemCount ? `<span class="tag">🧩 ${itemCount} item(s)</span>` : ""
  ].filter(Boolean).join("");

  box.innerHTML = `
    <div class="preview-row">
      <div>
        <div style="font-size:1.1rem;font-weight:900;">${title}</div>
        ${linkedLessonTitle ? `<div class="muted" style="margin-top:6px;"><strong>Linked Lesson:</strong> ${linkedLessonTitle}</div>` : ``}
        <div style="margin-top:10px;">${tags}</div>
      </div>
    </div>
    <div class="preview-row">
      <div>${description || "No description yet."}</div>
    </div>
  `;
}

function setLessonPreviewCover(src = ""){
  const img = q("lesson-preview-cover");
  const empty = q("lesson-preview-cover-empty");

  if(img){
    img.src = src || "";
    img.style.display = src ? "block" : "none";
  }

  if(empty){
    empty.style.display = src ? "none" : "flex";
  }
}

function clearLessonTitleWarning(){
  setStatus("lessons-status", "", "muted");

  const box = q("lesson-modal-warning");
  if(box){
    box.textContent = "";
    box.style.display = "none";
  }
}

function fillLessonForm(lesson = {}){
  clearLessonTitleWarning();
  if(q("lesson-title")) q("lesson-title").value = lesson.title || "";
  if(q("lesson-type")) q("lesson-type").value = lesson.type || "words";
  if(q("lesson-visibility")) q("lesson-visibility").value = lesson.visibility || "private";
  if(q("lesson-notes")) q("lesson-notes").value = lesson.notes || "";

  setLessonCoverPreview(getLessonCoverImage(lesson) || "");

  if(q("editor-headline")){
    if(lesson.id){
      q("editor-headline").textContent = `Editing: ${lesson.title || "Lesson"}`;
    }else{
      q("editor-headline").textContent = isReadingLessonType() ? "New Story Lesson" : "New Lesson";
    }
  }

  refreshLessonTypeUI();
}

function lessonSourceLabel(lesson){ return lesson.localOnly ? "Local draft" : "Cloud"; }

function syncCurrentToCache(){
  const lesson = getCurrentLessonFromState();
  if(!lesson.id){
    lesson.id = uid("draft");
    lesson.localOnly = true;
  }
  const idx = lessonsCache.findIndex(l => String(l.id) === String(lesson.id));
  if(idx >= 0) lessonsCache[idx] = { ...lessonsCache[idx], ...lesson };
  else lessonsCache.unshift(lesson);
  saveLocalCache();
  renderLessonsFromExistingState();
  return lesson;
}

function renderLessonPreviewItems(items = []){
  const list = q("lesson-preview-list");
  if(!list) return;

  if(!items.length){
    list.innerHTML = `<div class="empty">This lesson has no items yet.</div>`;
    return;
  }

  list.innerHTML = items.map((item,idx)=>`
    <div class="preview-row">
      ${
        item.image?.thumb
          ? `<img class="preview-thumb" src="${item.image.thumb}?v=${item.imageVersion || ""}" alt="" />`
          : item.image
            ? `<img class="preview-thumb" src="${item.image}" alt="" />`
            : ``
      }
      <div>
        <div><strong>${idx+1}.</strong> ${item.word || item.text || "Untitled item"}</div>
        <div class="muted" style="margin-top:4px;">${item.image ? "Has image" : "No image"}</div>
      </div>
    </div>
  `).join("");
}

function openLessonPreview(lesson){
  if(!lesson) return;

  setText("lesson-preview-title", lesson.title || "Lesson Preview");

  const items = cloneItems(lesson?.data_json?.items || lesson?.dataJson?.items || lesson?.items || []);
  const cover = resolveLessonCardCover(lesson);

  setLessonPreviewCover(cover || "");
  renderLessonPreviewSummary({
    title: lesson.title || "Lesson Preview",
    type: lesson.type || "words",
    language: lesson.language || "",
    category: lesson.category || "",
    itemCount: items.length,
    description: lesson.notes || ""
  });
  renderLessonPreviewItems(items);
  openModal("lesson-preview-modal");
}

function getFilteredLessons(lessons = []){
  const query = String(currentLessonsSearch || "").trim().toLowerCase();
  if(!query) return lessons;

  return lessons.filter(lesson => {
    const title = String(lesson.title || "").toLowerCase();
    const type = String(lesson.type || "").toLowerCase();
    const visibility = String(lesson.visibility || "").toLowerCase();
    const notes = String(lesson.notes || "").toLowerCase();

    return (
      title.includes(query) ||
      type.includes(query) ||
      visibility.includes(query) ||
      notes.includes(query)
    );
  });
}

function money(cents = 0){
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function renderCreatorDashboard(dashboard = null){
  const cardsWrap = q("creator-dashboard-cards");
  const tableWrap = q("creator-top-packs");
  if(!cardsWrap || !tableWrap) return;

  if(!dashboard){
    cardsWrap.innerHTML = `<div class="empty">No dashboard data yet.</div>`;
    tableWrap.innerHTML = `<div class="empty">No performance data yet.</div>`;
    return;
  }

  const totals = dashboard.totals || {};
  const topPacks = Array.isArray(dashboard.topPacks) ? dashboard.topPacks : [];

  cardsWrap.innerHTML = `
    <div class="dashboard-stat">
      <div class="dashboard-stat-label">Published Packs</div>
      <div class="dashboard-stat-value">${Number(totals.published_packs || 0)}</div>
    </div>
    <div class="dashboard-stat">
      <div class="dashboard-stat-label">Total Sales</div>
      <div class="dashboard-stat-value">${Number(totals.total_sales || 0)}</div>
    </div>
    <div class="dashboard-stat">
      <div class="dashboard-stat-label">Free Downloads</div>
      <div class="dashboard-stat-value">${Number(totals.free_downloads || 0)}</div>
    </div>
    <div class="dashboard-stat">
      <div class="dashboard-stat-label">Gross Revenue</div>
      <div class="dashboard-stat-value">${money(totals.gross_revenue_cents || 0)}</div>
    </div>
    <div class="dashboard-stat">
      <div class="dashboard-stat-label">Estimated Earnings</div>
      <div class="dashboard-stat-value">${money(totals.estimated_earnings_cents || 0)}</div>
    </div>
  `;

  if(!topPacks.length){
    tableWrap.innerHTML = `<div class="empty">No pack performance data yet.</div>`;
    return;
  }

  tableWrap.innerHTML = `
    <table class="dashboard-table">
      <thead>
        <tr>
          <th>Pack</th>
          <th>Status</th>
          <th>Sales</th>
          <th>Free</th>
          <th>Gross</th>
          <th>Estimated Net</th>
        </tr>
      </thead>
      <tbody>
        ${topPacks.map(pack => `
          <tr>
            <td>
              <div style="font-weight:900;">${pack.title || "Untitled Pack"}</div>
              <div class="muted">${pack.type || "pack"}</div>
            </td>
            <td>${statusTag(pack.status)}</td>
            <td>${Number(pack.total_sales || 0)}</td>
            <td>${Number(pack.free_downloads || 0)}</td>
            <td>${money(pack.gross_revenue_cents || 0)}</td>
            <td>${money(pack.estimated_earnings_cents || 0)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function loadCreatorDashboard(){
  if(!getToken()){
    renderCreatorDashboard(null);
    setStatus("creator-dashboard-status","Login to load creator dashboard.","error");
    return null;
  }

  try{
    const data = await api("/api/creator/dashboard");
    renderCreatorDashboard(data.dashboard || null);
    setStatus("creator-dashboard-status","Creator dashboard loaded.","success");
    return data.dashboard || null;
  }catch(err){
    renderCreatorDashboard(null);
    setStatus("creator-dashboard-status", err.message || "Load creator dashboard failed","error");
    return null;
  }
}

function getSearchFilteredMarketplacePacks(packs = []){
  const query = String(currentMarketplaceSearch || "").trim().toLowerCase();
  if(!query) return packs;

  return packs.filter(pack => {
    const linkedLessonId = pack.lesson_id || pack.lessonId || "";
    const linkedLesson = lessonsCache.find(l => String(l.id) === String(linkedLessonId)) || null;
    const linkedLessonTitle = String(linkedLesson?.title || "").toLowerCase();

    const title = String(pack.title || "").toLowerCase();
    const shortDescription = String(pack.short_description || "").toLowerCase();
    const longDescription = String(pack.long_description || "").toLowerCase();
    const category = String(pack.category || "").toLowerCase();
    const language = String(pack.language || "").toLowerCase();
    const status = String(pack.status || "").toLowerCase();
    const type = String(pack.type || "").toLowerCase();

    return (
      title.includes(query) ||
      shortDescription.includes(query) ||
      longDescription.includes(query) ||
      category.includes(query) ||
      language.includes(query) ||
      status.includes(query) ||
      type.includes(query) ||
      linkedLessonTitle.includes(query)
    );
  });
}

function getFilteredMarketplacePacks(packs = []){
  if(currentMarketplaceFilter === "all"){
    return packs;
  }

  if(currentMarketplaceFilter === "ready"){
    return packs.filter(pack => {
      try{
        return getMarketplacePackReadiness(pack).ready;
      }catch{
        return false;
      }
    });
  }

  if(currentMarketplaceFilter === "draft"){
    return packs.filter(pack => String(pack.status || "").toLowerCase() === "draft");
  }

  if(currentMarketplaceFilter === "review"){
    return packs.filter(pack => String(pack.status || "").toLowerCase() === "review");
  }

  return packs;
}

function sortLessons(lessons = []){
  const arr = [...lessons];

  if(currentLessonsSort === "az"){
    arr.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    return arr;
  }

  if(currentLessonsSort === "oldest"){
    arr.sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
    return arr;
  }

  // default newest
  arr.sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
  return arr;
}

function sortMarketplacePacks(packs = []){
  const arr = [...packs];

  if(currentMarketplaceSort === "ready"){
    arr.sort((a, b) => {
      const aReady = getMarketplacePackReadiness(a).ready ? 1 : 0;
      const bReady = getMarketplacePackReadiness(b).ready ? 1 : 0;
      if(bReady !== aReady) return bReady - aReady;
      return String(b.updated_at || "").localeCompare(String(a.updated_at || ""));
    });
    return arr;
  }

  if(currentMarketplaceSort === "review"){
    arr.sort((a, b) => {
      const aReview = String(a.status || "").toLowerCase() === "review" ? 1 : 0;
      const bReview = String(b.status || "").toLowerCase() === "review" ? 1 : 0;
      if(bReview !== aReview) return bReview - aReview;
      return String(b.updated_at || "").localeCompare(String(a.updated_at || ""));
    });
    return arr;
  }

  if(currentMarketplaceSort === "az"){
    arr.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    return arr;
  }

  if(currentMarketplaceSort === "oldest"){
    arr.sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
    return arr;
  }

  // default newest
  arr.sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
  return arr;
}

function getMarketplacePackForLesson(lessonId = ""){
  if(!lessonId) return null;
  return marketplacePacksCache.find(
    pack => String(pack.lesson_id || pack.lessonId || "") === String(lessonId)
  ) || null;
}

function renderLessonsFromExistingState(){
  const wrap = q("lessons-list");
  if(!wrap) return;

  wrap.classList.add("lesson-card-grid");

  const allLessons = Array.isArray(lessonsCache) ? lessonsCache : [];
  const filteredLessons = sortLessons(getFilteredLessons(allLessons));
  updateLessonsResultsText(filteredLessons.length, allLessons.length);

if(!allLessons.length){
  wrap.innerHTML = `
    <div class="empty-upgrade">
      <strong>No lesson packs loaded yet.</strong>
      Start a new lesson, import a pack, or login to load your cloud lessons.
    </div>
  `;
  updateLessonsResultsText(0, 0);
  setStatus("lessons-status","Use New Lesson or Import to start building lesson packs.","muted");
  updateWorkspaceCounts();
  return;
}

if(!filteredLessons.length){
  wrap.innerHTML = `<div class="empty-upgrade">No lessons match your search.</div>`;
  updateLessonsResultsText(0, allLessons.length);
  setStatus("lessons-status", `${allLessons.length} lesson pack(s) loaded.`, "success");
  updateWorkspaceCounts();
  return;
}

  wrap.innerHTML = filteredLessons.map((lesson)=>{
    const items = cloneItems(lesson?.data_json?.items || lesson?.dataJson?.items || lesson?.items || []);
    const cover = resolveLessonCardCover(lesson);
    const sourceClass = lesson.localOnly ? "local-draft" : "cloud-pack";
    const sourceLabel = lesson.localOnly ? "Local Draft" : "Cloud";

    const linkedPack = getMarketplacePackForLesson(lesson.id || "");
    const publishLabel = linkedPack ? "🛍️ Edit Listing" : "🛍️ Publish";

    return `
      <div class="lesson-pack-card">
        <div class="lesson-pack-top">
          <div>
            ${
              cover
                ? `<img class="lesson-pack-cover" src="${cover}" alt="${lesson.title || "Lesson"} cover" />`
                : `<div class="lesson-pack-cover-fallback">📚</div>`
            }
          </div>

          <div class="lesson-pack-main">
            <div class="lesson-pack-title">${lesson.title || "Untitled Lesson"}</div>
            <div class="muted" style="margin-top:6px;">
              ID: ${String(lesson.id || "").slice(0, 8)}
            </div>
            <div class="lesson-pack-sub">
              ${items.length} item(s) ready for ${lesson.type || "words"} mode.
            </div>

            <div class="lesson-pack-meta">
              <span class="tag ${sourceClass}">${sourceLabel}</span>
              <span class="tag">${lesson.type || "words"}</span>
              <span class="tag">${lesson.visibility || "private"}</span>
              ${getLessonCoverImage(lesson) ? `<span class="tag">🖼️ Custom Cover</span>` : ``}
              ${linkedPack ? `<span class="tag">🛍️ Listing Ready</span>` : ``}
            </div>

            <div class="lesson-pack-actions">
              <button class="btn btn-primary lesson-edit-btn" data-id="${lesson.id || ""}">✏️ Edit</button>
              <button class="btn btn-soft lesson-preview-btn" data-id="${lesson.id || ""}">👁️ Preview</button>
              <button class="btn btn-soft lesson-export-btn" data-id="${lesson.id || ""}">⬇️ Export</button>
              <button class="btn btn-green lesson-publish-btn" data-id="${lesson.id || ""}">${publishLabel}</button>
              <button class="btn btn-danger lesson-delete-btn" data-id="${lesson.id || ""}">🗑️ Delete</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");


  setStatus("lessons-status", `${allLessons.length} lesson pack(s) loaded.`, "success");
  updateWorkspaceCounts();
}

async function deleteLessonById(lessonId){
  const lesson = lessonsCache.find(l => String(l.id) === String(lessonId));
  if(!lessonId) return;
  if(!window.confirm(`Delete "${lesson?.title || 'this lesson'}"? This cannot be undone.`)) return;

  const isCloudLesson = !String(lessonId).startsWith("draft-");

  try{
    if(isCloudLesson){
      await api(`/api/lessons/${lessonId}`, { method:"DELETE" });
    }

    lessonsCache = lessonsCache.filter(l => String(l.id) !== String(lessonId));
    saveLocalCache();

    if(String(currentLessonId) === String(lessonId)){
      currentLessonId = null;
      currentItems = [];
      currentDraft = null;
      fillLessonForm({ title:"", type:"words", visibility:"private", notes:"" });
      renderItemsEditor();
      closeModal("editor-modal");
    }

    renderLessonsFromExistingState();
    setStatus("lessons-status", `Deleted: ${lesson?.title || 'Lesson'}`, "success");
  }catch(err){
    setStatus("lessons-status", err.message || "Delete failed.", "error");
  }
}

function renderEditorPreview(){
  const wrap = q("lesson-preview-list");
  if(!wrap || !q("editor-modal")?.classList.contains("open")) return;
}

function renderItemsEditor(){
  const wrap = q("items-wrap");
  if(!wrap) return;

  const itemNoun = getLessonItemNoun();
  const fieldLabel = getLessonPrimaryFieldLabel();
  const fieldPlaceholder = getLessonPrimaryFieldPlaceholder();

  if(!currentItems.length){
    wrap.innerHTML = `
      <div class="empty-upgrade">
        <strong>No ${isReadingLessonType() ? "story pages" : "items"} yet.</strong>
        ${getLessonItemsEmptyText()}
      </div>
    `;
    refreshLessonTypeUI();
    return;
  }

  wrap.innerHTML = "";

  currentItems.forEach((item, index) => {
    const imageSrc = item.image?.thumb || item.image?.medium || item.image?.original || "";
    const version = item.imageVersion || "";

    const div = document.createElement("div");
    div.className = "editor-item-card";
    const wordInputId = `item-word-${index}`;
    const imageInputId = `item-image-${index}`;
    div.innerHTML = `
      <div class="editor-item-head">
        <div class="editor-item-index">
          <div class="editor-item-badge">${index + 1}</div>
          <div class="editor-item-title">${itemNoun} ${index + 1}</div>
        </div>

        <button class="btn btn-danger remove-btn" data-index="${index}" type="button">
          Remove ${itemNoun}
        </button>
      </div>

      <div class="editor-item-grid">
        <div class="editor-item-media">
          ${
            imageSrc
              ? `<img class="editor-item-thumb" src="${imageSrc}?v=${version}" alt="${item.word || ""}" />`
              : `<div class="editor-item-thumb-fallback">${isReadingLessonType() ? "No page image yet" : "No image yet"}</div>`
          }
        </div>

        <div class="editor-item-fields">
          <div class="field">
            <label for="${wordInputId}">${fieldLabel}</label>
            <input
              id="${wordInputId}"
              name="${wordInputId}"
              type="text"
              class="item-word"
              data-index="${index}"
              value="${(item.word || "").replace(/"/g,'&quot;')}"
              placeholder="${fieldPlaceholder}"
            />
          </div>

          <div class="field">
            <label for="${imageInputId}">${isReadingLessonType() ? "Page Image" : "Image File"}</label>
            <input
              id="${imageInputId}"
              name="${imageInputId}"
              type="file"
              class="item-image"
              data-index="${index}"
              accept="image/png,image/jpeg,image/webp"
            />
          </div>

          <div class="editor-item-actions">
            <button class="btn btn-soft move-up-btn" data-index="${index}" type="button" ${index === 0 ? "disabled" : ""}>⬆️ Move Up</button>
            <button class="btn btn-soft move-down-btn" data-index="${index}" type="button" ${index === currentItems.length - 1 ? "disabled" : ""}>⬇️ Move Down</button>
            <button class="btn btn-soft duplicate-btn" data-index="${index}" type="button">🪄 Duplicate</button>
            <button class="btn btn-soft delete-image-btn" data-index="${index}" type="button">🧹 Delete Image</button>
          </div>
        </div>
      </div>
    `;
    wrap.appendChild(div);
  });

  refreshLessonTypeUI();
}



function startNewDraft(){
  currentLessonId = null;
  currentItems = [];
  currentDraft = {
    title:"",
    type:"words",
    visibility:"private",
    notes:"",
    data_json:{ items:[] },
    localOnly:true
  };
  clearLessonTitleWarning();
  fillLessonForm(currentDraft);
  renderItemsEditor();
  refreshLessonTypeUI();
  setLessonStep(1);
  setStatus("lessons-status", "New draft started. Add a title, choose lesson type, then begin adding items.", "success");
  openModal("editor-modal");
}

function openLessonForEdit(lessonId){
  const lesson = lessonsCache.find(l => String(l.id) === String(lessonId));
  if(!lesson) return;

  currentLessonId = String(lesson.id || "").startsWith("draft-") ? null : (lesson.id || null);
  currentItems = cloneItems(lesson?.data_json?.items || lesson?.dataJson?.items || lesson?.items || []);
  currentDraft = lesson;

  fillLessonForm(lesson);
  renderItemsEditor();
  setLessonStep(3);
  setStatus("lessons-status", `Editing: ${lesson.title || "Untitled"}`, "success");
  openModal("editor-modal");
}

function makePack(lessons){
  return { app:"study-buddy", version:1, exportedAt:new Date().toISOString(), lessons };
}
function downloadJson(filename, data){
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
async function importPack(file){
  try{
    const text = await file.text();
    const parsed = JSON.parse(text);
    const arr = Array.isArray(parsed.lessons) ? parsed.lessons : parsed.lesson ? [parsed.lesson] : Array.isArray(parsed) ? parsed : [parsed];
    if(!arr.length) throw new Error("No lessons found in file.");
    const lesson = arr[0];
    currentLessonId = null;
    currentItems = cloneItems(lesson?.data_json?.items || lesson?.dataJson?.items || lesson?.items || []);
    currentDraft = {
      id:null,
      title: lesson.title || "Imported Lesson",
      type: lesson.type || "words",
      visibility: lesson.visibility || "private",
      notes: lesson.notes || "",
      data_json: { items: cloneItems(currentItems) },
      localOnly: true
    };
    fillLessonForm(currentDraft);
    renderItemsEditor();
    setLessonStep(1);
    openModal("editor-modal");
    setStatus("lessons-status", `Imported \"${currentDraft.title}\". Save it to cloud when ready.`, "success");
  }catch(err){
    setStatus("lessons-status", err.message || "Import failed.", "error");
  }
}

async function loadExistingLessons(forceRefresh = true){
  if(!getToken()){
    lessonsCache = loadLocalCache();
    renderLessonsFromExistingState();
    populateMarketplaceLessonOptions(q("market-pack-lesson-id")?.value || "");
    renderMarketplaceLinkedLessonSummary(q("market-pack-lesson-id")?.value || "");
    if(!lessonsCache.length){
      setStatus("lessons-status", "Please login to load cloud lessons.", "muted");
    }
    return;
  }
  if(!forceRefresh){
    lessonsCache = loadLocalCache();
    renderLessonsFromExistingState();
    populateMarketplaceLessonOptions(q("market-pack-lesson-id")?.value || "");
    renderMarketplaceLinkedLessonSummary(q("market-pack-lesson-id")?.value || "");
  }
  try{
    const res = await api("/api/lessons");
    lessonsCache = Array.isArray(res.lessons) ? res.lessons : [];
    saveLocalCache();
    renderLessonsFromExistingState();
    populateMarketplaceLessonOptions(q("market-pack-lesson-id")?.value || "");
    renderMarketplaceLinkedLessonSummary(q("market-pack-lesson-id")?.value || "");
  }catch(err){
    lessonsCache = loadLocalCache();
    renderLessonsFromExistingState();
    populateMarketplaceLessonOptions(q("market-pack-lesson-id")?.value || "");
    renderMarketplaceLinkedLessonSummary(q("market-pack-lesson-id")?.value || "");
    setStatus("lessons-status", err.message || "Could not load lessons. Showing cache.", "error");
  }
}

function slugify(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function makeUniquePackSlug(title, existingPacks = [], currentPackId = "") {
  const base = slugify(title) || "pack";
  let slug = base;
  let n = 2;

  const used = new Set(
    (existingPacks || [])
      .filter(pack => String(pack.id || "") !== String(currentPackId || ""))
      .map(pack => String(pack.slug || "").trim().toLowerCase())
      .filter(Boolean)
  );

  while (used.has(slug)) {
    slug = `${base}-${n}`;
    n++;
  }

  return slug;
}

function normalizeTitle(value = ""){
  return String(value).trim().toLowerCase();
}

function findDuplicateLessonTitle(title, excludeLessonId = null){
  const normalized = normalizeTitle(title);
  if(!normalized) return null;

  return (lessonsCache || []).find(lesson => {
    const lessonTitle = normalizeTitle(lesson?.title || "");
    const lessonId = String(lesson?.id || "");
    const excludedId = String(excludeLessonId || "");
    return lessonTitle === normalized && lessonId !== excludedId;
  }) || null;
}

function showLessonTitleWarning(message){
  setStatus("lessons-status", message, "error");
  const input = q("lesson-title");
  if(input){
    input.focus();
    input.select?.();
  }
}

async function doCreateLesson(){
  if(!getToken()){
    setStatus("lessons-status", "Please login first.", "error");
    return;
  }

  const title = q("lesson-title")?.value?.trim() || "";
  const type = q("lesson-type")?.value || "words";
  const visibility = q("lesson-visibility")?.value || "private";

  if(!title){
    showLessonModalWarning("Lesson title is required.");
    return;
  }

  const dup = findDuplicateLessonTitle(title, currentLessonId);
  if(dup){
    showLessonModalWarning(
      `A lesson named "${title}" already exists. Please rename this lesson before creating it.`
    );
    return;
  }

  try{
    const payload = {
      title,
      type,
      visibility,
      notes: q("lesson-notes")?.value?.trim() || "",
      dataJson: {
        items: cloneItems(currentItems),
        coverImage: getCurrentCoverImage()
      }
    };

    const res = await api("/api/lessons", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    currentLessonId = res.lesson?.id || null;

    if(res.lesson){
      const idx = lessonsCache.findIndex(l => String(l.id) === String(res.lesson.id));
      if(idx >= 0) lessonsCache[idx] = res.lesson;
      else lessonsCache.unshift(res.lesson);
    }

    saveLocalCache();
    renderLessonsFromExistingState();
    renderItemsEditor();
    setStatus("lessons-status", `Lesson created: ${title}`, "success");
    await loadExistingLessons(true);
  }catch(err){
    setStatus("lessons-status", err.message || "Create lesson failed.", "error");
  }
}

function showLessonModalWarning(message){
  const box = q("lesson-modal-warning");
  if(box){
    box.textContent = message;
    box.style.display = "block";
  }
  showLessonTitleWarning(message);
}

function clearLessonModalWarning(){
  const box = q("lesson-modal-warning");
  if(box){
    box.textContent = "";
    box.style.display = "none";
  }
}

async function doSaveLessonInfo(){
  const title = q("lesson-title")?.value?.trim() || "";
  const type = q("lesson-type")?.value || "words";
  const visibility = q("lesson-visibility")?.value || "private";
  const notes = q("lesson-notes")?.value?.trim() || "";

  if(!title){
    showLessonModalWarning("Lesson title is required.");
    return;
  }

  const dup = findDuplicateLessonTitle(title, currentLessonId);
  if(dup){
    showLessonModalWarning(
      `A lesson named "${title}" already exists. Please rename this lesson before saving.`
    );
    return;
  }

  if(!currentLessonId){
    syncCurrentToCache();
    setStatus("lessons-status", "Saved as local draft. Create the cloud lesson first.", "success");
    return;
  }

  try{
    const payload = {
      title,
      type,
      visibility,
      notes,
      dataJson: {
        items: cloneItems(currentItems),
        coverImage: getCurrentCoverImage()
      }
    };

    const res = await api(`/api/lessons/${currentLessonId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });

    if(res.lesson){
      const idx = lessonsCache.findIndex(l => String(l.id) === String(res.lesson.id));
      if(idx >= 0) lessonsCache[idx] = res.lesson;
      else lessonsCache.unshift(res.lesson);
    }else{
      syncCurrentToCache();
    }

    saveLocalCache();
    renderLessonsFromExistingState();
    setStatus("lessons-status", "Lesson info saved.", "success");
    await loadExistingLessons(true);
  }catch(err){
    setStatus("lessons-status", err.message || "Save lesson failed.", "error");
  }
}

async function doSaveItems(){
  if(!currentLessonId){
    syncCurrentToCache();
    setStatus("lessons-status", "Saved as local draft. Create cloud lesson when ready.", "success");
    return;
  }

  try{
    await api(`/api/lessons/${currentLessonId}`, {
      method:"PATCH",
      body:JSON.stringify({
        title: q("lesson-title")?.value?.trim() || "Untitled",
        type: q("lesson-type")?.value || "words",
        visibility: q("lesson-visibility")?.value || "private",
        dataJson: {
          items: cloneItems(currentItems),
          coverImage: getCurrentCoverImage()
        }
      })
    });

    syncCurrentToCache();
    setStatus("lessons-status", "Items saved to lesson.", "success");
    await loadExistingLessons(true);
  }catch(err){
    setStatus("lessons-status", err.message || "Save failed.", "error");
  }
}

async function doDeleteLesson(){
  if(!currentLessonId){
    setStatus("lessons-status", "Select a lesson first.", "error");
    return;
  }
  if(!window.confirm("Delete this lesson? This cannot be undone.")) return;
  try{
    await api(`/api/lessons/${currentLessonId}`, { method:"DELETE" });
    lessonsCache = lessonsCache.filter(l => String(l.id) !== String(currentLessonId));
    saveLocalCache();
    currentLessonId = null;
    currentItems = [];
    currentDraft = null;
    fillLessonForm({ title:"", type:"words", visibility:"private", notes:"" });
    renderItemsEditor();
    renderLessonsFromExistingState();
    setStatus("lessons-status", "Lesson deleted.", "success");
    closeModal("editor-modal");
  }catch(err){
    setStatus("lessons-status", err.message || "Delete failed.", "error");
  }
}

async function doUploadCoverImage() {
  const input = q("lesson-cover-file");
  const originalFile = input?.files?.[0];
  if (!originalFile) {
    setStatus("lessons-status", "Choose a cover image first.", "error");
    return;
  }

  try {
    setStatus("lessons-status", "Compressing cover image...", "muted");

    let file = originalFile;
    try{
      file = await compressImageFile(originalFile, {
        maxWidth: 1600,
        maxHeight: 900,
        quality: 0.82,
        mimeType: "image/jpeg"
      });
    }catch(err){
      console.warn("Cover compression failed, using original file.", err);
    }

    if (!currentLessonId) {
      const reader = new FileReader();
      const localDataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setLessonCoverPreview(localDataUrl);
      syncCurrentToCache();
      renderLessonsFromExistingState();

      if (input) input.value = "";
      setStatus("lessons-status", "Cover image preview added to local draft.", "success");
      return;
    }

    setStatus("lessons-status", "Uploading cover image...", "muted");

    const form = new FormData();
    form.append("lessonId", currentLessonId);
    form.append("kind", "cover");
    form.append("itemKey", "cover");
    form.append("image", file);

    const token = getToken();
    const res = await fetch("/api/uploads/lesson-image", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form
    });

    const contentType = res.headers.get("content-type");
    let data = {};
    if (contentType && contentType.includes("application/json")) {
      data = await res.json();
    }

    if (!res.ok) throw new Error(data.error || `Server Error: ${res.status}`);

    const coverUrl =
      data.image?.mediumUrl ||
      data.image?.originalUrl ||
      data.image?.thumbUrl ||
      "";

    setLessonCoverPreview(coverUrl);
    syncCurrentToCache();
    renderLessonsFromExistingState();

    if (input) input.value = "";
    setStatus("lessons-status", "Cover image uploaded. Click Save Lesson Info to keep it.", "success");
  } catch (err) {
    console.error("Upload Catch:", err);
    setStatus("lessons-status", err.message || "Upload failed.", "error");
  }
}

// 2. Improved Modal Focus Management
function openModal(id) {
  const el = q(id);
  if (!el) return;
  el.classList.add("open");
  el.setAttribute("aria-hidden", "false");
  // Focus the first input or the close button to satisfy accessibility
  const firstInput = el.querySelector('input, button:not(:disabled)');
  if (firstInput) firstInput.focus();
}

function closeModal(id) {
  const el = q(id);
  if (!el) return;

  const active = document.activeElement;
  if (active && el.contains(active) && typeof active.blur === "function") {
    active.blur();
  }

  if(id === "editor-modal"){
    clearLessonModalWarning();
    clearLessonTitleWarning();
  }

  el.classList.remove("open");
  el.setAttribute("aria-hidden", "true");
}

async function doDeleteCoverImage(){
  if(!currentLessonId){
    setLessonCoverPreview("");
    syncCurrentToCache();
    renderLessonsFromExistingState();
    setStatus("lessons-status", "Local draft cover cleared.", "success");
    return;
  }

  const currentCover = getCurrentCoverImage();
  if(!currentCover){
    setStatus("lessons-status", "This lesson has no cover image.", "error");
    return;
  }

  if(!window.confirm("Delete this cover image?")) return;

  try{
    const token = getToken();
    const res = await fetch(
      `/api/uploads/lesson-image?lessonId=${encodeURIComponent(currentLessonId)}&itemKey=${encodeURIComponent("cover")}`,
      {
        method: "DELETE",
        headers: token ? { Authorization:`Bearer ${token}` } : {}
      }
    );

    const data = await res.json().catch(()=>({}));
    if(!res.ok || data.ok === false){
      throw new Error(data.error || `Delete failed: ${res.status}`);
    }

    setLessonCoverPreview("");
    if(q("lesson-cover-file")) q("lesson-cover-file").value = "";

    syncCurrentToCache();
    renderLessonsFromExistingState();

    setStatus("lessons-status", "Cover image removed.", "success");
  }catch(err){
    setStatus("lessons-status", err.message || "Delete cover failed.", "error");
  }
}

async function doUploadImage(index){
  if(!currentLessonId){
    setStatus("lessons-status", "Create the cloud lesson first before uploading server images.", "error");
    return;
  }

  const item = currentItems[index];

  if(!item.word.trim()){
    setStatus("lessons-status", "Enter a word before uploading image.", "error");
    return;
  }

  const input = document.querySelector(`.item-image[data-index="${index}"]`);
  const originalFile = input?.files?.[0];
  if(!originalFile){
    setStatus("lessons-status", "Choose an image first.", "error");
    return;
  }

  try{
    setStatus("lessons-status", `Compressing image for "${item.word}"...`, "muted");

    let file = originalFile;
    try{
      file = await compressImageFile(originalFile, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.82,
        mimeType: "image/jpeg"
      });
    }catch(err){
      console.warn("Item compression failed, using original file.", err);
    }

    setStatus("lessons-status", `Uploading image for "${item.word}"...`, "muted");

    const form = new FormData();
    form.append("lessonId", currentLessonId);
    form.append("kind", "item");
    form.append("itemKey", item.imageKey);
    form.append("image", file);

    const token = getToken();
    const res = await fetch("/api/uploads/lesson-image", {
      method:"POST",
      headers: token ? { Authorization:`Bearer ${token}` } : {},
      body: form
    });

    const data = await res.json().catch(()=>({}));
    if(!res.ok || data.ok === false) {
      throw new Error(data.error || `Upload failed: ${res.status}`);
    }

    currentItems[index].image = {
      original: data.image.originalUrl,
      medium: data.image.mediumUrl,
      thumb: data.image.thumbUrl
    };
    currentItems[index].imageKey = data.image.item_key || item.imageKey;
    currentItems[index].imageVersion = Date.now();

    renderItemsEditor();

    if(input) input.value = "";

    setStatus("lessons-status", `Image uploaded for "${item.word}"`, "success");
  }catch(err){
    console.error("Item Upload Catch:", err);
    setStatus("lessons-status", err.message || "Image upload failed.", "error");
  }
}

async function compressImageFile(file, {
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82,
  mimeType = "image/jpeg"
} = {}){
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  let { width, height } = img;

  const scale = Math.min(
    1,
    maxWidth / width,
    maxHeight / height
  );

  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if(!ctx) throw new Error("Canvas is not available.");

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });

  if(!blob) throw new Error("Could not compress image.");

  const ext = mimeType === "image/webp" ? "webp" : "jpg";
  return new File([blob], `upload.${ext}`, { type: mimeType });
}

async function doDeleteItemImage(index){
  if(!currentLessonId){
    setStatus("lessons-status", "Select a cloud lesson first.", "error");
    return;
  }
  const item = currentItems[index];
  const itemKey = item.imageKey || toItemKey(item.word);
  if(!itemKey || !item.image){
    setStatus("lessons-status", "This item has no uploaded image.", "error");
    return;
  }
  if(!window.confirm(`Delete image for \"${item.word}\"?`)) return;
  try{
    const token = getToken();
    const res = await fetch(`/api/uploads/lesson-image?lessonId=${encodeURIComponent(currentLessonId)}&itemKey=${encodeURIComponent(itemKey)}`, {
      method:"DELETE",
      headers: token ? { Authorization:`Bearer ${token}` } : {}
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok || data.ok === false) throw new Error(data.error || `Delete failed: ${res.status}`);
    currentItems[index].image = null;
    currentItems[index].imageKey = itemKey;
    currentItems[index].imageVersion = "";
    renderItemsEditor();
    setStatus("lessons-status", `Image removed for \"${item.word}\"`, "success");
  }catch(err){
    setStatus("lessons-status", err.message || "Delete image failed.", "error");
  }
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

function getLinkedLessonForPack(pack = {}){
  const linkedLessonId = pack.lesson_id || pack.lessonId || "";
  if(!linkedLessonId) return null;
  return lessonsCache.find(l => String(l.id) === String(linkedLessonId)) || null;
}

function renderMarketplaceLinkedLessonSummary(lessonId = ""){
  const box = q("market-pack-linked-lesson-box");
  const content = q("market-pack-linked-lesson-content");
  if(!box || !content) return;

  if(!lessonId){
    box.style.display = "none";
    content.innerHTML = "";
    return;
  }

  const lesson = lessonsCache.find(l => String(l.id) === String(lessonId));
  if(!lesson){
    box.style.display = "none";
    content.innerHTML = "";
    return;
  }

  const cover = resolveLessonCardCover(lesson);
  const items = cloneItems(lesson?.data_json?.items || lesson?.dataJson?.items || lesson?.items || []);
  const count = items.length;
  const lessonType = lesson.type || "reading";
  const minItems =
    lessonType === "reading" ? 3 :
    lessonType === "words" ? 1 :
    1;

  content.innerHTML = `
    <div class="preview-row">
      ${
        cover
          ? `<img class="preview-thumb" src="${cover}" alt="${lesson.title || "Lesson"} cover" />`
          : `<div class="preview-thumb" style="display:flex;align-items:center;justify-content:center;">📚</div>`
      }
      <div>
        <div><strong>${lesson.title || "Untitled Lesson"}</strong></div>
        <div class="muted" style="margin-top:4px;">
          ${lesson.type || "words"} • ${count} item(s)
        </div>
        <div class="muted" style="margin-top:4px;">
          Visibility: ${lesson.visibility || "private"}
        </div>
        <div class="muted" style="margin-top:4px;">
          ${count >= minItems ? "✅ Ready for marketplace item count" : `⚠️ Needs at least ${minItems} item(s) for ${lessonType}`}
        </div>
      </div>
    </div>
  `;

  box.style.display = "block";
}

function populateMarketplaceLessonOptions(selectedLessonId = ""){
  const select = q("market-pack-lesson-id");
  if(!select) return;

  const lessonOptions = (lessonsCache || []).map(lesson => {
    const id = lesson.id || "";
    const title = lesson.title || "Untitled Lesson";
    const type = lesson.type || "words";
    const selected = String(id) === String(selectedLessonId) ? "selected" : "";
    return `<option value="${id}" ${selected}>${title} (${type})</option>`;
  }).join("");

  select.innerHTML = `
    <option value="">Select a lesson pack</option>
    ${lessonOptions}
  `;
}

function resolveMarketplacePackCover(pack = {}){
  const linkedLessonId = pack.lesson_id || pack.lessonId || "";
  if(!linkedLessonId) return "";

  const lesson = lessonsCache.find(l => String(l.id) === String(linkedLessonId));
  if(!lesson) return "";

  return resolveLessonCardCover(lesson);
}

function getMarketplacePackReadiness(pack = {}){
  const linkedLessonId = pack.lesson_id || pack.lessonId || "";
  const lesson = lessonsCache.find(l => String(l.id) === String(linkedLessonId)) || null;
  const items = lesson
    ? cloneItems(lesson?.data_json?.items || lesson?.dataJson?.items || lesson?.items || [])
    : [];

  const issues = [];

  if(!linkedLessonId){
    issues.push("No linked lesson");
  }

  if(linkedLessonId && !lesson){
    issues.push("Linked lesson not found");
  }

  const lessonType = lesson?.type || pack.type || "reading";
  const minItems =
    lessonType === "reading" ? 3 :
    lessonType === "words" ? 1 :
    1;

  if(lesson && items.length < minItems){
    issues.push(`Linked lesson needs at least ${minItems} item(s) for ${lessonType}`);
  }

  if(!String(pack.title || "").trim()){
    issues.push("Missing title");
  }

  if(!String(pack.short_description || "").trim()){
    issues.push("Missing short description");
  }

  if(String(pack.short_description || "").trim().length < 8){
    issues.push("Short description too short");
  }

  if(Number(pack.price_cents || 0) <= 0){
    issues.push("Missing price");
  }

  return {
    ready: issues.length === 0,
    issues,
    lesson,
    itemCount: items.length,
    lessonType,
    minItems
  };
}

function readPackForm(){
  return {
    title: q("market-pack-title")?.value?.trim() || "",
    slug: q("market-pack-slug")?.value?.trim() || "",
    lesson_id: q("market-pack-lesson-id")?.value || "",
    type: q("market-pack-type")?.value || "reading",
    short_description: q("market-pack-short")?.value?.trim() || "",
    long_description: q("market-pack-long")?.value?.trim() || "",
    category: q("market-pack-category")?.value?.trim() || "General",
    language: q("market-pack-language")?.value?.trim() || "en",
    age_min: Number(q("market-pack-age-min")?.value || 3),
    age_max: Number(q("market-pack-age-max")?.value || 6),
    price_cents: Number(q("market-pack-price")?.value || 0),
    access_mode: q("market-pack-access-mode")?.value || "paid",
    license_type: q("market-pack-license-type")?.value || "personal",
    export_policy: q("market-pack-export-policy")?.value || "none",
    status: q("market-pack-status-select")?.value || "draft",
  };
}

function fillPackForm(pack = null){
  populateMarketplaceLessonOptions(pack?.lesson_id || pack?.lessonId || "");

  if(!pack){
    q("market-pack-id").value = "";
    q("market-pack-lesson-id").value = "";
    q("market-pack-type").value = "reading";
    q("market-pack-title").value = "";
    q("market-pack-short").value = "";
    q("market-pack-long").value = "";
    q("market-pack-age-min").value = 3;
    q("market-pack-age-max").value = 6;
    q("market-pack-category").value = "";
    q("market-pack-language").value = "en";
    q("market-pack-price").value = "299";
    applyMarketplaceAccessModeUI();
    renderMarketplaceLinkedLessonSummary("");
    setStatus("market-pack-status","Choose a lesson pack, then fill in marketplace details.","success");
    return;
  }

  q("market-pack-id").value = pack.id || "";
  q("market-pack-lesson-id").value = pack.lesson_id || pack.lessonId || "";
  q("market-pack-type").value = pack.type || "reading";
  q("market-pack-title").value = pack.title || "";
  q("market-pack-short").value = pack.short_description || "";
  q("market-pack-long").value = pack.long_description || "";
  q("market-pack-age-min").value = pack.age_min ?? 3;
  q("market-pack-age-max").value = pack.age_max ?? 6;
  q("market-pack-category").value = pack.category || "";
  q("market-pack-language").value = pack.language || "en";
  q("market-pack-price").value = String(pack.price_cents ?? 299);

  if(q("market-pack-access-mode")) {
    q("market-pack-access-mode").value = pack?.access_mode || "paid";
  }
  if(q("market-pack-license-type")) {
    q("market-pack-license-type").value = pack?.license_type || "personal";
  }
  if(q("market-pack-export-policy")) {
    q("market-pack-export-policy").value = pack?.export_policy || "none";
  }
  applyMarketplaceAccessModeUI();
  setStatus("market-pack-status", `Editing draft: ${pack.title || "Untitled"}`, "success");
  renderMarketplaceLinkedLessonSummary(pack?.lesson_id || pack?.lessonId || "");
  updateMarketplaceDraftReadiness();
}

function formatAccessMode(value = ""){
  return value === "free_library" ? "Free Library" : "Paid";
}

function formatLicenseType(value = ""){
  switch(String(value || "").toLowerCase()){
    case "classroom": return "Classroom License";
    case "school": return "School License";
    case "personal":
    default:
      return "Personal License";
  }
}

function formatExportPolicy(value = ""){
  switch(String(value || "").toLowerCase()){
    case "owner_backup": return "Owner Backup";
    case "classroom_only": return "Classroom Sharing";
    case "full": return "Full Export";
    case "none":
    default:
      return "No Export";
  }
}

function applyMarketplaceAccessModeUI(){
  const accessMode = q("market-pack-access-mode")?.value || "paid";
  const priceInput = q("market-pack-price");
  if(!priceInput) return;

  if(accessMode === "free_library"){
    if(!priceInput.dataset.lastPaidValue){
      priceInput.dataset.lastPaidValue = priceInput.value || "299";
    }
    priceInput.value = "0";
    priceInput.disabled = true;
  }else{
    priceInput.disabled = false;
    if(String(priceInput.value || "") === "0"){
      priceInput.value = priceInput.dataset.lastPaidValue || "299";
    }
  }
}
function applyMarketplaceLessonSelection(){
  const lessonId = q("market-pack-lesson-id")?.value || "";
  renderMarketplaceLinkedLessonSummary(lessonId);

  if(!lessonId) return;

  const lesson = lessonsCache.find(l => String(l.id) === String(lessonId));
  if(!lesson) return;

  const currentTitle = q("market-pack-title")?.value?.trim() || "";
  const currentCategory = q("market-pack-category")?.value?.trim() || "";

  if(!currentTitle && q("market-pack-title")){
    q("market-pack-title").value = lesson.title || "";
  }

  if(q("market-pack-type")){
    q("market-pack-type").value = lesson.type || "reading";
  }

  if(!currentCategory && q("market-pack-category")){
    q("market-pack-category").value =
      lesson.type === "reading" ? "Stories" :
      lesson.type === "words" ? "Vocabulary" :
      "General";
  }

  updateMarketplaceDraftReadiness();

  setStatus("market-pack-status", `Linked to lesson: ${lesson.title || "Untitled Lesson"}`, "success");
}

function getMarketplaceCardCover(pack = {}){
  const linkedLessonId = pack.lesson_id || pack.lessonId || "";
  if(!linkedLessonId) return "";

  const lesson = lessonsCache.find(l => String(l.id) === String(linkedLessonId)) || null;
  if(!lesson) return "";

  return resolveLessonCardCover(lesson);
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

function updateWorkspaceCounts(){
  const lessonCount = Array.isArray(lessonsCache) ? lessonsCache.length : 0;
  const listingCount = Array.isArray(marketplacePacksCache) ? marketplacePacksCache.length : 0;
  const readyCount = (marketplacePacksCache || []).filter(pack => {
    try{
      return getMarketplacePackReadiness(pack).ready;
    }catch{
      return false;
    }
  }).length;

  setText("tab-lessons-count", String(lessonCount));
  setText("tab-marketplace-count", String(listingCount));

  setText("workspace-lessons-pill", `📚 ${lessonCount} Lesson${lessonCount === 1 ? "" : "s"}`);
  setText("workspace-listings-pill", `🛍️ ${listingCount} Listing${listingCount === 1 ? "" : "s"}`);
  setText("workspace-ready-pill", `✅ ${readyCount} Ready`);
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

function readinessTag(pack = {}){
  const readiness = getMarketplacePackReadiness(pack);

  if(readiness.ready){
    return `<span class="tag" style="background:#eafaf1;color:#17815b;">✅ Ready to Submit</span>`;
  }

  return `<span class="tag" style="background:#fff4e5;color:#9b5d00;">⚠️ Not Ready</span>`;
}

function statusTag(status=""){
  const safe = String(status || "draft").toLowerCase();
  return `<span class="tag ${safe}">${safe}</span>`;
}

function updateMarketplaceDraftReadiness(){
  const payload = readPackForm();
  const readiness = getMarketplacePackReadiness(payload);

  if(readiness.ready){
    setStatus("market-pack-status", "This marketplace pack is ready to submit.", "success");
  }else{
    setStatus("market-pack-status", `Still needed: ${readiness.issues.join(", ")}`, "muted");
  }
}

function updateMarketplaceFilterUI(){
  document.querySelectorAll(".market-filter").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === currentMarketplaceFilter);
  });
}

function getMarketplaceFilterCounts(packs = []){
  const allPacks = Array.isArray(packs) ? packs : [];

  const ready = allPacks.filter(pack => {
    try{
      return getMarketplacePackReadiness(pack).ready;
    }catch{
      return false;
    }
  }).length;

  const draft = allPacks.filter(
    pack => String(pack.status || "").toLowerCase() === "draft"
  ).length;

  const review = allPacks.filter(
    pack => String(pack.status || "").toLowerCase() === "review"
  ).length;

  return {
    all: allPacks.length,
    ready,
    draft,
    review
  };
}

function updateMarketplaceFilterLabels(packs = []){
  const counts = getMarketplaceFilterCounts(packs);

  document.querySelectorAll(".market-filter").forEach(btn => {
    const key = btn.dataset.filter || "all";
    const baseLabel =
      key === "all" ? "All" :
      key === "ready" ? "Ready" :
      key === "draft" ? "Draft" :
      key === "review" ? "Review" :
      key;

    const count = counts[key] ?? 0;
    btn.textContent = `${baseLabel} (${count})`;
  });
}

function updateLessonsResultsText(shown = 0, total = 0){
  setText("lessons-results-text", `Showing ${shown} of ${total} lesson${total === 1 ? "" : "s"}`);

  const clearBtn = q("lessons-clear-search-btn");
  if(clearBtn){
    clearBtn.style.display = String(currentLessonsSearch || "").trim() ? "inline-flex" : "none";
  }
}

function updateMarketplaceResultsText(shown = 0, total = 0){
  setText("market-results-text", `Showing ${shown} of ${total} listing${total === 1 ? "" : "s"}`);

  const clearBtn = q("market-clear-search-btn");
  if(clearBtn){
    clearBtn.style.display = String(currentMarketplaceSearch || "").trim() ? "inline-flex" : "none";
  }
}

function getMarketplaceLinkedLessonStats(pack = {}){
  const linkedLessonId = pack.lesson_id || pack.lessonId || "";
  if(!linkedLessonId){
    return {
      lesson: null,
      itemCount: 0,
      hasCover: false
    };
  }

  const lesson = lessonsCache.find(l => String(l.id) === String(linkedLessonId)) || null;
  if(!lesson){
    return {
      lesson: null,
      itemCount: 0,
      hasCover: false
    };
  }

  const items = cloneItems(lesson?.data_json?.items || lesson?.dataJson?.items || lesson?.items || []);
  const cover = resolveLessonCardCover(lesson);

  return {
    lesson,
    itemCount: items.length,
    hasCover: !!cover
  };
}

function renderMarketPackList(packs = []){
  const wrap = q("market-pack-list");
  if(!wrap) return;

  updateMarketplaceFilterUI();
  updateMarketplaceFilterLabels(packs);

  const allPacks = Array.isArray(packs) ? packs : [];
  const filterMatchedPacks = getFilteredMarketplacePacks(allPacks);
  const filteredPacks = sortMarketplacePacks(getSearchFilteredMarketplacePacks(filterMatchedPacks));

  updateMarketplaceResultsText(filteredPacks.length, allPacks.length);

  if(!allPacks.length){
    wrap.innerHTML = `<div class="empty">No marketplace packs yet.</div>`;
    updateMarketplaceResultsText(0, 0);
    updateWorkspaceCounts();
    return;
  }

  if(!filteredPacks.length){
    wrap.innerHTML = `<div class="empty">No marketplace packs match this search or filter.</div>`;
    updateMarketplaceResultsText(0, allPacks.length);
    updateWorkspaceCounts();
    return;
  }

  wrap.innerHTML = filteredPacks.map(pack => {
    const linkedLessonId = pack.lesson_id || pack.lessonId || "";
    const linkedLesson = lessonsCache.find(l => String(l.id) === String(linkedLessonId)) || null;
    const linkedLessonTitle = linkedLesson?.title || "";
    const linkedLessonCover = getMarketplaceCardCover(pack);
    const linkedLessonStats = getMarketplaceLinkedLessonStats(pack);
    const readiness = getMarketplacePackReadiness(pack);

    return `
      <div class="item-card">
        <div class="item-top" style="align-items:stretch;">
          <div style="display:grid; grid-template-columns:88px 1fr; gap:12px; width:100%;">
            <div>
              ${
                linkedLessonCover
                  ? `<img class="preview-thumb" src="${linkedLessonCover}" alt="${linkedLessonTitle || pack.title || "Marketplace Pack"} cover" style="width:88px;height:88px;border-radius:14px;object-fit:cover;background:#eef3ff;border:1px solid #dfe8ff;" />`
                  : `<div class="preview-thumb" style="width:88px;height:88px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:#eef3ff;border:1px solid #dfe8ff;">📚</div>`
              }
            </div>

            <div>
              <div class="item-title">${pack.title || "Untitled Pack"}</div>
              <div class="muted" style="margin-top:6px;">${pack.short_description || "No short description yet."}</div>
              <div class="muted" style="margin-top:6px;"><strong>Linked Lesson:</strong> ${linkedLessonTitle || "None"}</div>
            </div>
          </div>

          <div class="tag">${money(pack.price_cents)}</div>
        </div>

        <div class="item-meta">
          <span class="tag">${pack.type || "reading"}</span>
          <span class="tag">${pack.language || "en"}</span>
          <span class="tag">${pack.category || "General"}</span>
          ${statusTag(pack.status)}
          <span class="tag">Ages ${pack.age_min ?? 3}-${pack.age_max ?? 6}</span>
          ${linkedLessonTitle ? `<span class="tag">📚 ${linkedLessonTitle}</span>` : ``}
          ${linkedLesson ? `<span class="tag">🧩 ${linkedLessonStats.itemCount} item(s)</span>` : ``}
          ${linkedLesson ? `<span class="tag">${linkedLessonStats.hasCover ? "🖼️ Has Cover" : "📭 No Cover"}</span>` : ``}
          ${readinessTag(pack)}
          ${pack.access_mode ? `<span class="tag">${formatAccessMode(pack.access_mode)}</span>` : ``}
          ${pack.license_type ? `<span class="tag">${formatLicenseType(pack.license_type)}</span>` : ``}
          ${pack.export_policy ? `<span class="tag">Export: ${formatExportPolicy(pack.export_policy)}</span>` : ``}
          
        </div>

        ${
          readiness.ready
            ? `<div class="muted" style="margin-top:10px;">This pack is ready for review.</div>`
            : `<div class="muted" style="margin-top:10px;"><strong>Needs:</strong> ${readiness.issues.join(", ")}</div>`
        }

        <div class="card-actions" style="margin-top:12px;">
          <button class="btn btn-primary market-edit-btn" data-id="${pack.id}">Edit</button>
          <button class="btn btn-soft market-preview-btn" data-id="${pack.id}">Preview</button>
          <button class="btn btn-green market-submit-btn" data-id="${pack.id}" ${readiness.ready ? "" : "disabled"}>Submit</button>
          ${
            String(pack.status || "").toLowerCase() === "rejected" && String(pack.review_notes || "").trim()
              ? `<div class="muted" style="margin-top:10px; color:#b54848;"><strong>Reason:</strong> ${pack.review_notes}</div>`
              : ``
          }
          ${pack.reviewed_at ? `<div class="muted" style="margin-top:8px;"><strong>Reviewed:</strong> ${new Date(pack.reviewed_at).toLocaleString()}</div>` : ``}
          ${pack.approved_at ? `<div class="muted" style="margin-top:4px;"><strong>Approved:</strong> ${new Date(pack.approved_at).toLocaleString()}</div>` : ``}
          ${pack.published_at ? `<div class="muted" style="margin-top:4px;"><strong>Published:</strong> ${new Date(pack.published_at).toLocaleString()}</div>` : ``}
          ${String(pack.review_notes || "").trim() ? `<div class="muted" style="margin-top:8px;"><strong>Latest Note:</strong> ${pack.review_notes}</div>` : ``}
        </div>
      </div>
    `;
  }).join("");

  wrap.querySelectorAll(".market-edit-btn").forEach(btn =>
    btn.addEventListener("click", () => {
      const pack = allPacks.find(p => String(p.id) === String(btn.dataset.id));
      if(pack){
        fillPackForm(pack);
        openModal("market-pack-modal");
      }
    })
  );

  wrap.querySelectorAll(".market-submit-btn").forEach(btn =>
    btn.addEventListener("click", async () => {
      await submitPack(btn.dataset.id);
    })
  );

  wrap.querySelectorAll(".market-preview-btn").forEach(btn =>
    btn.addEventListener("click", () => {
      const pack = allPacks.find(p => String(p.id) === String(btn.dataset.id));
      if(!pack) return;

      const linkedLessonId = pack.lesson_id || pack.lessonId || "";
      const lesson = lessonsCache.find(l => String(l.id) === String(linkedLessonId));
      const items = lesson
        ? cloneItems(lesson?.data_json?.items || lesson?.dataJson?.items || lesson?.items || [])
        : [];
      const cover = lesson ? resolveLessonCardCover(lesson) : "";
      const linkedLessonTitle = lesson?.title || "";

      setText("lesson-preview-title", `${pack.title || "Marketplace Pack"} Preview`);
      setLessonPreviewCover(cover || "");

      renderLessonPreviewSummary({
        title: pack.title || "Marketplace Pack",
        type: pack.type || "reading",
        priceText: money(pack.price_cents),
        status: pack.status || "draft",
        language: pack.language || "en",
        category: pack.category || "General",
        linkedLessonTitle,
        itemCount: items.length,
        description: pack.long_description || pack.short_description || "No description yet."
      });

      if(items.length){
        renderLessonPreviewItems(items);
      }else{
        q("lesson-preview-list").innerHTML = `
          <div class="empty">This linked lesson has no items yet.</div>
        `;
      }

      openModal("lesson-preview-modal");
    })
  );

  updateWorkspaceCounts();
}

async function loadCreatorPacks(){
  if(!getToken()){
    marketplacePacksCache = [];
    renderMarketPackList([]);
    setStatus("market-packs-status","Login to load marketplace packs.","error");
    return [];
  }

  try{
    const data = await api("/api/creator/packs");
    marketplacePacksCache = data.packs || [];
    renderMarketPackList(marketplacePacksCache);
    renderLessonsFromExistingState();
    setStatus("market-packs-status", `${marketplacePacksCache.length} marketplace pack(s) loaded.`,"success");
    return marketplacePacksCache;
  }catch(err){
    marketplacePacksCache = [];
    renderMarketPackList([]);
    renderLessonsFromExistingState();
    setStatus("market-packs-status", err.message || "Load marketplace packs failed","error");
    return [];
  }
}

async function savePackDraft(){
  if(!getToken()){
    setStatus("market-pack-status", "Please login first.", "error");
    return;
  }

  const packId = q("market-pack-id")?.value || "";
  const lessonId = q("market-pack-lesson-id")?.value || "";
  const payload = readPackForm();

  if(!payload.title){
    setStatus("market-pack-status", "Pack title is required.", "error");
    return;
  }

  if(!lessonId){
    setStatus("market-pack-status", "Please link this listing to a lesson.", "error");
    return;
  }

  payload.lesson_id = lessonId;
  payload.slug = makeUniquePackSlug(payload.title, marketplacePacksCache, packId);

  try{
    const method = packId ? "PATCH" : "POST";
    const url = packId ? `/api/creator/packs/${packId}` : "/api/creator/packs";

    const res = await api(url, {
      method,
      body: JSON.stringify(payload)
    });

    const savedPack = res.pack || null;
    if(savedPack){
      const idx = marketplacePacksCache.findIndex(p => String(p.id) === String(savedPack.id));
      if(idx >= 0) marketplacePacksCache[idx] = savedPack;
      else marketplacePacksCache.unshift(savedPack);

      renderMarketPackList(marketplacePacksCache);
      fillPackForm(savedPack);
      setStatus(
        "market-pack-status",
        `Draft saved as "${savedPack.title}"${savedPack.slug ? ` (${savedPack.slug})` : ""}.`,
        "success"
      );
      console.log("PACK PAYLOAD", payload);
    }else{
      setStatus("market-pack-status", "Draft saved.", "success");
    }
    clearLessonTitleWarning();

    await loadCreatorPacks();
  }catch(err){
    setStatus("market-pack-status", err.message || "Save draft failed.", "error");
  }
}

async function submitPack(packIdFromButton = ""){
  if(!getToken()){
    setStatus("market-pack-status","Login required.","error");
    openModal("auth-modal");
    return;
  }

  const title = q("market-pack-title")?.value?.trim() || "";
  const packId = q("market-pack-id")?.value || "";

  const payload = {
    ...readPackForm(),
    slug: makeUniquePackSlug(title, marketplacePacksCache, packId),
  };

  try{
    const packId = String(packIdFromButton || q("market-pack-id")?.value || "").trim();
    if(!packId){
      setStatus("market-pack-status","Save the draft first.","error");
      return;
    }

    const packs = await loadCreatorPacks();
    const pack = packs.find(p => String(p.id) === String(packId));

    if(!pack){
      setStatus("market-pack-status","Pack not found.","error");
      return;
    }

    const readiness = getMarketplacePackReadiness(pack);
    if(!readiness.ready){
      setStatus("market-pack-status", `Cannot submit yet: ${readiness.issues.join(", ")}`, "error");
      return;
    }

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
    updateHeroAuthLabel();
    setStatus("auth-modal-status","Login successful.","success");
    updateSummaryPills(await loadCreatorProfile());
    await loadExistingLessons(true);
    await loadCreatorPacks();
    await loadCreatorDashboard();
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
    updateHeroAuthLabel();
    setStatus("auth-modal-status","Registration successful.","success");
    updateSummaryPills(await loadCreatorProfile());
    await loadExistingLessons(true);
    await loadCreatorPacks();
    await loadCreatorDashboard();
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
  lessonsCache = loadLocalCache();
  renderLessonsFromExistingState();
  updateHeroAuthLabel();
  renderCreatorDashboard(null);
  setStatus("creator-dashboard-status","Login to load creator dashboard.","error");
  setStatus("auth-modal-status","Logged out.","success");
  setStatus("market-profile-status","Login to save your creator profile.","error");
  setStatus("market-packs-status","Login to load marketplace packs.","error");
}

// function setWorkspaceTab(tab = "lessons"){
//   const isLessons = tab === "lessons";

//   q("tab-lessons-btn")?.classList.toggle("active", isLessons);
//   q("tab-marketplace-btn")?.classList.toggle("active", !isLessons);

//   q("panel-lessons")?.classList.toggle("active", isLessons);
//   q("panel-marketplace")?.classList.toggle("active", !isLessons);

//   const filters = q("market-filters");
//   if(filters){
//     filters.style.display = isLessons ? "none" : "flex";
//   }
// }

function updateHeroAuthLabel(){
  const user = getCurrentUser?.() || null;
  const authLabel = q("hero-auth-label");
  const logoutBtn = q("hero-logout-btn");
  
  if(!authLabel) return;

  if(user){
    // User is logged in
    const name = user.display_name || user.displayName || user.email || "Creator";
    authLabel.textContent = `👋 ${name}: ${user.displayName || user.email}`;
    
    // Show the logout button
    if(logoutBtn) logoutBtn.style.display = "inline-flex";
    
    // Optional: Disable the login modal from opening when already logged in
    authLabel.style.pointerEvents = "none"; 
  } else {
    // User is logged out
    authLabel.textContent = "🔐 Login";
    authLabel.style.pointerEvents = "auto";
    
    // Hide the logout button
    if(logoutBtn) logoutBtn.style.display = "none";
  }

  if (typeof updateMenuAuthLabel === "function") updateMenuAuthLabel();
}

function updateMenuAuthLabel(){
  const user = getCurrentUser?.() || null;
  const btn = q("menu-auth-btn");
  if(!btn) return;

  btn.textContent = user ? "🚪 Logout" : "👤 Login";
}

function bindModalButtons(){
  if(modalBindingsReady) return;
  modalBindingsReady = true;

  q("open-dashboard-btn")?.addEventListener("click", async () => {
  setWorkspaceTab("dashboard");
  await loadCreatorDashboard();
});

  q("refresh-dashboard-btn")?.addEventListener("click", async () => {
    setWorkspaceTab("dashboard");
    await loadCreatorDashboard();
  });

  document.querySelectorAll(".workspace-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      setWorkspaceTab(btn.dataset.workspaceTab || "lessons");
    });
  });

q("hero-auth-label")?.addEventListener("click", () => {
  const user = getCurrentUser?.() || null;
  // If no user is logged in, open the auth modal
  if (!user) {
    openModal("auth-modal");
  }
});
  q("hero-logout-btn")?.addEventListener("click", () => {
  if(window.confirm("Are you sure you want to logout?")) {
    logoutUser();
    // After logout, refresh the UI
    updateHeroAuthLabel();
    // Redirect or refresh state as needed
    initWorkspace(); 
  } 

  
});
 q("menu-auth-btn")?.addEventListener("click", async () => {
  q("hero-menu-dropdown")?.classList.add("hidden");

  const user = getCurrentUser?.() || null;

  if(user){
    await logoutUser();
    updateHeroAuthLabel?.();
    return;
  }

  openModal("auth-modal");
});
  q("open-profile-btn")?.addEventListener("click", ()=>openModal("profile-modal"));
  q("open-lesson-editor-btn")?.addEventListener("click", startNewDraft);
  // q("new-lesson-btn")?.addEventListener("click", startNewDraft);
  q("new-lesson-btn")?.addEventListener("click", () => {
    setWorkspaceTab("lessons");
    startNewDraft();
  });

  q("open-marketplace-tab-btn")?.addEventListener("click", ()=>{
    if(typeof setWorkspaceTab === "function"){
      setWorkspaceTab("marketplace");
    }
  });

  q("new-market-btn")?.addEventListener("click", () => {
    setWorkspaceTab("marketplace");
    fillPackForm(null);
    openModal("market-pack-modal");
  });

  q("close-modal-btn")?.addEventListener("click", ()=>closeModal("editor-modal"));

  document.querySelectorAll("[data-close-modal]").forEach(btn =>
    btn.addEventListener("click", ()=>closeModal(btn.getAttribute("data-close-modal")))
  );

  document.querySelectorAll(".modal").forEach(modal =>
    modal.addEventListener("click",(e)=>{
      if(e.target===modal) closeModal(modal.id);
    })
  );

  q("editor-modal")?.addEventListener("click", (e)=>{
    if(e.target===q("editor-modal")) closeModal("editor-modal");
  });
}

function bindWorkspaceActions(){
  if(workspaceBindingsReady) return;
  workspaceBindingsReady = true;

  q("hero-menu-btn")?.addEventListener("click", (e) => {
  e.stopPropagation();
  const menu = q("hero-menu-dropdown");
  const btn = q("hero-menu-btn");
  if(!menu || !btn) return;

  const isHidden = menu.classList.contains("hidden");
  menu.classList.toggle("hidden", !isHidden);
  btn.setAttribute("aria-expanded", isHidden ? "true" : "false");
});

document.addEventListener("click", (e) => {
  const wrap = e.target.closest(".menu-wrap");
  if(wrap) return;

  q("hero-menu-dropdown")?.classList.add("hidden");
  q("hero-menu-btn")?.setAttribute("aria-expanded", "false");
});

q("hero-refresh-btn")?.addEventListener("click", async () => {
  q("hero-menu-dropdown")?.classList.add("hidden");
  await loadExistingLessons(true);
  await loadCreatorProfile();
  await loadCreatorPacks();
  await loadCreatorDashboard();
});

q("hero-marketplace-btn")?.addEventListener("click", () => {
  q("hero-menu-dropdown")?.classList.add("hidden");
  setWorkspaceTab("marketplace");
});
  q("delete-cover-btn")?.addEventListener("click", doDeleteCoverImage);

  q("tab-lessons-btn")?.addEventListener("click", () => setWorkspaceTab("lessons"));
  q("tab-marketplace-btn")?.addEventListener("click", () => setWorkspaceTab("marketplace"));

  q("refresh-workspace-btn")?.addEventListener("click", async()=>{
    await loadExistingLessons(true);
    await loadCreatorProfile();
    await loadCreatorPacks();
    await loadCreatorDashboard();
  });

  q("refresh-market-btn")?.addEventListener("click", loadCreatorPacks);

  q("market-save-profile-btn")?.addEventListener("click", saveCreatorProfile);
  q("market-save-pack-btn")?.addEventListener("click", savePackDraft);
  q("market-submit-pack-btn")?.addEventListener("click", ()=>submitPack(""));

  q("market-pack-lesson-id")?.addEventListener("change", applyMarketplaceLessonSelection);

  q("auth-login-btn")?.addEventListener("click", login);
  q("auth-register-btn")?.addEventListener("click", registerUser);
  q("auth-logout-btn")?.addEventListener("click", logoutUser);
  q("confirm-logout-btn")?.addEventListener("click", logoutUser);

  q("lessons-search-input")?.addEventListener("input", (e) => {
    currentLessonsSearch = e.target.value || "";
    renderLessonsFromExistingState();
  });

  q("market-search-input")?.addEventListener("input", (e) => {
    currentMarketplaceSearch = e.target.value || "";
    renderMarketPackList(marketplacePacksCache);
  });

  q("lessons-sort-select")?.addEventListener("change", (e) => {
    currentLessonsSort = e.target.value || "newest";
    renderLessonsFromExistingState();
  });

  q("market-sort-select")?.addEventListener("change", (e) => {
    currentMarketplaceSort = e.target.value || "newest";
    renderMarketPackList(marketplacePacksCache);
  });

  q("lessons-clear-search-btn")?.addEventListener("click", () => {
  currentLessonsSearch = "";
  if(q("lessons-search-input")) q("lessons-search-input").value = "";
  renderLessonsFromExistingState();
});

 q("market-clear-search-btn")?.addEventListener("click", () => {
  currentMarketplaceSearch = "";
  if(q("market-search-input")) q("market-search-input").value = "";
  renderMarketPackList(marketplacePacksCache);
});
q("market-pack-access-mode")?.addEventListener("change", applyMarketplaceAccessModeUI);

  document.querySelectorAll(".market-filter").forEach(btn => {
    btn.addEventListener("click", () => {
      currentMarketplaceFilter = btn.dataset.filter || "all";
      updateMarketplaceFilterUI();
      setWorkspaceTab("marketplace");
      renderMarketPackList(marketplacePacksCache);
    });
  });

  q("add-item-btn")?.addEventListener("click", ()=>{
    if(isReadingLessonType()){
      currentItems.push(makeItem("New story sentence", null));
    }else{
      currentItems.push(makeItem("", null));
    }

    renderItemsEditor();

    requestAnimationFrame(() => {
      const cards = document.querySelectorAll("#items-wrap .editor-item-card");
      const lastCard = cards[cards.length - 1];
      if(!lastCard) return;

      lastCard.scrollIntoView({ behavior: "smooth", block: "start" });

      const input = lastCard.querySelector(".item-word");
      if(input) input.focus();
    });
  });

  q("lesson-next-btn")?.addEventListener("click", handleLessonNext);
  q("lesson-back-btn")?.addEventListener("click", handleLessonBack);
  q("finish-lesson-btn")?.addEventListener("click", handleLessonFinish);

  q("lesson-cover-file")?.addEventListener("change", async () => {
    await doUploadCoverImage();
  });

  q("lesson-title")?.addEventListener("input", () => {
  clearLessonModalWarning();
  clearLessonTitleWarning();
});

q("import-lessons-btn")?.addEventListener("click", () => {
  q("import-lessons-file")?.click();
});

q("import-lessons-file")?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if(!file) return;

  await importPack(file);

  e.target.value = "";
});

  document.querySelectorAll(".lesson-step").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const step = Number(btn.dataset.step);
      if(currentLessonId){
        setLessonStep(step);
      }
    });
  });

  q("lesson-type")?.addEventListener("change", ()=>{
    refreshLessonTypeUI();
    renderItemsEditor();
  });

  document.addEventListener("input", (e)=>{
    if(e.target.classList.contains("item-word")){
      const index = Number(e.target.dataset.index);
      currentItems[index].word = e.target.value;
    }
  });

  document.addEventListener("change", async (e)=>{
    if(e.target.classList.contains("item-image")){
      const index = Number(e.target.dataset.index);
      await doUploadImage(index);
    }
  });

  document.addEventListener("click", async(e)=>{
    const moveUpBtn = e.target.closest(".move-up-btn");
    if(moveUpBtn){
      moveItemUp(Number(moveUpBtn.dataset.index));
      return;
    }

    const moveDownBtn = e.target.closest(".move-down-btn");
    if(moveDownBtn){
      moveItemDown(Number(moveDownBtn.dataset.index));
      return;
    }

    const duplicateBtn = e.target.closest(".duplicate-btn");
    if(duplicateBtn){
      duplicateItem(Number(duplicateBtn.dataset.index));
      return;
    }

    const deleteImageBtn = e.target.closest(".delete-image-btn");
    if(deleteImageBtn){
      await doDeleteItemImage(Number(deleteImageBtn.dataset.index));
      return;
    }

    const removeBtn = e.target.closest(".remove-btn");
    if(removeBtn){
      currentItems.splice(Number(removeBtn.dataset.index), 1);
      renderItemsEditor();
      return;
    }
  });

  window.addEventListener("storage", async(e)=>{
    if(e.key==="sb_token" || e.key==="sb_user"){
      await initWorkspace();
    }
  });

  q("lessons-list")?.addEventListener("click", async (e) => {
    
  const actionBtn = e.target.closest(
    ".lesson-edit-btn, .lesson-preview-btn, .lesson-export-btn, .lesson-publish-btn, .lesson-delete-btn"
  );
  if(!actionBtn) return;

  const lessonId = actionBtn.dataset.id || "";
  const lesson = lessonsCache.find(l => String(l.id) === String(lessonId));

  if(actionBtn.classList.contains("lesson-edit-btn")){
    if(!lesson) return;
    openLessonForEdit(lessonId);
    return;
  }

  if(actionBtn.classList.contains("lesson-preview-btn")){
    if(!lesson) return;
    openLessonPreview(lesson);
    return;
  }

  if(actionBtn.classList.contains("lesson-export-btn")){
    if(!lesson) return;
    downloadJson(
      `${(lesson.title || "lesson").replace(/\s+/g,"_").toLowerCase()}.json`,
      makePack([lesson])
    );
    return;
  }

  if(actionBtn.classList.contains("lesson-publish-btn")){
    if(!lesson) return;

    const existingPack = getMarketplacePackForLesson(lesson.id || "");

    if(existingPack){
      fillPackForm(existingPack);
    }else{
      fillPackForm(null);
      populateMarketplaceLessonOptions(lesson.id || "");
      if(q("market-pack-lesson-id")) q("market-pack-lesson-id").value = lesson.id || "";
      applyMarketplaceLessonSelection();
    }

    openModal("market-pack-modal");
    return;
  }

  if(actionBtn.classList.contains("lesson-delete-btn")){
    await deleteLessonById(lessonId);
  }
});
}

async function initWorkspace(){
  currentMarketplaceFilter = "all";
  currentLessonsSearch = "";
  currentMarketplaceSearch = "";
  currentLessonsSort = "newest";
  currentMarketplaceSort = "newest";

  if(q("lessons-sort-select")) q("lessons-sort-select").value = currentLessonsSort;
  if(q("market-sort-select")) q("market-sort-select").value = currentMarketplaceSort;
  if(q("lessons-search-input")) q("lessons-search-input").value = "";
  if(q("market-search-input")) q("market-search-input").value = "";

  lessonsCache = loadLocalCache();
  renderLessonsFromExistingState();
  renderItemsEditor();
  setWorkspaceTab("lessons");
  updateMarketplaceFilterUI();

  const profile = await loadCreatorProfile();
  updateSummaryPills(profile);

  await loadExistingLessons(true);
  await loadCreatorPacks();
  await loadCreatorDashboard();

  const user = getCurrentUser();
  updateWorkspaceCounts();
  updateHeroAuthLabel();

  setStatus("auth-modal-status", user ? `Logged in as ${user.display_name || user.email}` : "Not logged in.", user ? "success" : "muted");
}

bindModalButtons();
bindWorkspaceActions();
initWorkspace();

window.CreatorWorkspace = window.CreatorWorkspace || {};
window.CreatorWorkspace.openLegacyLessonEditor = startNewDraft;
window.CreatorWorkspace.editLesson = openLessonForEdit;
window.CreatorWorkspace.renderLessons = renderLessonsFromExistingState;
