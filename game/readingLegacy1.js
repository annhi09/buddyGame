// =====================================================
// readingLegacy.js - ULTRA FULL FIXED VERSION
// All features preserved + Sentence Repeat & Daily Speaking fully fixed
// Hear Again button and Next buttons now work correctly
// =====================================================

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
      }

      function sbMicEnvHint(){
        try{
          const proto = location.protocol || '';
          const host = location.hostname || '';
          const secureOk = window.isSecureContext || proto === 'https:' || host === 'localhost' || host === '127.0.0.1';
          if(!secureOk){
            sbToast('🎤 Microphone requires HTTPS or localhost.', 2600);
            return false;
          }
          return true;
        }catch(e){ return true; }
      }

      /* =========================
         TTS Safe
      ========================= */
      let sbTtsLastAt = 0;
      let sbTtsLastText = "";
      function speak(t, opts={}){
        const now = Date.now();
        const text = String(t||"");
        if(text && text === sbTtsLastText && (now - sbTtsLastAt) < 650) return;
        sbTtsLastAt = now;
        sbTtsLastText = text;

        try{ window.speechSynthesis.cancel(); }catch(e){}
        if(!text.trim()) return;

        setTimeout(()=>{
          try{ window.speechSynthesis.resume(); }catch(e){}
          const u = new SpeechSynthesisUtterance(text);
          u.rate = opts.rate ?? 0.85;
          u.lang = opts.lang ?? 'en-US';
          try{
            const voices = window.speechSynthesis.getVoices();
            if(voices?.length) u.voice = voices.find(v => (v.lang||'').includes('en')) || voices[0];
          }catch(e){}
          window.speechSynthesis.speak(u);
        }, 90);
      }

      function speakSentence(t){ speak(t, {rate: 0.75}); }

      let sbLastTryAgainAt = 0;
      function sbSayTryAgain(){
        const now = Date.now();
        if(now - sbLastTryAgainAt < 1400) return;
        sbLastTryAgainAt = now;
        speak("Try again", {rate:0.9});
      }

      /* =========================
         Win FX
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
      function sbSetParentLocked(v){ localStorage.setItem(sbLockedKey(), v ? '1' : '0'); }

      function sbApplyParentMode(){
        const locked = sbIsParentLocked();
        const menu = document.getElementById('menu-page');
        if(menu){
          menu.querySelectorAll('button').forEach(b => {
            const txt = (b.textContent||'').toLowerCase();
            if(txt.includes('create') || txt.includes('export') || txt.includes('import') || txt.includes('reset')){
              b.style.display = locked ? 'none' : '';
            }
          });
        }
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
        document.getElementById('sb-parent-overlay').classList.add('hidden');
      }

      function sbSetOrUnlockParent(){
        const pinEl = document.getElementById('sb-parent-pin');
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
         IndexedDB Core
      ========================= */
      const SB_DB_NAME = 'sbReadingDB_v1';
      const SB_DB_VER  = 2;

      function sbOpenDB(){
        return new Promise((resolve, reject)=>{
          const req = indexedDB.open(SB_DB_NAME, SB_DB_VER);
          let timedOut = false;
          const t = setTimeout(()=>{ timedOut=true; sbToast('⚠️ Storage upgrade blocked. Close other tabs.', 2600); reject(new Error('timeout')); }, 4500);

          req.onblocked = () => { if(!timedOut) sbToast('⚠️ Close other Study Buddy tabs to upgrade.', 2400); };
          req.onupgradeneeded = () => {
            const db = req.result;
            if(!db.objectStoreNames.contains('lessons')) db.createObjectStore('lessons', { keyPath:'id' });
            if(!db.objectStoreNames.contains('progress')) db.createObjectStore('progress', { keyPath:'lessonId' });
            if(!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath:'key' });
            if(!db.objectStoreNames.contains('assets')) db.createObjectStore('assets', { keyPath:'id' });
          };
          req.onsuccess = () => { clearTimeout(t); resolve(req.result); };
          req.onerror = () => { clearTimeout(t); reject(req.error); };
        });
      }

      async function sbTx(store, mode, fn){
        const db = await sbOpenDB();
        return new Promise((resolve, reject)=>{
          const tx = db.transaction(store, mode);
          const st = tx.objectStore(store);
          const res = fn(st, tx);
          tx.oncomplete = () => resolve(res);
          tx.onerror = () => reject(tx.error);
        });
      }

      async function sbGetAllLessons(){
        const db = await sbOpenDB();
        return new Promise((resolve,reject)=>{
          const req = db.transaction('lessons','readonly').objectStore('lessons').getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
      }

      async function sbPutLesson(lesson){
        lesson.updatedAt = Date.now();
        await sbTx('lessons','readwrite', st => st.put(lesson));
        return lesson;
      }

      async function sbDeleteLesson(id){
        await sbTx('lessons','readwrite', st => st.delete(id));
        await sbTx('progress','readwrite', st => st.delete(id));
      }

      async function sbGetProgress(lessonId){
        const db = await sbOpenDB();
        return new Promise((resolve,reject)=>{
          const req = db.transaction('progress','readonly').objectStore('progress').get(lessonId);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        });
      }

      async function sbPutProgress(p){
        await sbTx('progress','readwrite', st => st.put(p));
        return p;
      }

      async function sbGetMeta(key){
        const db = await sbOpenDB();
        return new Promise((resolve,reject)=>{
          const req = db.transaction('meta','readonly').objectStore('meta').get(key);
          req.onsuccess = () => resolve(req.result ? req.result.value : null);
          req.onerror = () => reject(req.error);
        });
      }

      async function sbSetMeta(key, value){
        await sbTx('meta','readwrite', st => st.put({key, value}));
      }

      /* =========================
         Migration from localStorage
      ========================= */
      async function sbMigrateIfNeeded(){
        if(await sbGetMeta('migrated_ls_myAdvancedLessons')) return;
        if((await sbGetAllLessons()).length){
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
            const id = crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
            await sbPutLesson({id, title: l.title || 'Lesson', items: l.items || []});
          }
          sbToast('✅ Lessons migrated to IndexedDB');
        }catch(e){ console.warn(e); }
        await sbSetMeta('migrated_ls_myAdvancedLessons', true);
      }

      /* =========================
         Progress Helpers
      ========================= */
      function sbDefaultProgress(lessonId){
        return { lessonId, stars:0, streak:0, completed:false, lastWinAt:0, _lastDayKey:'' };
      }

      async function sbAwardStar(lessonId, amount=1){
        let p = await sbGetProgress(lessonId) || sbDefaultProgress(lessonId);
        p.stars = (p.stars||0) + amount;
        await sbPutProgress(p);
      }

      async function sbRecordWin(lessonId){
        let p = await sbGetProgress(lessonId) || sbDefaultProgress(lessonId);
        const now = Date.now();
        const dayKey = new Date(now).toDateString();
        p.streak = (dayKey === p._lastDayKey) ? (p.streak||0)+1 : 1;
        p._lastDayKey = dayKey;
        p.lastWinAt = now;
        await sbPutProgress(p);
      }

      async function sbMarkCompleted(lessonId){
        let p = await sbGetProgress(lessonId) || sbDefaultProgress(lessonId);
        p.completed = true;
        await sbPutProgress(p);
      }

      /* =========================
         State
      ========================= */
      let lessons = [];
      let currentLesson = null;
      let currentLessonIndex = -1;
      let currentLessonId = null;
      let currentTarget = null;
      let storyIndex = 0;
      let editId = null;

      const praises = ["Great job!","Excellent!","Awesome!","You're a superstar!","Fantastic!","Way to go!","Brilliant!","You got it!"];

      /* =========================
         Page Routing
      ========================= */
      function showPage(pageId){
        document.querySelectorAll('div[id$="-page"]').forEach(p => p.classList.add('hidden'));
        const el = document.getElementById(pageId);
        if(el) el.classList.remove('hidden');
        if(pageId === 'menu-page') renderMenu();
      }

      function toggleHelp(show){
        document.getElementById('help-overlay').classList.toggle('hidden', !show);
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
        row.innerHTML = `
          <input type="text" placeholder="Sentence (or word)" class="word-in" value="${(text||'').replace(/"/g,'&quot;')}" style="flex:2;">
          <div style="display:flex; flex-direction:column; gap:6px; flex:2;">
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="text" placeholder="Image URL / Path / idb:..." class="img-url-in" value="${(imgUrl||'').replace(/"/g,'&quot;')}" style="width:100%">
              <span class="help-icon" onclick="toggleHelp(true)">?</span>
            </div>
            <div style="display:flex; gap:8px;">
              <button type="button" class="btn-muted sb-upload-btn">🖼️ Upload</button>
              <input type="file" accept="image/*" class="sb-upload-input hidden" />
            </div>
          </div>
          <div class="sb-img-preview-wrap"><img class="sb-img-preview" alt="preview"/></div>
          <button type="button" class="btn-danger sb-row-remove">×</button>
        `;

        const upBtn = row.querySelector('.sb-upload-btn');
        const upIn = row.querySelector('.sb-upload-input');
        const urlIn = row.querySelector('.img-url-in');
        const prev = row.querySelector('.sb-img-preview');
        row.querySelector('.sb-row-remove').onclick = () => row.remove();

        async function refresh(){ 
          const src = await sbResolveImageSrc(urlIn.value.trim());
          prev.src = src || ''; 
          prev.style.display = src ? 'block' : 'none';
        }
        urlIn.addEventListener('input', refresh);

        upBtn.onclick = () => upIn.click();
        upIn.onchange = async () => {
          const file = upIn.files[0];
          if(!file) return;
          try{
            const ref = await sbUploadImageFile(file);
            urlIn.value = ref;
            refresh();
            sbToast('✅ Image uploaded');
          }catch(e){ sbToast('❌ Upload failed'); }
          upIn.value = '';
        };

        container.appendChild(row);
        refresh();
      }

      async function saveLesson(){
        const title = document.getElementById('lesson-title-input').value.trim();
        if(!title) return alert('Lesson name required!');
        const items = [];
        document.querySelectorAll('.word-in').forEach((w,i) => {
          const word = w.value.trim();
          const image = document.querySelectorAll('.img-url-in')[i].value.trim() || 'https://via.placeholder.com/300x200?text=No+Image';
          if(word) items.push({word, image});
        });
        if(!items.length) return alert('Add at least one sentence!');

        if(editId){
          await sbPutLesson({id:editId, title, items});
          sbToast('✅ Lesson updated');
        }else{
          const id = crypto?.randomUUID?.() || Date.now().toString(36)+Math.random().toString(36).slice(2);
          await sbPutLesson({id, title, items});
          sbToast('✅ Lesson created');
        }
        showPage('menu-page');
      }

      async function editLessonById(id){
        const lesson = lessons.find(l=>l.id===id);
        if(!lesson) return;
        editId = id;
        document.getElementById('creator-title').innerText = 'Edit Lesson';
        document.getElementById('lesson-title-input').value = lesson.title;
        document.getElementById('items-input-container').innerHTML = '';
        lesson.items.forEach(it => addWordRow(it.word, it.image));
        showPage('creator-page');
      }

      async function deleteLessonById(id){
        if(!confirm('Delete lesson permanently?')) return;
        await sbDeleteLesson(id);
        sbToast('🗑️ Lesson deleted');
        await loadLessons();
        showPage('menu-page');
      }

      /* =========================
         Image Assets (IndexedDB)
      ========================= */
      async function sbPutAsset(asset){ await sbTx('assets','readwrite',st=>st.put(asset)); }

      async function sbGetAsset(id){
        const db = await sbOpenDB();
        return new Promise(r=> db.transaction('assets','readonly').objectStore('assets').get(id).onsuccess = e=> r(e.target.result));
      }

      async function sbUploadImageFile(file){
        const id = crypto?.randomUUID?.() || Date.now().toString(36)+Math.random().toString(36).slice(2);
        const dataUrl = await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });
        await sbPutAsset({id, dataUrl, name:file.name, createdAt:Date.now()});
        return 'idb:'+id;
      }

      async function sbResolveImageSrc(src){
        if(!src) return '';
        const s = String(src).trim();
        if(s.startsWith('idb:')){
          const asset = await sbGetAsset(s.slice(4));
          return asset?.dataUrl || '';
        }
        return s;
      }

      /* =========================
         Menu & Lesson Loading
      ========================= */
      async function computeLocks(sorted){
        const locks = {};
        for(let i=0;i<sorted.length;i++){
          if(i===0){ locks[sorted[i].id]=false; continue; }
          const prev = await sbGetProgress(sorted[i-1].id) || sbDefaultProgress(sorted[i-1].id);
          locks[sorted[i].id] = !prev.completed;
        }
        return locks;
      }

      async function loadLessons(){
        lessons = await sbGetAllLessons();
        lessons.sort((a,b)=>(a.updatedAt||0)-(b.updatedAt||0));
      }

      async function renderMenu(){
        await loadLessons();
        const list = document.getElementById('lesson-list');
        list.innerHTML = lessons.length ? '' : '<p>No lessons yet. Create one to start!</p>';

        const locks = await computeLocks(lessons);

        for(const lesson of lessons){
          const locked = locks[lesson.id];
          const prog = await sbGetProgress(lesson.id) || sbDefaultProgress(lesson.id);
          const div = document.createElement('div');
          div.className = `lesson-item${locked?' lock-shade':''}`;
          div.innerHTML = `
            <div class="lesson-left">
              <div class="lesson-title">${locked?'🔒':(prog.completed?'🏁':'📘')} <span>${lesson.title}</span></div>
              <div class="badges">
                <span class="badge badge-pages">📄 ${(lesson.items||[]).length} pages</span>
                <span class="badge badge-stars">⭐ ${prog.stars||0}</span>
                <span class="badge badge-streak">🔥 ${prog.streak||0}</span>
                ${locked?'<span class="badge badge-lock">Locked</span>':''}
              </div>
            </div>
            <div class="lesson-actions">
              <button style="background:#4ecdc4" ${locked?'disabled':''} data-open="${lesson.id}">Open</button>
              <button style="background:#3498db" ${locked?'disabled':''} data-edit="${lesson.id}">Edit</button>
              <button style="background:#e74c3c" data-del="${lesson.id}">×</button>
            </div>`;
          list.appendChild(div);
        }

        list.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openLessonHubById(b.dataset.open));
        list.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editLessonById(b.dataset.edit));
        list.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>deleteLessonById(b.dataset.del));
      }

      async function openLessonHubById(id){
        const idx = lessons.findIndex(l=>l.id===id);
        if(idx<0) return;
        currentLessonIndex = idx;
        currentLesson = lessons[idx];
        currentLessonId = currentLesson.id;

        document.getElementById('lesson-page-title').textContent = currentLesson.title;

        const prog = await sbGetProgress(currentLessonId) || sbDefaultProgress(currentLessonId);
        const count = (currentLesson.items||[]).length;
        document.getElementById('lesson-page-badges').innerHTML = `
          <span class="badge badge-pages">📄 ${count} pages</span>
          <span class="badge badge-stars">⭐ ${prog.stars||0}</span>
          <span class="badge badge-streak">🔥 ${prog.streak||0}</span>
          ${prog.completed?'<span class="badge">🏁 Completed</span>':''}`;

        const completed = !!prog.completed;
        const gate = (id, en) => {
          const b = document.getElementById(id);
          if(b){ b.disabled=!en; b.style.opacity=en?'1':'0.45'; b.style.pointerEvents=en?'':'none'; }
        };
        gate('btn-read', true);
        gate('btn-smash', completed);
        gate('btn-scramble', completed);
        gate('btn-flash', completed);
        gate('btn-sentence', completed);
        gate('btn-daily', completed);

        if(!completed) sbToast('📖 Finish "Read" mode to unlock games!', 1800);

        document.getElementById('btn-read').onclick = () => startRead(currentLessonIndex);
        document.getElementById('btn-smash').onclick = () => startSmash(currentLessonIndex);
        document.getElementById('btn-scramble').onclick = () => startScrambleGame(currentLessonIndex);
        document.getElementById('btn-flash').onclick = () => startFlashGame(currentLessonIndex);
        document.getElementById('btn-sentence').onclick = () => startSentenceRepeat(currentLessonIndex);
        document.getElementById('btn-daily').onclick = () => startDailySpeaking(currentLessonIndex);
        document.getElementById('btn-edit').onclick = () => editLessonById(currentLessonId);
        document.getElementById('btn-delete').onclick = () => deleteLessonById(currentLessonId);

        showPage('lesson-page');
      }

      function openLessonHub(i){ if(lessons[i]) openLessonHubById(lessons[i].id); }

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

        const nextBtn = document.getElementById('next-btn');
        const isLast = storyIndex === currentLesson.items.length-1;
        nextBtn.textContent = isLast ? 'Finish! 🏁' : 'Next ▶';
        nextBtn.onclick = isLast ? showStoryFinalScore : ()=>{ storyIndex++; updateStoryPage(); };
        document.getElementById('prev-btn').disabled = storyIndex === 0;

        speak(item.word);
      }

      function changePage(dir){
        storyIndex = Math.max(0, Math.min(currentLesson.items.length-1, storyIndex+dir));
        updateStoryPage();
      }

      function repeatText(){
        const text = document.getElementById('reading-page').classList.contains('hidden') 
          ? (currentTarget?.word || '') 
          : (currentLesson.items?.[storyIndex]?.word || '');
        if(text) speak(text);
      }

      async function showStoryFinalScore(){
        window.speechSynthesis.cancel();
        speak('Congratulations! You finished the story!');

        await sbMarkCompleted(currentLessonId);
        await sbRecordWin(currentLessonId);
        await sbAwardStar(currentLessonId, 3);

        const ov = document.getElementById('success-overlay');
        document.getElementById('success-msg').innerText = 'STORY COMPLETE!';
        document.getElementById('success-img').src = 'https://via.placeholder.com/360x240?text=🏆+Great+Job!';
        ov.classList.remove('hidden');
        ov.onclick = ()=>{ ov.classList.add('hidden'); openLessonHub(currentLessonIndex); };
      }

      /* =========================
         SMASH MODE
      ========================= */
      function startSmash(i){
        currentLesson = lessons[i];
        currentLessonId = currentLesson.id;
        currentLessonIndex = i;
        showPage('smash-page');
        nextSmashRound();
      }

      async function nextSmashRound(){
        document.getElementById('success-overlay').classList.add('hidden');
        const arena = document.getElementById('smash-arena');
        arena.innerHTML = '';
        currentTarget = currentLesson.items[Math.floor(Math.random()*currentLesson.items.length)];

        const shuffled = [...currentLesson.items].sort(()=>0.5-Math.random());
        shuffled.forEach(item=>{
          const b = document.createElement('div');
          b.className = 'word-box';
          b.textContent = item.word;
          b.onclick = async ()=>{
            if(item.word === currentTarget.word){
              speak(praises[Math.floor(Math.random()*praises.length)]);
              await sbAwardStar(currentLessonId,1);
              await sbRecordWin(currentLessonId);
              const ov = document.getElementById('success-overlay');
              document.getElementById('success-msg').innerText = 'GREAT JOB!';
              document.getElementById('success-img').src = await sbResolveImageSrc(item.image);
              ov.classList.remove('hidden');
              ov.onclick = nextSmashRound;
            }else{
              sbSayTryAgain();
            }
          };
          arena.appendChild(b);
        });
        speak(currentTarget.word);
      }

      /* =========================
         SCRAMBLE MODE
      ========================= */
      let originalSentence = "";
      let currentAttempt = [];
      let scrambleQueue = [];
      let currentScrambleIndex = 0;

      function startScrambleGame(lessonIndex){
        window.speechSynthesis.cancel();
        currentLesson = lessons[lessonIndex];
        currentLessonId = currentLesson.id;
        currentLessonIndex = lessonIndex;
        scrambleQueue = [...currentLesson.items];
        currentScrambleIndex = 0;
        showPage('scramble-page');
        setupScrambleRound();
      }

      function repeatSentence(){
        if(originalSentence) speak(originalSentence);
      }

      function setupScrambleRound(){
        const item = scrambleQueue[currentScrambleIndex];
        originalSentence = (item.word||"").toUpperCase();
        currentAttempt = [];

        document.getElementById('sentence-target').innerHTML = '';
        document.getElementById('word-pool').innerHTML = '';
        document.getElementById('check-sentence-btn').style.display = 'none';

        const words = originalSentence.split(" ").filter(Boolean);
        const shuffled = [...words].sort(()=>0.5-Math.random());

        shuffled.forEach(word=>{
          const span = document.createElement('div');
          span.className = 'word-box';
          span.textContent = word;
          span.onclick = () => moveToTarget(span, word);
          document.getElementById('word-pool').appendChild(span);
        });

        if(!document.getElementById('mute-btn').textContent.includes('OFF')) repeatSentence();
      }

      function moveToTarget(element, word){
        document.getElementById('sentence-target').appendChild(element);
        currentAttempt.push(word);
        element.onclick = () => {
          document.getElementById('word-pool').appendChild(element);
          currentAttempt = currentAttempt.filter(w=>w!==word);
          element.onclick = () => moveToTarget(element, word);
          document.getElementById('check-sentence-btn').style.display = 'none';
        };
        if(document.getElementById('sentence-target').children.length === originalSentence.split(" ").filter(Boolean).length){
          document.getElementById('check-sentence-btn').style.display = 'inline-block';
        }
      }

      async function checkSentence(){
        const attempt = Array.from(document.getElementById('sentence-target').children).map(el=>el.textContent).join(" ");
        const ov = document.getElementById('success-overlay');

        if(attempt === originalSentence){
          speak('Great job!');
          await sbAwardStar(currentLessonId,1);
          await sbRecordWin(currentLessonId);

          if(currentScrambleIndex < scrambleQueue.length-1){
            currentScrambleIndex++;
            document.getElementById('success-msg').innerText = 'NEXT SENTENCE!';
            ov.classList.remove('hidden');
            ov.onclick = ()=>{ ov.classList.add('hidden'); setupScrambleRound(); };
          }else{
            await sbMarkCompleted(currentLessonId);
            await sbAwardStar(currentLessonId,2);
            document.getElementById('success-msg').innerText = 'STORY COMPLETE!';
            ov.classList.remove('hidden');
            ov.onclick = ()=>{ ov.classList.add('hidden'); openLessonHub(currentLessonIndex); };
          }
        }else{
          speak('Try again.');
        }
      }

      /* =========================
         FLASH MODE
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
        document.getElementById('flash-score').innerText = '0';
        showPage('flash-page');
        nextFlashRound();
      }

      async function nextFlashRound(){
        clearInterval(flashTimer);
        document.getElementById('flash-zone').innerHTML = '';
        document.getElementById('flash-options').innerHTML = '';
        document.getElementById('flash-timer-fill').style.width = '100%';

        currentFlashItem = currentLesson.items[Math.floor(Math.random()*currentLesson.items.length)];

        const zone = document.getElementById('flash-zone');
        if(Math.random()>0.5 && currentFlashItem.image){
          zone.innerHTML = `<img src="${await sbResolveImageSrc(currentFlashItem.image)}" style="max-height:140px;border-radius:10px;">`;
        }else{
          zone.innerHTML = currentFlashItem.word;
        }

        let startTime = Date.now();
        flashTimer = setInterval(()=>{
          const elapsed = Date.now()-startTime;
          const perc = Math.max(0, 100 - (elapsed/flashDuration*100));
          document.getElementById('flash-timer-fill').style.width = perc+'%';
          if(elapsed >= flashDuration){
            clearInterval(flashTimer);
            hideFlashAndShowOptions();
          }
        },50);
      }

      function hideFlashAndShowOptions(){
        document.getElementById('flash-zone').innerHTML = '❓';
        let opts = [...currentLesson.items].sort(()=>0.5-Math.random()).slice(0,4);
        if(!opts.find(o=>o.word===currentFlashItem.word)) opts[0]=currentFlashItem;
        opts.sort(()=>0.5-Math.random());

        const area = document.getElementById('flash-options');
        opts.forEach(item=>{
          const btn = document.createElement('div');
          btn.className='word-box';
          btn.textContent = item.word;
          btn.onclick = () => checkFlashAnswer(item);
          area.appendChild(btn);
        });
      }

      async function checkFlashAnswer(selected){
        if(selected.word === currentFlashItem.word){
          flashScore++;
          document.getElementById('flash-score').innerText = flashScore;
          if(flashDuration>1000) flashDuration -= 150;
          speak(praises[Math.floor(Math.random()*praises.length)]);
          await sbAwardStar(currentLessonId,1);
          await sbRecordWin(currentLessonId);
          nextFlashRound();
        }else{
          speak('Whoops! Try again.');
          flashDuration = 3000;
          nextFlashRound();
        }
      }

      /* =========================
         FIXED SPEAKING MODES
      ========================= */
      let repeatIsListening = false;
      let repeatLastStartTs = 0;
      let sbListenStartedAt = 0;
      const sbListenMinMs = 2500;

      let speakSession = {
        mode:'', queue:[], current:null, index:0, correct:0, total:0, dailyKey:'',
        sentenceAwaitNext:false, dailyAwaitNext:false, sentenceComplete:false, dailyComplete:false,
        targetWords:[]
      };

      function sbNormalizeSpeech(s){
        return (s||"").toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"").replace(/\s+/g," ");
      }

      function sbGetSpeechTranscript(event){
        try{
          if(!event?.results?.length) return "";
          const i = typeof event.resultIndex==="number" ? event.resultIndex : event.results.length-1;
          return event.results[i][0].transcript || "";
        }catch(e){return "";}
      }

      function sbSentenceScore(spoken, target){
        const s = sbNormalizeSpeech(spoken);
        const t = sbNormalizeSpeech(target);
        if(!s||!t) return 0;
        const sw=s.split(" "), tw=t.split(" ");
        const tset = new Set(tw);
        let match=0; for(const w of sw) if(tset.has(w)) match++;
        let score = match / Math.max(1,tw.length);
        if(sw[0]===tw[0]) score+=0.08;
        if(sw[sw.length-1]===tw[tw.length-1]) score+=0.08;
        return Math.min(1,score);
      }

      function sbApplyWordColors(prefix, targetWords, spoken){
        const spokenSet = new Set(sbNormalizeSpeech(spoken).split(" ").filter(Boolean));
        let matched = 0;
        for(let i=0; i<targetWords.length; i++){
          const el = document.getElementById(`${prefix}-${i}`);
          if(!el) continue;
          if(spokenSet.has(targetWords[i])){
            matched++; el.style.color = '#2ecc71';
          }else el.style.color = '#e74c3c';
        }
        return matched;
      }

      function sbHashString(str){ let h=2166136261; for(let i=0;i<str.length;i++){h^=str.charCodeAt(i); h=Math.imul(h,16777619);} return h>>>0; }
      function sbMulberry32(seed){ return function(){let t=seed+=0x6D2B79F5; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296;}; }
      function sbSeededShuffle(arr, seedStr){
        const a=[...arr], rng = sbMulberry32(sbHashString(seedStr));
        for(let i=a.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
        return a;
      }
      function sbDateKeyLocal(){
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      }

      const RepeatRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      let repeatRecognition = RepeatRecognition ? new RepeatRecognition() : null;
      if(repeatRecognition){
        repeatRecognition.lang = 'en-US';
        repeatRecognition.interimResults = false;
      }

      /* ----- Sentence Repeat ----- */
      function startSentenceRepeat(index){
        currentLesson = lessons[index];
        currentLessonId = currentLesson.id;
        currentLessonIndex = index;

        let pool = (currentLesson.items||[]).filter(it => (it.word||"").trim().includes(' '));
        if(pool.length === 0) pool = currentLesson.items||[];

        if(!pool.length){ sbToast('No sentences available.'); return; }

        speakSession.queue = [...pool].sort(()=>0.5-Math.random());
        speakSession.sentenceComplete = false;
        showPage('sentence-page');
        nextSentencePrompt();
      }

      async function nextSentencePrompt(){
        try{repeatRecognition?.abort();}catch(e){}
        cleanupSpeakUI();

        const mic = document.getElementById('sentence-mic-btn');
        const nextB = document.getElementById('sentence-next-btn');
        const fb = document.getElementById('sentence-feedback');

        if(nextB) nextB.style.display='none';
        if(mic){ mic.disabled=false; mic.style.opacity='1'; mic.textContent='🎤 Tap to Speak'; }
        if(fb) fb.innerText = '';

        if(speakSession.queue.length===0){
          document.getElementById('sentence-prompt').innerHTML = '🏆 All done!';
          if(nextB){ nextB.style.display='inline-block'; nextB.textContent='Back to Lesson'; }
          speak('Great speaking!');
          speakSession.sentenceComplete = true;
          return;
        }

        speakSession.current = speakSession.queue.shift();
        const text = speakSession.current.word || '';
        const imgUrl = speakSession.current.image || '';

        const imgEl = document.getElementById('sentence-img');
        if(imgEl){
          imgEl.src = imgUrl ? await sbResolveImageSrc(imgUrl) : '';
          imgEl.style.display = imgUrl ? 'inline-block' : 'none';
        }

        const words = text.split(/\s+/);
        document.getElementById('sentence-prompt').innerHTML = words.map((w,i)=>`<span id="sentence-word-${i}">${w}</span>`).join(' ');

        speakSession.targetWords = words.map(w=>sbNormalizeSpeech(w));
        speakSentence(text);
      }

      function sentenceNext(){
        if(speakSession.sentenceComplete){ openLessonHub(currentLessonIndex); return; }
        if(!speakSession.sentenceAwaitNext) return;
        speakSession.sentenceAwaitNext = false;
        nextSentencePrompt();
      }

      /* ----- Daily Speaking ----- */
      function startDailySpeaking(index){
        currentLesson = lessons[index];
        currentLessonId = currentLesson.id;
        currentLessonIndex = index;

        const items = currentLesson.items||[];
        if(!items.length){ sbToast('No pages yet.'); return; }

        const dateKey = sbDateKeyLocal();
        const dailyKey = `sbDailySpeak:${currentLesson.title}:${dateKey}`;
        speakSession.dailyKey = dailyKey;

        const saved = JSON.parse(localStorage.getItem(dailyKey)||'null');
        const alreadyDone = !!(saved && saved.completed);

        const pool = sbSeededShuffle(items, dailyKey);
        const queue = pool.slice(0, Math.min(5, pool.length));

        speakSession.queue = queue;
        speakSession.index = 0;
        speakSession.correct = 0;
        speakSession.total = queue.length;

        showPage('daily-page');
        document.getElementById('daily-status').innerText = alreadyDone 
          ? `✅ Daily bonus already claimed today.` 
          : `💎 Finish ${speakSession.total} prompts to claim today's bonus!`;

        nextDailyPrompt();
      }

      async function nextDailyPrompt(){
        try{repeatRecognition?.abort();}catch(e){}
        cleanupSpeakUI();

        const mic = document.getElementById('daily-mic-btn');
        const nextB = document.getElementById('daily-next-btn');
        const fb = document.getElementById('daily-feedback');

        if(nextB) nextB.style.display='none';
        if(mic){ mic.disabled=false; mic.style.opacity='1'; mic.textContent='🎤 Tap to Speak'; }
        if(fb) fb.innerText='';

        if(speakSession.index >= speakSession.queue.length){
          showDailyCompleteScreen();
          return;
        }

        speakSession.current = speakSession.queue[speakSession.index];
        const text = speakSession.current.word || '';
        const imgUrl = speakSession.current.image || '';

        const words = text.split(/\s+/);
        document.getElementById('daily-prompt').innerHTML = words.map((w,i)=>`<span id="daily-word-${i}">${w}</span>`).join(' ');

        const imgEl = document.getElementById('daily-img');
        if(imgEl){
          imgEl.src = imgUrl ? await sbResolveImageSrc(imgUrl) : '';
          imgEl.style.display = imgUrl ? 'inline-block' : 'none';
        }

        document.getElementById('daily-counter').innerText = `Prompt ${speakSession.index+1}/${speakSession.total} • Correct: ${speakSession.correct}`;

        speakSession.targetWords = words.map(w=>sbNormalizeSpeech(w));

        if(text.trim().includes(' ')) speakSentence(text); else speak(text);
      }

      function showDailyCompleteScreen(){
        document.getElementById('daily-prompt').innerHTML = '🏆 Daily complete!';
        document.getElementById('daily-feedback').innerText = `You got ${speakSession.correct} / ${speakSession.total} correct.`;
        document.getElementById('daily-img').style.display='none';

        const nextB = document.getElementById('daily-next-btn');
        if(nextB){ nextB.style.display='inline-block'; nextB.textContent='Claim & Back'; }
        document.getElementById('daily-mic-btn').disabled = true;
        speak('Daily complete.');
        speakSession.dailyComplete = true;
      }

      function dailyNext(){
        if(speakSession.dailyComplete){ finishDailySpeaking(); return; }
        if(!speakSession.dailyAwaitNext) return;
        speakSession.dailyAwaitNext = false;
        speakSession.index++;
        nextDailyPrompt();
      }

      async function finishDailySpeaking(){
        try{repeatRecognition?.abort();}catch(e){}
        repeatIsListening = false;

        const dailyKey = speakSession.dailyKey;
        const saved = JSON.parse(localStorage.getItem(dailyKey)||'null');
        if(!(saved && saved.completed)){
          const bonus = Math.max(1, Math.round(5 * (speakSession.correct / speakSession.total)));
          await sbAwardStar(currentLessonId, bonus);
          await sbRecordWin(currentLessonId);
          localStorage.setItem(dailyKey, JSON.stringify({completed:true, correct:speakSession.correct, total:speakSession.total, bonus}));
          sbToast(`💎 Daily bonus claimed! +${bonus} ⭐`, 2000);
        }
        openLessonHub(currentLessonIndex);
      }

      /* Mic Handlers */
      function triggerSentenceMic(){
        if(!sbMicEnvHint() || !repeatRecognition || repeatIsListening) return;
        const now = Date.now();
        if(now - repeatLastStartTs < 350) return;
        repeatLastStartTs = now;

        try{ repeatRecognition.abort(); }catch(e){}
        repeatIsListening = true;
        let gotResult = false;
        let autoRestarted = false;
        sbListenStartedAt = Date.now();

        const micBtn = document.getElementById('sentence-mic-btn');
        if(micBtn){ micBtn.classList.add('mic-active'); micBtn.textContent = '👂 Listening...'; }

        function reset(){ 
          if(micBtn){ micBtn.classList.remove('mic-active'); micBtn.textContent = '🎤 Tap to Speak'; }
          repeatIsListening = false;
        }

        repeatRecognition.onresult = async (e)=>{
          gotResult = true; reset();
          const spoken = sbGetSpeechTranscript(e);
          if(!spoken.trim()){ document.getElementById('sentence-feedback').innerText = "❌ Didn't hear anything."; sbSayTryAgain(); return; }

          const matched = sbApplyWordColors('sentence-word', speakSession.targetWords, spoken);
          const score = speakSession.targetWords.length ? matched / speakSession.targetWords.length : sbSentenceScore(spoken, speakSession.current?.word||"");
          const pass = score >= 0.75;

          if(pass){
            await sbAwardStar(currentLessonId,1);
            await sbRecordWin(currentLessonId);
            document.getElementById('sentence-feedback').innerText = `✅ Correct! (${Math.round(score*100)}%)`;
            speak('Great job!');
            const nb = document.getElementById('sentence-next-btn');
            if(nb){ nb.style.display='inline-block'; nb.textContent='Next ▶'; }
            document.getElementById('sentence-mic-btn').disabled = true;
            speakSession.sentenceAwaitNext = true;
          }else{
            document.getElementById('sentence-feedback').innerText = `❌ Not yet. (${Math.round(score*100)}%)`;
            sbSayTryAgain();
          }
        };

        repeatRecognition.onend = ()=>{
          const elapsed = Date.now() - sbListenStartedAt;
          if(!gotResult && !autoRestarted && elapsed < sbListenMinMs){
            autoRestarted = true;
            setTimeout(()=>{ try{repeatRecognition.start();}catch(e){} },120);
            return;
          }
          reset();
        };

        setTimeout(()=>{ try{repeatRecognition.start();}catch(e){ reset(); sbToast('Could not start mic.',2800); } },30);
      }

      function triggerDailyMic(){
        if(!sbMicEnvHint() || !repeatRecognition || repeatIsListening) return;
        const now = Date.now();
        if(now - repeatLastStartTs < 350) return;
        repeatLastStartTs = now;

        try{ repeatRecognition.abort(); }catch(e){}
        repeatIsListening = true;
        let gotResult = false;
        let autoRestarted = false;
        sbListenStartedAt = Date.now();

        const micBtn = document.getElementById('daily-mic-btn');
        if(micBtn){ micBtn.classList.add('mic-active'); micBtn.textContent = '👂 Listening...'; }

        function reset(){ 
          if(micBtn){ micBtn.classList.remove('mic-active'); micBtn.textContent = '🎤 Tap to Speak'; }
          repeatIsListening = false;
        }

        repeatRecognition.onresult = async (e)=>{
          gotResult = true; reset();
          const spoken = sbGetSpeechTranscript(e);
          if(!spoken.trim()){ document.getElementById('daily-feedback').innerText = "❌ Didn't hear anything."; sbSayTryAgain(); return; }

          const isSent = sbNormalizeSpeech(speakSession.current.word||"").includes(' ');
          let pass = false, scorePct = 0;

          if(isSent){
            const matched = sbApplyWordColors('daily-word', speakSession.targetWords, spoken);
            const score = speakSession.targetWords.length ? matched/speakSession.targetWords.length : sbSentenceScore(spoken, speakSession.current.word||"");
            scorePct = Math.round(score*100);
            pass = score >= 0.75;
          }else{
            const hit = sbNormalizeSpeech(spoken).includes(sbNormalizeSpeech(speakSession.current.word||""));
            sbApplyWordColors('daily-word', speakSession.targetWords, spoken);
            scorePct = hit ? 100 : 0;
            pass = hit;
          }

          if(pass){
            speakSession.correct++;
            await sbAwardStar(currentLessonId,1);
            await sbRecordWin(currentLessonId);
            document.getElementById('daily-feedback').innerText = `✅ Correct! (${scorePct}%)`;
            speak('Great job!');

            const nb = document.getElementById('daily-next-btn');
            if(nb){ nb.style.display='inline-block'; nb.textContent = (speakSession.index >= speakSession.total-1) ? 'Finish 🏁' : 'Next ▶'; }
            document.getElementById('daily-mic-btn').disabled = true;
            speakSession.dailyAwaitNext = true;
          }else{
            document.getElementById('daily-feedback').innerText = `❌ Not yet. (${scorePct}%)`;
            sbSayTryAgain();
          }
        };

        repeatRecognition.onend = ()=>{
          const elapsed = Date.now() - sbListenStartedAt;
          if(!gotResult && !autoRestarted && elapsed < sbListenMinMs){
            autoRestarted = true;
            setTimeout(()=>{ try{repeatRecognition.start();}catch(e){} },120);
            return;
          }
          reset();
        };

        setTimeout(()=>{ try{repeatRecognition.start();}catch(e){ reset(); sbToast('Could not start mic.',2800); } },30);
      }

      function cleanupSpeakUI(){
        const s = document.getElementById('sentence-mic-btn');
        const d = document.getElementById('daily-mic-btn');
        if(s){ s.classList.remove('mic-active'); s.textContent='🎤 Tap to Speak'; }
        if(d){ d.classList.remove('mic-active'); d.textContent='🎤 Tap to Speak'; }
        repeatIsListening = false;
      }

      window.dailyHearAgain = function(){
        if(speakSession.current?.word) speak(speakSession.current.word);
      };

      /* =========================
         Button Wiring
      ========================= */
      function wireSpeakingButtons(){
        const sMic = document.getElementById('sentence-mic-btn');
        const dMic = document.getElementById('daily-mic-btn');
        const sNext = document.getElementById('sentence-next-btn');
        const dNext = document.getElementById('daily-next-btn');
        const dHear = document.getElementById('daily-hear-btn');

        if(sMic) sMic.onclick = triggerSentenceMic;
        if(dMic) dMic.onclick = triggerDailyMic;
        if(sNext) sNext.onclick = sentenceNext;
        if(dNext) dNext.onclick = dailyNext;
        if(dHear) dHear.onclick = window.dailyHearAgain;
      }

      const origShowPage = showPage;
      window.showPage = function(pageId){
        origShowPage(pageId);
        if(pageId==='sentence-page' || pageId==='daily-page'){
          setTimeout(wireSpeakingButtons, 150);
        }
      };

      /* =========================
         Global exports for HTML onclick handlers
      ========================= */
      window.openNewLesson = openNewLesson;
      window.addWordRow = addWordRow;
      window.saveLesson = saveLesson;
      window.showPage = showPage;
      window.toggleHelp = toggleHelp;
      window.openLessonHub = openLessonHub;
      window.startListening = ()=>{ /* placeholder if needed */ };
      window.changePage = changePage;
      window.repeatText = repeatText;
      window.sbOpenParent = sbOpenParent;
      window.sbCloseParent = sbCloseParent;
      window.sbSetOrUnlockParent = sbSetOrUnlockParent;
      window.sbLockParentNow = sbLockParentNow;
      window.sbExport = sbExport;
      window.sbResetAll = sbResetAll;
      window.startSentenceRepeat = startSentenceRepeat;
      window.startDailySpeaking = startDailySpeaking;
      window.dailyHearAgain = window.dailyHearAgain;
      window.sentenceNext = sentenceNext;
      window.dailyNext = dailyNext;
      window.triggerSentenceMic = triggerSentenceMic;
      window.triggerDailyMic = triggerDailyMic;

      /* =========================
         Export / Import / Reset
      ========================= */
      async function sbExport(){
        await loadLessons();
        const payload = [];
        for(const l of lessons){
          const prog = await sbGetProgress(l.id) || sbDefaultProgress(l.id);
          payload.push({lesson:l, progress:prog});
        }
        const assets = await (async()=>{
          const db = await sbOpenDB();
          return new Promise(r=> db.transaction('assets','readonly').objectStore('assets').getAll().onsuccess=e=>r(e.target.result));
        })();
        const blob = new Blob([JSON.stringify({version:2, exportedAt:Date.now(), data:payload, assets}, null, 2)], {type:'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'reading_lessons_export.json';
        a.click();
        setTimeout(()=>URL.revokeObjectURL(a.href),500);
      }

      document.getElementById('sb-import').addEventListener('change', async e=>{
        const f = e.target.files[0];
        if(!f) return;
        try{
          const text = await f.text();
          const json = JSON.parse(text);
          for(const a of (json.assets||[])) if(a.id && a.dataUrl) await sbPutAsset(a);
          for(const row of (json.data||[])){
            if(row.lesson?.id) await sbPutLesson(row.lesson);
            if(row.progress?.lessonId) await sbPutProgress(row.progress);
          }
          sbToast('✅ Import successful!');
          await loadLessons();
          showPage('menu-page');
        }catch(err){
          alert('Import failed - invalid file');
        }
        e.target.value = '';
      });

      async function sbResetAll(){
        if(!confirm('Reset ALL lessons and progress?')) return;
        indexedDB.deleteDatabase(SB_DB_NAME);
        localStorage.removeItem('myAdvancedLessons');
        sbToast('🧹 Reset complete. Reloading...');
        setTimeout(()=>location.reload(), 900);
      }

      /* =========================
         Boot
      ========================= */
      (async function boot(){
        await sbMigrateIfNeeded();
        await loadLessons();
        showPage('menu-page');
        setTimeout(wireSpeakingButtons, 300);
      })();

    }).call(window);
  } catch (e) {
    console.error('Boot error:', e);
  }
});