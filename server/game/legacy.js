// Auto-extracted legacy inline JS from reading.html
    // NOTE: This runs inside a function after DOMContentLoaded.
    // If your legacy HTML relies on globally named functions via inline onclick= handlers,
    // you may need to attach those functions to window explicitly.
    document.addEventListener('DOMContentLoaded', () => {
      try {
        (function() {
    /* =========================
   Toast
========================= */
function sbToast(msg, ms=1400){
  const el = document.getElementById('sb-toast');
  if(!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(sbToast._t);
  sbToast._t = setTimeout(()=>el.classList.add('hidden'), ms);

  // Mobile mic troubleshooting: show clear reasons when SpeechRecognition can't start
}

function sbMicEnvHint(){
  try{
    const proto = (location && location.protocol) ? location.protocol : '';
    const host  = (location && location.hostname) ? location.hostname : '';
    const secureOk = (window.isSecureContext === true) || proto === 'https:' || host === 'localhost' || host === '127.0.0.1';
    if(!secureOk){
      sbToast('🎤 Mic needs HTTPS (or localhost). Open this on a secure site.', 2600);
      return false;
    }
    return true;
  }catch(e){
    return true;
  }
}



/* =========================
   TTS Safe (anti-spam)
========================= */
let sbTtsLastAt = 0;
let sbTtsLastText = "";
function speak(t, opts={}){
  // Safe TTS: cancel queue and "wake" mac speech server like word5
  const now = Date.now();
  const text = String(t||"");
  // small debounce if same text spammed
  if(text && text === sbTtsLastText && (now - sbTtsLastAt) < 650){
    return;
  }
  sbTtsLastAt = now;
  sbTtsLastText = text;

  try{ window.speechSynthesis.cancel(); }catch(e){}
  // allow skipping if blank
  if(!text.trim()) return;

  setTimeout(()=>{
    try{ window.speechSynthesis.resume(); }catch(e){}
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate ?? 0.85;
    u.lang = opts.lang ?? 'en-US';
    try{
      const voices = window.speechSynthesis.getVoices();
      if(voices && voices.length){
        u.voice = voices.find(v => (v.lang||'').includes('en')) || voices[0];
      }
    }catch(e){}
    try{ window.speechSynthesis.speak(u); }catch(e){}
  }, 90);
}

// Rate-limited "Try again" to prevent loops
let sbLastTryAgainAt = 0;
function sbSayTryAgain(){
  const now = Date.now();
  if(now - sbLastTryAgainAt < 1400) return;
  sbLastTryAgainAt = now;
  speak("Try again", {rate:0.9});
}

/* =========================
   Win FX (fire + stars)
========================= */
function sbShowWinFx(streak, starsPlus){
  const wrap = document.getElementById('sb-winfxtop');
  const card = document.getElementById('sb-winfxtop-card');
  if(!wrap || !card) return;
  card.textContent = `🔥 Streak ${streak||0}   ⭐ +${starsPlus||0}`;
  wrap.style.display = 'block';
  clearTimeout(sbShowWinFx._t);
  sbShowWinFx._t = setTimeout(()=>{ wrap.style.display='none'; }, 1400);
}

/* =========================
   Parent Mode
========================= */
function sbParentKey(){ return 'sb_parent_pin_v1'; }
function sbLockedKey(){ return 'sb_parent_locked_v1'; }
function sbIsParentLocked(){ return localStorage.getItem(sbLockedKey()) === '1'; }
function sbSetParentLocked(v){ localStorage.setItem(sbLockedKey(), v ? '1':'0'); }

function sbApplyParentMode(){
  const locked = sbIsParentLocked();
  // menu buttons
  const menu = document.getElementById('menu-page');
  if(menu){
    // hide create/export/import/reset when locked
    const btns = menu.querySelectorAll('button');
    btns.forEach(b=>{
      const txt = (b.textContent||'').toLowerCase();
      if(txt.includes('create') || txt.includes('export') || txt.includes('import') || txt.includes('reset')){
        b.style.display = locked ? 'none' : '';
      }
    });
  }
  // lesson edit/delete
  const editBtn = document.getElementById('btn-edit');
  const delBtn  = document.getElementById('btn-delete');
  if(editBtn) editBtn.style.display = locked ? 'none' : '';
  if(delBtn)  delBtn.style.display  = locked ? 'none' : '';
}

function sbOpenParent(){
  const overlay = document.getElementById('sb-parent-overlay');
  const pinEl = document.getElementById('sb-parent-pin');
  const msgEl = document.getElementById('sb-parent-msg');
  if(!overlay || !pinEl || !msgEl) return;
  pinEl.value = '';
  const hasPin = !!localStorage.getItem(sbParentKey());
  msgEl.textContent = hasPin ? 'Enter PIN to unlock editing tools.' : 'Set a new PIN to enable Parent Mode.';
  overlay.classList.remove('hidden');
  setTimeout(()=>pinEl.focus(), 0);
}

function sbCloseParent(){
  const overlay = document.getElementById('sb-parent-overlay');
  if(overlay) overlay.classList.add('hidden');
}

function sbSetOrUnlockParent(){
  const pinEl = document.getElementById('sb-parent-pin');
  if(!pinEl) return;
  const pin = (pinEl.value||'').trim();
  if(pin.length < 4) return sbToast('PIN must be 4+ digits');
  const saved = localStorage.getItem(sbParentKey());
  if(!saved){
    localStorage.setItem(sbParentKey(), pin);
    sbSetParentLocked(true);
    sbToast('✅ Parent lock enabled');
    sbApplyParentMode();
    sbCloseParent();
    return;
  }
  if(pin === saved){
    sbSetParentLocked(false);
    sbToast('🔓 Unlocked');
    sbApplyParentMode();
    sbCloseParent();
  }else{
    sbToast('❌ Wrong PIN');
  }
}

function sbLockParentNow(){
  sbSetParentLocked(true);
  sbToast('🔒 Locked');
  sbApplyParentMode();
  sbCloseParent();
}


/* =========================
   IndexedDB: Lessons + Progress
========================= */
const SB_DB_NAME = 'sbReadingDB_v1';
const SB_DB_VER  = 2;

function sbOpenDB(){
  return new Promise((resolve, reject)=>{
    if(!('indexedDB' in window)){
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const req = indexedDB.open(SB_DB_NAME, SB_DB_VER);

    // If another tab is holding the DB open at an older version, upgrades can hang.
    // Show a clear toast and fail fast so the UI doesn't look "dead".
    let timedOut = false;
    const t = setTimeout(()=>{
      timedOut = true;
      try{ req && req.result && req.result.close(); }catch(e){}
      sbToast('⚠️ Storage upgrade blocked. Close other Study Buddy tabs and reload.', 2600);
      reject(new Error('IndexedDB open timeout / blocked'));
    }, 4500);

    req.onblocked = ()=>{
      if(timedOut) return;
      sbToast('⚠️ Close other Study Buddy tabs to finish storage upgrade.', 2400);
    };

    req.onupgradeneeded = ()=>{
      const db = req.result;
      if(!db.objectStoreNames.contains('lessons')){
        const st = db.createObjectStore('lessons', { keyPath:'id' });
        st.createIndex('updatedAt', 'updatedAt');
      }
      if(!db.objectStoreNames.contains('progress')){
        db.createObjectStore('progress', { keyPath:'lessonId' });
      }
      if(!db.objectStoreNames.contains('meta')){
        db.createObjectStore('meta', { keyPath:'key' });
      }
      if(!db.objectStoreNames.contains('assets')){
        db.createObjectStore('assets', { keyPath:'id' });
      }
    };

    req.onsuccess = ()=>{
      clearTimeout(t);
      const db = req.result;
      // If THIS tab becomes stale, close so upgrades can happen elsewhere.
      db.onversionchange = ()=>{
        try{ db.close(); }catch(e){}
      };
      resolve(db);
    };

    req.onerror = ()=>{
      clearTimeout(t);
      reject(req.error || new Error('IndexedDB open failed'));
    };
  });
}

async function sbTx(store, mode, fn){
  const db = await sbOpenDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(store, mode);
    const st = tx.objectStore(store);
    const res = fn(st, tx);
    tx.oncomplete = ()=>resolve(res);
    tx.onerror = ()=>reject(tx.error);
    tx.onabort = ()=>reject(tx.error);
  });
}

async function sbGetAllLessons(){
  const db = await sbOpenDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction('lessons', 'readonly');
    const st = tx.objectStore('lessons');
    const req = st.getAll();
    req.onsuccess = ()=>resolve(req.result || []);
    req.onerror = ()=>reject(req.error);
  });
}

async function sbPutLesson(lesson){
  lesson.updatedAt = Date.now();
  await sbTx('lessons','readwrite',(st)=>st.put(lesson));
  return lesson;
}

async function sbDeleteLesson(id){
  await sbTx('lessons','readwrite',(st)=>st.delete(id));
  await sbTx('progress','readwrite',(st)=>st.delete(id));
}

async function sbGetProgress(lessonId){
  const db = await sbOpenDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction('progress','readonly');
    const st = tx.objectStore('progress');
    const req = st.get(lessonId);
    req.onsuccess = ()=>resolve(req.result || null);
    req.onerror = ()=>reject(req.error);
  });
}

async function sbPutProgress(p){
  await sbTx('progress','readwrite',(st)=>st.put(p));
  return p;
}

async function sbGetMeta(key){
  const db = await sbOpenDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction('meta','readonly');
    const st = tx.objectStore('meta');
    const req = st.get(key);
    req.onsuccess = ()=>resolve(req.result ? req.result.value : null);
    req.onerror = ()=>reject(req.error);
  });
}
async function sbSetMeta(key, value){
  await sbTx('meta','readwrite',(st)=>st.put({key, value}));
}

/* =========================
   Migration: localStorage -> IndexedDB
========================= */
async function sbMigrateIfNeeded(){
  const migrated = await sbGetMeta('migrated_ls_myAdvancedLessons');
  if(migrated) return;

  // If DB already has lessons, mark migrated and stop.
  const existing = await sbGetAllLessons();
  if(existing && existing.length){
    await sbSetMeta('migrated_ls_myAdvancedLessons', true);
    return;
  }

  const ls = localStorage.getItem('myAdvancedLessons');
  if(!ls){
    await sbSetMeta('migrated_ls_myAdvancedLessons', true);
    return;
  }

  try{
    const arr = JSON.parse(ls) || [];
    for(const l of arr){
      const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
      await sbPutLesson({ id, title:l.title || 'Lesson', items:l.items || [] });
    }
    sbToast('✅ Migrated lessons to IndexedDB');
  }catch(e){
    console.warn('Migration failed', e);
  }
  await sbSetMeta('migrated_ls_myAdvancedLessons', true);
}

/* =========================
   Progress + Locking rules
   - Lesson 0 unlocked by default
   - Lesson i unlocks when lesson (i-1) is completed (reading finish OR scramble complete)
========================= */
function sbDefaultProgress(lessonId){
  return { lessonId, stars:0, streak:0, completed:false, lastWinAt:0 };
}

async function sbAwardStar(lessonId, amount=1){
  const p = (await sbGetProgress(lessonId)) || sbDefaultProgress(lessonId);
  p.stars = (p.stars||0) + amount;
  await sbPutProgress(p);
}

async function sbRecordWin(lessonId){
  const p = (await sbGetProgress(lessonId)) || sbDefaultProgress(lessonId);
  const now = Date.now();
  const dayKey = new Date(now).toDateString();
  const lastDayKey = p._lastDayKey || '';
  if(dayKey === lastDayKey){
    p.streak = (p.streak||0) + 1;
  }else{
    p.streak = 1;
  }
  p._lastDayKey = dayKey;
  p.lastWinAt = now;
  await sbPutProgress(p);
}

async function sbMarkCompleted(lessonId){
  const p = (await sbGetProgress(lessonId)) || sbDefaultProgress(lessonId);
  p.completed = true;
  await sbPutProgress(p);
}

let lessons = [];
let currentLesson = null;
let currentLessonIndex = -1;
let currentLessonId = null;
let currentTarget = null;
let storyIndex = 0;
let editId = null;

const praises = ["Great job!","Excellent!","Awesome!","You're a superstar!","Fantastic!","Way to go!","Brilliant!","You got it!"];

/* =========================
   Page routing
========================= */
function showPage(pageId){
  document.querySelectorAll('div[id$="-page"]').forEach(p => p.classList.add('hidden'));
  document.getElementById(pageId).classList.remove('hidden');
  if(pageId === 'menu-page') renderMenu();
}

function toggleHelp(show){
  const overlay = document.getElementById('help-overlay');
  if(!overlay) return;
  if(show) overlay.classList.remove('hidden');
  else overlay.classList.add('hidden');
}

/* =========================
   Creator
========================= */
function openNewLesson(){
  editId = null;
  document.getElementById('creator-title').innerText = 'New Reading Lesson';
  document.getElementById('lesson-title-input').value = '';
  document.getElementById('items-input-container').innerHTML = '';
  addWordRow();
  showPage('creator-page');
}

function addWordRow(text='', imgUrl=''){
  const container = document.getElementById('items-input-container');
  const row = document.createElement('div');
  row.className = 'input-group';

  const safeText = (text||'').replace(/"/g,'&quot;');
  const safeImg = (imgUrl||'').replace(/"/g,'&quot;');

  row.innerHTML = `
    <input type="text" placeholder="Sentence (or word)" class="word-in" value="${safeText}" style="flex:2;">
    <div style="display:flex; flex-direction:column; gap:6px; flex:2;">
      <div style="display:flex; align-items:center; gap:8px;">
        <input type="text" placeholder="Image URL / Path / idb:..." class="img-url-in" value="${safeImg}" style="width:100%">
        <span class="help-icon" onclick="toggleHelp(true)">?</span>
      </div>

      <div style="display:flex; gap:8px; align-items:center; justify-content:flex-start;">
        <button type="button" class="btn-muted sb-upload-btn" style="padding:8px 12px;">🖼️ Upload</button>
        <input type="file" accept="image/*" class="sb-upload-input hidden" />
        <span class="tiny">Stores image in IndexedDB</span>
      </div>
    </div>

    <div class="sb-img-preview-wrap" title="Preview">
      <img class="sb-img-preview" alt="preview" />
    </div>

    <button type="button" class="btn-danger sb-row-remove" style="padding:10px 14px;">×</button>
  `;

  const upBtn = row.querySelector('.sb-upload-btn');
  const upIn  = row.querySelector('.sb-upload-input');
  const urlIn = row.querySelector('.img-url-in');
  const prev  = row.querySelector('.sb-img-preview');
  const rmBtn = row.querySelector('.sb-row-remove');

  if(rmBtn) rmBtn.onclick = ()=> row.remove();

  async function refreshPreview(){
    if(!prev || !urlIn) return;
    const ref = (urlIn.value || '').trim();
    if(!ref){
      prev.src = '';
      prev.style.display = 'none';
      return;
    }
    const src = await sbResolveImageSrc(ref);
    if(src){
      prev.src = src;
      prev.style.display = 'block';
    }else{
      prev.src = '';
      prev.style.display = 'none';
    }
  }

  if(upBtn && upIn && urlIn){
    upBtn.onclick = ()=> upIn.click();
    upIn.onchange = async ()=>{
      const file = upIn.files && upIn.files[0];
      if(!file) return;
      try{
        const ref = await sbUploadImageFile(file);
        urlIn.value = ref;
        await refreshPreview();
        sbToast('✅ Image uploaded');
      }catch(e){
        console.error(e);
        sbToast('❌ Upload failed');
      }finally{
        upIn.value = '';
      }
    };
  }

  if(urlIn){
    urlIn.addEventListener('input', ()=>{ refreshPreview(); });
    urlIn.addEventListener('change', ()=>{ refreshPreview(); });
  }

  container.appendChild(row);
  refreshPreview();
}

async function saveLesson(){
  const title = document.getElementById('lesson-title-input').value.trim();
  if(!title) return alert('Please enter a lesson title!');
  const wordInputs = document.querySelectorAll('.word-in');
  const urlInputs  = document.querySelectorAll('.img-url-in');
  const items = [];
  for(let i=0;i<wordInputs.length;i++){
    const word = (wordInputs[i].value || '').trim();
    const image = (urlInputs[i].value || '').trim() || 'https://via.placeholder.com/300x200?text=No+Image';
    if(word) items.push({ word, image });
  }
  if(!items.length) return alert('Add at least 1 page/sentence.');

  if(editId){
    await sbPutLesson({ id: editId, title, items });
    sbToast('✅ Lesson updated');
  }else{
    const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    await sbPutLesson({ id, title, items });
    sbToast('✅ Lesson created');
  }
  showPage('menu-page');
}

async function editLessonById(id){
  const lesson = lessons.find(l=>l.id===id);
  if(!lesson) return;
  editId = id;
  document.getElementById('creator-title').innerText = 'Edit Lesson';
  document.getElementById('lesson-title-input').value = lesson.title || '';
  document.getElementById('items-input-container').innerHTML = '';
  (lesson.items||[]).forEach(it => addWordRow(it.word, it.image));
  showPage('creator-page');
}

async function deleteLessonById(id){
  if(!confirm('Delete this lesson?')) return;
  await sbDeleteLesson(id);
  sbToast('🗑️ Deleted');
  await loadLessons();
  showPage('menu-page');
}


/* =========================
   Assets in IndexedDB (image upload)
========================= */
async function sbPutAsset(asset){
  await sbTx('assets','readwrite',(st)=>st.put(asset));
}
async function sbGetAsset(id){
  const db = await sbOpenDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction('assets','readonly');
    const st = tx.objectStore('assets');
    const req = st.get(id);
    req.onsuccess = ()=>resolve(req.result || null);
    req.onerror = ()=>reject(req.error);
  });
}
async function sbGetAllAssets(){
  const db = await sbOpenDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction('assets','readonly');
    const st = tx.objectStore('assets');
    const req = st.getAll();
    req.onsuccess = ()=>resolve(req.result || []);
    req.onerror = ()=>reject(req.error);
  });
}
async function sbFileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = ()=>resolve(String(r.result||''));
    r.onerror = ()=>reject(r.error);
    r.readAsDataURL(file);
  });
}
async function sbUploadImageFile(file){
  const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
  const dataUrl = await sbFileToDataUrl(file);
  await sbPutAsset({ id, dataUrl, name:file.name||'', type:file.type||'image/*', createdAt:Date.now() });
  return 'idb:' + id;
}
async function sbResolveImageSrc(src){
  if(!src) return '';
  if(typeof src !== 'string') return String(src);

  const s = String(src).trim();
  if(!s) return '';

  // IndexedDB asset reference
  if(s.startsWith('idb:')){
    const id = s.slice(4);
    const asset = await sbGetAsset(id);
    if(!asset) return '';
    // v6 stored dataUrl; future-proof for blob too
    if(asset.dataUrl) return asset.dataUrl;
    if(asset.blob){
      try{
        // cache object URLs to avoid leaking
        sbResolveImageSrc._cache = sbResolveImageSrc._cache || new Map();
        const cache = sbResolveImageSrc._cache;
        if(cache.has(id)) return cache.get(id);
        const url = URL.createObjectURL(asset.blob);
        cache.set(id, url);
        return url;
      }catch(e){
        return '';
      }
    }
    return '';
  }

  // If it's a normal URL/path, return as-is
  return s;
}



window.addEventListener('beforeunload', ()=>{
  const cache = sbResolveImageSrc._cache;
  if(cache && cache.forEach){
    try{ cache.forEach((url)=>{ try{ URL.revokeObjectURL(url); }catch(e){} }); }catch(e){}
  }
});

/* =========================
   Lock/Unlock calculation (based on ordered list)
========================= */
async function computeLocks(sortedLessons){
  const locks = {};
  for(let i=0;i<sortedLessons.length;i++){
    if(i === 0){
      locks[sortedLessons[i].id] = false; // first unlocked
      continue;
    }
    const prev = sortedLessons[i-1];
    const prevProg = await sbGetProgress(prev.id) || sbDefaultProgress(prev.id);
    locks[sortedLessons[i].id] = !prevProg.completed;
  }
  return locks;
}

/* =========================
   Menu
========================= */
async function loadLessons(){
  lessons = await sbGetAllLessons();
  // stable ordering by updatedAt desc? for progression it should be by creation order.
  // We'll store creation order by updatedAt first time. We'll sort by updatedAt asc.
  lessons.sort((a,b)=>(a.updatedAt||0)-(b.updatedAt||0));
}

async function renderMenu(){
  await loadLessons();
  const list = document.getElementById('lesson-list');
  list.innerHTML = lessons.length ? '' : '<p>No lessons yet. Create one to start!</p>';

  const locks = await computeLocks(lessons);

  for(let i=0;i<lessons.length;i++){
    const lesson = lessons[i];
    const locked = !!locks[lesson.id];
    const prog = await sbGetProgress(lesson.id) || sbDefaultProgress(lesson.id);

    const pages = (lesson.items||[]).length;
    const icon = locked ? '🔒' : (prog.completed ? '🏁' : '📘');

    const div = document.createElement('div');
    div.className = 'lesson-item' + (locked ? ' lock-shade' : '');

    div.innerHTML = `
      <div class="lesson-left">
        <div class="lesson-title">${icon} <span>${lesson.title}</span></div>
        <div class="badges">
          <span class="badge badge-pages">📄 ${pages} pages</span>
          <span class="badge badge-stars">⭐ ${(prog.stars||0)}</span>
          <span class="badge badge-streak">🔥 ${(prog.streak||0)}</span>
          ${locked ? '<span class="badge badge-lock">Locked</span>' : ''}
        </div>
      </div>
      <div class="lesson-actions">
        <button style="background:#4ecdc4;" ${locked?'disabled':''} data-open="${lesson.id}">Open</button>
        <button style="background:#3498db;" ${locked?'disabled':''} data-edit="${lesson.id}">Edit</button>
        <button style="background:#e74c3c;" data-del="${lesson.id}">×</button>
      </div>
    `;
    list.appendChild(div);
  }

  // event delegation
  list.querySelectorAll('button[data-open]').forEach(b=>{
    b.onclick = ()=>openLessonHubById(b.getAttribute('data-open'));
  });
  list.querySelectorAll('button[data-edit]').forEach(b=>{
    b.onclick = ()=>editLessonById(b.getAttribute('data-edit'));
  });
  list.querySelectorAll('button[data-del]').forEach(b=>{
    b.onclick = ()=>deleteLessonById(b.getAttribute('data-del'));
  });
}

/* =========================
   Lesson hub
========================= */
async function openLessonHubById(id){
  const idx = lessons.findIndex(l=>l.id===id);
  if(idx < 0) return;

  currentLessonIndex = idx;
  currentLesson = lessons[idx];
  currentLessonId = currentLesson.id;

  document.getElementById('lesson-page-title').textContent = currentLesson.title || 'Lesson';

  const prog = await sbGetProgress(currentLessonId) || sbDefaultProgress(currentLessonId);
  const wordsCount = (currentLesson.items||[]).length;
  const badgeWrap = document.getElementById('lesson-page-badges');
  if(badgeWrap){
    badgeWrap.innerHTML = `
      <span class="badge badge-pages">📄 ${wordsCount} pages</span>
      <span class="badge badge-stars">⭐ ${prog.stars||0}</span>
      <span class="badge badge-streak">🔥 ${prog.streak||0}</span>
      ${prog.completed ? '<span class="badge">🏁 Completed</span>' : ''}
    `;
  }

  // STUDY-FIRST GATE: lock modes until lesson completed
  const isCompleted = !!prog.completed;

  const btnRead     = document.getElementById('btn-read');
  const btnSmash    = document.getElementById('btn-smash');
  const btnScramble = document.getElementById('btn-scramble');
  const btnFlash    = document.getElementById('btn-flash');
  const btnSentence = document.getElementById('btn-sentence');
  const btnDaily    = document.getElementById('btn-daily');

  function sbGateBtn(btn, enabled){
    if(!btn) return;
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? '1' : '.45';
    btn.style.filter  = enabled ? '' : 'grayscale(0.7)';
    btn.style.pointerEvents = enabled ? '' : 'none';
  }

  // Always allow Read; other modes require completion
  sbGateBtn(btnRead, true);
  sbGateBtn(btnSmash, isCompleted);
  sbGateBtn(btnScramble, isCompleted);
  sbGateBtn(btnFlash, isCompleted);
  sbGateBtn(btnSentence, isCompleted);
  sbGateBtn(btnDaily, isCompleted);

  if(!isCompleted){
    sbToast('📖 Study first: finish Read to unlock games!', 1800);
  }


  // wire buttons
  document.getElementById('btn-read').onclick = ()=>startRead(currentLessonIndex);
  document.getElementById('btn-smash').onclick = ()=>startSmash(currentLessonIndex);
  document.getElementById('btn-scramble').onclick = ()=>startScrambleGame(currentLessonIndex);
  document.getElementById('btn-flash').onclick = ()=>startFlashGame(currentLessonIndex);
  document.getElementById('btn-sentence').onclick = ()=>startSentenceRepeat(currentLessonIndex);
  document.getElementById('btn-daily').onclick = ()=>startDailySpeaking(currentLessonIndex);

  document.getElementById('btn-edit').onclick = ()=>editLessonById(currentLessonId);
  document.getElementById('btn-delete').onclick = ()=>deleteLessonById(currentLessonId);

  showPage('lesson-page');
}

function openLessonHub(index){
  // compatibility helper
  const lesson = lessons[index];
  if(!lesson) return showPage('menu-page');
  openLessonHubById(lesson.id);
}

/* =========================
   Speech: TTS + SpeechRecognition
========================= */
let isMuted = true;

let sbSpeakBusyUntil = 0;
function speakRate(t, rate){
  const now = Date.now();
  if(now < sbSpeakBusyUntil) return;
  sbSpeakBusyUntil = now + 120;
  window.speechSynthesis.cancel();
  setTimeout(()=>{
    window.speechSynthesis.resume();
    const m = new SpeechSynthesisUtterance(t);
    m.rate = typeof rate === 'number' ? rate : 0.85;
    m.lang = 'en-US';
    const voices = window.speechSynthesis.getVoices();
    if(voices && voices.length){
      m.voice = voices.find(v => (v.lang||'').includes('en')) || voices[0];
    }
    window.speechSynthesis.speak(m);
  }, 80);
}

function speak(t){
  speakRate(t, 0.85);
}

// slightly slower for full sentences (clearer for kids)
function speakSentence(t){
  speakRate(t, 0.75);
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
if(recognition){
  recognition.lang = 'en-US';
  recognition.interimResults = false;
}
function startListening(){
  if(!recognition){
    alert('Speech recognition not supported. Try Chrome!');
    return;
  }
  const micBtn = document.querySelector('#reading-page .mic-btn');
  const char = document.getElementById('character');
  recognition.start();
  if(micBtn) micBtn.classList.add('mic-active');
  if(char) char.innerText = '👂';

  recognition.onresult = (event)=>{
    const spokenText = (event.results?.[0]?.[0]?.transcript || '').toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,'');
    const targetClean = (currentLesson.items?.[storyIndex]?.word || '').toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,'');

    if(micBtn) micBtn.classList.remove('mic-active');
    if(char) char.innerText = '👧';

    if(spokenText && (spokenText.includes(targetClean) || targetClean.includes(spokenText))){
      const randomPraise = praises[Math.floor(Math.random()*praises.length)];
      speak(randomPraise);
      document.getElementById('reader-text').style.color = '#2ecc71';
      setTimeout(()=>document.getElementById('reader-text').style.color = 'inherit', 900);
      // reward small star for reading speaking
      sbAwardStar(currentLessonId, 1);
    }else{
      speak('Try again!');
      if(char) char.innerText = '❌';
    }
  };
  recognition.onerror = ()=>{
    if(micBtn) micBtn.classList.remove('mic-active');
    if(char) char.innerText = '👧';
  };
}

/* =========================
   READ MODE
========================= */
function startRead(i){
  currentLesson = lessons[i];
  currentLessonId = currentLesson.id;
  currentLessonIndex = i;
  storyIndex = 0;
  showPage('reading-page');
  updateStoryPage();
}

async function updateStoryPage(){
  const item = currentLesson.items[storyIndex];
  document.getElementById('story-title-display').innerText = currentLesson.title;
  document.getElementById('reader-img').src = await sbResolveImageSrc(item.image);
  document.getElementById('reader-text').innerText = item.word;
  document.getElementById('page-counter').innerText = `${storyIndex+1} / ${currentLesson.items.length}`;

  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  prevBtn.disabled = (storyIndex === 0);

  const isLast = (storyIndex === currentLesson.items.length - 1);
  if(isLast){
    nextBtn.innerText = 'Finish! 🏁';
    nextBtn.onclick = showStoryFinalScore;
  }else{
    nextBtn.innerText = 'Next ▶';
    nextBtn.onclick = ()=>{ storyIndex++; updateStoryPage(); };
  }

  speak(item.word);
}

function changePage(dir){
  storyIndex += dir;
  if(storyIndex < 0) storyIndex = 0;
  if(storyIndex > currentLesson.items.length-1) storyIndex = currentLesson.items.length-1;
  updateStoryPage();
}

function repeatText(){
  const onRead = !document.getElementById('reading-page').classList.contains('hidden');
  const text = onRead ? (currentLesson.items?.[storyIndex]?.word || '') : (currentTarget?.word || '');
  if(text) speak(text);
}

async function showStoryFinalScore(){
  window.speechSynthesis.cancel();
  speak('Congratulations! You finished the whole story! Great reading!');

  await sbMarkCompleted(currentLessonId);
  await sbRecordWin(currentLessonId);
  await sbAwardStar(currentLessonId, 3); // completion bonus

  const overlay = document.getElementById('success-overlay');
  const msg = document.getElementById('success-msg');
  const media = document.getElementById('success-img');

  msg.innerText = 'STORY COMPLETE!';
  media.src = 'https://via.placeholder.com/360x240?text=🏆+Great+Job!';
  overlay.classList.remove('hidden');

  overlay.onclick = ()=>{
    overlay.classList.add('hidden');
    openLessonHub(currentLessonIndex);
  };
}

/* =========================
   SMASH
========================= */
function startSmash(i){
  currentLesson = lessons[i];
  currentLessonId = currentLesson.id;
  currentLessonIndex = i;
  showPage('smash-page');
  nextSmashRound();
}

async function nextSmashRound(){
  const overlay = document.getElementById('success-overlay');
  overlay.classList.add('hidden');

  const arena = document.getElementById('smash-arena');
  arena.innerHTML = '';
  currentTarget = currentLesson.items[Math.floor(Math.random()*currentLesson.items.length)];
  const shuffled = [...currentLesson.items].sort(()=>0.5 - Math.random());

  shuffled.forEach(item=>{
    const b = document.createElement('div');
    b.className = 'word-box';
    b.innerText = item.word;
    b.onclick = async ()=>{
      if(item.word === currentTarget.word){
        const randomPraise = praises[Math.floor(Math.random()*praises.length)];
        speak(randomPraise);
        await sbAwardStar(currentLessonId, 1);
        await sbRecordWin(currentLessonId);

        document.getElementById('success-msg').innerText = 'GREAT JOB!';
        document.getElementById('success-img').src = await sbResolveImageSrc(item.image);
        overlay.classList.remove('hidden');
        overlay.onclick = nextSmashRound;
      }else{
        sbSayTryAgain();
      }
    };
    arena.appendChild(b);
  });

  speak(currentTarget.word);
}

/* =========================
   SCRAMBLE (Sentence rebuild)
========================= */
let originalSentence = "";
let currentAttempt = [];
let scrambleQueue = [];
let currentScrambleIndex = 0;

function toggleMute(forceState){
  if(typeof forceState === 'boolean') isMuted = forceState;
  else isMuted = !isMuted;

  const muteBtn = document.getElementById('mute-btn');
  const repeatCont = document.getElementById('repeat-mic');
  if(isMuted){
    muteBtn.innerText = '🔇 Sound: OFF';
    muteBtn.style.background = '#ff4757';
    if(repeatCont) repeatCont.classList.add('hidden');
    window.speechSynthesis.cancel();
  }else{
    muteBtn.innerText = '🔊 Sound: ON';
    muteBtn.style.background = '#57606f';
    if(repeatCont) repeatCont.classList.remove('hidden');
  }
}

function startScrambleGame(lessonIndex){
  window.speechSynthesis.cancel();
  toggleMute(true);

  currentLesson = lessons[lessonIndex];
  currentLessonId = currentLesson.id;
  currentLessonIndex = lessonIndex;

  scrambleQueue = [...currentLesson.items];
  currentScrambleIndex = 0;

  setupScrambleRound();
  showPage('scramble-page');
}

function repeatSentence(){
  if(originalSentence && !isMuted){
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(originalSentence);
    msg.rate = 0.7;
    window.speechSynthesis.speak(msg);
  }
}

function setupScrambleRound(){
  const item = scrambleQueue[currentScrambleIndex];
  originalSentence = (item.word||"").toUpperCase();
  currentAttempt = [];

  const target = document.getElementById('sentence-target');
  const pool = document.getElementById('word-pool');
  target.innerHTML = '';
  pool.innerHTML = '';
  document.getElementById('check-sentence-btn').style.display = 'none';
  document.getElementById('scramble-char').innerText = '🚂';

  const words = originalSentence.split(" ").filter(Boolean);
  const shuffled = [...words].sort(()=>0.5 - Math.random());

  shuffled.forEach((word)=>{
    const span = document.createElement('div');
    span.className = 'word-box';
    span.style.padding = '10px 16px';
    span.innerText = word;
    span.onclick = ()=>moveToTarget(span, word);
    pool.appendChild(span);
  });

  if(!isMuted) repeatSentence();
}

function moveToTarget(element, word){
  const target = document.getElementById('sentence-target');
  target.appendChild(element);
  currentAttempt.push(word);

  element.onclick = ()=>{
    document.getElementById('word-pool').appendChild(element);
    currentAttempt = currentAttempt.filter(w => w !== word);
    element.onclick = ()=>moveToTarget(element, word);
    document.getElementById('check-sentence-btn').style.display = 'none';
  };

  const totalWords = originalSentence.split(" ").filter(Boolean).length;
  if(target.children.length === totalWords){
    document.getElementById('check-sentence-btn').style.display = 'inline-block';
  }
}

async function checkSentence(){
  const target = document.getElementById('sentence-target');
  const attemptString = Array.from(target.children).map(el => el.innerText).join(" ");

  const overlay = document.getElementById('success-overlay');
  const msg = document.getElementById('success-msg');
  const media = document.getElementById('success-img');

  if(attemptString === originalSentence){
    speak('Great job!');
    document.getElementById('scramble-char').innerText = '🥳';

    await sbAwardStar(currentLessonId, 1);
    await sbRecordWin(currentLessonId);

    if(currentScrambleIndex < scrambleQueue.length - 1){
      msg.innerText = 'NEXT SENTENCE!';
      media.src = 'https://via.placeholder.com/360x240?text=🎯+Next!';
      overlay.classList.remove('hidden');
      overlay.onclick = ()=>{
        overlay.classList.add('hidden');
        currentScrambleIndex++;
        setupScrambleRound();
      };
    }else{
      // completed
      await sbMarkCompleted(currentLessonId);
      await sbAwardStar(currentLessonId, 2);

      msg.innerText = 'STORY COMPLETE!';
      media.src = 'https://via.placeholder.com/360x240?text=🏆+Complete!';
      overlay.classList.remove('hidden');
      overlay.onclick = ()=>{
        overlay.classList.add('hidden');
        openLessonHub(currentLessonIndex);
      };
    }
  }else{
    speak('Try again.');
    document.getElementById('scramble-char').innerText = '🤔';
  }
}

/* =========================
   FLASH
========================= */
let flashScore = 0;
let flashTimer;
let currentFlashItem = null;
let flashDuration = 3000;

function startFlashGame(index){
  currentLesson = lessons[index];
  currentLessonId = currentLesson.id;
  currentLessonIndex = index;

  flashScore = 0;
  flashDuration = 3000;
  document.getElementById('flash-score').innerText = flashScore;

  showPage('flash-page');
  nextFlashRound();
}

async function nextFlashRound(){
  const flashZone = document.getElementById('flash-zone');
  const optionsArea = document.getElementById('flash-options');
  const timerFill = document.getElementById('flash-timer-fill');

  flashZone.innerHTML = '';
  optionsArea.innerHTML = '';
  timerFill.style.width = '100%';

  currentFlashItem = currentLesson.items[Math.floor(Math.random()*currentLesson.items.length)];

  const showImage = Math.random() > 0.5 && currentFlashItem.image;
  if(showImage){
    const src = await sbResolveImageSrc(currentFlashItem.image);
    flashZone.innerHTML = src ? `<img src="${String(src).replace(/"/g,'')}" style="max-height:140px; border-radius:10px;">` : currentFlashItem.word;
  }else{
    flashZone.innerHTML = currentFlashItem.word;
  }

  let startTime = Date.now();
  clearInterval(flashTimer);
  flashTimer = setInterval(()=>{
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, 100 - (elapsed / flashDuration * 100));
    timerFill.style.width = remaining + '%';
    if(elapsed >= flashDuration){
      clearInterval(flashTimer);
      hideFlashAndShowOptions();
    }
  }, 50);
}

function hideFlashAndShowOptions(){
  const flashZone = document.getElementById('flash-zone');
  const optionsArea = document.getElementById('flash-options');

  flashZone.innerHTML = '❓';

  const shuffledOptions = [...currentLesson.items].sort(()=>0.5 - Math.random()).slice(0, 4);
  if(!shuffledOptions.find(o => o.word === currentFlashItem.word)) shuffledOptions[0] = currentFlashItem;
  shuffledOptions.sort(()=>0.5 - Math.random());

  shuffledOptions.forEach(item=>{
    const btn = document.createElement('div');
    btn.className = 'word-box';
    btn.innerText = item.word;
    btn.onclick = ()=>checkFlashAnswer(item);
    optionsArea.appendChild(btn);
  });
}

async function checkFlashAnswer(selectedItem){
  if(selectedItem.word === currentFlashItem.word){
    flashScore++;
    document.getElementById('flash-score').innerText = flashScore;
    if(flashDuration > 1000) flashDuration -= 150;

    const praise = praises[Math.floor(Math.random()*praises.length)];
    speak(praise);
    await sbAwardStar(currentLessonId, 1);
    await sbRecordWin(currentLessonId);

    nextFlashRound();
  }else{
    speak('Whoops! Try again.');
    flashDuration = 3000;
    nextFlashRound();
  }
}

/* =========================
   Sentence Repeat + Daily Speaking (uses repeatRecognition)
========================= */
function sbNormalizeSpeech(s){
  return (s||"").toLowerCase().trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"")
    .replace(/\s+/g," ");
}


function sbGetSpeechTranscript(event){
  try{
    if(!event || !event.results || event.results.length === 0) return "";
    const i = (typeof event.resultIndex === "number") ? event.resultIndex : (event.results.length - 1);
    const t = (event.results?.[i]?.[0]?.transcript || event.results?.[event.results.length-1]?.[0]?.transcript || event.results?.[0]?.[0]?.transcript || "");
    return (t || "");
  }catch(e){
    return "";
  }
}
function sbSentenceScore(spoken, target){
  const s = sbNormalizeSpeech(spoken);
  const t = sbNormalizeSpeech(target);
  if(!s || !t) return 0;
  const sw = s.split(" ");
  const tw = t.split(" ");
  const tset = new Set(tw);
  let match = 0;
  for(const w of sw){ if(tset.has(w)) match++; }
  let score = match / Math.max(1, tw.length);
  if(sw[0] && tw[0] && sw[0] === tw[0]) score += 0.08;
  if(sw[sw.length-1] && tw[tw.length-1] && sw[sw.length-1] === tw[tw.length-1]) score += 0.08;
  return Math.min(1, score);
}

function sbApplyWordColors(prefixId, targetWords, spokenNorm){
  const spokenWords = new Set(sbNormalizeSpeech(spokenNorm).split(' ').filter(Boolean));
  let matched = 0;
  for(let i=0;i<(targetWords||[]).length;i++){
    const tw = targetWords[i];
    const el = document.getElementById(`${prefixId}-${i}`);
    if(!el) continue;
    const hit = tw && spokenWords.has(tw);
    if(hit){
      matched++;
      el.style.color = '#2ecc71';
    }else{
      el.style.color = '#e74c3c';
    }
  }
  return matched;
}

// Daily seeded shuffle
function sbHashString(str){
  let h = 2166136261;
  for(let i=0;i<str.length;i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function sbMulberry32(seed){
  return function(){
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function sbSeededShuffle(arr, seedStr){
  const a = [...arr];
  const rng = sbMulberry32(sbHashString(seedStr));
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(rng() * (i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sbDateKeyLocal(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

const RepeatRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let repeatRecognition = null;
let repeatIsListening = false;
let repeatLastStartTs = 0;

// Listening patience (Option B): auto-restart once if the mic ends too quickly
let sbListenStartedAt = 0;
let sbListenMinMs = 2200; // increase (2500-3000) if you want even more time before auto-restart

function sbMicStop(){
  try{ repeatRecognition && repeatRecognition.stop(); }catch(e){}
}

// Option A + tap fallback: hold-to-talk, short tap behaves like normal tap-to-speak
function sbBindHoldToTalk(btnId, startFn){
  const btn = document.getElementById(btnId);
  if(!btn) return;

  let downAt = 0;

  btn.addEventListener('pointerdown', (e)=>{
    e.preventDefault();
    downAt = Date.now();
    startFn();
  });

  btn.addEventListener('pointerup', (e)=>{
    e.preventDefault();
    const heldMs = Date.now() - downAt;

    // If the user held the button, we stop listening on release.
    // If it was a quick tap, we let recognition decide when to end naturally.
    if(heldMs >= 260){
      sbMicStop();
    }
  });

  btn.addEventListener('pointercancel', ()=> sbMicStop());
  // Don't auto-stop on leave; kids often drag their finger
  btn.addEventListener('pointerleave',  ()=> {});
}

if(RepeatRecognition){
  repeatRecognition = new RepeatRecognition();
  repeatRecognition.lang = 'en-US';
  repeatRecognition.interimResults = false;
}

let speakSession = { mode:'', queue:[], current:null, index:0, correct:0, total:0, dailyKey:'' };

function startSentenceRepeat(index){
  currentLesson = lessons[index];
  currentLessonId = currentLesson.id;
  currentLessonIndex = index;

  const items = (currentLesson.items||[]);
  let pool = items.filter(it => (it.word||'').trim().includes(' '));
  if(pool.length === 0) pool = items;

  if(!pool.length){ sbToast('No pages yet.'); return; }

  speakSession.mode = 'sentence';
  speakSession.queue = [...pool].sort(()=>0.5 - Math.random());
  speakSession.current = null;

  showPage('sentence-page');
  nextSentencePrompt();
}

async function nextSentencePrompt(){
  try{ repeatRecognition && repeatRecognition.abort(); }catch(e){}
  cleanupSpeakUI();

  // Reset UI for a fresh prompt
  const micBtn = document.getElementById('sentence-mic-btn');
  const nextBtn = document.getElementById('sentence-next-btn');
  const fb = document.getElementById('sentence-feedback');
  if(nextBtn){ nextBtn.style.display='none'; nextBtn.textContent='Next ▶'; }
  if(micBtn){ micBtn.disabled = false; micBtn.style.opacity = '1'; }
  if(fb) fb.innerText = '';

  // Completion screen (NO auto-jump)
  if(!speakSession.queue || speakSession.queue.length === 0){
    const promptEl = document.getElementById('sentence-prompt');
    if(promptEl) promptEl.innerHTML = '🏆 All done!';
    const imgEl = document.getElementById('sentence-img');
    if(imgEl){ imgEl.style.display='none'; imgEl.src=''; }

    if(nextBtn){
      nextBtn.style.display='inline-block';
      nextBtn.textContent='Back to Lesson';
    }
    if(micBtn){ micBtn.disabled = true; micBtn.style.opacity='0.5'; }
    speak('Great speaking!');
    speakSession.sentenceAwaitNext = false;
    speakSession.sentenceComplete = true;
    return;
  }

  speakSession.sentenceComplete = false;
  speakSession.sentenceAwaitNext = false;

  speakSession.current = speakSession.queue.pop();
  const text = speakSession.current.word || '';
  const imgUrl = speakSession.current.image || '';

  // Image
  const imgEl = document.getElementById('sentence-img');
  if(imgEl){
    if(imgUrl && imgUrl !== 'https://via.placeholder.com/300x200?text=No+Image'){
      imgEl.src = await sbResolveImageSrc(imgUrl);
      imgEl.style.display = 'inline-block';
    }else{
      imgEl.style.display = 'none';
      imgEl.src = '';
    }
  }

  // Word spans for coloring
  const words = text.split(/\s+/);
  const promptEl = document.getElementById('sentence-prompt');
  if(promptEl){
    promptEl.innerHTML = words.map((w,i)=>`<span id="sentence-word-${i}" style="transition:color .25s;">${w}</span>`).join(' ');
  }

  // Prepare targets
  speakSession.targetWords = words.map(w=>sbNormalizeSpeech(w));
  speakSession.wordsMatched = 0;

  // Speak first (slower for sentences)
  speakSentence(text);
}

function sentenceNext(){
  // If completed, go back (NO surprise navigation)
  if(speakSession.sentenceComplete){
    openLessonHub(currentLessonIndex);
    return;
  }
  if(!speakSession.sentenceAwaitNext) return;
  nextSentencePrompt();
}


document.addEventListener('DOMContentLoaded', ()=>{
  const sMic = document.getElementById('sentence-mic-btn');
  if(sMic){
    let last = 0;
    sMic.addEventListener('click', (e)=>{
      try{ e && e.preventDefault && e.preventDefault(); e && e.stopPropagation && e.stopPropagation(); }catch(_){}
      const now = Date.now();
      if(now - last < 500) return; // avoid ghost/double click on mobile
      last = now;
      triggerSentenceMic();
    }, {passive:false});
  }

  const dMic = document.getElementById('daily-mic-btn');
  if(dMic){
    let last = 0;
    dMic.addEventListener('click', (e)=>{
      try{ e && e.preventDefault && e.preventDefault(); e && e.stopPropagation && e.stopPropagation(); }catch(_){}
      const now = Date.now();
      if(now - last < 500) return;
      last = now;
      triggerDailyMic();
    }, {passive:false});
  }

  const sNext = document.getElementById('sentence-next-btn');
  if(sNext) sNext.addEventListener('click', sentenceNext);
  const dNext = document.getElementById('daily-next-btn');
  if(dNext) dNext.addEventListener('click', dailyNext);
});

function triggerSentenceMic(){
  // Mobile: show helpful message if unsupported or insecure context
  if(!sbMicEnvHint()) return;

  if(!repeatRecognition){ sbToast('❌ Speech recognition not supported on this device/browser.', 2400); return; }
  if(repeatIsListening){ return; }

  const now = Date.now();
  if(now - repeatLastStartTs < 350) return;
  repeatLastStartTs = now;

  try{ repeatRecognition.abort(); }catch(e){}
  repeatIsListening = true;
  let sbGotResult = false;
  let sbAutoRestarted = false;
  sbListenStartedAt = Date.now();

  const micBtn = document.getElementById('sentence-mic-btn');
  if(micBtn){
    micBtn.classList.add('mic-active');
    micBtn.textContent = '👂 Listening...';
  }
  function resetBtn(){
    if(micBtn){
      micBtn.classList.remove('mic-active');
      micBtn.textContent = '🎤 Tap to Speak';
    }
  }
  repeatRecognition.onstart = ()=>{
    // Set UI only when recognition really starts (mobile-safe)
    if(micBtn){
      micBtn.classList.add('mic-active');
      micBtn.textContent = '👂 Listening...';
    }
  };


  repeatRecognition.onresult = async (event)=>{
    sbGotResult = true;
    repeatIsListening = false;
    resetBtn();

    const spoken = sbGetSpeechTranscript(event);
    if(!spoken || !spoken.trim()){
      document.getElementById('sentence-feedback').innerText = "❌ I didn't hear anything. Try again!";
      sbSayTryAgain();
      return;
    }
    const target = (speakSession.current?.word || '');
    // Color words based on what was recognized
    const targetWords = Array.isArray(speakSession.targetWords) ? speakSession.targetWords : [];
    const matched = sbApplyWordColors('sentence-word', targetWords, spoken);
    const score = targetWords.length ? (matched / targetWords.length) : sbSentenceScore(spoken, target);
    const pass = score >= 0.75;

    if(pass){
      try{ repeatRecognition.abort(); }catch(e){}
      await sbAwardStar(currentLessonId, 1);
      await sbRecordWin(currentLessonId);
      document.getElementById('sentence-feedback').innerText = `✅ Correct! (${Math.round(score*100)}%)`;
      speak('Great job!');
      // Wait for user click to continue
      const nextBtn = document.getElementById('sentence-next-btn');
      const micBtn = document.getElementById('sentence-mic-btn');
      if(nextBtn){ nextBtn.style.display='inline-block'; nextBtn.textContent='Next ▶'; }
      if(micBtn){ micBtn.disabled = true; micBtn.style.opacity='0.5'; }
      speakSession.sentenceAwaitNext = true;
    }else{
      document.getElementById('sentence-feedback').innerText = `❌ Not yet. (${Math.round(score*100)}%)`;
      sbSayTryAgain();
    }
  };
  repeatRecognition.onerror = ()=>{ repeatIsListening=false; resetBtn(); };
  repeatRecognition.onend   = ()=>{
    const elapsed = Date.now() - (sbListenStartedAt || Date.now());
    if(!sbGotResult && !sbAutoRestarted && elapsed < sbListenMinMs){
      sbAutoRestarted = true;
      try{ repeatRecognition.abort(); }catch(e){}
      repeatIsListening = true;
      if(micBtn){ micBtn.classList.add('mic-active'); micBtn.textContent = '👂 Listening...'; }
      sbListenStartedAt = Date.now();
      setTimeout(()=>{ try{ repeatRecognition.start(); }catch(e){} }, 120);
      return;
    }
    repeatIsListening=false;
    resetBtn();
  };

  // Some mobile browsers are picky; defer start a tick after the tap
  setTimeout(()=>{
    try{
      repeatRecognition.start();
    }catch(e){
      repeatIsListening=false;
      resetBtn();
      sbToast(`🎤 Could not start mic: ${(e && (e.name||e.message)) ? (e.name||e.message) : 'unknown error'}. Check HTTPS + permission.`, 2800);
      try{ repeatRecognition.abort(); }catch(_){}
    }
  }, 30)
}

function startDailySpeaking(index){
  currentLesson = lessons[index];
  currentLessonId = currentLesson.id;
  currentLessonIndex = index;

  const items = (currentLesson.items||[]);
  if(!items.length){ sbToast('No pages yet.'); return; }

  const dateKey = sbDateKeyLocal();
  const dailyKey = `sbDailySpeak:${currentLesson.title}:${dateKey}`;
  speakSession.dailyKey = dailyKey;

  const saved = JSON.parse(localStorage.getItem(dailyKey) || 'null');
  const alreadyDone = !!(saved && saved.completed);

  const pool = sbSeededShuffle(items, dailyKey);
  const queue = pool.slice(0, Math.min(5, pool.length));

  speakSession.mode = 'daily';
  speakSession.queue = queue;
  speakSession.index = 0;
  speakSession.correct = 0;
  speakSession.total = queue.length;

  showPage('daily-page');

  document.getElementById('daily-status').innerText =
    alreadyDone ? `✅ Daily bonus already claimed today (${dateKey}). Practice mode still works.`
               : `💎 Finish ${speakSession.total} prompts to claim today's bonus!`;

  nextDailyPrompt();
}

async function nextDailyPrompt(){
  try{ repeatRecognition && repeatRecognition.abort(); }catch(e){}
  cleanupSpeakUI();

  const micBtn = document.getElementById('daily-mic-btn');
  const nextBtn = document.getElementById('daily-next-btn');
  const fb = document.getElementById('daily-feedback');

  // reset UI
  if(nextBtn){ nextBtn.style.display='none'; nextBtn.textContent='Next ▶'; }
  if(micBtn){ micBtn.disabled = false; micBtn.style.opacity = '1'; }
  if(fb) fb.innerText = '';

  // If finished, show a completion screen and wait for click
  if(speakSession.index >= (speakSession.queue ? speakSession.queue.length : 0)){
    showDailyCompleteScreen();
    return;
  }

  speakSession.dailyAwaitNext = false;
  speakSession.dailyComplete = false;

  speakSession.current = speakSession.queue[speakSession.index];
  const text = speakSession.current.word || '';
  const imgUrl = speakSession.current.image || '';

  // Word spans (so we can color matches)
  const words = text.split(/\s+/);
  const promptEl = document.getElementById('daily-prompt');
  if(promptEl){
    promptEl.innerHTML = words.map((w,i)=>`<span id="daily-word-${i}" style="transition:color .25s;">${w}</span>`).join(' ');
  }

  // Image
  const imgEl = document.getElementById('daily-img');
  if(imgEl){
    if(imgUrl && imgUrl !== 'https://via.placeholder.com/300x200?text=No+Image'){
      imgEl.src = await sbResolveImageSrc(imgUrl);
      imgEl.style.display = 'inline-block';
    }else{
      imgEl.style.display = 'none';
      imgEl.src = '';
    }
  }

  // Counter
  const counter = document.getElementById('daily-counter');
  if(counter){
    counter.innerText = `Prompt ${speakSession.index + 1} / ${speakSession.total} • Correct: ${speakSession.correct}`;
  }

  // Prepare targets for coloring
  speakSession.wordsMatched = 0;
  speakSession.targetWords = words.map(w => sbNormalizeSpeech(w));

  // Speak first: sentence slower, single word normal
  const isSentence = sbNormalizeSpeech(text).includes(' ');
  if(isSentence) speakSentence(text);
  else speak(text);
}

function cleanupSpeakUI() {
  const sMic = document.getElementById('sentence-mic-btn');
  const dMic = document.getElementById('daily-mic-btn');

  if(sMic) {
    sMic.classList.remove('mic-active');
    sMic.textContent = '🎤 Tap to Speak';
  }
  if(dMic) {
    dMic.classList.remove('mic-active');
    dMic.textContent = '🎤 Tap to Speak';
  }
  repeatIsListening = false;
}
function showDailyCompleteScreen(){
  const promptEl = document.getElementById('daily-prompt');
  const fb = document.getElementById('daily-feedback');
  const nextBtn = document.getElementById('daily-next-btn');
  const micBtn = document.getElementById('daily-mic-btn');
  const imgEl = document.getElementById('daily-img');

  if(promptEl) promptEl.innerHTML = '🏆 Daily complete!';
  if(fb) fb.innerText = `You got ${speakSession.correct} / ${speakSession.total} correct.`;
  if(imgEl){ imgEl.style.display='none'; imgEl.src=''; }

  if(nextBtn){
    nextBtn.style.display='inline-block';
    nextBtn.textContent='Claim & Back';
  }
  if(micBtn){ micBtn.disabled = true; micBtn.style.opacity='0.5'; }

  speak('Daily complete.');
  speakSession.dailyComplete = true;
  speakSession.dailyAwaitNext = false;
}

function dailyNext(){
  // If completion screen, claim bonus + go back
  if(speakSession.dailyComplete){
    finishDailySpeaking();
    return;
  }
  if(!speakSession.dailyAwaitNext) return;
  // advance to next prompt after user click
  speakSession.dailyAwaitNext = false;
  speakSession.index++;
  nextDailyPrompt();
}


function triggerDailyMic(){
  // Mobile: show helpful message if unsupported or insecure context
  if(!sbMicEnvHint()) return;

  if(!repeatRecognition){ sbToast('❌ Speech recognition not supported on this device/browser.', 2400); return; }

  const micBtn = document.getElementById('daily-mic-btn');

  if(repeatIsListening){ return; }

  const now = Date.now();
  if(now - repeatLastStartTs < 350) return;
  repeatLastStartTs = now;

  try{ repeatRecognition.abort(); }catch(e){}
  repeatIsListening = true;
  let sbGotResult = false;
  let sbAutoRestarted = false;
  sbListenStartedAt = Date.now();

  if(micBtn){
    micBtn.classList.add('mic-active');
    micBtn.textContent = '👂 Listening...';
  }
  function resetBtn(){
    if(micBtn){
      micBtn.classList.remove('mic-active');
      micBtn.textContent = '🎤 Tap to Speak';
    }
  }
  repeatRecognition.onstart = ()=>{
    // Set UI only when recognition really starts (mobile-safe)
    if(micBtn){
      micBtn.classList.add('mic-active');
      micBtn.textContent = '👂 Listening...';
    }
  };


  repeatRecognition.onresult = async (event)=>{
    sbGotResult = true;
    repeatIsListening = false;
    resetBtn();

    const spokenRaw = sbGetSpeechTranscript(event);
    if(!spokenRaw || !spokenRaw.trim()){
      document.getElementById('daily-feedback').innerText = "❌ I didn't hear anything. Try again!";
      sbSayTryAgain();
      return;
    }
    const targetRaw = (speakSession.current?.word || '');

    const targetNorm = sbNormalizeSpeech(targetRaw);
    const spokenNorm = sbNormalizeSpeech(spokenRaw);

    const isSentence = targetNorm.includes(' ');
    let pass = false;
    let scorePct = 0;

    if(isSentence){
      // Color words based on what was recognized
      const targetWords = Array.isArray(speakSession.targetWords) ? speakSession.targetWords : [];
      const matched = sbApplyWordColors('daily-word', targetWords, spokenRaw);
      const score = targetWords.length ? (matched / targetWords.length) : sbSentenceScore(spokenRaw, targetRaw);
      scorePct = Math.round(score * 100);
      pass = score >= 0.75;
    }else{
      // Word target: mark it green if it matches; otherwise red
      const hit = (spokenNorm.includes(targetNorm) || targetNorm.includes(spokenNorm)) && spokenNorm.length > 0;
      sbApplyWordColors('daily-word', Array.isArray(speakSession.targetWords) ? speakSession.targetWords : [targetNorm], spokenRaw);
      scorePct = hit ? 100 : 0;
      pass = hit;
    }

    if(pass){
      try{ repeatRecognition.abort(); }catch(e){}
      speakSession.correct++;
      await sbAwardStar(currentLessonId, 1);
      await sbRecordWin(currentLessonId);

      document.getElementById('daily-feedback').innerText = `✅ Correct! (${scorePct}%)`;
      speak('Great job!');

      // Wait for user click to continue
      const nextBtn = document.getElementById('daily-next-btn');
      const micBtn = document.getElementById('daily-mic-btn');
      if(nextBtn){
        nextBtn.style.display='inline-block';
        const isLast = (speakSession.index >= speakSession.total - 1);
        nextBtn.textContent = isLast ? 'Finish 🏁' : 'Next ▶';
      }
      if(micBtn){ micBtn.disabled = true; micBtn.style.opacity='0.5'; }
      speakSession.dailyAwaitNext = true;
    }else{
      document.getElementById('daily-feedback').innerText = `❌ Not yet. (${scorePct}%)`;
      sbSayTryAgain();
    }
  };

  repeatRecognition.onerror = ()=>{ repeatIsListening=false; resetBtn(); };
  repeatRecognition.onend   = ()=>{
    const elapsed = Date.now() - (sbListenStartedAt || Date.now());
    if(!sbGotResult && !sbAutoRestarted && elapsed < sbListenMinMs){
      sbAutoRestarted = true;
      try{ repeatRecognition.abort(); }catch(e){}
      repeatIsListening = true;
      if(micBtn){ micBtn.classList.add('mic-active'); micBtn.textContent = '👂 Listening...'; }
      sbListenStartedAt = Date.now();
      setTimeout(()=>{ try{ repeatRecognition.start(); }catch(e){} }, 120);
      return;
    }
    repeatIsListening=false;
    resetBtn();
  };

  // Some mobile browsers are picky; defer start a tick after the tap
  setTimeout(()=>{
    try{
      repeatRecognition.start();
    }catch(e){
      repeatIsListening=false;
      resetBtn();
      sbToast(`🎤 Could not start mic: ${(e && (e.name||e.message)) ? (e.name||e.message) : 'unknown error'}. Check HTTPS + permission.`, 2800);
      try{ repeatRecognition.abort(); }catch(_){}
    }
  }, 30)
}

async function finishDailySpeaking(){
  try{ repeatRecognition && repeatRecognition.abort(); }catch(e){}
  repeatIsListening = false;

  const dateKey = sbDateKeyLocal();
  const dailyKey = speakSession.dailyKey;
  const saved = JSON.parse(localStorage.getItem(dailyKey) || 'null');
  const alreadyDone = !!(saved && saved.completed);

  const total = speakSession.total || 1;
  const correct = speakSession.correct || 0;

  speak(`Daily complete. You got ${correct} out of ${total}.`);

  if(!alreadyDone){
    const bonus = Math.max(1, Math.round(5 * (correct / total)));
    await sbAwardStar(currentLessonId, bonus);
    await sbRecordWin(currentLessonId);

    localStorage.setItem(dailyKey, JSON.stringify({ completed:true, dateKey, correct, total, bonus }));
    sbToast(`💎 Daily bonus claimed! +${bonus} ⭐`, 1800);
  }else{
    sbToast('✅ Daily already claimed. Practice anytime!', 1600);
  }

  openLessonHub(currentLessonIndex);
}

/* =========================
   Export / Import / Reset
========================= */
async function sbExport(){
  await loadLessons();
  const payload = [];
  for(const l of lessons){
    const prog = await sbGetProgress(l.id) || sbDefaultProgress(l.id);
    payload.push({ lesson:l, progress:prog });
  }
  const assets = await sbGetAllAssets();
  const blob = new Blob([JSON.stringify({version:2, exportedAt:Date.now(), data:payload, assets}, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'reading_lessons_export.json';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 500);
}

document.getElementById('sb-import').addEventListener('change', async (e)=>{
  const f = e.target.files?.[0];
  if(!f) return;
  try{
    const text = await f.text();
    const json = JSON.parse(text);
    const data = json.data || [];
    const assets = json.assets || [];
    for(const a of assets){ if(a && a.id && a.dataUrl) await sbPutAsset(a); }
    for(const row of data){
      if(row.lesson && row.lesson.id){
        await sbPutLesson(row.lesson);
        if(row.progress && row.progress.lessonId){
          await sbPutProgress(row.progress);
        }
      }
    }
    sbToast('⬆ Imported!');
    await loadLessons();
    showPage('menu-page');
  }catch(err){
    console.error(err);
    alert('Import failed (invalid file).');
  }finally{
    e.target.value = '';
  }
});

async function sbResetAll(){
  if(!confirm('Reset ALL lessons + progress?')) return;
  // wipe DB by deleting database
  indexedDB.deleteDatabase(SB_DB_NAME);
  localStorage.removeItem('myAdvancedLessons');
  sbToast('🧹 Reset done. Reloading...');
  setTimeout(()=>location.reload(), 900);
}

/* =========================
   Boot
========================= */
(async function boot(){
  await sbMigrateIfNeeded();
  await loadLessons();
  showPage('menu-page');
})();
        }).call(window);
      } catch (e) {
        console.error('Legacy boot error:', e);
      }
    });
