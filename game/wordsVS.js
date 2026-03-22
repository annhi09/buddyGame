// Auto-extracted legacy inline JS from words.html
// Runs after DOMContentLoaded. Some legacy HTML uses inline onclick handlers,
// so we explicitly expose certain functions onto window.
document.addEventListener('DOMContentLoaded', () => {
  try {
let repeatIsListening = false;
  let repeatLastStartTs = 0;

//   let repeatIsListening = false;
// let repeatLastStartTs = 0;


  let repeatMode = {
  isPro:false,
  queue:[],
  current:null,
  streak:0,
  timer:null,
  timeLeft:0
};

let speakSession = {
  mode: "",          // "sentence" | "daily"
  queue: [],
  current: null,
  index: 0,
  correct: 0,
  total: 0,
  dailyKey: ""
};

function sbEscapeAttr(s){
  return (s??'').toString()
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

/* =========================================================
   ✅ Core state
   ========================================================= */
const fallbacks = ["⭐","🎆","🎈","✨","🍭"];
const praises = ["Great job!","Excellent!","Awesome!","Fantastic!","Brilliant!"];

let lessons = [];
let unlockedLessons = JSON.parse(localStorage.getItem("unlocked_status") || "{}");

let currentLesson = null;
let currentLessonIndex = -1;

let gameMode = "smash"; // smash | spelling
let currentTargetItem = null;
let wordQueue = [];

let studiedItems = new Set();
let isSpeaking = false;

let spellingProgress = "";

let flippedCards = [];
let moves = 0;
let matches = 0;

let editIndex = -1;

let typeSpellMode = { queue: [], current: null };
let wordScrambleMode = { queue: [], current: null, letters: [], picked: [] };
let sbSpellVs = {
  enabled:false,
  seed:"",
  queue:[],
  finished:false,
  winnerTeam:"",
  winnerName:"",
  status:"idle"
};

function sbHashString(str){
  let h = 2166136261;
  const text = String(str || "");
  for(let i=0;i<text.length;i++){
    h ^= text.charCodeAt(i);
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
  const out = [...(arr || [])];
  const rng = sbMulberry32(sbHashString(seedStr || "seed"));
  for(let i = out.length - 1; i > 0; i--){
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function sbSpellVsReset(){
  sbSpellVs.enabled = false;
  sbSpellVs.seed = "";
  sbSpellVs.queue = [];
  sbSpellVs.finished = false;
  sbSpellVs.winnerTeam = "";
  sbSpellVs.winnerName = "";
  sbSpellVs.status = "idle";
}

function sbSpellVsIsActive(){
  return !!(SB_NET.connected && gameMode === "spelling" && sbSpellVs.enabled);
}

function sbSpellVsStatusText(){
  if(!sbSpellVsIsActive()) return "";
  if(sbSpellVs.finished){
    if(sbSpellVs.winnerTeam === SB_NET.team) return "🏆 You won the round!";
    return `💨 ${sbSpellVs.winnerName || "Opponent"} finished first.`;
  }
  return "⚡ VS Spelling • First to finish wins";
}

function sbUpdateSpellVsHud(){
  if(sbSpellVsIsActive()){
    sbUpdateGlobalNetStatus(sbSpellVsStatusText());
  }else{
    sbUpdateGlobalNetStatus();
  }
}

function sbOpenRemoteSpelling(payload){
  if(payload) sbApplyNetLessonPayload(payload);
  if(SB_NET.role !== "host"){
    startGame(currentLessonIndex >= 0 ? currentLessonIndex : 0, "spelling", { fromRemote:true, vs:true });
  }
}

function sbStartSpellVsRound(payload){
  if(payload?.lesson) sbApplyNetLessonPayload(payload.lesson);
  sbSpellVs.enabled = true;
  sbSpellVs.seed = String(payload?.seed || `${Date.now()}`);
  sbSpellVs.queue = sbSeededShuffle(currentLesson?.items || [], `spell-vs:${sbSpellVs.seed}`);
  sbSpellVs.finished = false;
  sbSpellVs.winnerTeam = "";
  sbSpellVs.winnerName = "";
  sbSpellVs.status = "playing";

  wordQueue = [...sbSpellVs.queue];
  currentTargetItem = null;
  spellingProgress = "";

  showPage("game-page");
  nextRound(false);
  sbUpdateSpellVsHud();
}

function sbHostStartSpellingVs(index){
  const payload = sbMakeNetLessonPayload(lessons[index]);
  const seed = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  if(payload){
    globalSend({ type:"page_jump", roomId:SB_NET.roomId, gameId:"spelling", lesson:payload });
  }

  globalSend({
    type:"spell_match_prepare",
    roomId: SB_NET.roomId,
    seed,
    lesson: payload
  });

  startGame(index, "spelling", { vs:true, seed });
}

/* =========================================================
   🌐 Global Multiplayer (Warrior first)
   ========================================================= */
let SB_NET = {
  connected:false,
  ws:null,
  roomId:"class-1",
  role:"player",
  team:"red",
  playerName:"Player",
  character:"athena",
  hostPlays:true, // true for 1v1, false for teacher host
  playerKey:"",
  score:{ red:0, blue:0 },
  lessonPayload:null,
  roundActive:false,
  roster:[],
  rosterSummary:"",
  paused:false,
  pauseReason:"",
  reconnectTimer:null,
  reconnectAttempts:0,
  manualDisconnect:false,
};

function warriorHostStartRound(){
  if (!SB_NET.connected) {
    warriorStartCountdown(4);
    setTimeout(() => {
      warriorNextRound();
    }, 4000);
    return;
  }

  if (SB_NET.role !== 'host') {
    sbToast("Only host can start the round.");
    return;
  }

  if (SB_NET.paused) {
    sbToast("Room is paused.");
    return;
  }

  globalSend({
    type: "warrior_match_countdown",
    roomId: SB_NET.roomId,
    seconds: 4
  });

  warriorStartCountdown(4);

  setTimeout(() => {
    warriorNextRound();
  }, 4000);
}

function mpOpenRoomModal(){
  const modal = document.getElementById("mp-room-modal");
  if(!modal) return;
  modal.classList.remove("hidden");
  mpRenderRoomModal();
}

function mpCloseRoomModal(){
  document.getElementById("mp-room-modal").classList.add("hidden");
}

function sbLoadNetPrefs(){
  try{
    SB_NET.roomId = localStorage.getItem('sb_room_id') || SB_NET.roomId;
    SB_NET.role = localStorage.getItem('sb_role') || SB_NET.role;
    SB_NET.team = localStorage.getItem('sb_team') || SB_NET.team;
    SB_NET.playerName = localStorage.getItem('sb_player_name') || SB_NET.playerName;
    SB_NET.character = localStorage.getItem('sb_character') || SB_NET.character;
    SB_NET.playerKey = localStorage.getItem('sb_player_key') || "";
    const hp = localStorage.getItem('sb_host_plays');
    if(hp !== null) SB_NET.hostPlays = hp === '1';
  }catch(e){}
}

function sbSaveNetPrefs(){
  try{
    localStorage.setItem('sb_room_id', SB_NET.roomId || 'class-1');
    localStorage.setItem('sb_role', SB_NET.role || 'player');
    localStorage.setItem('sb_team', SB_NET.team || 'red');
    localStorage.setItem('sb_player_name', SB_NET.playerName || 'Player');
    localStorage.setItem('sb_character', SB_NET.character || 'athena');
    localStorage.setItem('sb_host_plays', SB_NET.hostPlays ? '1' : '0');
    if(SB_NET.playerKey) localStorage.setItem('sb_player_key', SB_NET.playerKey);
  }catch(e){}
}

function sbClearReconnectTimer(){
  if(SB_NET.reconnectTimer){
    clearTimeout(SB_NET.reconnectTimer);
    SB_NET.reconnectTimer = null;
  }
}

function sbScheduleReconnect(){
  if(SB_NET.manualDisconnect) return;
  sbClearReconnectTimer();
  const delay = Math.min(1000 * Math.pow(2, SB_NET.reconnectAttempts || 0), 8000);
  SB_NET.reconnectTimer = setTimeout(() => {
    SB_NET.reconnectTimer = null;
    SB_NET.reconnectAttempts = Math.min((SB_NET.reconnectAttempts || 0) + 1, 8);
    globalConnect();
  }, delay);
}

function sbDisplayNameForTeam(team){
  const roster = Array.isArray(SB_NET.roster) ? SB_NET.roster : [];
  const member = roster.find(p => p.team === team);
  if(member && member.name) return member.name;
  return team === 'blue' ? 'Blue' : 'Red';
}

function sbNetWsUrl(){
  const host = (location.hostname && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1')
    ? location.hostname
    : 'localhost';
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${host}:8080`;
}

function sbUpdateGlobalNetStatus(text=''){
  const el = document.getElementById('global-connect-status');
  if(!el) return;
  if(text){ el.textContent = text; return; }
  if(!SB_NET.connected){
    el.textContent = 'Offline. Multiplayer currently works on Warrior (Pro) first.';
    return;
  }
  el.textContent = `✅ ${SB_NET.role === 'host' ? 'Host' : 'Player'} in ${SB_NET.roomId} • ${SB_NET.team.toUpperCase()}${SB_NET.rosterSummary ? ' • ' + SB_NET.rosterSummary : ''}`;
}

function sbUpdateWarriorNetStatus(text=''){
  const el = document.getElementById('warrior-net-status');
  if(!el) return;

  const redName = sbDisplayNameForTeam('red');
  const blueName = sbDisplayNameForTeam('blue');

  if(text){
    el.textContent = text;
    return;
  }

  if(!SB_NET.connected){
    const soloTeam = (SB_NET.team === "blue") ? "blue" : "red";
    const soloName = sbDisplayNameForTeam(soloTeam);
    const soloScore = SB_NET.score?.[soloTeam] || 0;
    el.textContent = `Local play • ${soloName} • Score: ${soloScore}`;
    return;
  }

  el.textContent =
    `👥 ${SB_NET.role === 'host' ? 'Host' : 'Player'} • ${SB_NET.team.toUpperCase()} • ` +
    `Score: ${redName}: ${SB_NET.score.red} - ${blueName}: ${SB_NET.score.blue}`;
}

function sbMakeNetLessonPayload(lesson){
  if(!lesson) return null;
  return {
    title: lesson.title || "Online Lesson",
    items: (lesson.items || []).map(it => ({
      word: it.word || "",
      image: it.image || "",
      fallback: it.fallback || rand(fallbacks)
    }))
  };
}

function sbApplyNetLessonPayload(payload){
  if(!payload || !Array.isArray(payload.items)) return;
  currentLesson = {
    id: payload.id || "net-lesson",
    title: payload.title || "Online Lesson",
    items: payload.items.map(it => ({
      word: it.word || "",
      image: it.image || "",
      fallback: it.fallback || rand(fallbacks)
    }))
  };
  currentLessonIndex = -1;
  SB_NET.lessonPayload = currentLesson;
}

function mpFillRoomForm(){
  const room = document.getElementById('mp-room-id');
  const role = document.getElementById('mp-role');
  const team = document.getElementById('mp-team');
  const name = document.getElementById('mp-name');
  const hostPlays = document.getElementById('mp-host-plays');
  const charSel = document.getElementById('mp-character');

  if(room) room.value = SB_NET.roomId || 'class-1';
  if(role) role.value = SB_NET.role || 'player';
  if(team) team.value = SB_NET.team || 'red';
  if(name) name.value = SB_NET.playerName || 'Player';
  if(hostPlays) hostPlays.checked = !!SB_NET.hostPlays;
  if(charSel) charSel.value = SB_NET.character || 'athena';
}

function mpSyncRoomForm(){
  const room = document.getElementById('mp-room-id');
  const role = document.getElementById('mp-role');
  const team = document.getElementById('mp-team');
  const name = document.getElementById('mp-name');
  const hostPlays = document.getElementById('mp-host-plays');
  const charSel = document.getElementById('mp-character');

  SB_NET.roomId = (room?.value || 'class-1').trim() || 'class-1';
  SB_NET.role = role?.value || 'player';
  SB_NET.team = team?.value || 'red';
  SB_NET.playerName = (name?.value || 'Player').trim() || 'Player';
  SB_NET.hostPlays = !!hostPlays?.checked;
  SB_NET.character = charSel?.value || 'athena';

  sbSaveNetPrefs();
}

function mpRenderRoomModal(){
  mpFillRoomForm();

  const info = document.getElementById('mp-room-info');
  if(info){
    info.innerHTML = SB_NET.connected
      ? `<b>Connected:</b> ${SB_NET.roomId} • ${SB_NET.role} • ${SB_NET.team}`
      : `<b>Status:</b> Offline`;
  }

  const rosterEl = document.getElementById('mp-room-roster');
  if(rosterEl){
    const items = Array.isArray(SB_NET.roster) ? SB_NET.roster : [];
    rosterEl.innerHTML = items.length
      ? items.map(p => `<div>• ${p.name || 'Player'} — ${p.role || 'player'} — ${p.team || ''}</div>`).join('')
      : '<div>• No one connected yet</div>';
  }
}

function globalSend(payload){
  if(!SB_NET.ws || SB_NET.ws.readyState !== 1) return false;
  try{
    SB_NET.ws.send(JSON.stringify(payload));
    return true;
  }catch(e){
    console.warn('globalSend failed', e);
    return false;
  }
}

function globalConnect(){
  mpSyncRoomForm();
  sbClearReconnectTimer();
  SB_NET.manualDisconnect = false;

  try{
    const ws = new WebSocket(sbNetWsUrl());
    SB_NET.ws = ws;

    ws.onopen = () => {
      SB_NET.connected = true;
      SB_NET.reconnectAttempts = 0;
      sbUpdateGlobalNetStatus('Connected. Joining room...');

      globalSend({
        type: "join_room",
        roomId: SB_NET.roomId,
        role: SB_NET.role,
        team: SB_NET.team,
        name: SB_NET.playerName,
        playerKey: SB_NET.playerKey || undefined,
        hostPlays: SB_NET.hostPlays,
        character: SB_NET.character
      });
    };

    ws.onmessage = (ev) => {
      try{
        const msg = JSON.parse(ev.data);
        handleGlobalNetworkMessages(msg);
      }catch(e){
        console.warn('Bad WS message', e);
      }
    };

    ws.onclose = () => {
      SB_NET.connected = false;
      SB_NET.ws = null;
      SB_NET.roundActive = false;
      sbUpdateGlobalNetStatus('Disconnected. Reconnecting...');
      sbUpdateWarriorNetStatus('Disconnected. Reconnecting...');
      if(!SB_NET.manualDisconnect) sbScheduleReconnect();
    };

    ws.onerror = () => {
      sbUpdateGlobalNetStatus('Connection error.');
    };
  }catch(err){
    console.warn('globalConnect error', err);
    sbUpdateGlobalNetStatus('Connect failed.');
    sbScheduleReconnect();
  }
}

function globalDisconnect(){
  SB_NET.manualDisconnect = true;
  sbClearReconnectTimer();

  try{
    globalSend({
      type: "leave_room",
      roomId: SB_NET.roomId
    });
  }catch(e){}

  try{
    SB_NET.ws?.close();
  }catch(e){}

  SB_NET.connected = false;
  SB_NET.ws = null;
  SB_NET.roundActive = false;
  SB_NET.paused = false;
  SB_NET.pauseReason = "";
  sbSpellVsReset();

  sbUpdateGlobalNetStatus('Disconnected.');
  sbUpdateWarriorNetStatus('Disconnected.');
}

function handleGlobalNetworkMessages(msg){
  if(msg.roomId && msg.roomId !== SB_NET.roomId) return;

  if(msg.type === 'join_ack' || msg.type === 'room_state'){
    SB_NET.score = msg.score || SB_NET.score;
    SB_NET.roster = Array.isArray(msg.players) ? msg.players : [];
    SB_NET.paused = !!msg.paused;
    SB_NET.pauseReason = msg.pauseReason || "";

    if(msg.playerKey){
      SB_NET.playerKey = msg.playerKey;
      localStorage.setItem("sb_player_key", msg.playerKey);
    }

    const red = SB_NET.roster.filter(p => p.team === 'red').length;
    const blue = SB_NET.roster.filter(p => p.team === 'blue').length;
    SB_NET.rosterSummary = `Red ${red} • Blue ${blue}`;

    sbUpdateGlobalNetStatus();
    sbUpdateWarriorNetStatus();
    mpRenderRoomModal();
    return;
  }

  if(msg.type === 'join_denied'){
    sbToast("Room join denied.");
    sbUpdateGlobalNetStatus("Join denied.");
    return;
  }

  if(msg.type === 'session_start'){
    mpCloseRoomModal();
    sbToast("Host started the session. Choose lesson and game.");
    return;
  }

  if(msg.type === 'page_jump' && msg.gameId === 'warrior'){
    if(msg.lesson) sbApplyNetLessonPayload(msg.lesson);
    if(SB_NET.role !== 'host') openWarriorHub(true);
    return;
  }

  if(msg.type === 'page_jump' && msg.gameId === 'spelling'){
    if(msg.lesson) sbApplyNetLessonPayload(msg.lesson);
    sbOpenRemoteSpelling(msg.lesson);
    return;
  }

  if(msg.type === 'spell_match_prepare'){
    sbStartSpellVsRound(msg);
    return;
  }

  if(msg.type === 'spell_finish'){
    if(!sbSpellVsIsActive()) return;
    sbSpellVs.finished = true;
    sbSpellVs.winnerTeam = msg.team || '';
    sbSpellVs.winnerName = msg.name || 'Opponent';
    sbSpellVs.status = 'finished';
    sbUpdateSpellVsHud();

    const overlay = document.getElementById("success-overlay");
    if(overlay){
      overlay.classList.remove("hidden");
      document.getElementById("success-media").innerHTML = sbSpellVs.winnerTeam === SB_NET.team ? "🏆" : "💨";
      document.getElementById("success-msg").innerText =
        sbSpellVs.winnerTeam === SB_NET.team
          ? "YOU WON THE ROUND!"
          : `${sbSpellVs.winnerName || 'Opponent'} finished first!`;
      overlay.onclick = () => {
        overlay.classList.add("hidden");
        sbSpellVsReset();
        openLessonHub(currentLessonIndex);
      };
    }
    return;
  }

  if(msg.type === 'warrior_match_countdown'){
    if(!warrior || !warrior.running) openWarriorHub(true);
    warriorStartCountdown(msg.seconds || 4);
    sbUpdateWarriorNetStatus(`Get ready... • Score ${SB_NET.score.red}-${SB_NET.score.blue}`);
    return;
  }

  if(msg.type === 'warrior_round'){
    SB_NET.score = msg.score || SB_NET.score;
    SB_NET.roundActive = true;
    SB_NET.paused = false;
    SB_NET.pauseReason = "";

    if(!warrior || !warrior.running) openWarriorHub(true);

    warriorApplyRoundPayload(msg.round);

    if (warrior && !warrior.showTargets && !warrior.countdownActive) {
      warriorStartCountdown(4);
    }

    sbUpdateWarriorNetStatus(`Round live • Score ${SB_NET.score.red}-${SB_NET.score.blue}`);
    return;
  }

  if(msg.type === 'warrior_result'){
    SB_NET.score = msg.score || SB_NET.score;
    if(msg.correct) SB_NET.roundActive = false;
    warriorApplyNetResult(msg);
    return;
  }

  if(msg.type === 'host_paused'){
    SB_NET.paused = true;
    SB_NET.pauseReason = 'host_disconnected';
    SB_NET.roundActive = false;

    if(warrior){
      warrior.showTargets = false;
      warrior.countdownActive = false;
      if(warrior.countdownTimer){
        clearInterval(warrior.countdownTimer);
        warrior.countdownTimer = null;
      }
      warriorUpdateHud();
    }

    sbUpdateWarriorNetStatus("Host disconnected. Game paused...");
    sbToast("Host disconnected. Waiting for reconnect...");
    return;
  }

  if(msg.type === 'host_resumed'){
    SB_NET.paused = false;
    SB_NET.pauseReason = '';
    sbUpdateWarriorNetStatus("Host reconnected. Game resumed.");
    sbToast("Host reconnected.");
    return;
  }

  if(msg.type === 'host_timeout'){
    SB_NET.paused = false;
    SB_NET.pauseReason = 'host_timeout';
    SB_NET.roundActive = false;

    if(warrior){
      warrior.showTargets = false;
      warrior.countdownActive = false;
      if(warrior.countdownTimer){
        clearInterval(warrior.countdownTimer);
        warrior.countdownTimer = null;
      }
      warriorUpdateHud();
    }

    sbUpdateWarriorNetStatus("Host did not reconnect.");
    sbToast("Host did not reconnect in time.");
    return;
  }

  if(msg.type === 'room_paused'){
    SB_NET.paused = true;
    SB_NET.pauseReason = msg.reason || 'paused';
    SB_NET.roundActive = false;
    sbUpdateWarriorNetStatus("Room is paused.");
    return;
  }
}

function warriorPerformCorrectHit(target, team='red'){
  if(!warrior || !target) return;

  const c = warrior.characters
    ? (team === 'blue' ? warrior.characters.blue : warrior.characters.red)
    : warrior.character;

  if(!c) return;

  c.pendingBox = target;
  c.pendingTargetX = target.x + target.w / 2;

  c.state = 'dash';
  c.t = 0;
  c.dashFromX = c.x;
  c.dashToX = target.x + target.w / 2;
  c.facing = (c.dashToX >= c.dashFromX) ? 1 : -1;

  warriorUpdateHud();
}

function warriorPerformFail(target, team='red'){
  if(target) target.shakeT = 10;

  const c = warriorGetCharacter(team);
  if(!c) return;

  c.state = 'fail';
  c.t = 0;
}

function warriorBuildRoundPayload(){
  return {
    mode: warrior.mode,
    promptText: warrior.promptText,
    correctWord: warrior.correctWord,
    spellingTarget: warrior.spellingTarget || '',
    spellingProgress: warrior.spellingProgress || '',
    targets: (warrior.targets || []).map(t => ({
      id:t.id, label:t.label, isCorrect:!!t.isCorrect,
      x:t.x, y:t.y, w:t.w, h:t.h,
      hitState:t.hitState || 'idle', hitT:t.hitT || 0, shakeT:t.shakeT || 0,
    }))
  };
}

function warriorApplyRoundPayload(round){
  if(!warrior || !round) return;

  warrior.mode = round.mode || "boxes";
  warrior.promptText = round.promptText || "";
  warrior.correctWord = round.correctWord || "";
  warrior.spellingTarget = round.spellingTarget || "";
  warrior.spellingProgress = round.spellingProgress || "";
  warrior.targets = Array.isArray(round.targets)
    ? round.targets.map(t => ({ ...t }))
    : [];

  const correct = warrior.targets.find(t => t.isCorrect);
  const visibleTeams = warriorVisibleTeams();

  if(correct){
    const tx = correct.x + correct.w / 2;

    for (const team of visibleTeams) {
      const c = warriorGetCharacter(team);
      if (c) c.facing = (tx >= c.x) ? 1 : -1;
    }
  } else {
    for (const team of visibleTeams) {
      const c = warriorGetCharacter(team);
      if (!c) continue;
      c.facing = (team === "blue") ? -1 : 1;
    }
  }

  warriorUpdateHud();
}

function warriorApplyNetResult(msg){
  if(!warrior) return;

  const target = (warrior.targets || []).find(t => t.id === msg.targetId) || null;

  if(msg.correct){
    SB_NET.score = msg.score || SB_NET.score;
    SB_NET.roundActive = false;

    if(target){
      warriorPerformCorrectHit(target, msg.team);
    }

    const heroName = msg.team === "blue" ? "Aria" : "Athena";
    warrior.message = `${heroName} scores!`;
    warrior.messageT = 70;
  }else{
    if(target){
      warriorPerformFail(target, msg.team);
    }
  }

  warriorUpdateHud();
}

/* =========================================================
   ⚔️ Warrior Core Runtime
   ========================================================= */

function warriorGetCharacter(team){
  if(!warrior) return null;
  if(warrior.characters){
    return team === 'blue' ? warrior.characters.blue : warrior.characters.red;
  }
  return warrior.character;
}

function warriorVisibleTeams(){
  if(!SB_NET.connected) return ['red']; // single player
  if(SB_NET.hostPlays) return ['red','blue'];
  return SB_NET.role === 'host' ? [] : [SB_NET.team];
}

function warriorUpdateHud(){
  const hud = document.getElementById("warrior-hud");
  if(!hud || !warrior) return;

  const score = SB_NET.score || { red:0, blue:0 };
  const redName = sbDisplayNameForTeam('red');
  const blueName = sbDisplayNameForTeam('blue');

  hud.innerHTML = `
    <div class="warrior-hud-row">
      <div>🔴 ${redName}: ${score.red}</div>
      <div>🔵 ${blueName}: ${score.blue}</div>
    </div>
    <div class="warrior-hud-row">
      ${warrior.promptText || ""}
    </div>
  `;
}

function warriorLoop(ts){
  if(!warrior.running) return;

  const dt = Math.min(32, ts - (warrior.lastTs || ts));
  warrior.lastTs = ts;

  warriorUpdate(dt);
  warriorRender();

  requestAnimationFrame(warriorLoop);
}

function warriorUpdate(dt){
  if(!warrior) return;

  const teams = warriorVisibleTeams();

  for(const team of teams){
    const c = warriorGetCharacter(team);
    if(!c) continue;

    c.t += dt;

    if(c.state === "dash"){
      const progress = Math.min(1, c.t / 200);
      c.x = c.dashFromX + (c.dashToX - c.dashFromX) * progress;

      if(progress >= 1){
        c.state = "jump";
        c.t = 0;
      }
    }

    else if(c.state === "jump"){
      if(c.t > 150){
        c.state = "land";
        c.t = 0;
      }
    }

    else if(c.state === "land"){
      if(c.t > 150){
        c.state = "idle";
        c.t = 0;
      }
    }

    else if(c.state === "fail"){
      if(c.t > 300){
        c.state = "idle";
        c.t = 0;
      }
    }
  }
}

function warriorRender(){
  const canvas = document.getElementById("warrior-canvas");
  if(!canvas) return;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Draw targets
  (warrior.targets || []).forEach(t => {
    ctx.fillStyle = t.isCorrect ? "#4caf50" : "#e53935";
    ctx.fillRect(t.x, t.y, t.w, t.h);

    ctx.fillStyle = "#fff";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(t.label, t.x + t.w/2, t.y + t.h/2 + 5);
  });

  // Draw characters
  const teams = warriorVisibleTeams();

  for(const team of teams){
    const c = warriorGetCharacter(team);
    if(!c) continue;

    ctx.fillStyle = team === "blue" ? "#2196f3" : "#f44336";
    ctx.fillRect(c.x - 15, c.y - 30, 30, 30);
  }
}

/* =========================================================
   🎮 Warrior Input
   ========================================================= */

function warriorPick(target){
  if(!target || !SB_NET.roundActive) return;

  if(SB_NET.connected){
    globalSend({
      type:"warrior_pick",
      roomId: SB_NET.roomId,
      targetId: target.id,
      team: SB_NET.team
    });
    return;
  }

  // local mode
  if(target.isCorrect){
    warriorPerformCorrectHit(target, 'red');
  }else{
    warriorPerformFail(target, 'red');
  }
}

/* =========================================================
   🎯 Game Entry / Flow
   ========================================================= */

function startGame(index, mode, opts={}){
  currentLessonIndex = index;
  currentLesson = lessons[index] || currentLesson;
  gameMode = mode;

  if(mode === 'spelling'){
    if(SB_NET.connected && SB_NET.role === 'host' && !opts.fromRemote && !opts.vs){
      sbHostStartSpellingVs(index);
      return;
    }

    if(opts.vs){
      sbSpellVs.enabled = true;
      sbSpellVs.seed = String(opts.seed || `${Date.now()}`);
      wordQueue = sbSeededShuffle(currentLesson?.items || [], `spell-vs:${sbSpellVs.seed}`);
      sbSpellVs.queue = [...wordQueue];
      sbSpellVs.finished = false;
      sbSpellVs.status = "playing";
    }else{
      sbSpellVsReset();
      wordQueue = shuffle(currentLesson?.items || []);
    }

    currentTargetItem = null;
    spellingProgress = "";
    showPage("game-page");
    nextRound(false);
    return;
  }

  if(mode === 'warrior'){
    showPage("warrior-page");
    warriorOpen(index);
    return;
  }
}

/* =========================================================
   🔤 Spelling Game
   ========================================================= */

function nextRound(playSound=true){
  if(!currentLesson || !(currentLesson.items||[]).length){
    sbToast("No lesson.");
    return;
  }

  if(wordQueue.length === 0){
    onSpellingComplete();
    return;
  }

  currentTargetItem = wordQueue.shift();
  spellingProgress = "";

  renderGameBoard();

  if(playSound){
    speakCurrentTarget();
  }
}

function renderGameBoard(){
  const board = document.getElementById("game-board");
  if(!board || !currentTargetItem) return;

  const word = currentTargetItem.word || "";
  const letters = shuffle(word.split(""));

  board.innerHTML = `
    <div id="spell-progress">${spellingProgress || "_"}</div>
    <div>
      ${letters.map(l => `<button onclick="pickLetter('${l}')">${l}</button>`).join("")}
    </div>
  `;
}

function pickLetter(ch){
  if(!currentTargetItem || sbSpellVs.finished) return;

  const expected = currentTargetItem.word[spellingProgress.length];

  if(ch === expected){
    spellingProgress += ch;

    if(spellingProgress === currentTargetItem.word){
      setTimeout(()=>nextRound(true),150);
    }
  }else{
    sbToast("Wrong letter");
  }

  renderGameBoard();
}

function onSpellingComplete(){
  if(sbSpellVsIsActive() && !sbSpellVs.finished){
    sbSpellVs.finished = true;

    globalSend({
      type:"spell_finish",
      roomId:SB_NET.roomId,
      team:SB_NET.team,
      name:SB_NET.playerName
    });

    alert("🏆 You finished first!");
    return;
  }

  alert("Done!");
  openLessonHub(currentLessonIndex);
}

/* =========================================================
   🧰 Utilities
   ========================================================= */

function rand(arr){
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr){
  const a = [...(arr || [])];
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sbToast(msg){
  console.log("Toast:", msg);
  const el = document.getElementById("sb-toast");
  if(!el){
    alert(msg);
    return;
  }
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"), 1500);
}

/* =========================================================
   🔊 Speech
   ========================================================= */

function speak(text){
  if(!text) return;

  try{
    const u = new SpeechSynthesisUtterance(text);
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }catch(e){
    console.warn("Speech failed", e);
  }
}

function speakCurrentTarget(){
  if(!currentTargetItem) return;
  speak(currentTargetItem.word);
}

/* =========================================================
   📚 Lessons System
   ========================================================= */

async function sbLoadLessons(){
  try{
    const raw = localStorage.getItem("lessons_data");
    lessons = raw ? JSON.parse(raw) : [];

    if(!Array.isArray(lessons) || !lessons.length){
      lessons = [
        {
          title:"Sample Lesson",
          items:[
            { word:"cat", image:"", fallback:"🐱" },
            { word:"dog", image:"", fallback:"🐶" },
            { word:"sun", image:"", fallback:"☀️" }
          ]
        }
      ];
    }
  }catch(e){
    console.warn("Load lessons failed", e);
    lessons = [];
  }
}

async function sbMigrateLessonsIfNeeded(){
  // placeholder for IndexedDB migration (your earlier system)
}

/* =========================================================
   📺 Navigation
   ========================================================= */

function showPage(id){
  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
  const el = document.getElementById(id);
  if(el) el.classList.remove("hidden");
}

/* =========================================================
   📖 Lesson Hub
   ========================================================= */

function openLessonHub(index){
  currentLessonIndex = index;
  currentLesson = lessons[index];

  const titleEl = document.getElementById("lesson-page-title");
  if(titleEl) titleEl.textContent = currentLesson.title || "Lesson";

  const badgeWrap = document.getElementById("lesson-page-badges");
  if(badgeWrap){
    const wordsCount = (currentLesson.items||[]).length;
    badgeWrap.innerHTML = `
      <span>🧩 ${wordsCount} words</span>
    `;
  }

  showPage("lesson-page");
}

/* =========================================================
   🏠 Menu Rendering
   ========================================================= */

async function renderMenu(){
  await sbLoadLessons();

  const list = document.getElementById("lesson-list");
  if(!list) return;

  list.innerHTML = `
    <div id="sb-card-grid"></div>
  `;

  const grid = document.getElementById("sb-card-grid");

  lessons.forEach((lesson, index)=>{
    const card = document.createElement("div");
    card.className = "lesson-card";

    card.innerHTML = `
      <h3>${lesson.title}</h3>
      <button onclick="openLessonHub(${index})">Open</button>
    `;

    grid.appendChild(card);
  });
}

/* =========================================================
   🎯 Misc Game Helpers
   ========================================================= */

function resetGameState(){
  currentTargetItem = null;
  spellingProgress = "";
  wordQueue = [];
  sbSpellVsReset();
}

function openWarriorHub(fromNet=false){
  showPage("warrior-page");

  if(!warrior){
    warriorInit();
  }

  if(!warrior.running){
    warrior.running = true;
    requestAnimationFrame(warriorLoop);
  }

  if(!fromNet){
    SB_NET.roundActive = false;
  }
}

/* =========================================================
   ⚔️ Warrior Init
   ========================================================= */

function warriorInit(){
  const canvas = document.getElementById("warrior-canvas");

  warrior = {
    running:false,
    lastTs:0,
    mode:"boxes",
    promptText:"",
    correctWord:"",
    spellingTarget:"",
    spellingProgress:"",
    targets:[],
    message:"",
    messageT:0,

    characters:{
      red:{ x:100, y:250, state:"idle", t:0 },
      blue:{ x:400, y:250, state:"idle", t:0 }
    }
  };

  if(canvas){
    canvas.width = 600;
    canvas.height = 300;
  }
}

/* =========================================================
   🚀 Boot
   ========================================================= */

window.startGame = startGame;
window.openLessonHub = openLessonHub;
window.pickLetter = pickLetter;
window.warriorPick = warriorPick;

renderMenu();

  } catch (err) {
    console.error("Legacy init error:", err);
  }
});