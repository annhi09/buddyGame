import { playTeamIntro, preloadTeamIntroAssets } from "../js/team-intro.js";

// Auto-extracted legacy inline JS from words.html
// Runs after DOMContentLoaded. Some legacy HTML uses inline onclick handlers,
// so we explicitly expose certain functions onto window.
document.addEventListener('DOMContentLoaded', () => {
  try {
    preloadTeamIntroAssets().catch(() => {});
let repeatIsListening = false;
  let repeatLastStartTs = 0;


let repeatMode = {
  isPro:false,
  queue:[],
  current:null,
  streak:0,
  timer:null,
  timeLeft:0,
  correct:0,
  total:0,
  finished:false,
  seed:"",
  remote:false
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

let memoryMode = {
  deck: [],
  busy: false,
  completed: false,
};

let editIndex = -1;

let typeSpellMode = { queue: [], current: null };
// let wordScrambleMode = { queue: [], current: null, letters: [], picked: [] };


/* =========================================================
   🌐 Global Multiplayer (Warrior first)
   ========================================================= */
// let SB_NET = {
//   connected:false,
//   ws:null,
//   roomId:"class-1",
//   role:"player",
//   team:"red",
//   playerName:"Player",
//   character:"athena",
//   hostPlays:true, // true for 1v1, false for teacher host
//   playerKey:"",
//   score:{ red:0, blue:0 },
//   lessonPayload:null,
//   roundActive:false,
//   roster:[],
//   rosterSummary:"",
//   paused:false,
//   pauseReason:"",
//   reconnectTimer:null,
//   reconnectAttempts:0,
//   manualDisconnect:false,
// };

let SB_NET = {
  connected:false,
  ws:null,
  roomId:"class-1",
  role:"player",
  team:"red",
  playerName:"Player",
  character:"athena",
  vehicle:"heli",
  hostPlays:true,
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

let SB_MATCH = {
  active: false,
  kind: "",              // "race"
  gameId: "",            // "typespell" | "scramble" | later more
  roundId: "",
  seed: "",
  lessonTitle: "",
  startedAt: 0,
  finishedAt: 0,
  status: "idle",        // idle | countdown | playing | finished
  result: "",            // win | lose | tie
  progress: 0,
  opponentProgress: 0,
  completeSent: false,
  hostStarted: false,
};

let SB_SESSION = {
  maxRounds: 5,
  roundsPlayed: 0,
  bestOf: 5,
  warriorAutoNext: true,
  warriorRoundSeconds: 4,
  allowedModes: ["smash","spelling","typespell","memory","repeatpro","warrior"],
  micEnabled: true,
  lessonSizeLimit: 0, // 0 = full lesson
  leaderboard: {},
  history: []
};

// let SB_RUNNER_SHARED = {
//   active: false,
//   role: "player",
//   roomId: "",
//   roundId: "",
//   seed: "",
//   status: "idle", // idle | countdown | live | ended
//   timeLeft: 60,
//   score: { red: 0, blue: 0 },
//   promptWord: "",
//   enemies: [],
//   players: {
//     red: null,
//     blue: null
//   },
//   raf: 0,
//   clientRaf: 0
// };

let SB_RUNNER_SHARED = {
  active: false,
  role: "player",
  roomId: "",
  roundId: "",
  seed: "",
  status: "idle",
  timeLeft: 60,
  score: { red: 0, blue: 0 },
  promptWord: "",
  enemies: [],
  players: {
    red: null,
    blue: null
  },
  speedMul: 1,
  spawnMul: 1,
  projectiles: [],
  explosions: [],
  raf: 0,
  clientRaf: 0
};

let SB_SKYBATTLE_SHARED = {
  active: false,
  role: "player",
  roomId: "",
  roundId: "",
  seed: "",
  status: "idle", // idle | live | ended
  timeLeft: 60,
  score: { red: 0, blue: 0 },
  promptWord: "",
  enemies: [],
  bullets: [],
  bursts: [],
  players: {
    red: null,
    blue: null
  },
  raf: 0,
  clientRaf: 0
};


// function warriorHostStartRound(){
//   if (!SB_NET.connected) {
//     warriorStartCountdown(4);
//     setTimeout(() => {
//       warriorNextRound();
//     }, 4000);
//     return;
//   }

//   if (SB_NET.role !== 'host') {
//     sbToast("Only host can start the round.");
//     return;
//   }

//   if (SB_NET.paused) {
//     sbToast("Room is paused.");
//     return;
//   }

//   globalSend({
//     type: "warrior_match_countdown",
//     roomId: SB_NET.roomId,
//     seconds: 4
//   });

//   warriorStartCountdown(4);

//   setTimeout(() => {
//     warriorNextRound();
//   }, 4000);
// }

async function sbPlayTeamIntroIfNeeded(roundId = "") {
  await playTeamIntro({
    role: SB_NET.role,
    team: SB_NET.team,
    hostPlays: SB_NET.hostPlays,
    mode: "words",
    soundEnabled: true,
    hostView: "full",
    roundId
  });
}

function warriorHostStartRound() {
  if (!SB_NET.connected) {
    warriorStartCountdown(4);
    setTimeout(() => {
      if (warrior?.running) warriorNextRound();
    }, 4200);
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

  // Let the shared network handler drive countdown for BOTH host and player
  globalSend({
    type: "warrior_match_countdown",
    roomId: SB_NET.roomId,
    seconds: 4
  });

  sbUpdateWarriorNetStatus("Round starting...");
}



function mpOpenRoomModal(){
  const modal = document.getElementById("mp-room-modal");
  if(!modal) return;
  modal.classList.remove("hidden");
  mpRenderRoomModal();
}

function mpCloseRoomModal(){
  const modal = document.getElementById("mp-room-modal");
  if(!modal) return;
  modal.classList.add("hidden");
}

function mpRenderRoomModal(){
  const statusEl = document.getElementById("mp-room-modal-status");
  const codeEl = document.getElementById("mp-room-modal-code");
  const roleEl = document.getElementById("mp-room-modal-role");
  const teamEl = document.getElementById("mp-room-modal-team");
  const charEl = document.getElementById("mp-room-modal-character");
  const rosterEl = document.getElementById("mp-room-modal-roster");
  const startBtn = document.getElementById("mp-room-start-btn");

  if(statusEl){
    statusEl.textContent = !SB_NET.connected
      ? "Offline"
      : (SB_NET.role === "host"
          ? "Waiting for players to join..."
          : "Waiting for host to start...");
  }

  if(codeEl) codeEl.textContent = `Room: ${SB_NET.roomId || "class-1"}`;
  if(roleEl) roleEl.textContent = `Role: ${(SB_NET.role || "player").toUpperCase()}`;
  if(teamEl) teamEl.textContent = `Team: ${(SB_NET.team || "red").toUpperCase()}`;
  if(charEl) charEl.textContent = `Character: ${SB_NET.character || "athena"}`;

  if(startBtn){
    startBtn.style.display = (SB_NET.role === "host") ? "inline-block" : "none";
  }

  if(rosterEl){
    const players = Array.isArray(SB_NET.roster) ? SB_NET.roster : [];
    if(!players.length){
      rosterEl.textContent = "No players yet.";
    } else {
      rosterEl.innerHTML = players.map(p => {
        const role = (p.role || "player").toUpperCase();
        const team = (p.team || "red").toUpperCase();
        const character = p.character || "athena";
        const name = p.name || "Player";
        // return `
        //   <div style="margin:4px 0;">
        //     ${role} • ${team} • ${character} • ${name}
        //   </div>
        // `;
        // return `
        //   <div style="margin:4px 0;">
        //     ${role} • ${team} • ${character} • ${p.vehicle || "heli"} • ${name}
        //   </div>
        // `;
        return `
          <div style="margin:4px 0;">
            ${role} • ${team} • ${name} • ${
              p.team === "blue"
                ? "Aria + Unicorn"
                : "Athena + Griffin"
            }
          </div>
        `;
      }).join("");
    }
  }
}

function mpHostStartSession(){
  if(SB_NET.role !== "host"){
    sbToast("Only host can start the session.");
    return;
  }

  if(!SB_NET.connected){
    sbToast("Connect first.");
    return;
  }

  globalSend({
    type: "session_start",
    roomId: SB_NET.roomId
  });

  mpCloseRoomModal();
  sbToast("Session started. Choose a lesson and game.");
}

// function sbNetWsUrl(){
//   const host = (location.hostname && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1')
//     ? location.hostname
//     : 'localhost';
//   const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
//   return `${proto}//${host}:8080`;
// }

// function sbNetWsUrl(){
//   const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
//   return `${proto}//${location.host}`;
// }

function sbNetWsUrl(){
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const isLocalhost =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

  if (isLocalhost && location.port !== "8080") {
    return `${proto}//${location.hostname}:8080`;
  }

  return `${proto}//${location.host}`;
}

function sbUpdateGlobalNetStatus(text=''){
  const el = document.getElementById('global-connect-status');
  if(!el) return;
  if(text){ el.textContent = text; return; }
  if(!SB_NET.connected){
    // el.textContent = 'Offline. Multiplayer currently works on Warrior (Pro) first.';
    el.textContent = 'Offline. VS works for Smash, Spell, Type Spell, Memory, Repeat Pro, Sky Patrol and Warrior.';
    return;
  }
    const teamLabel =
    SB_NET.team === "blue"
      ? "🔵 Aria + Unicorn"
      : "🔴 Athena + Griffin";

  el.textContent =
    `✅ ${SB_NET.role === 'host' ? 'Host' : 'Player'} • ${SB_NET.roomId} • ${teamLabel}${SB_NET.rosterSummary ? ' • ' + SB_NET.rosterSummary : ''}`;

  // el.textContent =
  // `✅ ${SB_NET.role === 'host' ? 'Host' : 'Player'} in ${SB_NET.roomId} • ${SB_NET.team.toUpperCase()} • ${String(SB_NET.vehicle || "heli").toUpperCase()}${SB_NET.rosterSummary ? ' • ' + SB_NET.rosterSummary : ''}`;
  // el.textContent = `✅ ${SB_NET.role === 'host' ? 'Host' : 'Player'} in ${SB_NET.roomId} • ${SB_NET.team.toUpperCase()}${SB_NET.rosterSummary ? ' • ' + SB_NET.rosterSummary : ''}`;
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

function globalSend(obj){
  if(!SB_NET.ws || SB_NET.ws.readyState !== 1) return false;
  SB_NET.ws.send(JSON.stringify(obj));
  return true;
}

// function sbIsRaceMode(gameId){
//   return ["typespell", "scramble", "smash", "spelling", "memory", "repeatpro", "runner", "skybattle"].includes(gameId);
// }

function sbIsRaceMode(gameId){
  return ["typespell", "scramble", "smash", "spelling", "memory", "repeatpro", "runner"].includes(gameId);
}

function sbMemoryProgressPercent(){
  const totalPairs = Math.max(1, currentLesson?.items?.length || 1);
  return Math.max(0, Math.min(100, Math.round((matches / totalPairs) * 100)));
}

function sbIsMultiplayerRaceActive(gameId){
  return !!(
    SB_NET.connected &&
    SB_MATCH.active &&
    SB_MATCH.kind === "race" &&
    SB_MATCH.gameId === gameId &&
    SB_MATCH.status === "playing"
  );
}

function sbMakeRoundId(){
  return `round-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

// function sbResetRaceMatch(){
//   SB_MATCH.active = false;
//   SB_MATCH.kind = "";
//   SB_MATCH.gameId = "";
//   SB_MATCH.roundId = "";
//   SB_MATCH.seed = "";
//   SB_MATCH.lessonTitle = "";
//   SB_MATCH.startedAt = 0;
//   SB_MATCH.finishedAt = 0;
//   SB_MATCH.status = "idle";
//   SB_MATCH.result = "";
//   SB_MATCH.progress = 0;
//   SB_MATCH.opponentProgress = 0;
//   SB_MATCH.completeSent = false;
//   SB_MATCH.hostStarted = false;
// }

function sbResetRaceMatch(){
  SB_MATCH.active = false;
  SB_MATCH.kind = "";
  SB_MATCH.gameId = "";
  SB_MATCH.roundId = "";
  SB_MATCH.seed = "";
  SB_MATCH.lessonTitle = "";
  SB_MATCH.startedAt = 0;
  SB_MATCH.finishedAt = 0;
  SB_MATCH.status = "idle";
  SB_MATCH.result = "";
  SB_MATCH.progress = 0;
  SB_MATCH.opponentProgress = 0;
  SB_MATCH.completeSent = false;
  SB_MATCH.hostStarted = false;
  sbHideVsBanner();
}

function sbRaceModeLabel(gameId){
  switch(String(gameId || "").toLowerCase()){
    case "smash": return "🔨 Smash VS";
    case "spelling": return "🔤 Spell VS";
    case "typespell": return "⌨️ Type Spell VS";
    case "memory": return "🧠 Memory VS";
    case "repeatpro": return "🎤 Repeat Pro VS";
    case "runner": return "🚁 Sky Patrol VS";
    case "skybattle": return "☄️ Sky Battle VS";
    default: return "⚡ VS Mode";
  }
}

function sbEnsureVsBanner(){
  return {
    wrap: document.getElementById("sb-vs-banner"),
    mode: document.getElementById("sb-vs-mode"),
    title: document.getElementById("sb-vs-title"),
    sub: document.getElementById("sb-vs-sub"),
  };
}

function sbHideVsBanner(){
  const { wrap } = sbEnsureVsBanner();
  if(wrap) wrap.classList.add("hidden");
}

function sbShowVsBanner(){
  const { wrap } = sbEnsureVsBanner();
  if(wrap) wrap.classList.remove("hidden");
}

function sbUpdateVsBanner(customTitle = "", customSub = ""){
  const { wrap, mode, title, sub } = sbEnsureVsBanner();
  if(!wrap || !mode || !title || !sub) return;

  const gameId = SB_MATCH?.gameId || "";
  const you = Math.max(0, Math.min(100, Math.round(SB_MATCH?.progress || 0)));
  const opp = Math.max(0, Math.min(100, Math.round(SB_MATCH?.opponentProgress || 0)));

  mode.textContent = sbRaceModeLabel(gameId);
  title.textContent = customTitle || (
    SB_MATCH?.status === "countdown" ? "Get ready…" :
    SB_MATCH?.status === "finished" ? "Round finished" :
    "Race live"
  );
  sub.textContent = customSub || `You ${you}% • Opponent ${opp}%`;

  wrap.classList.remove("hidden");
}

function sbSetRaceStatus(text){
  sbUpdateGlobalNetStatus(text);

  if(!SB_MATCH?.active){
    sbHideVsBanner();
    return;
  }

  sbUpdateVsBanner(text, `You ${Math.round(SB_MATCH.progress || 0)}% • Opponent ${Math.round(SB_MATCH.opponentProgress || 0)}%`);
}

function sbRaceSeededShuffle(arr, seedStr){
  let seed = 0;
  const s = String(seedStr || "seed");
  for(let i=0;i<s.length;i++) seed = ((seed * 31) + s.charCodeAt(i)) >>> 0;

  function rand(){
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  const copy = [...arr];
  for(let i=copy.length - 1; i>0; i--){
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sbBuildRacePayload(index, gameId){
  const lesson = lessons[index];
  const roundId = sbMakeRoundId();
  const seed = `${lesson?.title || "lesson"}-${gameId}-${roundId}`;

  return {
    type: "race_mode_start",
    roomId: SB_NET.roomId,
    gameId,
    roundId,
    seed,
    lesson: sbMakeNetLessonPayload(lesson)
  };
}


// function sbStartRaceMatchFromPayload(msg){
//   if(msg.lesson) sbApplyNetLessonPayload(msg.lesson);

//   SB_MATCH.active = true;
//   SB_MATCH.kind = "race";
//   SB_MATCH.gameId = msg.gameId || "";
//   SB_MATCH.roundId = msg.roundId || sbMakeRoundId();
//   SB_MATCH.seed = msg.seed || "";
//   SB_MATCH.lessonTitle = currentLesson?.title || "";
//   SB_MATCH.startedAt = 0;
//   SB_MATCH.finishedAt = 0;
//   SB_MATCH.status = "countdown";
//   SB_MATCH.result = "";
//   SB_MATCH.progress = 0;
//   SB_MATCH.opponentProgress = 0;
//   SB_MATCH.completeSent = false;

//   sbSetRaceStatus(`Get ready... ${SB_MATCH.gameId.toUpperCase()} VS`);

//   if(SB_MATCH.gameId === "typespell"){
//     startTypeSpellMode(currentLessonIndex, { remote:true, seed:SB_MATCH.seed });
//   } else if(SB_MATCH.gameId === "scramble"){
//     startWordScrambleMode(currentLessonIndex, { remote:true, seed:SB_MATCH.seed });
//   } else if(SB_MATCH.gameId === "smash"){
//     startGame(currentLessonIndex, "smash", { remote:true, seed:SB_MATCH.seed });
//   } else if(SB_MATCH.gameId === "spelling"){
//     startGame(currentLessonIndex, "spelling", { remote:true, seed:SB_MATCH.seed });
//   } else if(SB_MATCH.gameId === "memory"){
//     startMemoryGame(currentLessonIndex, { remote:true, seed:SB_MATCH.seed });
//       } else if(SB_MATCH.gameId === "repeatpro"){
//     startRepeatMode(currentLessonIndex, true, { remote:true, seed:SB_MATCH.seed });
//   }

//   setTimeout(() => {
//     SB_MATCH.status = "playing";
//     SB_MATCH.startedAt = Date.now();
//     sbSetRaceStatus(`VS live • ${SB_MATCH.gameId.toUpperCase()}`);
//   }, 3000);
// }

async function sbStartRaceMatchFromPayload(msg){
  // Prevent duplicate start of the exact same round on the same client
  if(
    SB_MATCH.active &&
    SB_MATCH.roundId &&
    msg.roundId &&
    SB_MATCH.roundId === msg.roundId
  ){
    return;
  }

  await sbPlayTeamIntroIfNeeded(msg.roundId);
  if(msg.lesson) sbApplyNetLessonPayload(msg.lesson);

  SB_MATCH.active = true;
  SB_MATCH.kind = "race";
  SB_MATCH.gameId = msg.gameId || "";
  SB_MATCH.roundId = msg.roundId || sbMakeRoundId();
  SB_MATCH.seed = msg.seed || "";
  SB_MATCH.lessonTitle = currentLesson?.title || "";
  SB_MATCH.startedAt = 0;
  SB_MATCH.finishedAt = 0;
  SB_MATCH.status = "countdown";
  SB_MATCH.result = "";
  SB_MATCH.progress = 0;
  SB_MATCH.opponentProgress = 0;
  SB_MATCH.completeSent = false;

  sbSetRaceStatus(`Get ready... ${SB_MATCH.gameId.toUpperCase()} VS`);
  sbUpdateVsBanner(`Get ready... ${sbRaceModeLabel(SB_MATCH.gameId)}`, "You 0% • Opponent 0%");

  if(SB_MATCH.gameId === "typespell"){
    startTypeSpellMode(currentLessonIndex, { remote:true, seed:SB_MATCH.seed });
  // } else if(SB_MATCH.gameId === "scramble"){
  //   startWordScrambleMode(currentLessonIndex, { remote:true, seed:SB_MATCH.seed });
  } else if(SB_MATCH.gameId === "smash"){
    startGame(currentLessonIndex, "smash", { remote:true, seed:SB_MATCH.seed });
  } else if(SB_MATCH.gameId === "spelling"){
    startGame(currentLessonIndex, "spelling", { remote:true, seed:SB_MATCH.seed });
  } else if(SB_MATCH.gameId === "memory"){
    startMemoryGame(currentLessonIndex, { remote:true, seed:SB_MATCH.seed });
  } else if(SB_MATCH.gameId === "repeatpro"){
    startRepeatMode(currentLessonIndex, true, { remote:true, seed:SB_MATCH.seed });
  } else if(SB_MATCH.gameId === "runner"){
  startRunner({ remote:true, seed:SB_MATCH.seed });
    } else if(SB_MATCH.gameId === "skybattle"){
    startSkyBattle({ remote:true, seed:SB_MATCH.seed });
}

  setTimeout(() => {
    // only promote to playing if this same round is still active
    if(SB_MATCH.roundId !== msg.roundId) return;
    SB_MATCH.status = "playing";
    SB_MATCH.startedAt = Date.now();
    // sbSetRaceStatus(`VS live • ${SB_MATCH.gameId.toUpperCase()}`);
    sbSetRaceStatus(`VS live • ${sbRaceModeLabel(SB_MATCH.gameId)}`);
    sbUpdateVsBanner(`VS live • ${sbRaceModeLabel(SB_MATCH.gameId)}`, "You 0% • Opponent 0%");
  }, 3000);
}

function sbSendRaceProgress(gameId, progress){
  if(!sbIsMultiplayerRaceActive(gameId)) return;
  progress = Math.max(0, Math.min(100, Math.round(progress || 0)));

  if(progress === SB_MATCH.progress) return;
  SB_MATCH.progress = progress;

  globalSend({
    type: "race_progress",
    roomId: SB_NET.roomId,
    gameId,
    roundId: SB_MATCH.roundId,
    progress
  });
}

function sbMyVehicle(){
  return SB_NET?.vehicle === "tank" ? "tank" : "heli";
}

function sbVehicleConfig(kind){
  if(kind === "tank"){
    return {
      kind: "tank",
      emoji: "🚓",
      label: "tank",
      y: 430,
      baseCooldown: 0.24,
      projectileSpeed: 660
    };
  }

  return {
    kind: "heli",
    emoji: "🚁",
    label: "heli",
    y: 120,
    baseCooldown: 0.16,
    projectileSpeed: 720
  };
}

function sbLaunchRunner(){
  if(!SB_NET.connected){
    startRunner();
    return;
  }
  startRunnerSharedVs();
}

function sbLaunchSkyBattle(){
  if(!SB_NET.connected){
    startSkyBattle();
    return;
  }
  startSkyBattleSharedVs();
}

function runnerSharedApplySpeedFromUi(){
  const sel = document.getElementById("runner-speed-select");
  const v = Math.max(0.5, Math.min(2, parseFloat(sel?.value || "1")));

  SB_RUNNER_SHARED.speedMul = v;

  // Higher speed = shorter spawn gap
  SB_RUNNER_SHARED.spawnMul =
    v >= 1.5 ? 0.72 :
    v >= 1.25 ? 0.84 :
    v <= 0.8 ? 1.2 :
    1;
}

function sbSendRunnerRaceComplete(result = "done"){
  if(!runner || !sbIsMultiplayerRaceActive("runner")) return;
  if(SB_MATCH.completeSent) return;

  const durationMs = Math.max(0, Date.now() - (SB_MATCH.startedAt || Date.now()));

  // sbSendRaceComplete("runner", {
  //   mode: "score_battle",
  //   result,
  //   score: runner.score || 0,
  //   correctHits: runner.correctHits || 0,
  //   wrongHits: runner.wrongHits || 0,
  //   timeLeft: Math.max(0, Math.ceil(runner.timeLeft || 0)),
  //   durationMsLocal: durationMs
  // });
 sbSendRaceComplete("runner", {
  mode: "score_battle",
  result,
  score: Number(runner.score || 0),
  correctHits: Number(runner.correctHits || 0),
  wrongHits: Number(runner.wrongHits || 0),
  timeLeft: Number(Math.max(0, Math.ceil(runner.timeLeft || 0)))
});
}

function sbSendRaceComplete(gameId, meta = {}){
  if(!sbIsMultiplayerRaceActive(gameId)) return;
  if(SB_MATCH.completeSent) return;

  SB_MATCH.completeSent = true;
  SB_MATCH.finishedAt = Date.now();
  SB_MATCH.status = "finished";

  globalSend({
    type: "race_complete",
    roomId: SB_NET.roomId,
    gameId,
    roundId: SB_MATCH.roundId,
    durationMs: Math.max(0, SB_MATCH.finishedAt - SB_MATCH.startedAt),
    meta
  });
}

function sbHandleRaceResult(msg){
  if(!SB_MATCH.active) return;
  if(msg.roundId && SB_MATCH.roundId && msg.roundId !== SB_MATCH.roundId) return;

  SB_MATCH.status = "finished";
  SB_MATCH.result = msg.result || "";

  const overlay = document.getElementById("success-overlay");
  const media   = document.getElementById("success-media");
  const msgEl   = document.getElementById("success-msg");

  const isRunner = (SB_MATCH.gameId === "runner");
  const yourScore = Number(msg?.youMeta?.score ?? msg?.meta?.score ?? 0);
  const oppScore  = Number(msg?.oppMeta?.score ?? msg?.opponentMeta?.score ?? 0);

  if(!overlay || !media || !msgEl){
    sbResetRaceMatch();
    openLessonHub(currentLessonIndex);
    return;
  }

  overlay.classList.remove("hidden");

  if(msg.result === "tie"){
    media.innerHTML = "🤝";
    msgEl.innerHTML = isRunner
      ? `TIE!<div style="font-size:18px; margin-top:8px;">Score ${yourScore} - ${oppScore}</div>`
      : `TIE!<div style="font-size:18px; margin-top:8px;">Tap to return to lesson</div>`;
  } else if(msg.winnerTeam === SB_NET.team){
    media.innerHTML = "🏆";
    msgEl.innerHTML = isRunner
      ? `YOU WIN!<div style="font-size:18px; margin-top:8px;">Score ${yourScore} - ${oppScore}</div>`
      : `YOU WIN!<div style="font-size:18px; margin-top:8px;">Tap to return to lesson</div>`;
    sbRewardFx({ emoji:"🏆", text:"VS WIN!", shake:true });
  } else {
    media.innerHTML = "💨";
    msgEl.innerHTML = isRunner
      ? `YOU LOSE!<div style="font-size:18px; margin-top:8px;">Score ${yourScore} - ${oppScore}</div>`
      : `YOU LOSE!<div style="font-size:18px; margin-top:8px;">Tap to return to lesson</div>`;
  }

  overlay.onclick = () => {
    overlay.classList.add("hidden");
    sbResetRaceMatch();
    openLessonHub(currentLessonIndex);
  };
}

function sbMakeNetLessonPayload(lesson){
  if(!lesson) return null;
  return {
    title: lesson.title || 'Lesson',
    items: (lesson.items || []).map(it => ({
      word: (it.word || '').toString(),
      image: /^https?:\/\//i.test(it.image || '') ? it.image : ''
    }))
  };
}

function sbApplyNetLessonPayload(payload){
  if(!payload) return;
  SB_NET.lessonPayload = payload;
  currentLesson = {
    title: payload.title || 'Lesson',
    items: Array.isArray(payload.items) ? payload.items.map(it => ({ word: it.word || '', image: it.image || '' })) : []
  };
}

function sbGetRequestedMarketPackId(){
  try{
    const url = new URL(window.location.href);
    return (url.searchParams.get("marketPack") || "").trim();
  }catch{
    return "";
  }
}

async function sbAutoOpenMarketplaceWordsLesson(){
  const marketPackId = sbGetRequestedMarketPackId();
  if(!marketPackId) return false;

  // lesson ids from marketplace download are saved as:
  // id: `market:${payload.packId}`
  const wantedLessonId = `market:${marketPackId}`;

  // Make sure lessons are loaded
  try{ await sbLoadLessons(); }catch(e){}

  const idx = lessons.findIndex(l =>
    l &&
    (
      l.id === wantedLessonId ||
      l.marketplacePackId === marketPackId
    )
  );

  if(idx < 0){
    console.warn("Marketplace words lesson not found for pack:", marketPackId);
    return false;
  }

  openLessonHub(idx);
  return true;
}

function sbGetPlayerKey(){
  let key = localStorage.getItem("sb_player_key");
  if(!key){
    try{
      key = (crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : `sb-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }catch(err){
      key = `sb-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
    localStorage.setItem("sb_player_key", key);
  }
  return key;
}

function sbClearReconnectTimer(){
  if(SB_NET.reconnectTimer){
    clearTimeout(SB_NET.reconnectTimer);
    SB_NET.reconnectTimer = null;
  }
}

function sbScheduleReconnect(){
  if(SB_NET.manualDisconnect) return;
  if(SB_NET.reconnectTimer) return;

  const delay = Math.min(1500 + (SB_NET.reconnectAttempts * 1000), 5000);

  SB_NET.reconnectTimer = setTimeout(() => {
    SB_NET.reconnectTimer = null;
    SB_NET.reconnectAttempts++;
    globalConnect(true);
  }, delay);
}

function globalConnect(isReconnect = false){
  try{
    if(SB_NET.connected && SB_NET.ws){
      sbUpdateGlobalNetStatus();
      return;
    }

    SB_NET.manualDisconnect = false;

    // if(!isReconnect){
    //   SB_NET.roomId = document.getElementById('global-room-id')?.value?.trim() || 'class-1';
    //   SB_NET.role = document.getElementById('global-role-id')?.value || 'player';
    //   SB_NET.team = document.getElementById('global-team-id')?.value || 'red';
    //   SB_NET.character = sbCharacterForTeam(SB_NET.team);
    //   SB_NET.hostPlays = (document.getElementById('global-host-plays-id')?.value || 'yes') === 'yes';
    // }

    if(!isReconnect){
      SB_NET.roomId = document.getElementById('global-room-id')?.value?.trim() || 'class-1';
      SB_NET.role = document.getElementById('global-role-id')?.value || 'player';
      SB_NET.team = document.getElementById('global-team-id')?.value || 'red';
      SB_NET.vehicle = document.getElementById('global-vehicle-id')?.value || 'heli';
      SB_NET.character = sbCharacterForTeam(SB_NET.team);
      SB_NET.hostPlays = (document.getElementById('global-host-plays-id')?.value || 'yes') === 'yes';
    }

    SB_NET.playerKey = SB_NET.playerKey || sbGetPlayerKey();

    sbUpdateGlobalNetStatus(isReconnect ? 'Reconnecting...' : 'Connecting...');

    const ws = new WebSocket(sbNetWsUrl());
    SB_NET.ws = ws;

    ws.onopen = () => {
      SB_NET.connected = true;
      SB_NET.reconnectAttempts = 0;
      sbClearReconnectTimer();

      // globalSend({
      //   type:'join_room',
      //   roomId: SB_NET.roomId,
      //   role: SB_NET.role,
      //   team: SB_NET.team,
      //   name: SB_NET.playerName,
      //   character: SB_NET.character,
      //   hostPlays: SB_NET.hostPlays,
      //   playerKey: SB_NET.playerKey
      // });

      globalSend({
        type:'join_room',
        roomId: SB_NET.roomId,
        role: SB_NET.role,
        team: SB_NET.team,
        name: SB_NET.playerName,
        character: SB_NET.character,
        vehicle: SB_NET.vehicle,
        hostPlays: SB_NET.hostPlays,
        playerKey: SB_NET.playerKey
      });

      sbUpdateGlobalNetStatus();
      sbUpdateWarriorNetStatus();
      mpOpenRoomModal();
    };

    ws.onmessage = (ev) => {
      try{
        handleGlobalNetworkMessages(JSON.parse(ev.data));
      }catch(err){
        console.warn('Net parse error', err);
      }
    };

    ws.onclose = () => {
      SB_NET.connected = false;
      SB_NET.ws = null;
      SB_NET.roundActive = false;

      sbUpdateGlobalNetStatus('Disconnected. Trying to reconnect...');
      sbUpdateWarriorNetStatus('Disconnected. Trying to reconnect...');

      sbScheduleReconnect();
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

  sbUpdateGlobalNetStatus('Disconnected.');
  sbUpdateWarriorNetStatus('Disconnected.');
}

async function handleGlobalNetworkMessages(msg){
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

//   if(msg.type === 'warrior_match_countdown'){
//     if(!warrior || !warrior.running) openWarriorHub(true);
//     warriorStartCountdown(msg.seconds || 4);
//     sbUpdateWarriorNetStatus(`Get ready... • Score ${SB_NET.score.red}-${SB_NET.score.blue}`);
//     return;
//   }

if (msg.type === 'warrior_match_countdown') {
  if (!warrior || !warrior.running) openWarriorHub(true);

  await sbPlayTeamIntroIfNeeded(`warrior:${msg.seconds}:${SB_NET.roomId}`);

  const seconds = msg.seconds || 4;

  // Everyone shows the same countdown
  warriorStartCountdown(seconds);

  // Only host advances the actual round after countdown finishes
  if (SB_NET.role === 'host') {
    clearTimeout(warrior._hostCountdownTimer);
    warrior._hostCountdownTimer = setTimeout(() => {
      if (warrior?.running && SB_NET.connected && SB_NET.role === 'host') {
        warriorNextRound();
      }
    }, seconds * 1000 + 200);
  }

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

    if(msg.type === "race_mode_start"){
    sbStartRaceMatchFromPayload(msg);
    return;
  }

  if(msg.type === "runner_shared_open"){
  if(msg.roomId !== SB_NET.roomId) return;

  gameMode = "runner";
  showPage("runner-page");

  SB_RUNNER_SHARED.active = true;
  SB_RUNNER_SHARED.roomId = msg.roomId;
  SB_RUNNER_SHARED.roundId = msg.roundId;
  SB_RUNNER_SHARED.seed = msg.seed || "";
  SB_RUNNER_SHARED.status = "live";
  SB_RUNNER_SHARED.players.red = runnerSharedMakePlayer("red");
  SB_RUNNER_SHARED.players.blue = runnerSharedMakePlayer("blue");

  runnerStop();
  runnerResetState({ remote:true, seed:SB_RUNNER_SHARED.seed });
  runnerLoadSprites();
  runnerBindSharedTap();
  runnerSharedDrawLoopStart();

  const statusEl = document.getElementById("runner-shared-status");
  if(statusEl) statusEl.textContent = "Tap the correct word before your opponent";
  return;
}

if(msg.type === "runner_shared_state"){
  if(!SB_RUNNER_SHARED.active) return;
  if(msg.roundId !== SB_RUNNER_SHARED.roundId) return;

  SB_RUNNER_SHARED.timeLeft = msg.state?.timeLeft ?? SB_RUNNER_SHARED.timeLeft;
SB_RUNNER_SHARED.score = msg.state?.score || SB_RUNNER_SHARED.score;
SB_RUNNER_SHARED.promptWord = msg.state?.promptWord || SB_RUNNER_SHARED.promptWord;
SB_RUNNER_SHARED.enemies = Array.isArray(msg.state?.enemies) ? msg.state.enemies : [];
SB_RUNNER_SHARED.players = msg.state?.players || SB_RUNNER_SHARED.players;
SB_RUNNER_SHARED.projectiles = Array.isArray(msg.state?.projectiles) ? msg.state.projectiles : [];
SB_RUNNER_SHARED.explosions = Array.isArray(msg.state?.explosions) ? msg.state.explosions : [];
SB_RUNNER_SHARED.speedMul = Number(msg.state?.speedMul || 1);
SB_RUNNER_SHARED.spawnMul = Number(msg.state?.spawnMul || 1);
return;

//   SB_RUNNER_SHARED.timeLeft = msg.state?.timeLeft ?? SB_RUNNER_SHARED.timeLeft;
//   SB_RUNNER_SHARED.score = msg.state?.score || SB_RUNNER_SHARED.score;
//   SB_RUNNER_SHARED.promptWord = msg.state?.promptWord || SB_RUNNER_SHARED.promptWord;
//   SB_RUNNER_SHARED.enemies = Array.isArray(msg.state?.enemies) ? msg.state.enemies : [];
//   SB_RUNNER_SHARED.players = msg.state?.players || SB_RUNNER_SHARED.players;
//   SB_RUNNER_SHARED.speedMul = Number(msg.state?.speedMul || 1);
// SB_RUNNER_SHARED.spawnMul = Number(msg.state?.spawnMul || 1);
// SB_RUNNER_SHARED.projectiles = Array.isArray(msg.state?.projectiles) ? msg.state.projectiles : [];
  // return;
}

if(msg.type === "runner_shared_pick"){
  if(SB_NET.role !== "host" || !SB_RUNNER_SHARED.active) return;
  if(msg.roundId !== SB_RUNNER_SHARED.roundId) return;

  runnerSharedResolvePick(msg.team, msg.enemyId);
  return;
}

if(msg.type === "runner_shared_end"){
  if(msg.roundId !== SB_RUNNER_SHARED.roundId) return;

  SB_RUNNER_SHARED.active = false;
  const myWin = msg.winnerTeam && msg.winnerTeam === SB_NET.team;
  const tie = !msg.winnerTeam;

  sbRewardFx({
    emoji: tie ? "🤝" : (myWin ? "🏆" : "💨"),
    text: tie ? "Tie!" : (myWin ? "You win!" : "You lose!"),
    shake: true
  });

  setTimeout(() => openLessonHub(currentLessonIndex), 1400);
  return;
}


if(msg.type === "runner_shared_input"){
  if(SB_NET.role !== "host" || !SB_RUNNER_SHARED.active) return;
  const team = msg.team;
  if(!team || !SB_RUNNER_SHARED.players[team]) return;

  SB_RUNNER_SHARED.players[team].pendingInput = {
    ...(SB_RUNNER_SHARED.players[team].pendingInput || {}),
    ...(msg.input || {})
  };
  return;
}

if(msg.type === "runner_shared_fire"){
  if(SB_NET.role !== "host" || !SB_RUNNER_SHARED.active) return;
  if(msg.team){
    runnerSharedFire(msg.team);
  }
  return;
}


if(msg.type === "race_progress"){
  if(
    SB_MATCH.active &&
    msg.roundId === SB_MATCH.roundId &&
    msg.gameId === SB_MATCH.gameId
  ){
    const pct = Math.max(0, Math.min(100, msg.progress || 0));
    if(msg.team && msg.team === SB_NET.team){
      SB_MATCH.progress = pct;
    }else{
      SB_MATCH.opponentProgress = pct;
    }

    const title =
      SB_MATCH.status === "countdown"
        ? `Get ready... ${sbRaceModeLabel(SB_MATCH.gameId)}`
        : `VS live • ${sbRaceModeLabel(SB_MATCH.gameId)}`;

    sbSetRaceStatus(`${title}`);
    sbUpdateVsBanner(title, `You ${SB_MATCH.progress}% • Opponent ${SB_MATCH.opponentProgress}%`);
  }
  return;
}


  if(msg.type === "race_result"){
  SB_NET.score = msg.score || SB_NET.score;
  sbHandleRaceResult(msg);
  return;
}

if(msg.type === "race_abort"){
  sbResetRaceMatch();
  sbToast("Race canceled.");
  return;
}

if(msg.type === "skybattle_shared_open"){
  if(msg.roomId !== SB_NET.roomId) return;

  gameMode = "skybattle";
  showPage("skybattle-page");

  SB_SKYBATTLE_SHARED.active = true;
  SB_SKYBATTLE_SHARED.roomId = msg.roomId;
  SB_SKYBATTLE_SHARED.roundId = msg.roundId;
  SB_SKYBATTLE_SHARED.seed = msg.seed || "";
  SB_SKYBATTLE_SHARED.status = "live";
  SB_SKYBATTLE_SHARED.players.red = skybattleSharedMakePlayer("red");
  SB_SKYBATTLE_SHARED.players.blue = skybattleSharedMakePlayer("blue");

  skybattleStop();
  skybattleBindSharedControls();
  skybattleSharedLoadSprites();
  skybattleSharedDrawLoopStart();

  const statusEl = document.getElementById("skybattle-shared-status");
  if(statusEl) statusEl.textContent = "Shared VS mode";
  return;
}

if(msg.type === "skybattle_shared_state"){
  if(!SB_SKYBATTLE_SHARED.active) return;
  if(msg.roundId !== SB_SKYBATTLE_SHARED.roundId) return;

  SB_SKYBATTLE_SHARED.timeLeft = msg.state?.timeLeft ?? SB_SKYBATTLE_SHARED.timeLeft;
  SB_SKYBATTLE_SHARED.score = msg.state?.score || SB_SKYBATTLE_SHARED.score;
  SB_SKYBATTLE_SHARED.promptWord = msg.state?.promptWord || SB_SKYBATTLE_SHARED.promptWord;
  SB_SKYBATTLE_SHARED.enemies = Array.isArray(msg.state?.enemies) ? msg.state.enemies : [];
  SB_SKYBATTLE_SHARED.bullets = Array.isArray(msg.state?.bullets) ? msg.state.bullets : [];
  SB_SKYBATTLE_SHARED.bursts = Array.isArray(msg.state?.bursts) ? msg.state.bursts : [];
  // SB_SKYBATTLE_SHARED.players = msg.state?.players || SB_SKYBATTLE_SHARED.players;
  const netPlayers = msg.state?.players || {};

for(const team of ["red", "blue"]){
  const local = SB_SKYBATTLE_SHARED.players[team];
  const incoming = netPlayers[team];
  if(!local || !incoming) continue;

  local.x = Number(incoming.x ?? local.x);
  local.y = Number(incoming.y ?? local.y);
  local.flipX = !!incoming.flipX;
  local.animState = incoming.animState || local.animState;
  local.frameIndex = Number.isFinite(incoming.frameIndex) ? incoming.frameIndex : local.frameIndex;
}
  return;
}

if(msg.type === "skybattle_shared_input"){
  if(SB_NET.role !== "host" || !SB_SKYBATTLE_SHARED.active) return;
  const team = msg.team;
  if(!team || !SB_SKYBATTLE_SHARED._inputState?.[team]) return;

  Object.assign(SB_SKYBATTLE_SHARED._inputState[team], msg.input || {});

  const p = SB_SKYBATTLE_SHARED.players[team];
  const inp = SB_SKYBATTLE_SHARED._inputState[team];
  if(p){
    if(inp.up) p.animState = "climb";
    else if(inp.down) p.animState = "dive";
    else if(inp.left || inp.right) p.animState = "boost";
    else p.animState = "idle";
  }
  return;
}

if(msg.type === "skybattle_shared_fire"){
  if(SB_NET.role !== "host" || !SB_SKYBATTLE_SHARED.active) return;
  if(msg.team){
    skybattleSharedFire(msg.team);
  }
  return;
}

if(msg.type === "skybattle_shared_end"){
  if(msg.roundId !== SB_SKYBATTLE_SHARED.roundId) return;

  SB_SKYBATTLE_SHARED.active = false;
  const myWin = msg.winnerTeam && msg.winnerTeam === SB_NET.team;
  const tie = !msg.winnerTeam;

  sbRewardFx({
    emoji: tie ? "🤝" : (myWin ? "🏆" : "💨"),
    text: tie ? "Tie!" : (myWin ? "You win!" : "You lose!"),
    shake: true
  });

  setTimeout(() => openLessonHub(currentLessonIndex), 1400);
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

    if(typeof sbRewardFx === "function"){
      sbRewardFx({
        emoji: msg.team === "blue" ? "🏹" : "🛡️",
        text: `${heroName} scored!`,
        shake: true
      });
    }

    warrior.shake = 10;
    sbUpdateWarriorNetStatus(`Score: Athena: ${SB_NET.score.red} - Aria: ${SB_NET.score.blue}`);

    // host prepares next round later
    if(SB_NET.connected && SB_NET.role === 'host'){
      clearTimeout(warrior._nextRoundTimer);
      warrior._nextRoundTimer = setTimeout(() => {
        if(warrior?.running && SB_NET.connected && SB_NET.role === 'host'){
          warriorNextRound();
        }
      }, 1400);
    }

    // if a pending round already arrived, begin it after hit animation
    clearTimeout(warrior._beginPendingTimer);
    warrior._beginPendingTimer = setTimeout(() => {
      if(warrior?.running && warrior.pendingRound){
        warriorBeginPendingRound();
      }
    }, 1450);

    return;
  }

  if(msg.ignored) return;

  if(target){
    warriorPerformFail(target, msg.team);
  }

  if(msg.team === SB_NET.team && typeof sbRewardFx === "function"){
    sbRewardFx({
      emoji:'😅',
      text:'Try again!',
      shake:false
    });
  }

  sbUpdateWarriorNetStatus(`Score: Athena: ${SB_NET.score.red} - Aria: ${SB_NET.score.blue}`);
}

/* =========================================================
   🎈 Kid HUD + Progress (stars/streak)
   ========================================================= */
let SB_PARENT_UNLOCKED = false;
function sbParentKey(){ return 'sb_parent_pin_v1'; }
function sbLockedKey(){ return 'sb_parent_locked_v1'; }
function sbIsParentLocked(){ return localStorage.getItem(sbLockedKey()) === '1'; }
function sbSetParentLocked(v){ localStorage.setItem(sbLockedKey(), v ? '1' : '0'); }
const SB_PROGRESS_KEY = "sb_progress_v1";

/* =========================================================
   🔒 Per-lesson Game Locks (Parent)
   ========================================================= */
const SB_GAMELOCK_KEY = "sb_gamelocks_v1";

function sbLoadGameLocks(){
  try{ return JSON.parse(localStorage.getItem(SB_GAMELOCK_KEY) || "{}"); }catch{ return {}; }
}
function sbSaveGameLocks(m){
  localStorage.setItem(SB_GAMELOCK_KEY, JSON.stringify(m));
}
function sbLessonKey(lesson){
  return (lesson && (lesson.id || lesson.title)) ? String(lesson.id || lesson.title) : "__lesson__";
}
function sbIsGameLocked(lessonKey, gameId){
  const m = sbLoadGameLocks();
  return !!(m[lessonKey] && m[lessonKey][gameId]);
}
function sbSetGameLocked(lessonKey, gameId, locked){
  const m = sbLoadGameLocks();
  if(!m[lessonKey]) m[lessonKey] = {};
  m[lessonKey][gameId] = !!locked;
  sbSaveGameLocks(m);
}


function sbLoadProgress(){ try{ return JSON.parse(localStorage.getItem(SB_PROGRESS_KEY) || "{}"); }catch{ return {}; } }
function sbSaveProgress(p){ localStorage.setItem(SB_PROGRESS_KEY, JSON.stringify(p)); }

function sbGetLessonProgress(lessonTitle){
  const p = sbLoadProgress();
  if(!p[lessonTitle]) p[lessonTitle] = { stars:0, correct:0, attempts:0, streak:0, badges:{} };
  return { all:p, entry:p[lessonTitle] };
}
function sbAwardStar(lessonTitle, amount=1){
  const { all, entry } = sbGetLessonProgress(lessonTitle);
  entry.stars = (entry.stars||0) + amount;
  sbSaveProgress(all);
  sbUpdateHud();

  // ✅ Big star reward
  sbRewardFx({ emoji: "⭐", text: `+${amount} STAR${amount>1?"S":""}!` });

}
function sbRecordAttempt(lessonTitle, isCorrect){

  const { all, entry } = sbGetLessonProgress(lessonTitle);

  const prevStreak = entry.streak || 0;

  entry.attempts = (entry.attempts||0) + 1;
  if(isCorrect){
    entry.correct = (entry.correct||0) + 1;
    entry.streak = (entry.streak||0) + 1;
  }else{
    entry.streak = 0;
  }

  if(entry.correct >= 10) entry.badges["10_correct"]=true;
  if(entry.streak >= 5) entry.badges["streak_5"]=true;

  sbSaveProgress(all);
  sbUpdateHud();

  // ✅ Big streak feedback (only when it increases)
  if (isCorrect && entry.streak > prevStreak) {
    // Milestones feel more exciting
    if (entry.streak === 3) sbRewardFx({ emoji:"🔥", text:"STREAK x3!", shake:false });
    else if (entry.streak === 5) sbRewardFx({ emoji:"🔥", text:"MEGA STREAK x5!", shake:true });
    else if (entry.streak === 10) sbRewardFx({ emoji:"🔥", text:"LEGEND STREAK x10!", shake:true });
    else if (entry.streak >= 8) sbRewardFx({ emoji:"🔥", text:`SUPER STREAK x${entry.streak}!`, shake:true });
    else sbRewardFx({ emoji:"🔥", text:`STREAK x${entry.streak}!`, shake:false });
  }

}

// function sbEnsureHud(){
//   const hud = document.getElementById("sb-hud");
//   if(hud.dataset.ready === "1") return;

//   hud.innerHTML = `
//     <div class="sb-hud-left">
//       <span class="sb-pill"><span id="sb-stars">⭐ 0</span></span>
//       <span class="sb-pill"><span id="sb-streak">🔥 0</span></span>
//     </div>
//     <div class="sb-hud-right">
//       <label class="sb-pill" title="Speech speed">
//         🐢<input id="sb-rate" type="range" min="0.6" max="1.2" value="0.9" step="0.05" />
//         🚀
//       </label>
//       <button id="sb-parent-btn" class="sb-pill sb-parent">🔒 Parent</button>
//     </div>
//   `;
//   hud.dataset.ready = "1";

//   const btn = document.getElementById("sb-parent-btn");

//   // Prevent long-press context menu / selection only on this button
//   btn.addEventListener("contextmenu", (e)=> e.preventDefault(), {capture:true});
//   btn.addEventListener("pointerdown", (e)=> { try{ e.preventDefault(); }catch(_){} }, {passive:false});

//   // Click to toggle with math check
//   // btn.addEventListener("click", handleParentClick);
//   btn.addEventListener("click", sbOpenParent);
//   btn.addEventListener("click", handleParentClick)
// }

function sbEnsureHud(){
  const hud = document.getElementById("sb-hud");
  if(hud.dataset.ready === "1") return;

  hud.innerHTML = `
    <div class="sb-hud-left">
      <span class="sb-pill"><span id="sb-stars">⭐ 0</span></span>
      <span class="sb-pill"><span id="sb-streak">🔥 0</span></span>
    </div>
    <div class="sb-hud-right">
      <label class="sb-pill" title="Speech speed">
        🐢<input id="sb-rate" type="range" min="0.6" max="1.2" value="0.9" step="0.05" />
        🚀
      </label>
      <button id="sb-parent-btn" class="sb-pill sb-parent">🔒 Parent</button>
    </div>
  `;
  hud.dataset.ready = "1";

  const parentBtn = document.getElementById("sb-parent-btn");

  [parentBtn].forEach(btn => {
    if(!btn) return;
    btn.addEventListener("contextmenu", (e)=> e.preventDefault(), {capture:true});
    btn.addEventListener("pointerdown", (e)=> { try{ e.preventDefault(); }catch(_){} }, {passive:false});
  });

  // if(parentBtn){
  //   parentBtn.addEventListener("click", sbOpenParent);
  //   // parentBtn.addEventListener("click", handleParentHub)
  // }

  if(parentBtn){
  parentBtn.addEventListener("click", () => {
    sbOpenParent();

    if (!document.getElementById("lesson-page")?.classList.contains("hidden")) {
      handleParentClick();
    }
  });
}
}

function sbOpenParent(){
  const overlay = document.getElementById('sb-parent-overlay');
  const pinEl = document.getElementById('sb-parent-pin');
  const msgEl = document.getElementById('sb-parent-msg');
  if(!overlay || !pinEl || !msgEl) return;

  pinEl.value = '';
  const hasPin = !!localStorage.getItem(sbParentKey());
  msgEl.textContent = hasPin
    ? 'Enter PIN to unlock parent tools.'
    : 'Set a new PIN to enable Parent Mode.';

  overlay.classList.remove('hidden');
  setTimeout(()=>pinEl.focus(), 0);
}

function sbCloseParent(){
  const overlay = document.getElementById('sb-parent-overlay');
  if(overlay) overlay.classList.add('hidden');
}

function sbSetOrUnlockParent(){
  const pinEl = document.getElementById('sb-parent-pin');
  const pin = (pinEl?.value || '').trim();
  if(pin.length < 4) return sbToast('PIN must be 4+ digits');

  const saved = localStorage.getItem(sbParentKey());

  if(!saved){
    localStorage.setItem(sbParentKey(), pin);
    sbSetParentLocked(true);
    SB_PARENT_UNLOCKED = false;
    sbToast('✅ Parent lock enabled');
    sbApplyParentMode();
    if (!document.getElementById("lesson-page").classList.contains("hidden")) {
      openLessonHub(currentLessonIndex);
    }
    sbCloseParent();
    return;
  }

  if(pin === saved){
    sbSetParentLocked(false);
    SB_PARENT_UNLOCKED = true
    sbToast('🔓 Parent unlocked');
    sbApplyParentMode();
    if (!document.getElementById("lesson-page").classList.contains("hidden")) {
      openLessonHub(currentLessonIndex);
    }
    sbCloseParent();
  } else {
    sbToast('❌ Wrong PIN');
  }
}

function sbLockParentNow(){
  sbSetParentLocked(true);
  sbToast('🔒 Locked');
  sbApplyParentMode();
  if (!document.getElementById("lesson-page").classList.contains("hidden")) {
    openLessonHub(currentLessonIndex);
  }
  sbCloseParent();
}

function handleParentClick() {
  if (SB_PARENT_UNLOCKED) {
    SB_PARENT_UNLOCKED = false;
    sbApplyParentMode();
  sbWireWordsImport();
    sbToast("Parent Mode OFF");
    // If we are on the lesson page, refresh it to hide the lock panel
    if (!document.getElementById("lesson-page").classList.contains("hidden")) {
      openLessonHub(currentLessonIndex);
    }
    return;
  } else if (!SB_PARENT_UNLOCKED){
    SB_PARENT_UNLOCKED = true;
    sbApplyParentMode();
    sbToast("Parent Mode ON");
    
    // REFRESH the hub immediately so the checkboxes appear
    if (!document.getElementById("lesson-page").classList.contains("hidden")) {
      openLessonHub(currentLessonIndex);
    }
  } else if (ans !== null) {
    sbToast("Wrong answer");
  }
}

function sbGetSpeechRate(){
  const el = document.getElementById("sb-rate");
  const v = el ? parseFloat(el.value) : 0.9;
  return isFinite(v) ? v : 0.9;
}
function sbUpdateHud(){
  sbEnsureHud();
  const title = (currentLesson && currentLesson.title) ? currentLesson.title : "";
  const prog = title ? sbGetLessonProgress(title).entry : { stars:0, streak:0 };
  const starsEl = document.getElementById("sb-stars");
  const streakEl = document.getElementById("sb-streak");
  if(starsEl) starsEl.textContent = `⭐ ${prog.stars||0}`;
  if(streakEl) streakEl.textContent = `🔥 ${prog.streak||0}`;
}
// function sbApplyParentLessonMode(){
//   document.querySelectorAll("[data-parent-only='1']").forEach(el=>{
//     el.style.display = SB_PARENT_UNLOCKED ? "" : "none";
//   });
//   const btn = document.getElementById("sb-parent-btn");
//   if(btn) btn.textContent = SB_PARENT_UNLOCKED ? "🔓 Parent" : "🔒 Parent";
// }

function sbApplyParentMode(){
  const locked = sbIsParentLocked();

  document.querySelectorAll("[data-parent-only='1']").forEach(el=>{
    el.style.display = locked ? "none" : "";
  });

  const btn = document.getElementById("sb-parent-btn");
  if(btn) btn.textContent = locked ? "🔒 Parent" : "🔓 Parent";
}

function sbToast(text){
  let t = document.getElementById("sb-toast");
  if(!t){
    t = document.createElement("div");
    t.id = "sb-toast";
    document.body.appendChild(t);
  }

  t.textContent = text;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 1400);
}   // ← CLOSE IT HERE


// =========================
// ✅ Big reward FX (stars / streak)
// =========================
let SB_REWARD_LOCK = false;

function sbShakeScreen() {
  // shake the main card/page container lightly (kid-friendly)
  const target = document.querySelector('.card:not(.hidden)') || document.body;
  target.classList.add('sb-shake');
  setTimeout(() => target.classList.remove('sb-shake'), 360);
}

function sbRewardFx({ emoji, text, shake=false }) {
  if (SB_REWARD_LOCK) return;
  SB_REWARD_LOCK = true;

  const root = document.getElementById("sb-reward");
  const emojiEl = document.getElementById("sb-reward-emoji");
  const textEl = document.getElementById("sb-reward-text");
  const burst = document.getElementById("sb-reward-burst");

  if (!root || !emojiEl || !textEl || !burst) {
    SB_REWARD_LOCK = false;
    return;
  }

  emojiEl.textContent = emoji;
  textEl.textContent = text;

  burst.innerHTML = "";

  // Confetti: reuse your theme vars so it matches your app style
  const colors = ["var(--accent)", "var(--primary)", "var(--secondary)"];
  const n = 22;

  for (let i = 0; i < n; i++) {
    const p = document.createElement("div");
    p.className = "sb-confetti";
    p.style.background = colors[i % colors.length];

    const angle = Math.random() * Math.PI * 2;
    const dist = 140 + Math.random() * 160;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;

    p.style.setProperty("--dx", `${dx}px`);
    p.style.setProperty("--dy", `${dy}px`);
    p.style.animationDelay = `${Math.random() * 120}ms`;

    burst.appendChild(p);
  }

  root.classList.remove("hidden");

  if (shake) sbShakeScreen();

  setTimeout(() => {
    root.classList.add("hidden");
    burst.innerHTML = "";
    SB_REWARD_LOCK = false;
  }, 820);
}

function sbLoadMpPrefs(){
  try{
    const name = localStorage.getItem("sb_player_name") || "Player";
    const maxRounds = localStorage.getItem("sb_max_rounds") || "5";
    const warriorRoundLimit = localStorage.getItem("sb_warrior_round_limit") || "5";
    const allowedModes = JSON.parse(localStorage.getItem("sb_allowed_modes") || '["smash","spelling","typespell","memory","repeatpro","warrior"]');

    const nameEl = document.getElementById("global-player-name-id");
    const maxRoundsEl = document.getElementById("global-max-rounds-id");
    const warriorLimitEl = document.getElementById("global-warrior-round-limit-id");

    if(nameEl) nameEl.value = name;
    if(maxRoundsEl) maxRoundsEl.value = maxRounds;
    if(warriorLimitEl) warriorLimitEl.value = warriorRoundLimit;

    document.querySelectorAll(".sb-mode-opt").forEach(el => {
      el.checked = allowedModes.includes(el.value);
    });

    SB_NET.playerName = name;
    SB_SESSION.maxRounds = Number(maxRounds || 5);
    SB_SESSION.warriorRoundLimit = Number(warriorRoundLimit || 5);
    SB_SESSION.allowedModes = allowedModes;
  }catch(e){
    console.warn("sbLoadMpPrefs", e);
  }
}

function sbSaveMpPrefs(){
  try{
    const name = document.getElementById("global-player-name-id")?.value?.trim() || "Player";
    const maxRounds = document.getElementById("global-max-rounds-id")?.value || "5";
    const warriorRoundLimit = document.getElementById("global-warrior-round-limit-id")?.value || "5";
    const allowedModes = [...document.querySelectorAll(".sb-mode-opt:checked")].map(el => el.value);

    localStorage.setItem("sb_player_name", name);
    localStorage.setItem("sb_max_rounds", maxRounds);
    localStorage.setItem("sb_warrior_round_limit", warriorRoundLimit);
    localStorage.setItem("sb_allowed_modes", JSON.stringify(allowedModes));

    SB_NET.playerName = name;
    SB_SESSION.maxRounds = Number(maxRounds || 5);
    SB_SESSION.warriorRoundLimit = Number(warriorRoundLimit || 5);
    SB_SESSION.allowedModes = allowedModes;
  }catch(e){
    console.warn("sbSaveMpPrefs", e);
  }
}


/* =========================================================
   ✅ Speech
   ========================================================= */
function speak(t){
  try{
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(t);
    msg.rate = sbGetSpeechRate();
    window.speechSynthesis.speak(msg);
  }catch(e){}
}
function repeatTarget(){
  if(currentTargetItem) speak(currentTargetItem.word);
}

/* =========================================================
   ✅ Offline Images (IndexedDB)
   ========================================================= */
const SB_DB_NAME = "studyBuddyDB";
const SB_DB_VER = 2;
const SB_IMG_STORE = "images";
const sbImgUrlCache = new Map(); // id -> objectURL

function sbOpenDB(){
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open(SB_DB_NAME, SB_DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;

      // images (blobs)
      if(!db.objectStoreNames.contains(SB_IMG_STORE)){
        db.createObjectStore(SB_IMG_STORE, { keyPath:"id" });
      }

      // lessons (JSON)
      if(!db.objectStoreNames.contains("lessons")){
        const st = db.createObjectStore("lessons", { keyPath:"id" });
        st.createIndex("updatedAt", "updatedAt");
      }

      // meta flags
      if(!db.objectStoreNames.contains("meta")){
        db.createObjectStore("meta", { keyPath:"key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function sbMakeId(){
  return (crypto && crypto.randomUUID) ? crypto.randomUUID()
    : (Date.now() + "-" + Math.random().toString(16).slice(2));
}
async function sbPutImage({id, blob, meta}){
  const db = await sbOpenDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(SB_IMG_STORE, "readwrite");
    tx.objectStore(SB_IMG_STORE).put({ id, blob, meta, ts: Date.now() });
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}
async function sbGetImage(id){
  const db = await sbOpenDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(SB_IMG_STORE, "readonly");
    const req = tx.objectStore(SB_IMG_STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
async function sbDeleteImage(id){
  const db = await sbOpenDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(SB_IMG_STORE, "readwrite");
    tx.objectStore(SB_IMG_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function sbListImages(){
  const db = await sbOpenDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(SB_IMG_STORE, "readonly");
    const req = tx.objectStore(SB_IMG_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}


/* =========================================================
   ✅ Lessons storage (IndexedDB)
   - Replaces localStorage myStudyBuddy_v2
   ========================================================= */
const SB_LESSON_STORE = "lessons";
const SB_META_STORE   = "meta";

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

async function sbPutLesson(lesson){
  lesson.updatedAt = Date.now();
  await sbTx(SB_LESSON_STORE, "readwrite", (st)=>st.put(lesson));
  return lesson;
}
async function sbDeleteLesson(id){
  await sbTx(SB_LESSON_STORE, "readwrite", (st)=>st.delete(id));
}
async function sbGetAllLessons(){
  const db = await sbOpenDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(SB_LESSON_STORE, "readonly");
    const st = tx.objectStore(SB_LESSON_STORE);
    const req = st.getAll();
    req.onsuccess = ()=>resolve(req.result || []);
    req.onerror = ()=>reject(req.error);
  });
}

async function sbGetMeta(key){
  const db = await sbOpenDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(SB_META_STORE, "readonly");
    const st = tx.objectStore(SB_META_STORE);
    const req = st.get(key);
    req.onsuccess = ()=>resolve(req.result ? req.result.value : null);
    req.onerror = ()=>reject(req.error);
  });
}
async function sbSetMeta(key, value){
  await sbTx(SB_META_STORE, "readwrite", (st)=>st.put({ key, value }));
}

async function sbMigrateLessonsIfNeeded(){
  // already migrated?
  const migrated = await sbGetMeta("migrated_ls_myStudyBuddy_v2");
  if(migrated) return;

  // if DB already has lessons, mark migrated and stop
  const existing = await sbGetAllLessons();
  if(existing && existing.length){
    await sbSetMeta("migrated_ls_myStudyBuddy_v2", true);
    return;
  }

  const raw = localStorage.getItem("myStudyBuddy_v2");
  if(!raw){
    await sbSetMeta("migrated_ls_myStudyBuddy_v2", true);
    return;
  }

  try{
    const arr = JSON.parse(raw) || [];
    for(const l of arr){
      const id = l.id || sbMakeId();
      await sbPutLesson({
        id,
        title: l.title || "Lesson",
        items: Array.isArray(l.items) ? l.items : (Array.isArray(l.words) ? l.words : []),
      });
    }
    sbToast("✅ Migrated lessons to IndexedDB");
  }catch(e){
    console.warn("Migration failed", e);
  }

  await sbSetMeta("migrated_ls_myStudyBuddy_v2", true);
}

async function sbLoadLessons(){
  lessons = await sbGetAllLessons();
  // stable order by updatedAt asc (creation order feel)
  lessons.sort((a,b)=>(a.updatedAt||0)-(b.updatedAt||0));
}

function sbLoadImageFromFile(file){
  return new Promise((resolve, reject)=>{
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = ()=>{ URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e)=>{ URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}
function sbCanvasToBlob(canvas, type="image/jpeg", quality=0.72){
  return new Promise(resolve=>canvas.toBlob(resolve, type, quality));
}
async function sbResizeCompressImage(file, {maxW=512, maxH=512, type="image/jpeg", quality=0.72}={}){
  const img = await sbLoadImageFromFile(file);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const scale = Math.min(maxW/w, maxH/h, 1);
  const nw = Math.max(1, Math.round(w*scale));
  const nh = Math.max(1, Math.round(h*scale));

  const canvas = document.createElement("canvas");
  canvas.width = nw; canvas.height = nh;
  const ctx = canvas.getContext("2d", { alpha:false });
  ctx.drawImage(img, 0, 0, nw, nh);

  return await sbCanvasToBlob(canvas, type, quality);
}

function sbGetItemImageRef(item){
  const img = item?.image;
  if(!img) return "";

  if(typeof img === "string") return img.trim();

  if(typeof img === "object"){
    return img.medium || img.original || img.thumb || "";
  }

  return "";
}

async function sbResolveImageSrc(ref){
  const s = (ref||"").toString().trim();
  if(!s) return "";
  if(s.startsWith("data:")) return s;
  if(s.startsWith("http://") || s.startsWith("https://")) return s;
  if(s.startsWith("idb:")){
    const id = s.slice(4);
    if(sbImgUrlCache.has(id)) return sbImgUrlCache.get(id);
    const rec = await sbGetImage(id);
    if(!rec || !rec.blob) return "";
    const url = URL.createObjectURL(rec.blob);
    sbImgUrlCache.set(id, url);
    return url;
  }
  if(s.startsWith("blob:")) return ""; // old non-recoverable
  return s; // relative if hosted
}

// async function sbHydrateImages(root=document){
//   const imgs = root.querySelectorAll("img[data-img-ref]");
//   for(const img of imgs){
//     const ref = img.getAttribute("data-img-ref") || "";
//     const src = await sbResolveImageSrc(ref);
//     if(src) img.src = src;
//   }
// }

async function sbHydrateImages(root = document){
  const imgs = [...root.querySelectorAll("img[data-img-ref]")];
  await Promise.all(imgs.map(async (img) => {
    const ref = img.getAttribute("data-img-ref") || "";
    const src = await sbResolveImageSrc(ref);
    if(src) img.src = src;
  }));
}

function sbBytesToMB(n){ return (n/1024/1024).toFixed(2); }

async function sbConsumePendingImportWords(){
  try{
    const raw = localStorage.getItem("sb_pending_import_words");
    if(!raw) return;

    const lesson = JSON.parse(raw);
    localStorage.removeItem("sb_pending_import_words");

    if(!lesson || !lesson.title) return;

    await sbPutLesson({
      id: lesson.id || `import-${Date.now()}`,
      title: lesson.title || "Imported Pack",
      items: Array.isArray(lesson?.data_json?.items) ? lesson.data_json.items : [],
      marketplacePackId: lesson?.data_json?.importedFromPackId || "",
      data_json: {
        ...(lesson?.data_json || {}),
      },
      updatedAt: Date.now(),
    });

    sbToast("✅ Imported pack to Words");
  }catch(err){
    console.warn("Words import failed", err);
  }
}
/* =========================================================
   ✅ Navigation / page show
   ========================================================= */
async function showPage(pageId){
  try{
    if(pageId !== "runner-page"){
      runnerStop();
      if(SB_RUNNER_SHARED?.raf) cancelAnimationFrame(SB_RUNNER_SHARED.raf);
      if(SB_RUNNER_SHARED?.clientRaf) cancelAnimationFrame(SB_RUNNER_SHARED.clientRaf);
      SB_RUNNER_SHARED.active = false;
    }
  }catch(e){}

  try{
  if(pageId !== "skybattle-page"){
    skybattleStop();
    if(SB_SKYBATTLE_SHARED?.raf) cancelAnimationFrame(SB_SKYBATTLE_SHARED.raf);
    if(SB_SKYBATTLE_SHARED?.clientRaf) cancelAnimationFrame(SB_SKYBATTLE_SHARED.clientRaf);
    SB_SKYBATTLE_SHARED.active = false;
  }
}catch(e){}

  try{ if(pageId !== "warrior-page") warriorStop(); }catch(e){}

  document.querySelectorAll('div[id$="-page"]').forEach(p=>p.classList.add('hidden'));
  document.getElementById(pageId).classList.remove('hidden');

  if(pageId === "menu-page") await renderMenu();

  await sbHydrateImages(document.getElementById(pageId) || document);

  sbUpdateHud();
  sbApplyParentMode();
}

function toggleHelp(show){
  document.getElementById("help-overlay").classList.toggle("hidden", !show);
}

/* =========================================================
   ✅ Lessons menu / CRUD
   ========================================================= */
function resetAllProgress(){
  if(confirm("Reset all stars so a new student can study?")){
    unlockedLessons = {};
    localStorage.removeItem("unlocked_status");
    renderMenu();
    speak("All stars reset. Ready for a new learner!");
  }
}



let SB_SELECTED_LESSON_INDEX = -1;

function sbOpenModePicker(index){
  SB_SELECTED_LESSON_INDEX = index;
  currentLesson = lessons[index];
  currentLessonIndex = index;

  sbUpdateHud();

  const isUnlocked = !!unlockedLessons[index];

  const titleEl = document.getElementById("sb-modal-title");
  const subEl = document.getElementById("sb-modal-sub");
  if(titleEl) titleEl.textContent = currentLesson.title || "Choose a game";
  if(subEl) subEl.textContent = isUnlocked ? "Pick a mode" : "Study first to unlock games";

  const bStudy = document.getElementById("sb-btn-study");
  const bSmash = document.getElementById("sb-btn-smash");
  const bSpell = document.getElementById("sb-btn-spell");
  const bMem  = document.getElementById("sb-btn-memory");

  if(bStudy) bStudy.disabled = false;
  if(bSmash) bSmash.disabled = !isUnlocked;
  if(bSpell) bSpell.disabled = !isUnlocked;
  if(bMem)   bMem.disabled  = !isUnlocked;

  const modal = document.getElementById("sb-mode-modal");
  if(modal){
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden","false");
  }
  sbApplyParentMode();
}

function sbCloseModePicker(){
  const modal = document.getElementById("sb-mode-modal");

  // Move focus back to body (or menu container)
  if (document.activeElement) {
    document.activeElement.blur();
  }

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");

  // Optional: move focus to first lesson card
  const firstCard = document.querySelector(".sb-lesson-card");
  if (firstCard) firstCard.focus();
}


function sbLaunch(mode){
  const i = SB_SELECTED_LESSON_INDEX;
  if(i < 0) return;
  sbCloseModePicker();

  if(mode === "study") return startStudySession(i);
  if(mode === "smash") return startGame(i, "smash");
  if(mode === "spelling") return startGame(i, "spelling");
  if(mode === "memory") return startMemoryGame(i);
}

function sbEditSelected(){
  const i = SB_SELECTED_LESSON_INDEX;
  if(i < 0) return;
  sbCloseModePicker();
  editLesson(i);
}

function sbDeleteSelected(){
  const i = SB_SELECTED_LESSON_INDEX;
  if(i < 0) return;
  sbCloseModePicker();
  deleteLesson(i);
}

async function renderMenu(){
  sbUpdateHud();
  setTimeout(sbApplyParentMode, 0);

  // Ensure lessons are in IndexedDB (migrate once) then load
  await sbMigrateLessonsIfNeeded();
  await sbLoadLessons();

  // const policy = sbGetLessonPolicyMeta(lesson);
  // const isImportedPack = !!policy.importedFromPackId;

  // let policyWrap = document.getElementById("sb-policy-row");
  //   if(!policyWrap){
  //     policyWrap = document.createElement("div");
  //     policyWrap.id = "sb-policy-row";
  //     policyWrap.className = "row";
  //     policyWrap.style.justifyContent = "center";
  //     policyWrap.style.gap = "8px";
  //     policyWrap.style.flexWrap = "wrap";
  //     const lessonPage = document.getElementById("lesson-page");
  //     const badgeRow = document.getElementById("lesson-page-badges");
  //     if(lessonPage && badgeRow){
  //       badgeRow.insertAdjacentElement("afterend", policyWrap);
  //     }
  //   }

  //   policyWrap.innerHTML = isImportedPack ? `
  //     <span class="sb-badge lock">🛍️ Marketplace Pack</span>
  //     <span class="sb-badge">${sbFormatAccessMode(policy.accessMode)}</span>
  //     <span class="sb-badge">${sbFormatLicenseType(policy.licenseType)}</span>
  //     <span class="sb-badge">${sbFormatExportPolicy(policy.exportPolicy)}</span>
  //   ` : "";

  const list = document.getElementById("lesson-list");
  if(!list) return;

  list.innerHTML = `<div class="sb-card-grid" id="sb-card-grid"></div>`;
  const grid = document.getElementById("sb-card-grid");

  // lessons.forEach((lesson, index)=>{
  //   const isUnlocked = !!unlockedLessons[index];
  //   const icon = isUnlocked ? "⭐" : "🔒";
  //   const prog = sbGetLessonProgress(lesson.title).entry;

  //   const firstImg = (lesson.items && lesson.items[0]) ? (lesson.items[0].image || "") : "";
  //   const firstFallback = (lesson.items && lesson.items[0]) ? (lesson.items[0].fallback || "📘") : "📘";

  //   const card = document.createElement("div");
  //   card.className = "sb-lesson-card" + (isUnlocked ? "" : " sb-lock");

  //   card.innerHTML = `
  //     <div class="sb-lesson-top">
  //       <div class="sb-lesson-thumb">
  //         ${firstImg
  //           ? `<img data-img-ref="${sbEscapeAttr(firstImg)}" src="" alt="">`
  //           : `<div class="sb-thumb-fallback">${firstFallback}</div>`
  //         }
  //       </div>

  //       <div style="flex:1; position:relative;">
  //         <div class="sb-lesson-title">${icon} ${lesson.title}</div>

  //         <div class="sb-lesson-sub">
  //           <span class="sb-badge words">🧩 ${(lesson.items||[]).length} words</span>
  //           <div>
  //           <span class="sb-badge star">⭐ ${(prog.stars||0)}</span>
  //           <span class="sb-badge streak">🔥 ${(prog.streak||0)}</span>
  //           </div>
  //           ${!isUnlocked ? `<span class="sb-badge lock">Study to unlock</span>` : ``}
  //         </div>

  //         <div class="sb-lesson-hint">Tap to choose a game</div>
  //       </div>

  //     </div>
  //   `;

  //   // hydrate idb:/http images
  //   sbHydrateImages(card);

  //   card.onclick = () => openLessonHub(index);

  //   grid.appendChild(card);
  // });

  lessons.forEach((lesson, index)=>{
    const isUnlocked = !!unlockedLessons[index];
    const icon = isUnlocked ? "⭐" : "🔒";
    const prog = sbGetLessonProgress(lesson.title).entry;

    const policy = sbGetLessonPolicyMeta(lesson);
    const isImportedPack = !!policy.importedFromPackId;

    const firstImg = (lesson.items && lesson.items[0]) ? (lesson.items[0].image || "") : "";
    const firstFallback = (lesson.items && lesson.items[0]) ? (lesson.items[0].fallback || "📘") : "📘";

    const card = document.createElement("div");
    card.className = "sb-lesson-card" + (isUnlocked ? "" : " sb-lock");

    card.innerHTML = `
      <div class="sb-lesson-top">
        <div class="sb-lesson-thumb">
          ${firstImg
            ? `<img data-img-ref="${sbEscapeAttr(firstImg)}" src="" alt="">`
            : `<div class="sb-thumb-fallback">${firstFallback}</div>`
          }
        </div>

        <div style="flex:1; position:relative;">
          <div class="sb-lesson-title">${icon} ${lesson.title}</div>

          <div class="sb-lesson-sub">
            <span class="sb-badge words">🧩 ${(lesson.items||[]).length} words</span>
            <div>
              <span class="sb-badge star">⭐ ${(prog.stars||0)}</span>
              <span class="sb-badge streak">🔥 ${(prog.streak||0)}</span>
            </div>
            ${!isUnlocked ? `<span class="sb-badge lock">Study to unlock</span>` : ``}
            ${isImportedPack ? `<span class="sb-badge lock">🛍️ Marketplace Pack</span>` : ``}
            ${isImportedPack ? `<span class="sb-badge">${sbFormatExportPolicy(policy.exportPolicy)}</span>` : ``}
          </div>

          <div class="sb-lesson-hint">Tap to choose a game</div>
        </div>
      </div>
    `;

    sbHydrateImages(card);
    card.onclick = () => openLessonHub(index);
    grid.appendChild(card);
  });

  sbApplyParentMode();
}

// card.onclick = () => sbOpenModePicker(index);

function openNewLesson(){
  editIndex = -1;
  document.getElementById("creator-title").innerText = "New Lesson";
  document.getElementById("lesson-title-input").value = "";
  document.getElementById("items-input-container").innerHTML = "";
  addWordRow();
  showPage("creator-page");
}

function openLessonHub(index){
  currentLessonIndex = index;
  currentLesson = lessons[index];
  SB_SELECTED_LESSON_INDEX = index;
  const policy = sbGetLessonPolicyMeta(currentLesson);
  const isImportedPack = !!policy.importedFromPackId;

  let policyWrap = document.getElementById("sb-policy-row");
    if(!policyWrap){
      policyWrap = document.createElement("div");
      policyWrap.id = "sb-policy-row";
      policyWrap.className = "row";
      policyWrap.style.justifyContent = "center";
      policyWrap.style.gap = "8px";
      policyWrap.style.flexWrap = "wrap";

      const badgeRow = document.getElementById("lesson-page-badges");
      if(badgeRow){
        badgeRow.insertAdjacentElement("afterend", policyWrap);
      }
    }

    policyWrap.innerHTML = isImportedPack ? `
      <span class="sb-badge lock">🛍️ Marketplace Pack</span>
      <span class="sb-badge">${sbFormatAccessMode(policy.accessMode)}</span>
      <span class="sb-badge">${sbFormatLicenseType(policy.licenseType)}</span>
      <span class="sb-badge">${sbFormatExportPolicy(policy.exportPolicy)}</span>
    ` : "";

  const exportLessonBtn = document.querySelector('[onclick="sbExportCurrentLesson()"]');
  if(exportLessonBtn){
    exportLessonBtn.style.display = sbCanExportLesson(currentLesson) ? '' : 'none';
  }

  const titleEl = document.getElementById("lesson-page-title");
  if(titleEl) titleEl.textContent = currentLesson.title || "Lesson";

  const unlocked = !!unlockedLessons[index];
  const lessonKey = sbLessonKey(currentLesson);

  // Helper: applies visual lock state
  function sbSetLockedButton(el, isLocked){
    if(!el) return;
    el.classList.toggle("sb-locked-btn", isLocked);
    el.setAttribute("aria-disabled", isLocked ? "true" : "false");
  }

  function sbBlockedReason(gameId){
  if(!unlocked) return "Study first to unlock!";
  if(sbIsGameLocked(lessonKey, gameId) && sbIsParentLocked()) return "Locked by parent";
  return "";
}
function sbCanPlay(gameId){
  return unlocked && (!sbIsGameLocked(lessonKey, gameId) || !sbIsParentLocked());
}

  function sbGuard(gameId, fn){
    const reason = sbBlockedReason(gameId);
    if(reason){ sbToast(reason); return; }
    fn();
  }

function sbStartRaceFromHub(gameId, offlineFn){
    if(!SB_NET.connected) return offlineFn();

    if(!sbIsRaceMode(gameId)){
      sbToast("Multiplayer not ready for this mode yet");
      return;
    }

    if(SB_NET.role !== "host"){
      sbToast("Only host can start VS mode.");
      return;
    }

    const payload = sbBuildRacePayload(index, gameId);
    globalSend(payload);
    sbStartRaceMatchFromPayload(payload);
  }

  document.getElementById("btn-study").onclick =
    () => SB_NET.connected ? sbToast("Study stays solo for now") : startStudySession(index);

  document.getElementById("btn-smash").onclick =
  () => sbGuard("smash", () => sbStartRaceFromHub("smash", () => startGame(index, "smash")));

document.getElementById("btn-spell").onclick =
  () => sbGuard("spelling", () => sbStartRaceFromHub("spelling", () => startGame(index, "spelling")));

  document.getElementById("btn-type-spell").onclick =
    () => sbGuard("typespell", () => sbStartRaceFromHub("typespell", () => startTypeSpellMode(index)));

  document.getElementById("btn-memory").onclick =
  () => sbGuard("memory", () => sbStartRaceFromHub("memory", () => startMemoryGame(index)));

document.getElementById("btn-repeat-pro").onclick =
  () => sbGuard("repeatpro", () => sbStartRaceFromHub("repeatpro", () => startRepeatMode(index, true)));


const btnRunner = document.getElementById("btn-runner");
if(btnRunner){
  btnRunner.onclick = () => sbGuard("runner", () => sbLaunchRunner());
}

  document.getElementById("btn-skybattle").onclick =
  () => sbGuard("skybattle", () => sbLaunchSkyBattle());

  document.getElementById("btn-warrior").onclick =
    () => sbGuard("warrior", () => openWarriorHub());

  const exportBtn = document.querySelector('[onclick="sbExportCurrentLesson()"]');
    if(exportBtn){
      exportBtn.style.display = sbCanExportLesson(currentLesson) ? '' : 'none';
    }

  sbUpdateGlobalNetStatus();
  sbUpdateWarriorNetStatus();

  // Apply visual locks
  sbSetLockedButton(document.getElementById("btn-smash"), !sbCanPlay("smash"));
  sbSetLockedButton(document.getElementById("btn-spell"), !sbCanPlay("spelling"));
  sbSetLockedButton(document.getElementById("btn-type-spell"), !sbCanPlay("typespell"));
  // sbSetLockedButton(document.getElementById("btn-scramble"), !sbCanPlay("scramble"));
  sbSetLockedButton(document.getElementById("btn-memory"), !sbCanPlay("memory"));
  sbSetLockedButton(document.getElementById("btn-warrior"), !sbCanPlay("warrior"));
  // sbSetLockedButton(document.getElementById("btn-repeat"), !sbCanPlay("repeat"));
  sbSetLockedButton(document.getElementById("btn-repeat-pro"), !sbCanPlay("repeatpro"));
sbSetLockedButton(document.getElementById("btn-runner"), !sbCanPlay("runner"));
sbSetLockedButton(document.getElementById("btn-skybattle"), !sbCanPlay("skybattle"));

  // Render Parent-only lock toggles
  const locksWrap = document.getElementById("sb-game-locks");
  // if(locksWrap && SB_PARENT_UNLOCKED){
    if(locksWrap && !sbIsParentLocked()){
    const games = [
      { id:"memory", label:"🧠 Memory" },
      { id:"smash", label:"🔨 Smash" },
      { id:"spelling", label:"🔤 Spell" },
      { id:"typespell", label:"⌨️ Type Spell" },
      // { id:"scramble", label:"🧩 Scramble" },
      // { id:"repeat", label:"🗣️ Repeat" },
      { id:"repeatpro", label:"🎤 Repeat Pro" },
      { id:"runner", label:"🚁 Sky Patrol" },
      { id:"skybattle", label:"☄️ Sky Battle" },
      { id:"warrior", label:"⚔️ Warrior" },
    ];

    locksWrap.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <div style="font-weight:900;">🔒 Game Locks (Parent Mode)</div>
        <div style="display:flex; gap:8px;">
          <button id="sb-lock-all" style="background:#ff6b6b; padding:6px 10px;">Lock all</button>
          <button id="sb-unlock-all" style="background:#2ecc71; padding:6px 10px;">Unlock all</button>
        </div>
      </div>
      <div style="margin-top:8px; display:flex; gap:10px; flex-wrap:wrap;" id="sb-lock-grid"></div>`;

    const grid = document.getElementById("sb-lock-grid");
    games.forEach(g => {
      const locked = sbIsGameLocked(lessonKey, g.id);
      const pill = document.createElement("label");
      pill.style.cssText = "display:flex; align-items:center; gap:8px; padding:6px 10px; border-radius:999px; background:rgba(31,45,61,.08); font-weight:900; cursor:pointer;";
      pill.innerHTML = `<input type="checkbox" ${locked ? "checked" : ""} /> <span>${g.label}</span>`;
      pill.querySelector("input").onchange = (e) => {
        sbSetGameLocked(lessonKey, g.id, e.target.checked);
        openLessonHub(index); // Refresh visuals
      };
      grid.appendChild(pill);
    });

    document.getElementById("sb-lock-all").onclick = () => {
      games.forEach(g => sbSetGameLocked(lessonKey, g.id, true));
      openLessonHub(index);
    };
    document.getElementById("sb-unlock-all").onclick = () => {
      games.forEach(g => sbSetGameLocked(lessonKey, g.id, false));
      openLessonHub(index);
    };
  }

  showPage("lesson-page");
}

function addWordRow(word="", img=""){
  const container = document.getElementById("items-input-container");
  const div = document.createElement("div");
  div.className = "input-group";

  div.innerHTML = `
    <input type="text" placeholder="Word" class="word-in" value="${(word||"").replace(/"/g,'&quot;')}" />
    <div class="img-row">
      <select class="img-mode">
        <option value="offline">Offline (Mobile)</option>
        <option value="link">Link/Path</option>
      </select>

      <input type="text" placeholder="Image URL/Path or idb:..." class="img-in"
             value="${(img||"").replace(/"/g,'&quot;')}" />

      <input type="file" accept="image/*" class="img-file" hidden />
      <button type="button" class="img-pick">🖼 Upload</button>
    </div>

    <div class="img-preview-wrap">
      <img class="img-preview" data-img-ref="${(img||"").replace(/"/g,'&quot;')}" alt="" />
    </div>

    <span class="help-icon" onclick="toggleHelp(true)">?</span>
    <button type="button" onclick="this.parentElement.remove()" style="background:#ff4757;">×</button>
  `;

  container.appendChild(div);

  const modeSel = div.querySelector(".img-mode");
  const imgInput = div.querySelector(".img-in");
  const fileInput = div.querySelector(".img-file");
  const pickBtn = div.querySelector(".img-pick");
  const preview = div.querySelector(".img-preview");

  const v0 = (img||"").toString().trim();
  if(v0.startsWith("idb:")) modeSel.value = "offline";
  else if(/^(https?:|data:)/.test(v0)) modeSel.value = "link";

  async function refreshPreview(){
    const ref = (imgInput.value||"").trim();
    preview.setAttribute("data-img-ref", ref);
    preview.src = "";
    await sbHydrateImages(div);
    preview.style.display = preview.src ? "block" : "none";
  }

  refreshPreview();

  pickBtn.onclick = () => fileInput.click();

  fileInput.onchange = async () => {
    const file = fileInput.files && fileInput.files[0];
    if(!file) return;

    const mode = modeSel.value;
    if(mode === "offline"){
      try{
        const blob = await sbResizeCompressImage(file, { maxW:512, maxH:512, quality:0.72 });
        const id = sbMakeId();
        await sbPutImage({ id, blob, meta:{ name:file.name, type:blob.type, size:blob.size } });
        imgInput.value = `idb:${id}`;
        await refreshPreview();
      }catch(e){
        console.error(e);
        alert("Offline image save failed. Try a smaller image or free storage.");
      }
    }else{
      // For security, browsers cannot give real file paths. Use filename as placeholder.
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      imgInput.value = safeName;

      // show local preview for this session
      const tmp = URL.createObjectURL(file);
      preview.src = tmp;
      preview.style.display = "block";
      preview.onload = ()=>URL.revokeObjectURL(tmp);
    }
  };

  imgInput.oninput = () => refreshPreview();
}

async function saveLesson(){
  const title = document.getElementById("lesson-title-input").value.trim();
  if(!title) return alert("Please enter a lesson title!");

  const words = document.querySelectorAll(".word-in");
  const imgs  = document.querySelectorAll(".img-in");

  const items = [];
  for(let i=0;i<words.length;i++){
    const w = (words[i].value || "").trim();
    const img = (imgs[i].value || "").trim();
    if(w) items.push({ word:w, image: img || "" });
  }
  if(!items.length) return alert("Add at least 1 word.");

  const id = (editIndex >= 0 && lessons[editIndex]) ? (lessons[editIndex].id || sbMakeId()) : sbMakeId();
  await sbPutLesson({ id, title, items });

  editIndex = -1;
  document.getElementById("creator-title").innerText = "Create Lesson";
  sbToast("✅ Lesson saved");

  await sbLoadLessons();
  showPage("menu-page");
}

function editLesson(index){
  editIndex = index;
  const l = lessons[index];
  document.getElementById("creator-title").innerText = "Edit Lesson";
  document.getElementById("lesson-title-input").value = l.title;
  document.getElementById("items-input-container").innerHTML = "";
  (l.items||[]).forEach(it=>addWordRow(it.word, it.image));
  showPage("creator-page");
}

async function deleteLesson(i){
  const l = lessons[i];
  if(!l) return;
  if(confirm("Delete this lesson?")){
    try{
      await sbDeleteLesson(l.id);
    }catch(e){
      console.warn(e);
    }
    // keep unlock map aligned (by index) - rebuild after reload
    await sbLoadLessons();
    const newUnlocked = {};
    lessons.forEach((_, idx)=>{ if(unlockedLessons[idx]) newUnlocked[idx]=true; });
    unlockedLessons = newUnlocked;
    localStorage.setItem("unlocked_status", JSON.stringify(unlockedLessons));

    sbToast("🗑️ Deleted");
    renderMenu();
  }
}

/* =========================================================
   ✅ Study flow (unlock games)
   ========================================================= */
// function startStudySession(index){
//   currentLesson = lessons[index];
//   currentLessonIndex = index;
//   studiedItems.clear();

//   const grid = document.getElementById("study-grid");
//   grid.innerHTML = "";
//   document.getElementById("unlock-message").classList.add("hidden");

//   currentLesson.items.forEach((item, i)=>{
//     const div = document.createElement("div");
//     div.className = "word-box";

//     const letterSpans = (item.word||"").split("").map(ch=>`<span>${ch}</span>`).join("");
//     div.innerHTML = `
//       ${item.image ? `<img data-img-ref="${item.image}" src="" onerror="this.style.display='none'">` : ""}
//       <div class="word-text">${letterSpans}</div>
//     `;
//     div.onclick = ()=>studyWordWithHighlight(div, item, i);
//     grid.appendChild(div);
//   });

//   // hydrate all study images now
//   sbHydrateImages(grid);

//   showPage("study-page");
// }

async function startStudySession(index){
  currentLesson = lessons[index];
  currentLessonIndex = index;
  studiedItems.clear();

  const grid = document.getElementById("study-grid");
  const unlockMessage = document.getElementById("unlock-message");
  if(!grid) return;

  grid.innerHTML = "";
  if(unlockMessage) unlockMessage.classList.add("hidden");

  // ✅ preload all lesson images first, same stability idea as Smash
  await sbPreloadLessonImages(currentLesson?.items || []);

  (currentLesson.items || []).forEach((item, i) => {
    const div = document.createElement("div");
    div.className = "word-box";

    const imgRef = sbGetItemImageRef(item);
    const letterSpans = (item.word || "")
      .split("")
      .map(ch => `<span>${sbEscapeAttr(ch)}</span>`)
      .join("");

    div.innerHTML = `
      ${imgRef
        ? `<img data-img-ref="${sbEscapeAttr(imgRef)}" src="" alt="${sbEscapeAttr(item.word || "")}" onerror="this.style.display='none'">`
        : ""
      }
      <div class="word-text">${letterSpans}</div>
    `;

    div.onclick = () => studyWordWithHighlight(div, item, i);
    grid.appendChild(div);
  });

  // ✅ show page first
  await showPage("study-page");

  // ✅ then hydrate only the Study grid
  await sbHydrateImages(grid);
}

async function studyWordWithHighlight(element, item, index){
  if(isSpeaking) return;
  isSpeaking = true;

  const spans = element.querySelectorAll("span");
  const word = item.word || "";

  speak(word);
  element.style.background = "#ffeaa7";
  await new Promise(r=>setTimeout(r, 900));

  for(let i=0; i<word.length; i++){
    if(spans[i]){
      spans[i].style.color = "#e67e22";
      spans[i].style.fontSize = "1.5em";
    }
    speak(word[i]);
    await new Promise(r=>setTimeout(r, 600));
    if(spans[i]){
      spans[i].style.color = "inherit";
      spans[i].style.fontSize = "inherit";
    }
  }

  speak(word);
  isSpeaking = false;

  studiedItems.add(index);
  element.classList.add("completed-study");

  if(studiedItems.size === currentLesson.items.length){
    completeStudy(currentLessonIndex);
  }
}

function completeStudy(index){
  unlockedLessons[index] = true;
  localStorage.setItem("unlocked_status", JSON.stringify(unlockedLessons));
  document.getElementById("unlock-message").classList.remove("hidden");
  speak("Awesome! You learned the words. Now you can play!");

  openLessonHub(index);
  setTimeout(() => {
  const cards = document.querySelectorAll(".sb-lesson-card");
  if(cards[index]){
    cards[index].classList.add("sb-unlock-animate");
    setTimeout(() => {
      cards[index].classList.remove("sb-unlock-animate");
    }, 1000);
  }
}, 200);

}

/* =========================================================
   ✅ Smash / Spell
   ========================================================= */

   function sbGetSafeImageRef(item){
  return sbGetItemImageRef(item) || "";
}

   async function sbPreloadLessonImages(items = []){
  const refs = items
    .map(it => sbGetSafeImageRef(it))
    .filter(Boolean);

  await Promise.all(refs.map(ref => sbResolveImageSrc(ref)));
}

async function startGame(index, mode, opts = {}){
  currentLesson = lessons[index] || currentLesson;
  currentLessonIndex = index;
  gameMode = mode;

  wordQueue = opts.seed
    ? sbRaceSeededShuffle([...(currentLesson?.items || [])], opts.seed)
    : [];

  currentTargetItem = null;
  spellingProgress = "";

  const overlay = document.getElementById("success-overlay");
  if(overlay) overlay.onclick = null;

  await sbPreloadLessonImages(currentLesson?.items || []);
  await showPage("game-page");
  await nextRound(false);
}

// function startGame(index, mode, opts = {}){
//   currentLesson = lessons[index] || currentLesson;
//   currentLessonIndex = index;
//   gameMode = mode;

//   wordQueue = opts.seed
//     ? sbRaceSeededShuffle([...(currentLesson?.items || [])], opts.seed)
//     : [];

//   currentTargetItem = null;
//   spellingProgress = "";

//   const overlay = document.getElementById("success-overlay");
//   if(overlay) overlay.onclick = null;

//   showPage("game-page");
//   nextRound(false);
// }

function renderWordContent(element, item, style){
  element.innerHTML = "";

  const imgRef = sbGetItemImageRef(item);

  if(style === "image" || style === "both"){
    if(imgRef){
      element.innerHTML += `<img data-img-ref="${sbEscapeAttr(imgRef)}" src="" onerror="this.style.display='none'">`;
    }else{
      element.innerHTML += `<div style="font-size:40px">${item.fallback || "⭐"}</div>`;
    }
  }

  if(style === "text" || style === "both"){
    element.innerHTML += `<span>${item.word || ""}</span>`;
  }
}

// function renderWordContent(element, item, style){
//   element.innerHTML = "";

//   if(style === "image" || style === "both"){
//     if(item.image){
//       element.innerHTML += `<img data-img-ref="${item.image}" src="" onerror="this.style.display='none'">`;
//     }else{
//       element.innerHTML += `<div style="font-size:40px">${item.fallback}</div>`;
//     }
//   }

//   if(style === "text" || style === "both"){
//     element.innerHTML += `<span>${item.word}</span>`;
//   }
// }


async function nextRound(keepSameWord=false){
  const overlay = document.getElementById("success-overlay");
  overlay?.classList.add("hidden");

  const characterEl = document.getElementById("character");
  if(characterEl) characterEl.innerText = "👧";

  const isSpelling = (gameMode === "spelling");
  document.getElementById("spelling-preview").classList.toggle("hidden", !isSpelling);

  const arena = document.getElementById("word-arena");
  arena.innerHTML = "";

  const selectedStyle = document.getElementById("global-display-style").value;
  const shouldRepeat = document.getElementById("repeat-toggle").checked;
  const raceActive = sbIsMultiplayerRaceActive(gameMode);

  if(!keepSameWord){
    if(wordQueue.length === 0){
      if(!shouldRepeat && currentTargetItem !== null){
        if(raceActive){
          showRaceLessonComplete(gameMode);
        }else{
          showFinalScore();
        }
        return;
      }

      const freshItems = [...(currentLesson?.items || [])];
      wordQueue = raceActive
        ? sbRaceSeededShuffle(freshItems, `${SB_MATCH.seed}:${gameMode}:loop`)
        : freshItems.sort(()=>0.5 - Math.random());
    }

    currentTargetItem = wordQueue.pop();
  }

  if(!currentTargetItem) return;

  if(gameMode === "smash"){
    const shuffled = raceActive
      ? sbRaceSeededShuffle([...(currentLesson?.items || [])], `${SB_MATCH.seed}:${currentTargetItem.word}:choices`)
      : [...(currentLesson?.items || [])].sort(()=>0.5 - Math.random());

    shuffled.forEach(item=>{
      const btn = document.createElement("div");
      btn.className = "word-box";
      renderWordContent(btn, item, selectedStyle);
      btn.onclick = ()=>checkSmash(item);
      arena.appendChild(btn);
    });

    await sbHydrateImages(arena);

  }else{
    spellingProgress = "";
    await updateSpellingDisplay();

    const letters = raceActive
      ? sbRaceSeededShuffle((currentTargetItem.word||"").split(""), `${SB_MATCH.seed}:${currentTargetItem.word}:letters`)
      : (currentTargetItem.word||"").split("").sort(()=>0.5 - Math.random());

    letters.forEach(ch=>{
      const btn = document.createElement("div");
      btn.className = "word-box letter-box";
      btn.innerText = ch;
      btn.onclick = ()=>checkLetter(ch, btn);
      arena.appendChild(btn);
    });
  }

  if(!keepSameWord && currentTargetItem) speak(currentTargetItem.word);
}

function checkSmash(item){
  const ok = item.word === currentTargetItem.word;
  sbRecordAttempt(currentLesson.title, ok);
  if(ok) win();
  else{
    speak("Try again");
    document.getElementById("character").innerText = "🤔";
  }
}


function checkLetter(char, btn){
  const nextChar = (currentTargetItem.word||"")[spellingProgress.length];
  const ok = (char === nextChar);

  if(ok){
    spellingProgress += char;
    updateSpellingDisplay();
    btn.style.visibility = "hidden";

    const partialPct = Math.max(
      SB_MATCH.progress || 0,
      sbRaceLessonProgressPercent()
    );

    if(gameMode === "spelling"){
      sbSendRaceProgress("spelling", partialPct);
    }

    if(spellingProgress === currentTargetItem.word){
      sbRecordAttempt(currentLesson.title, true);
      sbSendRaceProgress("spelling", sbRaceLessonProgressPercent());
      win();
    }
  }else{
    sbRecordAttempt(currentLesson.title, false);
    speak("Whoops!");
    btn.style.background = "#ff4757";
    setTimeout(()=>btn.style.background = "var(--accent)", 400);
  }
}

async function updateSpellingDisplay(){
  const hintContainer = document.getElementById("spelling-hint");
  const lettersContainer = document.getElementById("spelling-letters");
  const selectedStyle = document.getElementById("global-display-style").value;

  hintContainer.innerHTML = "";

  const hintBox = document.createElement("div");
  hintBox.className = "word-box";
  // hint is not clickable
  hintBox.style.cursor = "default";
  hintBox.onclick = null;

  renderWordContent(hintBox, currentTargetItem, selectedStyle);
  hintContainer.appendChild(hintBox);

  await sbHydrateImages(hintContainer);

  lettersContainer.innerText =
    spellingProgress.padEnd((currentTargetItem.word||"").length, "_");
}

// async function win(){
//   document.getElementById("character").innerText = "🔨";
//   const praise = praises[Math.floor(Math.random()*praises.length)];
//   speak(praise + " " + currentTargetItem.word);

//   sbAwardStar(currentLesson.title, 1);

//   const media = document.getElementById("success-media");
//   media.innerHTML = "";

//   if(currentTargetItem.image){
//     media.innerHTML = `<img data-img-ref="${currentTargetItem.image}" src="" style="max-width:300px; border-radius:20px;" onerror="this.style.display='none'">`;
//     await sbHydrateImages(media);
//   }else{
//     media.innerText = currentTargetItem.fallback;
//   }

//   document.getElementById("success-msg").innerText = praise;

//   const overlay = document.getElementById("success-overlay");
//   overlay.classList.remove("hidden");

//   overlay.onclick = () => {
//     overlay.classList.add("hidden");

//     const raceActive =
//       (gameMode === "smash" && sbIsMultiplayerRaceActive("smash")) ||
//       (gameMode === "spelling" && sbIsMultiplayerRaceActive("spelling"));

//     if(raceActive && wordQueue.length === 0){
//       showRaceLessonComplete(gameMode);
//       return;
//     }

//     nextRound(false);
//   };
// }

async function win(){
  document.getElementById("character").innerText = "🔨";
  const praise = praises[Math.floor(Math.random()*praises.length)];
  speak(praise + " " + currentTargetItem.word);

  sbAwardStar(currentLesson.title, 1);

  const media = document.getElementById("success-media");
  media.innerHTML = "";

  if(currentTargetItem.image){
    media.innerHTML = `<img data-img-ref="${currentTargetItem.image}" src="" style="max-width:300px; border-radius:20px;" onerror="this.style.display='none'">`;
    await sbHydrateImages(media);
  }else{
    media.innerText = currentTargetItem.fallback || "⭐";
  }

  document.getElementById("success-msg").innerText = praise;

  const overlay = document.getElementById("success-overlay");
  overlay.classList.remove("hidden");

  const isRace = sbIsMultiplayerRaceActive(gameMode);

  if(isRace && wordQueue.length === 0){
    // Last word completed → race finish
    showRaceLessonComplete(gameMode);
  } else {
    // Normal next round
    overlay.onclick = () => {
      overlay.classList.add("hidden");
      nextRound(false);
    };
  }
}

function showFinalScore(){
  speak("Congratulations! You finished the whole lesson!");

  const media = document.getElementById("success-media");
  media.innerHTML = "🏆";
  document.getElementById("success-msg").innerText = "LESSON COMPLETE!";

  const overlay = document.getElementById("success-overlay");
  overlay.classList.remove("hidden");

  overlay.onclick = () => {
    overlay.classList.add("hidden");
    openLessonHub(currentLessonIndex);
  };
}

// function showRaceLessonComplete(gameId){
//   const media = document.getElementById("success-media");
//   const msg = document.getElementById("success-msg");
//   const overlay = document.getElementById("success-overlay");

//   if(media) media.innerHTML = "🏁";
//   if(msg) msg.innerText = "ROUND COMPLETE!";

//   overlay.classList.remove("hidden");
//   overlay.onclick = () => {
//     overlay.classList.add("hidden");
//     sbSendRaceComplete(gameId, {
//       lessonTitle: currentLesson?.title || "",
//       lastWord: currentTargetItem?.word || ""
//     });
//   };
// }

// function showRaceLessonComplete(gameId){
//   const overlay = document.getElementById("success-overlay");
//   const media   = document.getElementById("success-media");
//   const msg     = document.getElementById("success-msg");

//   const isRace = sbIsMultiplayerRaceActive(gameId);

//   if (isRace) {
//     // VS MODE - First to finish wins
//     const youFinishedFirst = !SB_MATCH.result; // no result received yet = we finished first

//     if (youFinishedFirst) {
//       if (media) media.innerHTML = "🏆";
//       if (msg)   msg.innerHTML = `<span style="color:#2ecc71; font-size:1.4em;">🏆 YOU FINISHED FIRST!</span>`;
//       sbRewardFx({ emoji: "🏆", text: "You win the race!", shake: true });
//       sbSendRaceComplete(gameId, { finishedFirst: true });
//     } 
//     else {
//       // Opponent already finished
//       if (media) media.innerHTML = "💨";
//       if (msg)   msg.innerHTML = `<span style="color:#e74c3c;">Opponent finished first...</span>`;
//       sbRewardFx({ emoji: "💨", text: "Opponent won the race", shake: false });
//     }

//     overlay.classList.remove("hidden");

//     // Auto close and return to lesson hub
//     setTimeout(() => {
//       overlay.classList.add("hidden");
//       openLessonHub(currentLessonIndex);
//     }, 2200);

//   } 
//   else {
//     // SOLO MODE - Original behavior
//     if (media) media.innerHTML = "🏆";
//     if (msg) msg.innerText = "LESSON COMPLETE!";
    
//     overlay.classList.remove("hidden");
//     overlay.onclick = () => {
//       overlay.classList.add("hidden");
//       openLessonHub(currentLessonIndex);
//     };
//   }
// }

// function showRaceLessonComplete(gameId){
//   if (!sbIsMultiplayerRaceActive(gameId)) {
//     const overlay = document.getElementById("success-overlay");
//     const media   = document.getElementById("success-media");
//     const msg     = document.getElementById("success-msg");

//     if (media) media.innerHTML = "🏆";
//     if (msg) msg.innerText = "LESSON COMPLETE!";
//     overlay.classList.remove("hidden");
//     overlay.onclick = () => {
//       overlay.classList.add("hidden");
//       openLessonHub(currentLessonIndex);
//     };
//     return;
//   }

//   sbSendRaceComplete(gameId, {
//     lessonTitle: currentLesson?.title || "",
//     lastWord: currentTargetItem?.word || "",
//     matches,
//     moves
//   });

//   const overlay = document.getElementById("success-overlay");
//   const media   = document.getElementById("success-media");
//   const msg     = document.getElementById("success-msg");

//   if (media) media.innerHTML = "⏳";
//   if (msg) msg.innerText = "Finished! Waiting for result...";
//   overlay.classList.remove("hidden");
//   overlay.onclick = null;
// }

function showRaceLessonComplete(gameId){
  if (!sbIsMultiplayerRaceActive(gameId)) {
    const overlay = document.getElementById("success-overlay");
    const media   = document.getElementById("success-media");
    const msg     = document.getElementById("success-msg");

    if (media) media.innerHTML = "🏆";
    if (msg) msg.innerText = "LESSON COMPLETE!";
    overlay.classList.remove("hidden");
    overlay.onclick = () => {
      overlay.classList.add("hidden");
      openLessonHub(currentLessonIndex);
    };
    return;
  }

  const meta = {
    lessonTitle: currentLesson?.title || "",
    lastWord: currentTargetItem?.word || "",
    matches,
    moves
  };

  if(gameId === "repeatpro"){
    meta.correct = repeatMode.correct || 0;
    meta.total = repeatMode.total || 0;
  }

  sbSendRaceComplete(gameId, meta);

  const overlay = document.getElementById("success-overlay");
  const media   = document.getElementById("success-media");
  const msg     = document.getElementById("success-msg");

  if (media) media.innerHTML = "⏳";
  if (msg) msg.innerText = "Finished! Waiting for result...";
  overlay.classList.remove("hidden");
  overlay.onclick = null;
}
/* =========================================================
   ✅ Type Spell Mode
   ========================================================= */

function startTypeSpellMode(index, opts = {}){
  currentLesson = lessons[index] || currentLesson;
  currentLessonIndex = index;

  const items = [...(currentLesson?.items || [])];
  typeSpellMode.queue = opts.seed ? sbRaceSeededShuffle(items, opts.seed) : items.sort(()=>0.5 - Math.random());

  typeSpellMode.current = null;
  showPage("type-spell-page");
  nextTypeSpellWord();
}

async function nextTypeSpellWord(){
  const overlay = document.getElementById("success-overlay");
  overlay.classList.add("hidden");
  if(typeSpellMode.queue.length === 0){
    showFinalScore();
    return;
  }
  typeSpellMode.current = typeSpellMode.queue.pop();
  const item = typeSpellMode.current;
  const promptEl = document.getElementById("type-spell-prompt");
  const imgWrap = document.getElementById("type-spell-image-wrap");
  const blanksEl = document.getElementById("type-spell-blanks");
  const inputEl = document.getElementById("type-spell-input");
  const fbEl = document.getElementById("type-spell-feedback");
  if(promptEl) promptEl.innerText = "Type the word you hear";
  if(blanksEl) blanksEl.innerText = "_ ".repeat((item.word || "").length).trim();
  if(inputEl) inputEl.value = "";
  if(fbEl) fbEl.innerText = "";
  if(imgWrap){
    imgWrap.innerHTML = item.image ? `<img data-img-ref="${sbEscapeAttr(item.image)}" src="" alt="">` : `<div style="font-size:80px;">${item.fallback || "⭐"}</div>`;
    await sbHydrateImages(imgWrap);
  }
  speak(item.word || "");
  inputEl?.focus();
}


async function handleTypeSpellCorrect(item){
  sbRecordAttempt(currentLesson.title, true);
  sbAwardStar(currentLesson.title, 1);

  if(typeof sbRewardFx === "function"){
    sbRewardFx({ emoji:"⌨️", text:"Correct Spelling!", shake:true });
  }

  sbTypeSpellSetFeedback("✅ Great job!", "#1e9f53");
  sbTypeSpellClearErrorStyle();
  speak("Great job!");

  const isRace = sbIsMultiplayerRaceActive("typespell");
  const total = Math.max(1, currentLesson?.items?.length || 1);
  const done = total - typeSpellMode.queue.length;
  const pct = Math.round((done / total) * 100);
  sbSendRaceProgress("typespell", pct);

  if(isRace && typeSpellMode.queue.length === 0){
    // This was the last word → race finished
    showRaceLessonComplete("typespell");
  } else {
    // Normal flow
    const overlay = document.getElementById("success-overlay");
    const media = document.getElementById("success-media");
    const msg = document.getElementById("success-msg");

    msg.innerText = "SPELLING WIN!";
    media.innerHTML = item.image 
      ? `<img data-img-ref="${sbEscapeAttr(item.image)}" src="" style="max-width:300px; border-radius:20px;" onerror="this.style.display='none'">`
      : (item.fallback || "🏆");

    await sbHydrateImages(media);
    overlay.classList.remove("hidden");
    overlay.onclick = () => nextTypeSpellWord();
  }
}

function handleTypeSpellInput(){
  const item = typeSpellMode.current;
  if(!item) return;

  const inputEl = document.getElementById("type-spell-input");
  if(!inputEl) return;

  const typedRaw = inputEl.value || "";
  const typed = sbTypeSpellNormalize(typedRaw);
  const target = sbTypeSpellNormalize(item.word || "");

  // Keep visible input aligned with normalized version
  if(typedRaw !== typed){
    inputEl.value = typed;
  }

  if(!typed){
    sbTypeSpellSetFeedback("");
    sbTypeSpellClearErrorStyle();
    return;
  }

  const isPrefixOk = target.startsWith(typed);

  if(!isPrefixOk){
    sbRecordAttempt(currentLesson.title, false);
    sbTypeSpellSetFeedback("❌ Wrong letter. Fix it!", "#d63031");
    sbTypeSpellMarkError(false);
    speak("Buzz");
    return;
  }

  // Good prefix so far
  sbTypeSpellSetFeedback("✨ Good so far!", "#6c5ce7");
  sbTypeSpellClearErrorStyle();

  // Full length reached
  if(typed.length >= target.length){
    if(typed === target){
      handleTypeSpellCorrect(item);
    }else{
      sbRecordAttempt(currentLesson.title, false);
      sbTypeSpellSetFeedback("❌ Not quite. Backspace or clear and try again!", "#d63031");
      sbTypeSpellMarkError(true);
      speak("Try again");
    }
  }
}

function clearTypeSpell(){
  const inputEl = document.getElementById("type-spell-input");
  if(inputEl) inputEl.value = "";
  sbTypeSpellSetFeedback("");
  sbTypeSpellClearErrorStyle();
  inputEl?.focus();
}

/* =========================================================
   ✅ Word Scramble Mode
   ========================================================= */

// function startWordScrambleMode(index, opts = {}){
//   currentLesson = lessons[index] || currentLesson;
//   currentLessonIndex = index;

//   const items = [...(currentLesson?.items || [])];
//   wordScrambleMode.queue = opts.seed ? sbRaceSeededShuffle(items, opts.seed) : items.sort(()=>0.5 - Math.random());

//   wordScrambleMode.current = null;
//   wordScrambleMode.letters = [];
//   wordScrambleMode.picked = [];
//   showPage("scramble-word-page");
//   nextWordScramble();
// }

// async function nextWordScramble(){
//   const overlay = document.getElementById("success-overlay");
//   overlay.classList.add("hidden");
//   if(wordScrambleMode.queue.length === 0){
//     showFinalScore();
//     return;
//   }
//   wordScrambleMode.current = wordScrambleMode.queue.pop();
//   const item = wordScrambleMode.current;
//   const cleanWord = (item.word || "").replace(/\s+/g, "").toUpperCase();
//   wordScrambleMode.picked = [];
//   wordScrambleMode.letters = cleanWord.split("").map((ch, i) => ({ id: `${ch}_${i}_${Date.now()}`, ch, used:false })).sort(()=>0.5 - Math.random());
//   const promptEl = document.getElementById("scramble-word-prompt");
//   const imgWrap = document.getElementById("scramble-word-image-wrap");
//   const fbEl = document.getElementById("scramble-word-feedback");
//   if(promptEl) promptEl.innerText = "Unscramble the word";
//   if(fbEl) fbEl.innerText = "";
//   if(imgWrap){
//     imgWrap.innerHTML = item.image ? `<img data-img-ref="${sbEscapeAttr(item.image)}" src="" alt="">` : `<div style="font-size:80px;">${item.fallback || "⭐"}</div>`;
//     await sbHydrateImages(imgWrap);
//   }
//   renderWordScrambleBoard();
//   speak(item.word || "");
// }

// function renderWordScrambleBoard(){
//   const answerEl = document.getElementById("scramble-word-answer");
//   const bankEl = document.getElementById("scramble-word-bank");
//   if(answerEl){
//     answerEl.innerHTML = "";
//     if(wordScrambleMode.picked.length){
//       wordScrambleMode.picked.forEach((letterObj, index)=>{
//         const btn = document.createElement("button");
//         btn.className = "sb-scramble-letter sb-scramble-picked";
//         btn.textContent = letterObj.ch;
//         btn.onclick = () => unpickWordScramble(index);
//         answerEl.appendChild(btn);
//       });
//     }else{
//       answerEl.innerHTML = `<span style="opacity:.55;">Build the word here</span>`;
//     }
//   }
//   if(bankEl){
//     bankEl.innerHTML = "";
//     wordScrambleMode.letters.forEach((letterObj, index)=>{
//       const btn = document.createElement("button");
//       btn.className = "sb-scramble-letter" + (letterObj.used ? " used" : "");
//       btn.textContent = letterObj.ch;
//       btn.disabled = !!letterObj.used;
//       btn.onclick = () => pickWordScramble(index);
//       bankEl.appendChild(btn);
//     });
//   }
// }

// function pickWordScramble(index){
//   const letterObj = wordScrambleMode.letters[index];
//   if(!letterObj || letterObj.used) return;
//   letterObj.used = true;
//   wordScrambleMode.picked.push(letterObj);
//   renderWordScrambleBoard();
// }

// function unpickWordScramble(index){
//   const letterObj = wordScrambleMode.picked[index];
//   if(!letterObj) return;
//   wordScrambleMode.picked.splice(index, 1);
//   const source = wordScrambleMode.letters.find(x => x.id === letterObj.id);
//   if(source) source.used = false;
//   renderWordScrambleBoard();
// }

// function clearWordScramble(){
//   wordScrambleMode.picked = [];
//   wordScrambleMode.letters.forEach(l => l.used = false);
//   document.getElementById("scramble-word-feedback").innerText = "";
//   renderWordScrambleBoard();
// }

// async function checkWordScramble(){
//   const item = wordScrambleMode.current;
//   if(!item) return;
//   const target = (item.word || "").replace(/\s+/g, "").toUpperCase();
//   const built = wordScrambleMode.picked.map(x => x.ch).join("");
//   const fbEl = document.getElementById("scramble-word-feedback");
//   if(!built){
//     if(fbEl) fbEl.innerText = "🧩 Build the word first!";
//     speak("Build the word");
//     return;
//   }
// //   if(built === target){
// //     sbRecordAttempt(currentLesson.title, true);
// //     sbAwardStar(currentLesson.title, 1);
// //     if(typeof sbRewardFx === "function") sbRewardFx({ emoji:"🧩", text:"Puzzle Solved!", shake:true });
// //     if(fbEl) fbEl.innerText = "✅ Awesome!";
// //     speak("Awesome!");
// //     const overlay = document.getElementById("success-overlay");
// //     const media = document.getElementById("success-media");
// //     const msg = document.getElementById("success-msg");
// //     msg.innerText = "SCRAMBLE WIN!";
// //     media.innerHTML = item.image ? `<img data-img-ref="${sbEscapeAttr(item.image)}" src="" style="max-width:300px; border-radius:20px;" onerror="this.style.display='none'">` : (item.fallback || "🏆");
// //     await sbHydrateImages(media);
// //     // overlay.classList.remove("hidden");
// //     // overlay.onclick = () => nextWordScramble();
// //         const total = Math.max(1, currentLesson?.items?.length || 1);
// //     const done = total - wordScrambleMode.queue.length;
// //     const pct = Math.round((done / total) * 100);
// //     sbSendRaceProgress("scramble", pct);

// //     if(sbIsMultiplayerRaceActive("scramble")){
// //       if(wordScrambleMode.queue.length === 0){
// //         overlay.classList.remove("hidden");
// //         overlay.onclick = () => {
// //           overlay.classList.add("hidden");
// //           sbSendRaceComplete("scramble", {
// //             correctWord: item.word || ""
// //           });
// //         };
// //       } else {
// //         overlay.classList.remove("hidden");
// //         overlay.onclick = () => nextWordScramble();
// //       }
// //     } else {
// //       overlay.classList.remove("hidden");
// //       overlay.onclick = () => nextWordScramble();
// //     }
// //   } else {

//     if(built === target){
//   sbRecordAttempt(currentLesson.title, true);
//   sbAwardStar(currentLesson.title, 1);
//   if(typeof sbRewardFx === "function") sbRewardFx({ emoji:"🧩", text:"Puzzle Solved!", shake:true });
  
//   const fbEl = document.getElementById("scramble-word-feedback");
//   if(fbEl) fbEl.innerText = "✅ Awesome!";
//   speak("Awesome!");

//   const total = Math.max(1, currentLesson?.items?.length || 1);
//   const done = total - wordScrambleMode.queue.length;
//   const pct = Math.round((done / total) * 100);
//   sbSendRaceProgress("scramble", pct);

//   if(sbIsMultiplayerRaceActive("scramble") && wordScrambleMode.queue.length === 0){
//     showRaceLessonComplete("scramble");
//   } else {
//     const overlay = document.getElementById("success-overlay");
//     const media = document.getElementById("success-media");
//     const msg = document.getElementById("success-msg");
    
//     if(msg) msg.innerText = "SCRAMBLE WIN!";
//     if(media) media.innerHTML = item.image 
//       ? `<img data-img-ref="${sbEscapeAttr(item.image)}" src="" style="max-width:300px; border-radius:20px;" onerror="this.style.display='none'">` 
//       : (item.fallback || "🏆");
    
//     await sbHydrateImages(media);
//     overlay.classList.remove("hidden");
//     overlay.onclick = () => nextWordScramble();
//   }
// } else {
//     sbRecordAttempt(currentLesson.title, false);
//     if(fbEl) fbEl.innerText = "❌ Try again!";
//     speak("Try again");
//   }
// }

function sbRaceLessonProgressPercent(){
  const total = Math.max(1, currentLesson?.items?.length || 1);
  const done = total - wordQueue.length - (currentTargetItem ? 1 : 0) + 1;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

function sbRepeatProProgressPercent(){
  const total = Math.max(1, repeatMode.total || 1);
  const done = total - (repeatMode.queue?.length || 0) - (repeatMode.current ? 1 : 0) + 1;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

/* =========================================================
   ✅ Memory game
   ========================================================= */

function startMemoryGame(index, opts = {}){
  window.speechSynthesis.cancel();

  flippedCards = [];
  moves = 0;
  matches = 0;

  memoryMode.deck = [];
  memoryMode.busy = false;
  memoryMode.completed = false;

  currentLesson = lessons[index] || currentLesson;
  currentLessonIndex = index;

  document.getElementById("move-count").innerText = moves;
  document.getElementById("match-count").innerText = matches;

  const grid = document.getElementById("memory-grid");
  grid.innerHTML = "";

  let cardsData = [];
  (currentLesson.items || []).forEach(item=>{
    cardsData.push({ type:"text", value:item.word, id:item.word });
    cardsData.push({ type:"img", value:item.image || item.fallback, id:item.word });
  });

  memoryMode.deck = opts.seed
    ? sbRaceSeededShuffle(cardsData, `${opts.seed}:memory`)
    : cardsData.sort(()=>0.5 - Math.random());

  memoryMode.deck.forEach((data, i)=>{
    const card = document.createElement("div");
    card.className = "memory-card";
    card.dataset.id = data.id;
    card.dataset.index = i;
    card.innerHTML = "?";
    card.onclick = ()=>flipCard(card, data);
    grid.appendChild(card);
  });

  showPage("memory-page");
}

async function flipCard(card, data){
  if(memoryMode.busy) return;
  if(flippedCards.length === 2) return;
  if(card.classList.contains("flipped")) return;
  if(card.classList.contains("matched")) return;

  card.classList.add("flipped");

  if(data.type === "img"){
    const v = (data.value||"").toString().trim();
    if(v && (v.startsWith("idb:") || v.startsWith("http://") || v.startsWith("https://") || v.startsWith("data:"))){
      card.innerHTML = `<img data-img-ref="${v}" src="">`;
      await sbHydrateImages(card);
    }else if(v.length > 2 && (v.includes("/") || v.includes("."))){
      card.innerHTML = `<img src="${v}" onerror="this.style.display='none'">`;
    }else{
      card.innerHTML = v || data.value;
    }
  }else{
    card.innerHTML = data.value;
  }

  speak(data.id);
  flippedCards.push({ card, data });

  if(flippedCards.length === 2){
    memoryMode.busy = true;
    moves++;
    document.getElementById("move-count").innerText = moves;
    checkMatch();
  }
}

function checkMatch(){
  const [a, b] = flippedCards;
  if(!a || !b){
    memoryMode.busy = false;
    return;
  }

  if(a.data.id === b.data.id){
    a.card.classList.add("matched");
    b.card.classList.add("matched");

    matches++;
    document.getElementById("match-count").innerText = matches;
    flippedCards = [];
    memoryMode.busy = false;

    sbSendRaceProgress("memory", sbMemoryProgressPercent());

    if(matches === (currentLesson?.items?.length || 0)){
      memoryMode.completed = true;

      setTimeout(()=>{
        if(sbIsMultiplayerRaceActive("memory")){
        //   const media = document.getElementById("success-media");
        //   const msg = document.getElementById("success-msg");
        //   const overlay = document.getElementById("success-overlay");

        //   if(media) media.innerHTML = "🧠";
        //   if(msg) msg.innerText = "MEMORY COMPLETE!";

        //   overlay.classList.remove("hidden");
        //   overlay.onclick = () => {
        //     overlay.classList.add("hidden");
        //     sbSendRaceComplete("memory", {
        //       matches,
        //       moves,
        //       lessonTitle: currentLesson?.title || ""
        //     });
        //   };
            showRaceLessonComplete("memory");
        }else{
          speak("Incredible! You matched them all!");
          showFinalScore();
        }
      }, 400);
    }
  }else{
    setTimeout(()=>{
      a.card.classList.remove("flipped");
      b.card.classList.remove("flipped");
      a.card.innerHTML = "?";
      b.card.innerHTML = "?";
      flippedCards = [];
      memoryMode.busy = false;
    }, 900);
  }
}

/* =========================================================
   ✅ Repeat Mode
   ========================================================= */

// function startRepeatMode(index, isPro){
//   if(isPro){
//     sbRequirePro(()=>{
//       initRepeat(index, true);
//     });
//   }else{
//     initRepeat(index, false);
//   }
// }

function startRepeatMode(index, isPro, opts = {}){
  if(isPro){
    sbRequirePro(()=>{
      initRepeat(index, true, opts);
    });
  }else{
    initRepeat(index, false, opts);
  }
}

// function initRepeat(index, isPro){
//   currentLessonIndex = index;        // ✅ add this
//   currentLesson = lessons[index];    // ✅ and this

//   repeatMode.isPro = isPro;
//   repeatMode.queue = [...(currentLesson.items||[])].sort(()=>0.5 - Math.random());
//   repeatMode.streak = 0;

//   showPage("repeat-page");
//   nextRepeatWord();
// }

function initRepeat(index, isPro, opts = {}){
  currentLessonIndex = index;
  currentLesson = lessons[index] || currentLesson;

  repeatMode.isPro = isPro;
  repeatMode.streak = 0;
  repeatMode.correct = 0;
  repeatMode.finished = false;
  repeatMode.seed = opts.seed || "";
  repeatMode.remote = !!opts.remote;

  const items = [...(currentLesson.items || [])];

  if(repeatMode.remote && isPro){
    const seeded = sbRaceSeededShuffle(items, `${repeatMode.seed}:repeatpro`);
    repeatMode.queue = seeded.slice(0, Math.min(5, seeded.length));
  }else{
    repeatMode.queue = items.sort(()=>0.5 - Math.random());
  }

  repeatMode.total = repeatMode.queue.length;

  showPage("repeat-page");
  nextRepeatWord();
}

// function nextRepeatWord(){
//   if(repeatMode.queue.length === 0){
//     speak("Great speaking!");
//     openLessonHub(currentLessonIndex);
//     return;
//   }

//   repeatMode.current = repeatMode.queue.pop();
//   document.getElementById("repeat-prompt").innerText = repeatMode.current.word;
//   document.getElementById("repeat-feedback").innerText = "";
//   speak(repeatMode.current.word);

//   if(repeatMode.isPro){
//     startRepeatTimer();
//   }
// }

// Pro Mode

function nextRepeatWord(){
  clearInterval(repeatMode.timer);

  if(repeatMode.queue.length === 0){
    repeatMode.finished = true;

    if(sbIsMultiplayerRaceActive("repeatpro") && repeatMode.isPro){
      sbSendRaceProgress("repeatpro", 100);
      showRaceLessonComplete("repeatpro");
    }else{
      speak("Great speaking!");
      openLessonHub(currentLessonIndex);
    }
    return;
  }

  repeatMode.current = repeatMode.queue.pop();
  document.getElementById("repeat-prompt").innerText = repeatMode.current.word;
  document.getElementById("repeat-feedback").innerText = "";
  document.getElementById("repeat-counter") &&
    (document.getElementById("repeat-counter").innerText =
      `Prompt ${repeatMode.total - repeatMode.queue.length}/${repeatMode.total} • Correct: ${repeatMode.correct}`);

  speak(repeatMode.current.word);

  if(repeatMode.isPro){
    startRepeatTimer();
  }
}

function startRepeatTimer(){
  repeatMode.timeLeft = 5;
  clearInterval(repeatMode.timer);

  repeatMode.timer = setInterval(()=>{
    repeatMode.timeLeft--;

    if(repeatMode.timeLeft <= 0){
      clearInterval(repeatMode.timer);
      handleRepeatFail();
    }
  },1000);
}

const RepeatRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let repeatRecognition = null;

if(RepeatRecognition){
  repeatRecognition = new RepeatRecognition();
  repeatRecognition.lang = 'en-US';
  repeatRecognition.interimResults = false;
}

document.addEventListener("click", (e)=>{
  if(e.target.id === "repeat-mic-btn"){
    triggerRepeatMic();
  }

  if(e.target.id === "type-spell-backspace-btn") backspaceTypeSpell();
  if(e.target.id === "type-spell-clear-btn") clearTypeSpell();
  if(e.target.id === "type-spell-hear-btn" && typeSpellMode.current) speak(typeSpellMode.current.word || "");

  // if(e.target.id === "scramble-word-check-btn") checkWordScramble();
  // if(e.target.id === "scramble-word-clear-btn") clearWordScramble();
  if(e.target.id === "scramble-word-hear-btn" && wordScrambleMode.current) speak(wordScrambleMode.current.word || "");
});

function sbTypeSpellNormalize(v){
  return String(v || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function sbTypeSpellSetFeedback(text, color = ""){
  const fbEl = document.getElementById("type-spell-feedback");
  if(!fbEl) return;
  fbEl.innerText = text || "";
  fbEl.style.color = color || "";
}

function sbTypeSpellMarkError(hard = false){
  const inputEl = document.getElementById("type-spell-input");
  if(!inputEl) return;

  inputEl.style.borderColor = "#ff4757";
  inputEl.style.background = hard ? "#ffe0e0" : "#fff1f2";
  inputEl.style.transform = "translateX(-3px)";

  setTimeout(()=>{ inputEl.style.transform = "translateX(3px)"; }, 60);
  setTimeout(()=>{ inputEl.style.transform = "translateX(-2px)"; }, 120);
  setTimeout(()=>{ inputEl.style.transform = "translateX(2px)"; }, 180);
  setTimeout(()=>{ inputEl.style.transform = "translateX(0)"; }, 240);
}

function sbTypeSpellClearErrorStyle(){
  const inputEl = document.getElementById("type-spell-input");
  if(!inputEl) return;
  inputEl.style.borderColor = "";
  inputEl.style.background = "";
  inputEl.style.transform = "";
}

function backspaceTypeSpell(){
  const inputEl = document.getElementById("type-spell-input");
  if(!inputEl) return;
  inputEl.value = inputEl.value.slice(0, -1);
  handleTypeSpellInput();
  inputEl.focus();
}

document.getElementById("type-spell-input")?.addEventListener("input", ()=>{
  handleTypeSpellInput();
});

function triggerRepeatMic(){
  if(!repeatRecognition){
    alert("Speech not supported. Use Chrome.");
    return;
  }

  // Guard: prevents crashing if clicked while already listening
  if (repeatIsListening) return;

  const micBtn = document.getElementById("repeat-mic-btn");
  repeatIsListening = true;

  // UI: Show active state
  if (micBtn) {
    micBtn.classList.add("mic-active");
    micBtn.textContent = "👂 Listening...";
  }

  repeatRecognition.onresult = (event) => {
    // Microphone found a result, so we can stop "listening"
    repeatIsListening = false;
    resetMicButton(); 

    const spoken = (event.results?.[0]?.[0]?.transcript || "")
      .toLowerCase()
      .trim()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");

    const target = (repeatMode.current?.word || "")
      .toLowerCase()
      .trim()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");

    if (spoken.includes(target) || target.includes(spoken)){
      handleRepeatSuccess();
    } else {
      handleRepeatFail();
    }
  };

  repeatRecognition.onerror = () => {
    repeatIsListening = false;
    resetMicButton();
  };

  repeatRecognition.onend = () => {
    // Always reset the UI when the mic turns off
    repeatIsListening = false;
    resetMicButton();
  };

  function resetMicButton() {
    if (micBtn) {
      micBtn.classList.remove("mic-active");
      micBtn.textContent = "🎤 Tap to Speak";
    }
  }

  try {
    repeatRecognition.start();
  } catch(e) {
    repeatIsListening = false;
    resetMicButton();
  }
}

// function handleRepeatSuccess(){

//   try { repeatRecognition.abort(); } catch(e) {}
//     repeatIsListening = false;

//   clearInterval(repeatMode.timer);

//   repeatMode.streak++;
//   sbRecordAttempt(currentLesson.title, true);

//   let starAmount = 1;

//   if(repeatMode.isPro){
//     starAmount = 2;
//     if(repeatMode.streak >= 5) starAmount = 3;
//   }

//   sbAwardStar(currentLesson.title, starAmount);

//   document.getElementById("repeat-feedback").innerText = "✅ Great!";
//   speak("Great job!");

//   setTimeout(nextRepeatWord, 900);
// }

function handleRepeatSuccess(){
  try { repeatRecognition.abort(); } catch(e) {}
  repeatIsListening = false;

  clearInterval(repeatMode.timer);

  repeatMode.streak++;
  repeatMode.correct++;
  sbRecordAttempt(currentLesson.title, true);

  let starAmount = 1;
  if(repeatMode.isPro){
    starAmount = 2;
    if(repeatMode.streak >= 5) starAmount = 3;
  }

  sbAwardStar(currentLesson.title, starAmount);

  document.getElementById("repeat-feedback").innerText = "✅ Great!";
  speak("Great job!");

  if(sbIsMultiplayerRaceActive("repeatpro") && repeatMode.isPro){
    sbSendRaceProgress("repeatpro", sbRepeatProProgressPercent());
  }

  setTimeout(nextRepeatWord, 900);
}

// function handleRepeatFail(){

//   try { repeatRecognition.abort(); } catch(e) {}
//     repeatIsListening = false;

//   clearInterval(repeatMode.timer);

//   repeatMode.streak = 0;
//   sbRecordAttempt(currentLesson.title, false);

//   document.getElementById("repeat-feedback").innerText = "❌ Try again!";
//   speak("Try again");

//   if(repeatMode.isPro){
//     setTimeout(nextRepeatWord, 900);
//   }
// }

function handleRepeatFail(){
  try { repeatRecognition.abort(); } catch(e) {}
  repeatIsListening = false;

  clearInterval(repeatMode.timer);

  repeatMode.streak = 0;
  sbRecordAttempt(currentLesson.title, false);

  document.getElementById("repeat-feedback").innerText = "❌ Try again!";
  speak("Try again");

  if(sbIsMultiplayerRaceActive("repeatpro") && repeatMode.isPro){
    sbSendRaceProgress("repeatpro", sbRepeatProProgressPercent());
    setTimeout(nextRepeatWord, 900);
    return;
  }

  if(repeatMode.isPro){
    setTimeout(nextRepeatWord, 900);
  }
}

/* =========================================================
   ✅ Repeat Sentence
   ========================================================= */

function sbDateKeyLocal(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

// simple hash -> deterministic seed from string
function sbHashString(str){
  let h = 2166136261;
  for(let i=0;i<str.length;i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// seeded RNG (mulberry32)
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

//
function sbNormalizeSpeech(s){
  return (s||"")
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"")
    .replace(/\s+/g," ");
}

function sbSentenceScore(spoken, target){
  const s = sbNormalizeSpeech(spoken);
  const t = sbNormalizeSpeech(target);
  if(!s || !t) return 0;

  const sw = s.split(" ");
  const tw = t.split(" ");

  const tset = new Set(tw);
  let match = 0;
  for(const w of sw){
    if(tset.has(w)) match++;
  }

  // overlap ratio based on target length (more fair)
  let score = match / Math.max(1, tw.length);

  // small bonus if first/last word match (helps order a bit)
  if(sw[0] && tw[0] && sw[0] === tw[0]) score += 0.08;
  if(sw[sw.length-1] && tw[tw.length-1] && sw[sw.length-1] === tw[tw.length-1]) score += 0.08;

  return Math.min(1, score);
}


//
function startSentenceRepeat(index){
  currentLessonIndex = index;
  currentLesson = lessons[index];

  // prefer items that look like sentences, but allow any if none
  const items = (currentLesson.items||[]);
  let sentenceItems = items.filter(it => (it.word||"").trim().includes(" "));
  if(sentenceItems.length === 0) sentenceItems = items;

  if(sentenceItems.length === 0){
    sbToast?.("No items in this lesson yet.");
    return;
  }

  speakSession.mode = "sentence";
  speakSession.queue = [...sentenceItems].sort(()=>0.5 - Math.random());
  speakSession.current = null;

  showPage("sentence-page");
  nextSentencePrompt();
}

function nextSentencePrompt(){
  if(speakSession.queue.length === 0){
    speak("Great speaking!");
    openLessonHub(currentLessonIndex);
    return;
  }

  speakSession.current = speakSession.queue.pop();
  const text = speakSession.current.word || "";

  document.getElementById("sentence-prompt").innerText = text;
  document.getElementById("sentence-feedback").innerText = "";
  speak(text);
}

document.addEventListener("click", (e)=>{
  if(e.target && e.target.id === "sentence-mic-btn"){
    triggerSentenceMic();
  }
});

//
function triggerSentenceMic(){
  if(!repeatRecognition){
    alert("Speech not supported. Use Chrome.");
    return;
  }
  if(repeatIsListening) return;

  const micBtn = document.getElementById("sentence-mic-btn");
  repeatIsListening = true;

  if(micBtn){
    micBtn.classList.add("mic-active");
    micBtn.textContent = "👂 Listening...";
  }

  function resetBtn(){
    if(micBtn){
      micBtn.classList.remove("mic-active");
      micBtn.textContent = "🎤 Tap to Speak";
    }
  }

  repeatRecognition.onresult = (event)=>{
    repeatIsListening = false;
    resetBtn();

    const spoken = (event.results?.[0]?.[0]?.transcript || "");
    const target = (speakSession.current?.word || "");
    const score = sbSentenceScore(spoken, target);

    // threshold: friendly
    const pass = score >= 0.75;

    if(pass){
      // stop any late callbacks
      try { repeatRecognition.abort(); } catch(e) {}

      // reward (free sentence mode)
      sbRecordAttempt?.(currentLesson.title, true);
      sbAwardStar?.(currentLesson.title, 1);

      document.getElementById("sentence-feedback").innerText = `✅ Nice! (${Math.round(score*100)}%)`;
      speak("Great job!");
      setTimeout(nextSentencePrompt, 700);
    }else{
      sbRecordAttempt?.(currentLesson.title, false);
      document.getElementById("sentence-feedback").innerText = `❌ Try again. (${Math.round(score*100)}%)`;
      speak("Try again");
    }
  };

  repeatRecognition.onerror = ()=>{
    repeatIsListening = false;
    resetBtn();
  };

  repeatRecognition.onend = ()=>{
    repeatIsListening = false;
    resetBtn();
  };

  try{
    repeatRecognition.start();
  }catch(e){
    repeatIsListening = false;
    resetBtn();
  }
}



/* =========================================================
   ✅ Daily Speaking challenge
   ========================================================= */
function startDailySpeaking(index){
  currentLessonIndex = index;
  currentLesson = lessons[index];

  const items = (currentLesson.items||[]);
  if(items.length === 0){
    sbToast?.("No items in this lesson yet.");
    return;
  }

  const dateKey = sbDateKeyLocal();
  const dailyKey = `sbDailySpeak:${currentLesson.title}:${dateKey}`;
  speakSession.dailyKey = dailyKey;

  // Check completion
  const saved = JSON.parse(localStorage.getItem(dailyKey) || "null");
  const alreadyDone = !!(saved && saved.completed);

  // pick 5 deterministic items for today
  const pool = sbSeededShuffle(items, dailyKey);
  const queue = pool.slice(0, Math.min(5, pool.length));

  speakSession.mode = "daily";
  speakSession.queue = queue;
  speakSession.index = 0;
  speakSession.correct = 0;
  speakSession.total = queue.length;

  showPage("daily-page");

  // UI status
  const statusEl = document.getElementById("daily-status");
  statusEl.innerText = alreadyDone
    ? `✅ Daily bonus already claimed today (${dateKey}). Practice mode still works.`
    : `💎 Finish ${speakSession.total} prompts to claim today's bonus!`;

  nextDailyPrompt();
}

//Daily Prompt and hear again:
function nextDailyPrompt(){
  try { repeatRecognition.abort(); } catch(e) {}
repeatIsListening = false;

  if(speakSession.index >= speakSession.queue.length){
    finishDailySpeaking();
    return;
  }

  speakSession.current = speakSession.queue[speakSession.index];
  const text = speakSession.current.word || "";

  document.getElementById("daily-prompt").innerText = text;
  document.getElementById("daily-feedback").innerText = "";
  document.getElementById("daily-counter").innerText =
    `Prompt ${speakSession.index + 1} / ${speakSession.total}  •  Correct: ${speakSession.correct}`;

  speak(text);
}

function dailyHearAgain(){
  if(speakSession.mode !== "daily") return;
  speak(speakSession.current?.word || "");
}

//
document.addEventListener("click", (e)=>{
  if(e.target && e.target.id === "daily-mic-btn"){
    triggerDailyMic();
  }
});

//

function triggerDailyMic(){
  if(!repeatRecognition){
    alert("Speech not supported. Use Chrome.");
    return;
  }

  const micBtn = document.getElementById("daily-mic-btn");

  // ✅ Guard: if currently listening, treat click as "stop"
  if (repeatIsListening) {
    try { repeatRecognition.stop(); } catch(e) {}
    return;
  }

  // ✅ Guard: prevent double-tap start spam
  const now = Date.now();
  if (now - repeatLastStartTs < 350) return;
  repeatLastStartTs = now;

  // ✅ Hard reset any leftover session (this is the big fix)
  try { repeatRecognition.abort(); } catch(e) {}

  repeatIsListening = true;

  // UI on
  if (micBtn) {
    micBtn.classList.add("mic-active");
    micBtn.textContent = "👂 Listening...";
  }

  function resetBtn(){
    if (micBtn) {
      micBtn.classList.remove("mic-active");
      micBtn.textContent = "🎤 Tap to Speak";
    }
  }

  // Set handlers BEFORE start (more reliable)
  repeatRecognition.onresult = (event)=>{
    repeatIsListening = false;
    resetBtn();

    const spokenRaw = (event.results?.[0]?.[0]?.transcript || "");
    const targetRaw = (speakSession.current?.word || "");

    const targetNorm = sbNormalizeSpeech(targetRaw);
    const spokenNorm = sbNormalizeSpeech(spokenRaw);

    const isSentence = targetNorm.includes(" ");
    let pass = false;
    let scorePct = 0;

    if(isSentence){
      const score = sbSentenceScore(spokenRaw, targetRaw);
      scorePct = Math.round(score * 100);
      pass = score >= 0.75;
    } else {
      scorePct = (spokenNorm === targetNorm) ? 100 : 0;
      pass = (spokenNorm.includes(targetNorm) || targetNorm.includes(spokenNorm)) && spokenNorm.length > 0;
    }

    if(pass){
      // ✅ stop any late callbacks from interfering
      try { repeatRecognition.abort(); } catch(e) {}

      speakSession.correct++;
      sbRecordAttempt?.(currentLesson.title, true);

      document.getElementById("daily-feedback").innerText = `✅ Nice! (${scorePct}%)`;
      speak("Great job!");

      speakSession.index++;
      setTimeout(nextDailyPrompt, 650);
    } else {
      sbRecordAttempt?.(currentLesson.title, false);
      document.getElementById("daily-feedback").innerText = `❌ Try again. (${scorePct}%)`;
      speak("Try again");
    }
  };

  repeatRecognition.onerror = ()=>{
    repeatIsListening = false;
    resetBtn();
  };

  repeatRecognition.onend = ()=>{
    // ✅ Always reset — this is where Chrome often leaves you "half-started"
    repeatIsListening = false;
    resetBtn();
  };

  try{
    repeatRecognition.start();
  }catch(e){
    // If Chrome still thinks it is started, force reset and recover
    repeatIsListening = false;
    resetBtn();
    try { repeatRecognition.abort(); } catch(_) {}
  }
}


    function finishDailySpeaking(){
    try { repeatRecognition.abort(); } catch(e) {}
repeatIsListening = false;

  const dateKey = sbDateKeyLocal();
  const dailyKey = speakSession.dailyKey;
  const saved = JSON.parse(localStorage.getItem(dailyKey) || "null");
  const alreadyDone = !!(saved && saved.completed);

  const total = speakSession.total || 1;
  const correct = speakSession.correct || 0;

  // base feedback
  speak(`Daily complete. You got ${correct} out of ${total}!`);

  // Claim bonus once/day
  if(!alreadyDone){
    // Bonus stars: scale with performance (max +5)
    const bonus = Math.max(1, Math.round(5 * (correct / total)));
    sbAwardStar?.(currentLesson.title, bonus);

    localStorage.setItem(dailyKey, JSON.stringify({
      completed: true,
      dateKey,
      correct,
      total,
      bonus
    }));

    sbToast?.(`💎 Daily bonus claimed! +${bonus} ⭐`);
  }else{
    sbToast?.("✅ Daily already claimed. Practice anytime!");
  }

  openLessonHub(currentLessonIndex);
}






/* =========================================================
   ✅ Storage manager
   ========================================================= */
async function openStorageManager(){
  await showPage("storage-page");
  await refreshStorageManager();
}
function sbCollectUsedImageIds(){
  const used = new Set();
  try{
    (lessons||[]).forEach(ls=>(ls.items||[]).forEach(it=>{
      const img = (it.image||"").toString().trim();
      if(img.startsWith("idb:")) used.add(img.slice(4));
    }));
  }catch(e){}
  return used;
}

async function refreshStorageManager(){
  const listEl = document.getElementById("storage-list");
  const sumEl = document.getElementById("storage-summary");
  if(!listEl || !sumEl) return;

  const all = await sbListImages();
  const used = sbCollectUsedImageIds();

  let total = 0;
  all.forEach(r=>{ total += (r.blob && r.blob.size) ? r.blob.size : 0; });

  sumEl.innerText = `Images stored: ${all.length} • Used by lessons: ${used.size} • Approx size: ${sbBytesToMB(total)} MB`;

  listEl.innerHTML = "";
  for(const rec of all){
    const id = rec.id;
    const blob = rec.blob;
    const url = blob ? URL.createObjectURL(blob) : "";

    const div = document.createElement("div");
    div.style.background = "#fff";
    div.style.border = "1px solid rgba(0,0,0,.08)";
    div.style.borderRadius = "16px";
    div.style.padding = "10px";
    div.style.textAlign = "left";

    div.innerHTML = `
      <div style="display:flex; gap:10px; align-items:center;">
        <div style="width:86px; height:86px; border-radius:14px; overflow:hidden; border:1px solid rgba(0,0,0,.08); display:flex; align-items:center; justify-content:center;">
          ${url ? `<img src="${url}" style="max-width:100%; max-height:100%;">` : ""}
        </div>
        <div style="flex:1;">
          <div style="font-weight:900;">${used.has(id) ? "✅ Used" : "🟡 Unused"}</div>
          <div style="font-size:12px; opacity:.8;">id: ${id}</div>
          <div style="font-size:12px; opacity:.8;">
            ${(rec.meta && rec.meta.name) ? rec.meta.name : ""} ${(rec.meta && rec.meta.type) ? "• "+rec.meta.type : ""}
            ${blob && blob.size ? "• " + sbBytesToMB(blob.size) + " MB" : ""}
          </div>
          <div style="margin-top:8px;">
            <button style="background:#e74c3c;" onclick="deleteOneImage('${id}')">Delete</button>
          </div>
        </div>
      </div>
    `;
    listEl.appendChild(div);

    if(url){
      const img = div.querySelector("img");
      img.onload = ()=>URL.revokeObjectURL(url);
    }
  }
}

async function deleteOneImage(id){
  if(!confirm("Delete this offline image?")) return;
  await sbDeleteImage(id);

  // remove references in lessons
  try{
    lessons.forEach(ls=>ls.items.forEach(it=>{
      if((it.image||"") === "idb:"+id) it.image = "";
    }));
    // persist updated lessons back to IndexedDB
    for(const ls of lessons){
      try{ await sbPutLesson(ls); }catch(e){}
    }
  }catch(e){}

  await refreshStorageManager();
}

async function deleteUnusedImages(){
  if(!confirm("Delete all UNUSED offline images?")) return;
  const all = await sbListImages();
  const used = sbCollectUsedImageIds();
  for(const rec of all){
    if(!used.has(rec.id)) await sbDeleteImage(rec.id);
  }
  await refreshStorageManager();
}

async function clearAllImages(){
  if(!confirm("Clear ALL offline images?")) return;
  const all = await sbListImages();
  for(const rec of all) await sbDeleteImage(rec.id);
  await refreshStorageManager();
}


/* =========================================================
   ⭐ Pro Gate (local-only)
   ========================================================= */
const SB_PRO_KEY = "sb_pro_v1";
function sbGetPro(){ try{ return JSON.parse(localStorage.getItem(SB_PRO_KEY) || "{}"); }catch(e){ return {}; } }
function sbIsPro(){ return !!sbGetPro().isPro; }
function sbSetPro(patch){
  const cur = sbGetPro();
  const next = { ...cur, ...patch };
  localStorage.setItem(SB_PRO_KEY, JSON.stringify(next));
  return next;
}
function sbProOpen(){
  const o = document.getElementById("sb-pro-overlay");
  if(!o){ console.warn("Pro overlay missing"); return; }
  o.classList.remove("hidden");
  o.style.display = "flex";
  o.setAttribute("aria-hidden","false");
}
function sbProClose(){
  const o = document.getElementById("sb-pro-overlay");
  if(!o) return;
  o.classList.add("hidden");
  o.style.display = "none";
  o.setAttribute("aria-hidden","true");
}
function sbRequirePro(onPass){
  if(sbIsPro()) return onPass && onPass();
  sbProOpen();
}
function sbStartUpgrade(){
  alert("Upgrade flow not wired yet. To test Pro now, enter any code with 8+ characters, then tap Unlock.");
}
function sbRedeemCode(){
  const inp = document.getElementById("sb-pro-code-input");
  const code = (inp?.value || "").trim();
  if(code.length < 8){ alert("Invalid code."); return; }
  sbSetPro({ isPro:true, since: Date.now(), source:"code" });
  sbProClose();
  alert("Pro unlocked on this device ⭐");
}
// close modal when clicking outside card
document.addEventListener("click", (e)=>{
  const o = document.getElementById("sb-pro-overlay");
  if(!o || o.classList.contains("hidden")) return;
  if(e.target === o) sbProClose();
});

/* =========================================================
   🚁 Sky Patrol (Pro)
   - Silkworm-inspired word shooter
   - offline / local only
   ========================================================= */
let runner = null;

// function runnerResetState(opts = {}){
//   const goalModeEl = document.getElementById("runner-goal-mode");
//   const timeEl = document.getElementById("runner-time-limit");
//   const goalEl = document.getElementById("runner-goal-score");
//   // const isRemote = !!opts.remote;
//     const chosenVehicle = sbMyVehicle();

//   // const isRemote = !!opts.remote;

//   // const goalMode = isRemote ? "score" : (goalModeEl?.value || "time");
//   // const timeLimit = parseInt(timeEl?.value || "60", 10);
//   // const goalScore = parseInt(goalEl?.value || "12", 10);

//   const isRemote = !!opts.remote;

// const goalMode = isRemote ? "time" : (goalModeEl?.value || "time");
// const timeLimit = isRemote ? 45 : parseInt(timeEl?.value || "60", 10);
// const goalScore = parseInt(goalEl?.value || "12", 10);

//   runner = {
//     running:false,
//     paused:false,
//     raf:0,
//     lastTs:0,

//     remote:isRemote,
//     seed: opts.seed || "",

//     lessonTitle: currentLesson?.title || "Lesson",

//     bgX:0,
//     cloudX:0,

//     score:0,
//     wrongHits:0,
//     maxWrongHits:3,
//     correctHits:0,

//     goalMode,
//     timeLimit,
//     timeLeft: timeLimit,
//     goalScore,

//     promptItem:null,
//     promptSpokenAt:0,

//     spawnTimer:0,
//     enemies:[],
//     projectiles:[],
//     explosions:[],

//     // heli: { x:170, y:120, emoji:"🚁", cooldown:0, flipX:true, label:"heli" },
//     // jeep: { x:175, y:430, emoji:"🚓", cooldown:0, flipX:true, label:"tank" },
//     playerVehicle: (() => {
//       // const v = sbVehicleConfig(sbMyVehicle());
//       // return {
//       //   x: 170,
//       //   y: v.y,
//       //   emoji: v.emoji,
//       //   cooldown: 0,
//       //   flipX: true,
//       //   label: v.label,
//       //   kind: v.kind,
//       //   baseCooldown: v.baseCooldown,
//       //   projectileSpeed: v.projectileSpeed
//       // };
//       return {
//       soloMode: !isRemote,
//       vehicleChoice: chosenVehicle,

//       heli: {
//         x: 170,
//         y: 120,
//         emoji: "🚁",
//         cooldown: 0,
//         flipX: true,
//         label: "heli",
//         kind: "heli",
//         baseCooldown: 0.16,
//         projectileSpeed: 720
//       },

//       tank: {
//         x: 175,
//         y: 430,
//         emoji: "🚓",
//         cooldown: 0,
//         flipX: true,
//         label: "tank",
//         kind: "tank",
//         baseCooldown: 0.24,
//         projectileSpeed: 660
//       },
//     };
//     })(),

//     enemySpeedBase: 120,
//     enemyCap: 7,
//     ended:false,
//   };
// }

function runnerResetState(opts = {}){
  const goalModeEl = document.getElementById("runner-goal-mode");
  const timeEl = document.getElementById("runner-time-limit");
  const goalEl = document.getElementById("runner-goal-score");

  const isRemote = !!opts.remote;
  const chosenVehicle = sbMyVehicle();

  const goalMode = isRemote ? "time" : (goalModeEl?.value || "time");
  const timeLimit = isRemote ? 45 : parseInt(timeEl?.value || "60", 10);
  const goalScore = parseInt(goalEl?.value || "12", 10);

  runner = {
    running:false,
    paused:false,
    raf:0,
    lastTs:0,

    remote:isRemote,
    soloMode: !isRemote,
    vehicleChoice: chosenVehicle,
    seed: opts.seed || "",

    lessonTitle: currentLesson?.title || "Lesson",

    bgX:0,
    cloudX:0,

    score:0,
    wrongHits:0,
    maxWrongHits:3,
    correctHits:0,

    goalMode,
    timeLimit,
    timeLeft: timeLimit,
    goalScore,

    promptItem:null,
    promptSpokenAt:0,

    spawnTimer:0,
    enemies:[],
    projectiles:[],
    explosions:[],

    // heli: {
    //   x: 170,
    //   y: 120,
    //   emoji: "🚁",
    //   cooldown: 0,
    //   flipX: true,
    //   label: "heli",
    //   kind: "heli",
    //   baseCooldown: 0.16,
    //   projectileSpeed: 720
    // },

heli: {
  x: 170,
  y: 120,
  cooldown: 0,
  flipX: false,
  label: "griffin",
  kind: "heli",
  baseCooldown: 0.16,
  projectileSpeed: 720,

  spriteRef: "../assets/griffinM.png", // change path if needed
  spriteImg: null,
  spriteReady: false,

  frameCount: 8,
  spriteCols: 4,
  spriteRows: 2,

  frameIndex: 0,
  frameTimer: 0,
  frameSpeed: 0.2,

  frameW: 0,
  frameH: 0,
  drawScale: 1,
},

tank: {
  x: 175,
  y: 430,
  cooldown: 0,
  flipX: false,
  label: "unicorn",
  kind: "tank",
  baseCooldown: 0.24,
  projectileSpeed: 660,

  spriteRef: "../assets/unicornM02.png", // change path if needed
  spriteImg: null,
  spriteReady: false,

  frameCount: 6,
  spriteCols: 3,
  spriteRows: 2,

  frameIndex: 0,
  frameTimer: 0,
  frameSpeed: 0.2,

  frameW: 0,
  frameH: 0,
  drawScale: 1.0
},

    // tank: {
    //   x: 175,
    //   y: 430,
    //   emoji: "🚓",
    //   cooldown: 0,
    //   flipX: true,
    //   label: "tank",
    //   kind: "tank",
    //   baseCooldown: 0.24,
    //   projectileSpeed: 660
    // },

    enemySpeedBase: 120,
    enemyCap: 7,
    ended:false,
  };
}

async function runnerLoadSprites(){
  if(!runner) return;

  const units = [runner.heli, runner.tank];

  for(const u of units){
    if(!u?.spriteRef) continue;

    try{
      const src = (typeof sbResolveImageSrc === "function")
        ? await sbResolveImageSrc(u.spriteRef)
        : u.spriteRef;

      if(!src) continue;

      const img = new Image();

      img.onload = () => {
        if(!runner) return;

        u.spriteImg = img;
        u.spriteReady = true;

        const cols = Math.max(1, u.spriteCols || 1);
        const rows = Math.max(1, u.spriteRows || 1);

        u.frameW = img.width / cols;
        u.frameH = img.height / rows;
      };

      img.onerror = () => {
        console.warn("Runner sprite failed to load:", u.spriteRef);
      };

      img.src = src;
    }catch(err){
      console.warn("Runner sprite load error:", u.spriteRef, err);
    }
  }
}

function startRunner(opts = {}){
  const launch = () => {
    gameMode = "runner";
    showPage("runner-page");
    runnerStart(opts);
  };

  if(opts && opts.remote){
    launch();
    return;
  }

  sbRequirePro(launch);
}

function runnerStart(opts = {}){
  if(!currentLesson || !Array.isArray(currentLesson.items) || !currentLesson.items.length){
    sbToast("No lesson loaded");
    return;
  }

  runnerStop();
  runnerResetState(opts);
  runnerLoadSprites();

  const canvas = document.getElementById("runner-canvas");
  if(!canvas) return;

  if(!canvas.__runnerBound){
    canvas.__runnerBound = true;
    canvas.addEventListener("pointerdown", (e)=>{
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      runnerHandleTap(x, y);
    });
  }

  runner.running = true;
  runner.paused = false;
  runnerPickNextPrompt(true);
  runner.lastTs = performance.now();

  const ctx = canvas.getContext("2d");

  function loop(ts){
    if(!runner || !runner.running) return;
    runner.raf = requestAnimationFrame(loop);

    if(runner.paused){
      runner.lastTs = ts;
      runnerDraw(ctx);
      return;
    }

    const dt = Math.min(0.033, (ts - runner.lastTs) / 1000 || 0.016);
    runner.lastTs = ts;

    runnerUpdate(dt);
    runnerDraw(ctx);
  }

  runner.raf = requestAnimationFrame(loop);
  runnerUpdateHud();
}

function runnerStop(){
  if(runner?.raf) cancelAnimationFrame(runner.raf);
  if(runner) runner.running = false;
}

function runnerTogglePause(){
  if(!runner || runner.ended) return;
  runner.paused = !runner.paused;
  runnerUpdateHud();
}

// function runnerSharedMakePlayer(team){
//   const isBlue = team === "blue";
//   const vehicle = (team === SB_NET.team) ? sbMyVehicle() : (team === "red" ? "heli" : "tank");

//   return {
//     team,
//     vehicle,
//     x: isBlue ? 250 : 170,
//     y: isBlue ? 420 : 140,
//     speed: 300,
//     cooldown: 0,
//     flipX: false,
//     frameIndex: 0,
//     frameTimer: 0,
//     frameSpeed: 0.12
//   };
// }

function runnerSharedMakePlayer(team){
  const isBlue = team === "blue";
  return {
    team,
    vehicle: team === "blue" ? "tank" : "heli",
    x: 150,
    y: isBlue ? 470 : 150,
    pulse: 0
  };
}

// function startRunnerSharedVs(){
//   gameMode = "runner";
//   showPage("runner-page");

//   SB_RUNNER_SHARED.active = true;
//   SB_RUNNER_SHARED.role = SB_NET.role;
//   SB_RUNNER_SHARED.roomId = SB_NET.roomId;
//   SB_RUNNER_SHARED.status = "countdown";
//   SB_RUNNER_SHARED.roundId = sbMakeRoundId();
//   SB_RUNNER_SHARED.seed = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
//   SB_RUNNER_SHARED.timeLeft = 60;
//   SB_RUNNER_SHARED.score = { red: 0, blue: 0 };
//   SB_RUNNER_SHARED.enemies = [];
//   SB_RUNNER_SHARED.projectiles = [];
//   SB_RUNNER_SHARED.players.red = runnerSharedMakePlayer("red");
//   SB_RUNNER_SHARED.players.blue = runnerSharedMakePlayer("blue");

//   runnerStop();
//   runnerResetState({ remote:true, seed:SB_RUNNER_SHARED.seed });
//   runnerLoadSprites();
//   runnerBindSharedControls();

//   const statusEl = document.getElementById("runner-shared-status");
//   if(statusEl){
//     statusEl.textContent = "Shared VS mode";
//   }

//   if(SB_NET.role === "host"){
//     globalSend({
//       type: "runner_shared_open",
//       roomId: SB_NET.roomId,
//       roundId: SB_RUNNER_SHARED.roundId,
//       seed: SB_RUNNER_SHARED.seed
//     });
//     runnerSharedHostLoopStart();
//   } else {
//     runnerSharedDrawLoopStart();
//   }

//   runnerSharedUpdateHud();
// }

function startRunnerSharedVs(){
  gameMode = "runner";
  showPage("runner-page");

  SB_RUNNER_SHARED.active = true;
  SB_RUNNER_SHARED.role = SB_NET.role;
  SB_RUNNER_SHARED.roomId = SB_NET.roomId;
  SB_RUNNER_SHARED.status = "countdown";
  SB_RUNNER_SHARED.roundId = sbMakeRoundId();
  SB_RUNNER_SHARED.seed = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  SB_RUNNER_SHARED.timeLeft = 60;
  SB_RUNNER_SHARED.score = { red: 0, blue: 0 };
  SB_RUNNER_SHARED.promptWord = "";
  SB_RUNNER_SHARED.enemies = [];
  SB_RUNNER_SHARED.projectiles = [];
  SB_RUNNER_SHARED.players.red = runnerSharedMakePlayer("red");
  SB_RUNNER_SHARED.players.blue = runnerSharedMakePlayer("blue");

  runnerStop();
  runnerResetState({ remote:true, seed:SB_RUNNER_SHARED.seed });
  runnerLoadSprites();
  runnerBindSharedTap();

  const statusEl = document.getElementById("runner-shared-status");
  if(statusEl){
    statusEl.textContent = "Tap the correct word before your opponent";
  }

  const speedWrap = document.getElementById("runner-host-controls");
const speedSel = document.getElementById("runner-speed-select");

if(speedWrap){
  speedWrap.style.display = (SB_NET.role === "host") ? "block" : "none";
}

if(speedSel){
  speedSel.value = "1";
  if(SB_NET.role === "host"){
    speedSel.onchange = () => {
      runnerSharedApplySpeedFromUi();
      runnerSharedBroadcastState();
    };
    runnerSharedApplySpeedFromUi();
  }
}

  if(SB_NET.role === "host"){
    globalSend({
      type: "runner_shared_open",
      roomId: SB_NET.roomId,
      roundId: SB_RUNNER_SHARED.roundId,
      seed: SB_RUNNER_SHARED.seed
    });
    runnerSharedHostLoopStart();
  } else {
    runnerSharedDrawLoopStart();
  }

  runnerSharedUpdateHud();
}

// function runnerSharedSpawnProjectile(team, fromX, fromY, toX, toY){
//   if(!SB_RUNNER_SHARED?.active) return;

//   const dx = toX - fromX;
//   const dy = toY - fromY;
//   const dist = Math.max(1, Math.hypot(dx, dy));

//   const speed = 880; // visual only, can be fast
//   const life = Math.max(0.18, Math.min(0.45, dist / speed));

//   SB_RUNNER_SHARED.projectiles.push({
//     id: `rsp-${Date.now()}-${Math.random().toString(16).slice(2,7)}`,
//     team,
//     x: fromX,
//     y: fromY,
//     vx: dx / life,
//     vy: dy / life,
//     life,
//     maxLife: life
//   });
// }

function runnerSharedSpawnProjectile(team, fromX, fromY, target){
  if(!SB_RUNNER_SHARED?.active || !target) return null;

  const dx = target.x - fromX;
  const dy = target.y - fromY;
  const dist = Math.max(1, Math.hypot(dx, dy));

  const speed = 900;
  const life = Math.max(0.16, Math.min(0.5, dist / speed));

  const proj = {
    id: `rsp-${Date.now()}-${Math.random().toString(16).slice(2,7)}`,
    team,
    x: fromX,
    y: fromY,
    vx: dx / life,
    vy: dy / life,
    life,
    maxLife: life,
    targetId: target.id
  };

  SB_RUNNER_SHARED.projectiles.push(proj);
  return proj;
}

function runnerBindSharedControls(){
  const setInput = (key, pressed) => {
    if(!SB_RUNNER_SHARED.active) return;
    SB_RUNNER_SHARED.input[key] = !!pressed;

    if(SB_NET.connected){
      globalSend({
        type: "runner_shared_input",
        roomId: SB_NET.roomId,
        roundId: SB_RUNNER_SHARED.roundId,
        input: { [key]: !!pressed }
      });
    }
  };

  const bindHold = (id, key) => {
    const el = document.getElementById(id);
    if(!el || el.dataset.runnerSharedBound === "1") return;
    el.dataset.runnerSharedBound = "1";

    const onDown = (e) => {
      try{ e.preventDefault(); }catch(_){}
      setInput(key, true);
    };

    const onUp = (e) => {
      try{ e.preventDefault(); }catch(_){}
      setInput(key, false);
    };

    el.addEventListener("pointerdown", onDown, { passive:false });
    el.addEventListener("pointerup", onUp, { passive:false });
    el.addEventListener("pointercancel", onUp, { passive:false });
    el.addEventListener("pointerleave", onUp, { passive:false });
  };

  bindHold("runner-up-btn", "up");
  bindHold("runner-down-btn", "down");
  bindHold("runner-left-btn", "left");
  bindHold("runner-right-btn", "right");

  const fireBtn = document.getElementById("runner-fire-btn");
  if(fireBtn && fireBtn.dataset.runnerSharedBound !== "1"){
    fireBtn.dataset.runnerSharedBound = "1";
    fireBtn.addEventListener("click", () => {
      runnerSharedFire(SB_NET.team);
      if(SB_NET.connected){
        globalSend({
          type: "runner_shared_fire",
          roomId: SB_NET.roomId,
          roundId: SB_RUNNER_SHARED.roundId
        });
      }
    });
  }
}

// function runnerSharedPickPromptWord(){
//   if(!currentLesson?.items?.length) return "";
//   const item = currentLesson.items[Math.floor(Math.random() * currentLesson.items.length)];
//   SB_RUNNER_SHARED.promptWord = item?.word || "";
//   const el = document.getElementById("runner-prompt");
//   if(el){
//     el.innerHTML = `🎯 Shoot: <span style="color:var(--accent);">${SB_RUNNER_SHARED.promptWord}</span>`;
//   }
//   if(SB_NET.role === "host" && SB_RUNNER_SHARED.promptWord){
//     speak(SB_RUNNER_SHARED.promptWord);
//   }
// }

function runnerSharedPickPromptWord(){
  if(!currentLesson?.items?.length) return "";
  const item = currentLesson.items[Math.floor(Math.random() * currentLesson.items.length)];
  SB_RUNNER_SHARED.promptWord = item?.word || "";

  const el = document.getElementById("runner-prompt");
  if(el){
    el.innerHTML = `🎯 Tap: <span style="color:var(--accent);">${SB_RUNNER_SHARED.promptWord}</span>`;
  }

  if(SB_RUNNER_SHARED.promptWord){
    speak(SB_RUNNER_SHARED.promptWord);
  }

  return SB_RUNNER_SHARED.promptWord;
}

// function runnerSharedSpawnEnemy(){
//   if(!currentLesson?.items?.length) return;
//   if((SB_RUNNER_SHARED.enemies?.length || 0) >= 6) return;

//   const items = currentLesson.items;
//   const isCorrect = Math.random() < 0.34;

//   let item;
//   if(isCorrect && SB_RUNNER_SHARED.promptWord){
//     item = items.find(it => (it.word || "") === SB_RUNNER_SHARED.promptWord) || items[0];
//   } else {
//     const pool = items.filter(it => (it.word || "") !== SB_RUNNER_SHARED.promptWord);
//     item = pool.length ? pool[Math.floor(Math.random() * pool.length)] : items[0];
//   }

//   const lane = Math.random() < 0.5 ? "air" : "ground";
//   const yBase = lane === "air" ? (110 + Math.random() * 120) : (365 + Math.random() * 120);

//   SB_RUNNER_SHARED.enemies.push({
//     id: `rse-${Date.now()}-${Math.random().toString(16).slice(2,7)}`,
//     word: item?.word || "",
//     isCorrect: (item?.word || "") === SB_RUNNER_SHARED.promptWord,
//     x: 1240,
//     y: yBase,
//     lane,
//     speed: 95 + Math.random() * 35,
//     hit:false,
//     hitTeam:""
//   });
// }

// function runnerSharedSpawnEnemy(){
//   if(!currentLesson?.items?.length) return;
//   if((SB_RUNNER_SHARED.enemies?.length || 0) >= 7) return;

//   const items = currentLesson.items;
//   const isCorrect = Math.random() < 0.34;

//   let item;
//   if(isCorrect && SB_RUNNER_SHARED.promptWord){
//     item = items.find(it => (it.word || "") === SB_RUNNER_SHARED.promptWord) || items[0];
//   } else {
//     const pool = items.filter(it => (it.word || "") !== SB_RUNNER_SHARED.promptWord);
//     item = pool.length ? pool[Math.floor(Math.random() * pool.length)] : items[0];
//   }

//   const lane = Math.random() < 0.5 ? "air" : "ground";
//   const yBase = lane === "air" ? (90 + Math.random() * 120) : (335 + Math.random() * 120);

//   SB_RUNNER_SHARED.enemies.push({
//     id: `rse-${Date.now()}-${Math.random().toString(16).slice(2,7)}`,
//     word: item?.word || "",
//     isCorrect: (item?.word || "") === SB_RUNNER_SHARED.promptWord,
//     x: 1240,
//     y: yBase,
//     lane,
//     speed: 110 + Math.random() * 45,
//     hit:false
//   });
// }

function runnerSharedSpawnEnemy(){
  if(!currentLesson?.items?.length) return;
  if((SB_RUNNER_SHARED.enemies?.length || 0) >= 6) return;

  const items = currentLesson.items;
  const isCorrect = Math.random() < 0.34;

  let item;
  if(isCorrect && SB_RUNNER_SHARED.promptWord){
    item = items.find(it => (it.word || "") === SB_RUNNER_SHARED.promptWord) || items[0];
  } else {
    const pool = items.filter(it => (it.word || "") !== SB_RUNNER_SHARED.promptWord);
    item = pool.length ? pool[Math.floor(Math.random() * pool.length)] : items[0];
  }

  const lane = Math.random() < 0.5 ? "air" : "ground";
  const yBase = lane === "air" ? (110 + Math.random() * 120) : (365 + Math.random() * 120);

  SB_RUNNER_SHARED.enemies.push({
    id: `rse-${Date.now()}-${Math.random().toString(16).slice(2,7)}`,
    word: item?.word || "",
    isCorrect: (item?.word || "") === SB_RUNNER_SHARED.promptWord,
    x: 1240,
    y: yBase,
    lane,
    // speed: 95 + Math.random() * 35,
    speed: (95 + Math.random() * 35) * (SB_RUNNER_SHARED.speedMul || 1),
    hit:false,
    hitTeam:""
  });
}

function runnerSharedFindEnemyAt(x, y){
  for(let i = SB_RUNNER_SHARED.enemies.length - 1; i >= 0; i--){
    const e = SB_RUNNER_SHARED.enemies[i];
    if(e.hit) continue;

    const w = runnerMeasureEnemyWidth(e.word);
    const h = 48;

    if(
      x >= e.x - w / 2 &&
      x <= e.x + w / 2 &&
      y >= e.y - h / 2 &&
      y <= e.y + h / 2
    ){
      return e;
    }
  }
  return null;
}

function runnerBindSharedTap(){
  const canvas = document.getElementById("runner-canvas");
  if(!canvas || canvas.dataset.runnerSharedTapBound === "1") return;
  canvas.dataset.runnerSharedTapBound = "1";

  canvas.addEventListener("pointerdown", (ev) => {
    if(!SB_RUNNER_SHARED.active || SB_RUNNER_SHARED.status !== "live") return;

    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const y = (ev.clientY - rect.top) * (canvas.height / rect.height);

    const enemy = runnerSharedFindEnemyAt(x, y);
    if(!enemy) return;

    if(SB_NET.connected){
      globalSend({
        type: "runner_shared_pick",
        roomId: SB_NET.roomId,
        roundId: SB_RUNNER_SHARED.roundId,
        enemyId: enemy.id
      });
    }
  });
}

function runnerSharedFire(team){
  const p = SB_RUNNER_SHARED.players[team];
  if(!p) return;
  if(p.cooldown > 0) return;

  p.cooldown = 0.18;

  SB_RUNNER_SHARED.projectiles.push({
    id: `rsp-${Date.now()}-${Math.random().toString(16).slice(2,7)}`,
    team,
    x: p.x + 36,
    y: p.y,
    vx: 600
  });
}

function runnerSharedApplyInput(player, input, dt){
  if(!player || !input) return;

  if(input.up) player.y -= player.speed * dt;
  if(input.down) player.y += player.speed * dt;
  if(input.left){
    player.x -= player.speed * dt;
    player.flipX = true;
  }
  if(input.right){
    player.x += player.speed * dt;
    player.flipX = false;
  }

  player.x = Math.max(80, Math.min(460, player.x));
  player.y = Math.max(70, Math.min(570, player.y));
}

// function runnerSharedHostLoopStart(){
//   SB_RUNNER_SHARED.status = "live";
//   runnerSharedPickPromptWord();

//   let spawnTimer = 0;
//   let lastTs = performance.now();

//   const canvas = document.getElementById("runner-canvas");
//   const ctx = canvas?.getContext("2d");

//   function tick(ts){
//     if(!SB_RUNNER_SHARED.active || SB_NET.role !== "host") return;

//     const dt = Math.min(0.033, (ts - lastTs) / 1000 || 0.016);
//     lastTs = ts;

//     SB_RUNNER_SHARED.timeLeft = Math.max(0, SB_RUNNER_SHARED.timeLeft - dt);

//     const myPlayer = SB_RUNNER_SHARED.players[SB_NET.team];
//     runnerSharedApplyInput(myPlayer, SB_RUNNER_SHARED.input, dt);

//     const otherTeam = SB_NET.team === "red" ? "blue" : "red";
//     const remoteInput = SB_RUNNER_SHARED.players[otherTeam]?.pendingInput || {};
//     runnerSharedApplyInput(SB_RUNNER_SHARED.players[otherTeam], remoteInput, dt);

//     for(const t of ["red", "blue"]){
//       const p = SB_RUNNER_SHARED.players[t];
//       if(p) p.cooldown = Math.max(0, p.cooldown - dt);
//     }

//     spawnTimer += dt;
//     if(spawnTimer >= 1.0){
//       spawnTimer = 0;
//       runnerSharedSpawnEnemy();
//     }

//     for(const e of SB_RUNNER_SHARED.enemies){
//       e.x -= e.speed * dt;
//     }

//     for(const p of SB_RUNNER_SHARED.projectiles){
//       p.x += p.vx * dt;
//     }

//     for(const proj of SB_RUNNER_SHARED.projectiles){
//       for(const enemy of SB_RUNNER_SHARED.enemies){
//         if(enemy.hit) continue;
//         const w = runnerMeasureEnemyWidth(enemy.word);
//         const h = 48;
//         if(
//           proj.x >= enemy.x - w/2 &&
//           proj.x <= enemy.x + w/2 &&
//           proj.y >= enemy.y - h/2 &&
//           proj.y <= enemy.y + h/2
//         ){
//           enemy.hit = true;
//           proj.x = 99999;

//           if(enemy.isCorrect){
//             SB_RUNNER_SHARED.score[proj.team] += 1;
//             runnerSharedPickPromptWord();
//           } else {
//             SB_RUNNER_SHARED.score[proj.team] = Math.max(0, SB_RUNNER_SHARED.score[proj.team] - 1);
//           }
//         }
//       }
//     }

//     SB_RUNNER_SHARED.enemies = SB_RUNNER_SHARED.enemies.filter(e => !e.hit && e.x > -160);
//     SB_RUNNER_SHARED.projectiles = SB_RUNNER_SHARED.projectiles.filter(p => p.x < 1400);

//     runnerSharedBroadcastState();

//     if(ctx){
//       runnerSharedDraw(ctx);
//     }

//     runnerSharedUpdateHud();

//     if(SB_RUNNER_SHARED.timeLeft <= 0){
//       runnerSharedEnd();
//       return;
//     }

//     SB_RUNNER_SHARED.raf = requestAnimationFrame(tick);
//   }

//   SB_RUNNER_SHARED.raf = requestAnimationFrame(tick);
// }

function runnerSharedHostLoopStart(){
  SB_RUNNER_SHARED.status = "live";
  runnerSharedPickPromptWord();

  let spawnTimer = 0;
  let netStateTimer = 0;
  let lastTs = performance.now();

  const canvas = document.getElementById("runner-canvas");
  const ctx = canvas?.getContext("2d");

  function tick(ts){
    if(!SB_RUNNER_SHARED.active || SB_NET.role !== "host") return;

    const dt = Math.min(0.033, (ts - lastTs) / 1000 || 0.016);
    lastTs = ts;

    SB_RUNNER_SHARED.timeLeft = Math.max(0, SB_RUNNER_SHARED.timeLeft - dt);

    spawnTimer += dt;
    // if(spawnTimer >= 1.0){
    //   spawnTimer = 0;
    //   runnerSharedSpawnEnemy();
    // }

    const spawnGap = 1.0 * (SB_RUNNER_SHARED.spawnMul || 1);

if(spawnTimer >= spawnGap){
  spawnTimer = 0;
  runnerSharedSpawnEnemy();
}

for(const e of SB_RUNNER_SHARED.enemies){
  e.x -= e.speed * dt;
}

for(const p of SB_RUNNER_SHARED.projectiles){
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.life -= dt;
}

for(const p of SB_RUNNER_SHARED.projectiles){
  if(p.life > 0) continue;

  const enemy = SB_RUNNER_SHARED.enemies.find(e => e.id === p.targetId && !e.hit);
  if(enemy){
    enemy.hit = true;
    enemy.hitTeam = p.team || "";
    enemy.pendingHit = false;

    SB_RUNNER_SHARED.explosions.push({
      x: enemy.x,
      y: enemy.y,
      life: 0.35,
      maxLife: 0.35,
      text: enemy.isCorrect ? "✅" : "💥"
    });

    if(enemy.isCorrect){
      SB_RUNNER_SHARED.score[p.team] = (SB_RUNNER_SHARED.score[p.team] || 0) + 1;
      runnerSharedPickPromptWord();
    } else {
      SB_RUNNER_SHARED.score[p.team] = Math.max(0, (SB_RUNNER_SHARED.score[p.team] || 0) - 1);
    }
  }
}

for(const ex of SB_RUNNER_SHARED.explosions){
  ex.life -= dt;
}

SB_RUNNER_SHARED.projectiles = SB_RUNNER_SHARED.projectiles.filter(p => p.life > 0);
SB_RUNNER_SHARED.explosions = SB_RUNNER_SHARED.explosions.filter(ex => ex.life > 0);

for(const e of SB_RUNNER_SHARED.enemies){
  if(e.hit) continue;
  if(e.x < -160){
    if(e.pendingHit) continue;

    e.hit = true;
    if(e.isCorrect){
      runnerSharedPickPromptWord();
    }
  }
}

SB_RUNNER_SHARED.enemies = SB_RUNNER_SHARED.enemies.filter(e => !e.hit && e.x > -180);

//     for(const e of SB_RUNNER_SHARED.enemies){
//       e.x -= e.speed * dt;
//     }

// for(const p of SB_RUNNER_SHARED.projectiles){
//   p.x += p.vx * dt;
//   p.y += p.vy * dt;
//   p.life -= dt;
// }

// for(const p of SB_RUNNER_SHARED.projectiles){
//   if(p.life > 0) continue;

//   const enemy = SB_RUNNER_SHARED.enemies.find(e => e.id === p.targetId && !e.hit);
//   if(enemy){
//     enemy.hit = true;
//     enemy.hitTeam = p.team || "";
//     enemy.pendingHit = false;

//     if(enemy.isCorrect){
//       SB_RUNNER_SHARED.score[p.team] = (SB_RUNNER_SHARED.score[p.team] || 0) + 1;
//       runnerSharedPickPromptWord();
//     } else {
//       SB_RUNNER_SHARED.score[p.team] = Math.max(0, (SB_RUNNER_SHARED.score[p.team] || 0) - 1);
//     }
//   }
// }

// SB_RUNNER_SHARED.projectiles = SB_RUNNER_SHARED.projectiles.filter(p => p.life > 0);

//     // for(const e of SB_RUNNER_SHARED.enemies){
//     //   if(e.hit) continue;
//     //   if(e.x < -160){
//     //     e.hit = true;
//     //     if(e.isCorrect){
//     //       runnerSharedPickPromptWord();
//     //     }
//     //   }
//     // }

//     for(const e of SB_RUNNER_SHARED.enemies){
//   if(e.hit) continue;
//   if(e.x < -160){
//     // If already reserved by an incoming projectile, let the projectile finish.
//     if(e.pendingHit) continue;

//     e.hit = true;
//     if(e.isCorrect){
//       runnerSharedPickPromptWord();
//     }
//   }
// }

//     SB_RUNNER_SHARED.enemies = SB_RUNNER_SHARED.enemies.filter(e => !e.hit && e.x > -180);
//     // SB_RUNNER_SHARED.enemies = SB_RUNNER_SHARED.enemies.filter(e => !e.hit && e.x > -180);

    netStateTimer += dt;
    if(netStateTimer >= 0.08){
      netStateTimer = 0;
      runnerSharedBroadcastState();
    }

    if(ctx){
      runnerSharedDraw(ctx);
    }

    runnerSharedUpdateHud();

    if(SB_RUNNER_SHARED.timeLeft <= 0){
      runnerSharedEnd();
      return;
    }

    SB_RUNNER_SHARED.raf = requestAnimationFrame(tick);
  }

  SB_RUNNER_SHARED.raf = requestAnimationFrame(tick);
}

// function runnerSharedResolvePick(team, enemyId){
//   if(!SB_RUNNER_SHARED.active || SB_NET.role !== "host") return;

//   // const enemy = SB_RUNNER_SHARED.enemies.find(e => e.id === enemyId && !e.hit);
//   // if(!enemy) return;

//   // enemy.hit = true;
//   // enemy.hitTeam = team || "";

//   const enemy = SB_RUNNER_SHARED.enemies.find(e => e.id === enemyId && !e.hit);
// if(!enemy) return;

// const player = SB_RUNNER_SHARED.players[team];
// if(player){
//   const shotFromX = player.x + 30;
//   const shotFromY = player.y - 10;
//   runnerSharedSpawnProjectile(team, shotFromX, shotFromY, enemy.x, enemy.y);
// }

// enemy.hit = true;
// SB_RUNNER_SHARED.projectiles.push({
//   id: `rsp-hit-${Date.now()}-${Math.random().toString(16).slice(2,7)}`,
//   team,
//   x: enemy.x,
//   y: enemy.y,
//   vx: 0,
//   vy: 0,
//   life: 0.12,
//   maxLife: 0.12,
//   burst: true
// });

// enemy.hitTeam = team || "";

//   if(enemy.isCorrect){
//     SB_RUNNER_SHARED.score[team] = (SB_RUNNER_SHARED.score[team] || 0) + 1;
//     runnerSharedPickPromptWord();
//   } else {
//     SB_RUNNER_SHARED.score[team] = Math.max(0, (SB_RUNNER_SHARED.score[team] || 0) - 1);
//   }

//   runnerSharedBroadcastState();
// }

function runnerSharedResolvePick(team, enemyId){
  if(!SB_RUNNER_SHARED.active || SB_NET.role !== "host") return;

  const enemy = SB_RUNNER_SHARED.enemies.find(e => e.id === enemyId && !e.hit && !e.pendingHit);
  if(!enemy) return;

  const player = SB_RUNNER_SHARED.players[team];
  if(!player) return;

  const shotFromX = player.x + 30;
  const shotFromY = player.y - 10;

  const dx = enemy.x - shotFromX;
  const dy = enemy.y - shotFromY;
  const dist = Math.max(1, Math.hypot(dx, dy));

  const speed = 900;
  const life = Math.max(0.16, Math.min(0.5, dist / speed));

  SB_RUNNER_SHARED.projectiles.push({
    id: `rsp-${Date.now()}-${Math.random().toString(16).slice(2,7)}`,
    team,
    x: shotFromX,
    y: shotFromY,
    vx: dx / life,
    vy: dy / life,
    life,
    maxLife: life,
    targetId: enemy.id
  });

  enemy.pendingHit = true;
  enemy.pendingTeam = team || "";

  runnerSharedBroadcastState();
}
function runnerSharedDrawLoopStart(){
  const canvas = document.getElementById("runner-canvas");
  const ctx = canvas?.getContext("2d");
  if(!ctx) return;

  function loop(){
    if(!SB_RUNNER_SHARED.active || SB_NET.role === "host") return;
    runnerSharedDraw(ctx);
    runnerSharedUpdateHud();
    SB_RUNNER_SHARED.clientRaf = requestAnimationFrame(loop);
  }

  SB_RUNNER_SHARED.clientRaf = requestAnimationFrame(loop);
}

function runnerSharedDrawPlayer(ctx, team, player){
  if(!player || !runner) return;

  const unit = player.vehicle === "tank" ? runner.tank : runner.heli;
  if(!unit) return;

  ctx.save();
  ctx.translate(player.x, player.y);

  unit.frameTimer += 0.016;
  if(unit.frameTimer >= unit.frameSpeed){
    unit.frameTimer = 0;
    unit.frameIndex = (unit.frameIndex + 1) % Math.max(1, unit.frameCount || 1);
  }

  if(unit.spriteReady && unit.spriteImg && unit.frameW > 0 && unit.frameH > 0){
    const sx = (unit.frameIndex % unit.spriteCols) * unit.frameW;
    const sy = Math.floor(unit.frameIndex / unit.spriteCols) * unit.frameH;
    const dw = unit.frameW * (unit.drawScale || 1);
    const dh = unit.frameH * (unit.drawScale || 1);

    ctx.drawImage(
      unit.spriteImg,
      sx, sy, unit.frameW, unit.frameH,
      -dw/2, -dh/2, dw, dh
    );
  } else {
    ctx.font = "46px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(player.vehicle === "tank" ? "🦄" : "🪽", 0, 0);
  }

  ctx.restore();
}

function runnerSharedDraw(ctx){
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.clearRect(0, 0, w, h);

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#081225");
  g.addColorStop(0.55, "#12305f");
  g.addColorStop(1, "#182b52");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  runnerSharedDrawPlayer(ctx, "red", SB_RUNNER_SHARED.players.red);
  runnerSharedDrawPlayer(ctx, "blue", SB_RUNNER_SHARED.players.blue);

//   for(const p of SB_RUNNER_SHARED.projectiles){
//      if(p.burst){
//     const alpha = Math.max(0, Math.min(1, (p.life || 0) / Math.max(0.001, p.maxLife || 1)));
//     ctx.save();
//     ctx.globalAlpha = alpha;
//     ctx.font = "30px system-ui";
//     ctx.textAlign = "center";
//     ctx.textBaseline = "middle";
//     ctx.fillText("✨", p.x, p.y);
//     ctx.restore();
//     continue;
//   }
//   const isRed = p.team === "red";
//   const alpha = Math.max(0, Math.min(1, (p.life || 0) / Math.max(0.001, p.maxLife || 1)));

//   ctx.save();
//   ctx.globalAlpha = alpha;

//   // trail
//   ctx.strokeStyle = isRed ? "rgba(255,170,80,.45)" : "rgba(120,220,255,.45)";
//   ctx.lineWidth = 8;
//   ctx.lineCap = "round";
//   ctx.beginPath();
//   ctx.moveTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
//   ctx.lineTo(p.x, p.y);
//   ctx.stroke();

//   // glow
//   const glow = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 18);
//   glow.addColorStop(0, isRed ? "rgba(255,245,180,1)" : "rgba(220,245,255,1)");
//   glow.addColorStop(0.45, isRed ? "rgba(255,140,60,.95)" : "rgba(90,200,255,.95)");
//   glow.addColorStop(1, "rgba(255,255,255,0)");

//   ctx.fillStyle = glow;
//   ctx.beginPath();
//   ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
//   ctx.fill();

//   // core
//   ctx.fillStyle = isRed ? "#ff8a3d" : "#4fc3ff";
//   ctx.beginPath();
//   ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
//   ctx.fill();

//   // center
//   ctx.fillStyle = "#fff7d6";
//   ctx.beginPath();
//   ctx.arc(p.x + 1, p.y - 1, 3, 0, Math.PI * 2);
//   ctx.fill();

//   ctx.restore();
// }

// for(const p of SB_RUNNER_SHARED.projectiles){
//   const isRed = p.team === "red";
//   const alpha = Math.max(0, Math.min(1, (p.life || 0) / Math.max(0.001, p.maxLife || 1)));

//   ctx.save();
//   ctx.globalAlpha = alpha;

//   // trail
//   ctx.strokeStyle = isRed ? "rgba(255,170,80,.45)" : "rgba(120,220,255,.45)";
//   ctx.lineWidth = 8;
//   ctx.lineCap = "round";
//   ctx.beginPath();
//   ctx.moveTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
//   ctx.lineTo(p.x, p.y);
//   ctx.stroke();

//   // glow
//   const glow = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 18);
//   glow.addColorStop(0, isRed ? "rgba(255,245,180,1)" : "rgba(220,245,255,1)");
//   glow.addColorStop(0.45, isRed ? "rgba(255,140,60,.95)" : "rgba(90,200,255,.95)");
//   glow.addColorStop(1, "rgba(255,255,255,0)");

//   ctx.fillStyle = glow;
//   ctx.beginPath();
//   ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
//   ctx.fill();

//   // core
//   ctx.fillStyle = isRed ? "#ff8a3d" : "#4fc3ff";
//   ctx.beginPath();
//   ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
//   ctx.fill();

//   // center
//   ctx.fillStyle = "#fff7d6";
//   ctx.beginPath();
//   ctx.arc(p.x + 1, p.y - 1, 3, 0, Math.PI * 2);
//   ctx.fill();

//   ctx.restore();
// }

for(const p of SB_RUNNER_SHARED.projectiles){
  const isRed = p.team === "red";
  const alpha = Math.max(0, Math.min(1, (p.life || 0) / Math.max(0.001, p.maxLife || 1)));

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.strokeStyle = isRed ? "rgba(255,170,80,.45)" : "rgba(120,220,255,.45)";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();

  const glow = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 18);
  glow.addColorStop(0, isRed ? "rgba(255,245,180,1)" : "rgba(220,245,255,1)");
  glow.addColorStop(0.45, isRed ? "rgba(255,140,60,.95)" : "rgba(90,200,255,.95)");
  glow.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isRed ? "#ff8a3d" : "#4fc3ff";
  ctx.beginPath();
  ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff7d6";
  ctx.beginPath();
  ctx.arc(p.x + 1, p.y - 1, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

  for(const e of SB_RUNNER_SHARED.enemies){
    if(e.hit) continue;

    const boxW = runnerMeasureEnemyWidth(e.word);
    const boxH = 48;

    ctx.save();
    ctx.translate(e.x, e.y);
    if(e.pendingHit){
  ctx.globalAlpha = 0.92;
}
    ctx.fillStyle = e.isCorrect ? "#2ecc71" : "#ff7675";
    ctx.strokeStyle = "rgba(255,255,255,.25)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(-boxW/2, -boxH/2, boxW, boxH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "900 22px Comic Sans MS, cursive";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(e.word, 0, 0);

    ctx.restore();
  }

  for(const ex of SB_RUNNER_SHARED.explosions){
  const alpha = Math.max(0, ex.life / ex.maxLife);
  ctx.globalAlpha = alpha;
  ctx.font = `${Math.round(34 + (1-alpha)*18)}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ex.text, ex.x, ex.y);
  ctx.globalAlpha = 1;
}
}

// function runnerSharedDrawLoopStart(){
//   const canvas = document.getElementById("runner-canvas");
//   const ctx = canvas?.getContext("2d");
//   if(!ctx) return;

//   function loop(){
//     if(!SB_RUNNER_SHARED.active || SB_NET.role === "host") return;
//     runnerSharedDraw(ctx);
//     runnerSharedUpdateHud();
//     SB_RUNNER_SHARED.clientRaf = requestAnimationFrame(loop);
//   }

//   SB_RUNNER_SHARED.clientRaf = requestAnimationFrame(loop);
// }

// function runnerSharedDrawLoopStart(){
//   const canvas = document.getElementById("runner-canvas");
//   const ctx = canvas?.getContext("2d");
//   if(!ctx) return;

//   function loop(){
//     if(!SB_RUNNER_SHARED.active || SB_NET.role === "host") return;
//     runnerSharedDraw(ctx);
//     runnerSharedUpdateHud();
//     SB_RUNNER_SHARED.clientRaf = requestAnimationFrame(loop);
//   }

//   SB_RUNNER_SHARED.clientRaf = requestAnimationFrame(loop);
// }

// function runnerSharedDrawPlayer(ctx, team, player){
//   if(!player || !runner) return;

//   const unit = player.vehicle === "tank" ? runner.tank : runner.heli;
//   if(!unit) return;

//   ctx.save();
//   ctx.translate(player.x, player.y);

//   unit.frameTimer += 0.016;
//   if(unit.frameTimer >= unit.frameSpeed){
//     unit.frameTimer = 0;
//     unit.frameIndex = (unit.frameIndex + 1) % Math.max(1, unit.frameCount || 1);
//   }

//   if(unit.spriteReady && unit.spriteImg && unit.frameW > 0 && unit.frameH > 0){
//     const sx = (unit.frameIndex % unit.spriteCols) * unit.frameW;
//     const sy = Math.floor(unit.frameIndex / unit.spriteCols) * unit.frameH;
//     const dw = unit.frameW * (unit.drawScale || 1);
//     const dh = unit.frameH * (unit.drawScale || 1);

//     ctx.drawImage(
//       unit.spriteImg,
//       sx, sy, unit.frameW, unit.frameH,
//       -dw/2, -dh/2, dw, dh
//     );
//   } else {
//     ctx.font = "46px system-ui";
//     ctx.textAlign = "center";
//     ctx.textBaseline = "middle";
//     ctx.fillText(player.vehicle === "tank" ? "🦄" : "🪽", 0, 0);
//   }

//   ctx.restore();
// }

// function runnerSharedDraw(ctx){
//   const w = ctx.canvas.width;
//   const h = ctx.canvas.height;

//   ctx.clearRect(0, 0, w, h);

//   const g = ctx.createLinearGradient(0, 0, 0, h);
//   g.addColorStop(0, "#081225");
//   g.addColorStop(0.55, "#12305f");
//   g.addColorStop(1, "#182b52");
//   ctx.fillStyle = g;
//   ctx.fillRect(0, 0, w, h);

//   runnerSharedDrawPlayer(ctx, "red", SB_RUNNER_SHARED.players.red);
//   runnerSharedDrawPlayer(ctx, "blue", SB_RUNNER_SHARED.players.blue);

//   for(const e of SB_RUNNER_SHARED.enemies){
//     if(e.hit) continue;

//     const boxW = runnerMeasureEnemyWidth(e.word);
//     const boxH = 48;

//     ctx.save();
//     ctx.translate(e.x, e.y);
//     ctx.fillStyle = e.isCorrect ? "#2ecc71" : "#ff7675";
//     ctx.strokeStyle = "rgba(255,255,255,.25)";
//     ctx.lineWidth = 2;

//     ctx.beginPath();
//     ctx.roundRect(-boxW/2, -boxH/2, boxW, boxH, 16);
//     ctx.fill();
//     ctx.stroke();

//     ctx.fillStyle = "#fff";
//     ctx.font = "900 22px Comic Sans MS, cursive";
//     ctx.textAlign = "center";
//     ctx.textBaseline = "middle";
//     ctx.fillText(e.word, 0, 0);

//     ctx.restore();
//   }
// }

// function runnerSharedDrawPlayer(ctx, team, player){
//   if(!player || !runner) return;

//   const unit = player.vehicle === "tank" ? runner.tank : runner.heli;
//   if(!unit) return;

//   ctx.save();
//   ctx.translate(player.x, player.y);
//   if(player.flipX) ctx.scale(-1, 1);

//   unit.frameTimer += 0.016;
//   if(unit.frameTimer >= unit.frameSpeed){
//     unit.frameTimer = 0;
//     unit.frameIndex = (unit.frameIndex + 1) % Math.max(1, unit.frameCount || 1);
//   }

//   if(unit.spriteReady && unit.spriteImg && unit.frameW > 0 && unit.frameH > 0){
//     const sx = (unit.frameIndex % unit.spriteCols) * unit.frameW;
//     const sy = Math.floor(unit.frameIndex / unit.spriteCols) * unit.frameH;
//     const dw = unit.frameW * (unit.drawScale || 1);
//     const dh = unit.frameH * (unit.drawScale || 1);

//     ctx.drawImage(
//       unit.spriteImg,
//       sx, sy, unit.frameW, unit.frameH,
//       -dw/2, -dh/2, dw, dh
//     );
//   } else {
//     ctx.font = "46px system-ui";
//     ctx.textAlign = "center";
//     ctx.textBaseline = "middle";
//     ctx.fillText(player.vehicle === "tank" ? "🦄" : "🪽", 0, 0);
//   }

//   ctx.restore();
// }

// function runnerSharedDraw(ctx){
//   const w = ctx.canvas.width;
//   const h = ctx.canvas.height;

//   ctx.clearRect(0, 0, w, h);

//   const g = ctx.createLinearGradient(0, 0, 0, h);
//   g.addColorStop(0, "#081225");
//   g.addColorStop(0.55, "#12305f");
//   g.addColorStop(1, "#182b52");
//   ctx.fillStyle = g;
//   ctx.fillRect(0, 0, w, h);

//   for(const e of SB_RUNNER_SHARED.enemies){
//     const boxW = runnerMeasureEnemyWidth(e.word);
//     const boxH = 48;

//     ctx.save();
//     ctx.translate(e.x, e.y);
//     ctx.fillStyle = e.isCorrect ? "#2ecc71" : "#ff7675";
//     ctx.strokeStyle = "rgba(255,255,255,.25)";
//     ctx.lineWidth = 2;
//     ctx.beginPath();
//     ctx.roundRect(-boxW/2, -boxH/2, boxW, boxH, 16);
//     ctx.fill();
//     ctx.stroke();

//     ctx.fillStyle = "#fff";
//     ctx.font = "900 22px Comic Sans MS, cursive";
//     ctx.textAlign = "center";
//     ctx.textBaseline = "middle";
//     ctx.fillText(e.word, 0, 0);
//     ctx.restore();
//   }

//   for(const p of SB_RUNNER_SHARED.projectiles){
//     ctx.fillStyle = p.team === "red" ? "#ffd54f" : "#7dd3fc";
//     ctx.beginPath();
//     ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
//     ctx.fill();
//   }

//   runnerSharedDrawPlayer(ctx, "red", SB_RUNNER_SHARED.players.red);
//   runnerSharedDrawPlayer(ctx, "blue", SB_RUNNER_SHARED.players.blue);
// }

// function runnerSharedUpdateHud(){
//   const hud = document.getElementById("runner-hud");
//   const prompt = document.getElementById("runner-prompt");
//   if(!hud) return;

//   hud.innerHTML =
//     `🔴 ${SB_RUNNER_SHARED.score.red} &nbsp;|&nbsp; 🔵 ${SB_RUNNER_SHARED.score.blue} &nbsp;|&nbsp; ⏱ ${Math.ceil(SB_RUNNER_SHARED.timeLeft)}s`;

//   if(prompt && SB_RUNNER_SHARED.promptWord){
//     prompt.innerHTML = `🎯 Shoot: <span style="color:var(--accent);">${SB_RUNNER_SHARED.promptWord}</span>`;
//   }
// }

// function runnerSharedUpdateHud(){
//   const hud = document.getElementById("runner-hud");
//   const prompt = document.getElementById("runner-prompt");
//   if(!hud) return;

//   hud.innerHTML =
//     `🔴 ${SB_RUNNER_SHARED.score.red} &nbsp;|&nbsp; 🔵 ${SB_RUNNER_SHARED.score.blue} &nbsp;|&nbsp; ⏱ ${Math.ceil(SB_RUNNER_SHARED.timeLeft)}s`;

//   if(prompt && SB_RUNNER_SHARED.promptWord){
//     prompt.innerHTML = `🎯 Tap: <span style="color:var(--accent);">${SB_RUNNER_SHARED.promptWord}</span>`;
//   }
// }

// function runnerSharedBroadcastState(){
//   globalSend({
//     type: "runner_shared_state",
//     roomId: SB_NET.roomId,
//     roundId: SB_RUNNER_SHARED.roundId,
//     state: {
//       timeLeft: SB_RUNNER_SHARED.timeLeft,
//       score: SB_RUNNER_SHARED.score,
//       promptWord: SB_RUNNER_SHARED.promptWord,
//       enemies: SB_RUNNER_SHARED.enemies,
//       players: SB_RUNNER_SHARED.players
//     }
//   });
// }

// function runnerSharedEnd(){
//   SB_RUNNER_SHARED.active = false;

//   const red = SB_RUNNER_SHARED.score.red || 0;
//   const blue = SB_RUNNER_SHARED.score.blue || 0;

//   globalSend({
//     type: "runner_shared_end",
//     roomId: SB_NET.roomId,
//     roundId: SB_RUNNER_SHARED.roundId,
//     score: SB_RUNNER_SHARED.score,
//     winnerTeam: red === blue ? "" : (red > blue ? "red" : "blue")
//   });
// }

// function runnerSharedBroadcastState(){
//   globalSend({
//     type: "runner_shared_state",
//     roomId: SB_NET.roomId,
//     roundId: SB_RUNNER_SHARED.roundId,
//     state: {
//       timeLeft: SB_RUNNER_SHARED.timeLeft,
//       score: SB_RUNNER_SHARED.score,
//       promptWord: SB_RUNNER_SHARED.promptWord,
//       enemies: SB_RUNNER_SHARED.enemies,
//       projectiles: SB_RUNNER_SHARED.projectiles,
//       players: SB_RUNNER_SHARED.players
//     }
//   });
// }

// function runnerSharedEnd(){
//   SB_RUNNER_SHARED.active = false;

//   const red = SB_RUNNER_SHARED.score.red || 0;
//   const blue = SB_RUNNER_SHARED.score.blue || 0;

//   globalSend({
//     type: "runner_shared_end",
//     roomId: SB_NET.roomId,
//     roundId: SB_RUNNER_SHARED.roundId,
//     score: SB_RUNNER_SHARED.score,
//     winnerTeam: red === blue ? "" : (red > blue ? "red" : "blue")
//   });

//   sbRewardFx({
//     emoji: red === blue ? "🤝" : (SB_NET.team === (red > blue ? "red" : "blue") ? "🏆" : "💨"),
//     text: red === blue ? "Tie!" : (SB_NET.team === (red > blue ? "red" : "blue") ? "You win!" : "You lose!"),
//     shake: true
//   });
// }

function runnerSharedUpdateHud(){
  const hud = document.getElementById("runner-hud");
  const prompt = document.getElementById("runner-prompt");
  if(!hud) return;

  // hud.innerHTML =
  //   `🔴 ${SB_RUNNER_SHARED.score.red} &nbsp;|&nbsp; 🔵 ${SB_RUNNER_SHARED.score.blue} &nbsp;|&nbsp; ⏱ ${Math.ceil(SB_RUNNER_SHARED.timeLeft)}s`;

  hud.innerHTML =
  `🔴 ${SB_RUNNER_SHARED.score.red} &nbsp;|&nbsp; 🔵 ${SB_RUNNER_SHARED.score.blue} &nbsp;|&nbsp; ⏱ ${Math.ceil(SB_RUNNER_SHARED.timeLeft)}s &nbsp;|&nbsp; ⚡ x${Number(SB_RUNNER_SHARED.speedMul || 1).toFixed(2)}`;
  
  if(prompt && SB_RUNNER_SHARED.promptWord){
    prompt.innerHTML = `🎯 Tap: <span style="color:var(--accent);">${SB_RUNNER_SHARED.promptWord}</span>`;
  }
}

// function runnerSharedBroadcastState(){
//   globalSend({
//     type: "runner_shared_state",
//     roomId: SB_NET.roomId,
//     roundId: SB_RUNNER_SHARED.roundId,
//     state: {
//       timeLeft: SB_RUNNER_SHARED.timeLeft,
//       score: SB_RUNNER_SHARED.score,
//       promptWord: SB_RUNNER_SHARED.promptWord,
//       enemies: SB_RUNNER_SHARED.enemies,
//       players: SB_RUNNER_SHARED.players
//     }
//   });
// }

function runnerSharedBroadcastState(){
  globalSend({
    type: "runner_shared_state",
    roomId: SB_NET.roomId,
    roundId: SB_RUNNER_SHARED.roundId,
    state: {
      timeLeft: SB_RUNNER_SHARED.timeLeft,
      score: SB_RUNNER_SHARED.score,
      promptWord: SB_RUNNER_SHARED.promptWord,
      enemies: SB_RUNNER_SHARED.enemies,
      players: SB_RUNNER_SHARED.players,
      projectiles: SB_RUNNER_SHARED.projectiles,
      explosions: SB_RUNNER_SHARED.explosions,
      speedMul: SB_RUNNER_SHARED.speedMul || 1,
      spawnMul: SB_RUNNER_SHARED.spawnMul || 1
    }
  });
}

function runnerSharedEnd(){
  SB_RUNNER_SHARED.active = false;

  const red = SB_RUNNER_SHARED.score.red || 0;
  const blue = SB_RUNNER_SHARED.score.blue || 0;

  globalSend({
    type: "runner_shared_end",
    roomId: SB_NET.roomId,
    roundId: SB_RUNNER_SHARED.roundId,
    score: SB_RUNNER_SHARED.score,
    winnerTeam: red === blue ? "" : (red > blue ? "red" : "blue")
  });
}

function repeatRunnerPrompt(){
  if(!runner?.promptItem) return;
  speak(runner.promptItem.word);
  runner.promptSpokenAt = Date.now();
}

function runnerPickNextPrompt(speakNow = false){
  if(!runner || !currentLesson?.items?.length) return;
  runner.promptItem = currentLesson.items[Math.floor(Math.random() * currentLesson.items.length)];
  const promptEl = document.getElementById("runner-prompt");
  if(promptEl){
    promptEl.innerHTML = `🎯 Shoot: <span style="color:var(--accent);">${runner.promptItem.word}</span>`;
  }
  if(speakNow){
    speak(runner.promptItem.word);
    runner.promptSpokenAt = Date.now();
  }
}

function runnerSpawnEnemy(){
  if(!runner || !currentLesson?.items?.length) return;
  if(runner.enemies.length >= runner.enemyCap) return;

  const items = currentLesson.items;
  const isCorrect = Math.random() < 0.34;

  let item = null;
  if(isCorrect && runner.promptItem){
    item = runner.promptItem;
  } else {
    const pool = items.filter(it => it !== runner.promptItem);
    item = pool.length ? pool[Math.floor(Math.random()*pool.length)] : items[Math.floor(Math.random()*items.length)];
  }

  const highLane = Math.random() < 0.5;
  const yBase = highLane ? (90 + Math.random()*120) : (285 + Math.random()*120);

  runner.enemies.push({
    id: `enemy-${Date.now()}-${Math.random().toString(16).slice(2,7)}`,
    item,
    word: item?.word || "",
    isCorrect: !!(item === runner.promptItem),
    x: 980 + Math.random()*140,
    y: yBase,
    baseY: yBase,
    lane: highLane ? "air" : "ground",
    amp: 8 + Math.random()*14,
    bob: Math.random() * Math.PI * 2,
    speed: runner.enemySpeedBase + Math.random()*70 + Math.min(120, runner.score * 6),
    hit:false,
  });
}

function runnerHandleTap(x, y){
  if(!runner || !runner.running || runner.paused || runner.ended) return;

  let picked = null;
  for(let i = runner.enemies.length - 1; i >= 0; i--){
    const e = runner.enemies[i];
    const w = runnerMeasureEnemyWidth(e.word);
    const h = 48;
    if(x >= e.x - w/2 && x <= e.x + w/2 && y >= e.y - h/2 && y <= e.y + h/2){
      picked = e;
      break;
    }
  }

  if(!picked) return;

  if(runner.soloMode){
    if(picked.lane === "air"){
      runnerShootFrom(runner.heli, picked);
    } else {
      runnerShootFrom(runner.tank, picked);
    }
  } else {
    const activeUnit =
      runner.vehicleChoice === "tank"
        ? (runner.tank || runner.heli)
        : (runner.heli || runner.tank);

    if(activeUnit){
      runnerShootFrom(activeUnit, picked);
    }
  }
}

function runnerShootFrom(unit, target){
  if(!runner || !unit || !target) return;
  if(unit.cooldown > 0) return;

  // unit.cooldown = 0.18;

  // runner.projectiles.push({
  //   x: unit.x + 24,
  //   y: unit.y - 6,
  //   targetId: target.id,
  //   speed: 620,
  //   owner: unit === runner.heli ? "heli" : "jeep"
  // });

  const laneBonus =
  unit.kind === "heli" && target.lane === "air" ? 0.85 :
  unit.kind === "tank" && target.lane === "ground" ? 0.85 :
  1;

unit.cooldown = (unit.baseCooldown || 0.18) * laneBonus;

runner.projectiles.push({
  x: unit.x + 24,
  y: unit.y - 6,
  targetId: target.id,
  speed: unit.projectileSpeed || 620,
  owner: unit.kind || "heli"
});
}

function runnerMeasureEnemyWidth(word){
  return Math.max(110, Math.min(240, 28 + String(word || "").length * 18));
}

function runnerHitEnemy(enemy){
  if(!runner || !enemy || enemy.hit) return;
  enemy.hit = true;

  runner.explosions.push({
    x: enemy.x,
    y: enemy.y,
    life: 0.35,
    maxLife: 0.35,
    text: enemy.isCorrect ? "✅" : "💥"
  });

//   runner.explosions.push({
//   x: enemy.x,
//   y: enemy.y,
//   life: enemy.isCorrect ? 0.42 : 0.52,
//   maxLife: enemy.isCorrect ? 0.42 : 0.52,
//   kind: enemy.isCorrect ? "fire" : "bigfire",
//   text: "🔥"
// });

  if(enemy.isCorrect){
    runner.score += 1;
    runner.correctHits += 1;

    sbRecordAttempt(runner.lessonTitle, true);
    sbAwardStar(runner.lessonTitle, 1);

    if(runner.score % 5 === 0){
      sbRewardFx({ emoji:"⭐", text:"BONUS +2 STARS!", shake:true });
      sbAwardStar(runner.lessonTitle, 2);
    } else {
      sbRewardFx({ emoji:"🎯", text:"Great shot!", shake:false });
    }

    runnerPickNextPrompt(true);
  } else {
    runner.wrongHits += 1;

    sbRecordAttempt(runner.lessonTitle, false);
    sbRewardFx({ emoji:"💥", text:"Wrong word!", shake:true });

    if(runner.wrongHits >= runner.maxWrongHits){
      if(!runner.remote){
        runnerFinish("fail");
        return;
      }
    }
  }

  runner.enemies = runner.enemies.filter(e => e.id !== enemy.id);
  runnerUpdateHud();
}

function runnerFinish(result){
  if(!runner || runner.ended) return;
  runner.ended = true;
  runner.running = false;

  if(runner.remote){
    const pct = runner.goalMode === "time"
      ? Math.round(((runner.timeLimit - runner.timeLeft) / Math.max(1, runner.timeLimit)) * 100)
      : Math.round((runner.score / Math.max(1, runner.goalScore)) * 100);

    sbSendRaceProgress("runner", Math.max(0, Math.min(100, pct)));
    sbSendRunnerRaceComplete(result);
    return;
  }

  const won = result === "win";
  const msg = won ? "SKY PATROL COMPLETE!" : "MISSION FAILED!";
  const emoji = won ? "🏆" : "💥";

  if(won){
    sbRewardFx({ emoji:"🏆", text:"Mission complete!", shake:true });
    sbAwardStar(runner.lessonTitle, 3);
  }

  const overlay = document.getElementById("success-overlay");
  const msgEl = document.getElementById("success-msg");
  const mediaEl = document.getElementById("success-media");
  const imgEl = document.getElementById("success-img");

  if(overlay && msgEl){
    msgEl.innerText = msg;
    if(mediaEl) mediaEl.innerHTML = emoji;
    if(imgEl) imgEl.style.display = "none";
    overlay.classList.remove("hidden");
    overlay.onclick = () => {
      overlay.classList.add("hidden");
      sbBackToLesson();
    };
  } else {
    alert(msg);
    sbBackToLesson();
  }
}

function runnerUpdate(dt){
  if(!runner || runner.ended) return;

  runner.bgX = (runner.bgX + dt * 60) % 900;
  runner.cloudX = (runner.cloudX + dt * 28) % 900;

  // runner.heli.cooldown = Math.max(0, runner.heli.cooldown - dt);
  // runner.jeep.cooldown = Math.max(0, runner.jeep.cooldown - dt);

  // runner.playerVehicle.cooldown = Math.max(0, runner.playerVehicle.cooldown - dt);
  // if(runner.soloMode){
  //   runner.heli.cooldown = Math.max(0, runner.heli.cooldown - dt);
  //   runner.tank.cooldown = Math.max(0, runner.tank.cooldown - dt);
  // } else {
  //   // const activeUnit = runner.vehicleChoice === "tank" ? runner.tank : runner.heli;
  //   // activeUnit.cooldown = Math.max(0, activeUnit.cooldown - dt);
  //   const activeUnit =
  //     runner.vehicleChoice === "tank"
  //       ? (runner.tank || runner.jeep || runner.playerVehicle)
  //       : (runner.heli || runner.playerVehicle || runner.jeep);

  //   if (activeUnit) {
  //     activeUnit.cooldown = Math.max(0, activeUnit.cooldown - dt);
  //   }
  // }

  if(runner.soloMode){
    if (runner.heli) {
      runner.heli.cooldown = Math.max(0, runner.heli.cooldown - dt);
    }
    if (runner.tank) {
      runner.tank.cooldown = Math.max(0, runner.tank.cooldown - dt);
    }
  } else {
    const activeUnit =
      runner.vehicleChoice === "tank"
        ? (runner.tank || runner.heli)
        : (runner.heli || runner.tank);

    if (activeUnit) {
      activeUnit.cooldown = Math.max(0, activeUnit.cooldown - dt);
    }
  }

  // const activeUnits = runner.soloMode
  // ? [runner.heli, runner.tank]
  // : [runner.vehicleChoice === "tank" ? runner.tank : runner.heli];

  const activeUnits = runner.soloMode
  ? [runner.heli, runner.tank]
  : [runner.vehicleChoice === "tank" ? runner.tank : runner.heli];

for(const u of activeUnits){
  if(!u || !u.spriteReady) continue;

  u.frameTimer += dt;
  if(u.frameTimer >= u.frameSpeed){
    u.frameTimer = 0;
    u.frameIndex = (u.frameIndex + 1) % Math.max(1, u.frameCount || 1);
  }
}

for(const u of activeUnits){
  if(!u || !u.spriteReady) continue;
  u.frameTimer += dt;
  if(u.frameTimer >= u.frameSpeed){
    u.frameTimer = 0;
    u.frameIndex = (u.frameIndex + 1) % Math.max(1, u.frameCount || 1);
  }
}

if(runner.goalMode === "time"){
  runner.timeLeft = Math.max(0, runner.timeLeft - dt);

  if(runner.remote){
    const pct = Math.round(((runner.timeLimit - runner.timeLeft) / Math.max(1, runner.timeLimit)) * 100);
    sbSendRaceProgress("runner", pct);
  }

  if(runner.timeLeft <= 0){
    if(runner.remote){
      sbSendRaceProgress("runner", 100);
      sbSendRunnerRaceComplete("time_up");
      return;
    }

    runnerFinish(
      runner.score >= Math.max(1, Math.floor(runner.goalScore * 0.7))
        ? "win"
        : "fail"
    );
    return;
  }
} else {
  if(runner.remote){
    const pct = Math.round((runner.score / Math.max(1, runner.goalScore)) * 100);
    sbSendRaceProgress("runner", pct);
  }

  if(runner.score >= runner.goalScore){
    if(runner.remote){
      sbSendRaceProgress("runner", 100);
      sbSendRunnerRaceComplete("goal_reached");
      return;
    }

    runnerFinish("win");
    return;
  }
}

  runner.spawnTimer -= dt;
  const dynamicSpawnGap = Math.max(0.55, 1.25 - runner.score * 0.03);
  if(runner.spawnTimer <= 0){
    runner.spawnTimer = dynamicSpawnGap;
    runnerSpawnEnemy();
    if(Math.random() < 0.28) runnerSpawnEnemy();
  }

  for(const e of runner.enemies){
    e.x -= e.speed * dt;
    e.bob += dt * 4;
    e.y = e.baseY + Math.sin(e.bob) * e.amp;
  }

  for(const p of runner.projectiles){
    const enemy = runner.enemies.find(e => e.id === p.targetId);
    if(!enemy){
      p.dead = true;
      continue;
    }

    const dx = enemy.x - p.x;
    const dy = enemy.y - p.y;
    const dist = Math.hypot(dx, dy) || 1;

    p.x += (dx / dist) * p.speed * dt;
    p.y += (dy / dist) * p.speed * dt;

    if(dist < 18){
      p.dead = true;
      runnerHitEnemy(enemy);
    }
  }

  for(const e of runner.enemies){
    // if(e.x < -160){
    //   e.dead = true;
    //   if(e.isCorrect){
    //     runner.wrongHits += 1;
    //     sbRewardFx({ emoji:"⚠️", text:"Correct word escaped!", shake:true });
    //     if(runner.wrongHits >= runner.maxWrongHits){
    //       if(!runner.remote){
    //         runnerFinish("fail");
    //         return;
    //       }
    //     }
    //   }
    // }
    if(e.x < -160){
      e.dead = true;
      if(e.isCorrect){
        runner.wrongHits += 1;
        sbRewardFx({ emoji:"⚠️", text:"Correct word escaped!", shake:true });

        if(runner.wrongHits >= runner.maxWrongHits && !runner.remote){
          runnerFinish("fail");
          return;
        }
      }
    }
  }

  for(const ex of runner.explosions){
    ex.life -= dt;
  }

  runner.enemies = runner.enemies.filter(e => !e.dead && !e.hit);
  runner.projectiles = runner.projectiles.filter(p => !p.dead);
  runner.explosions = runner.explosions.filter(ex => ex.life > 0);

  if(Date.now() - runner.promptSpokenAt > 6500){
    repeatRunnerPrompt();
  }

  runnerUpdateHud();
}

function runnerDraw(ctx){
  if(!ctx || !runner) return;

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.clearRect(0,0,w,h);

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#60a5fa");
  sky.addColorStop(0.55, "#93c5fd");
  sky.addColorStop(0.56, "#dbeafe");
  sky.addColorStop(1, "#fde68a");
  ctx.fillStyle = sky;
  ctx.fillRect(0,0,w,h);

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#ffffff";
  for(let i=0;i<7;i++){
    const x = ((i*160) - runner.cloudX + w) % w;
    const y = 50 + (i%3)*42;
    ctx.beginPath();
    ctx.roundRect(x, y, 90, 18, 10);
    ctx.roundRect(x+18, y-10, 60, 16, 10);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#86efac";
  ctx.fillRect(0, h-170, w, 80);
  ctx.fillStyle = "#16a34a";
  ctx.fillRect(0, h-105, w, 40);
  ctx.fillStyle = "#334155";
  ctx.fillRect(0, h-65, w, 65);

  ctx.strokeStyle = "rgba(255,255,255,.45)";
  ctx.lineWidth = 4;
  for(let i=0;i<18;i++){
    const x = ((i*70) - runner.bgX*3 + w) % w;
    ctx.beginPath();
    ctx.moveTo(x, h-32);
    ctx.lineTo(x+28, h-32);
    ctx.stroke();
  }

  ctx.setLineDash([8,10]);
  ctx.strokeStyle = "rgba(255,255,255,.45)";
  ctx.beginPath();
  ctx.moveTo(0, 245);
  ctx.lineTo(w, 245);
  ctx.stroke();
  ctx.setLineDash([]);

  // ctx.font = "56px system-ui";
  // ctx.textAlign = "center";
  // ctx.textBaseline = "middle";
  // ctx.fillText(runner.heli.emoji, runner.heli.x, runner.heli.y);

  // ctx.font = "54px system-ui";
  // ctx.fillText(runner.jeep.emoji, runner.jeep.x, runner.jeep.y);

//   ctx.textAlign = "center";
// ctx.textBaseline = "middle";

// runnerDrawUnit(ctx, runner.heli, 56);
// runnerDrawUnit(ctx, runner.jeep, 54);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // runnerDrawUnit(
  //   ctx,
  //   runner.playerVehicle,
  //   runner.playerVehicle.kind === "tank" ? 54 : 56
  // );

  // if(runner.soloMode){
  //   runnerDrawUnit(ctx, runner.heli, 56);
  //   runnerDrawUnit(ctx, runner.tank, 54);
  // } else {
  //   const activeUnit = runner.vehicleChoice === "tank" ? runner.tank : runner.heli;
  //   runnerDrawUnit(ctx, activeUnit, activeUnit.kind === "tank" ? 54 : 56);
  // }

  if(runner.soloMode){
  runnerDrawUnit(ctx, runner.heli, "🚁");
  runnerDrawUnit(ctx, runner.tank, "🦄");
} else {
  const activeUnit = runner.vehicleChoice === "tank" ? runner.tank : runner.heli;
  runnerDrawUnit(ctx, activeUnit, activeUnit?.kind === "tank" ? "🦄" : "🚁");
}

  ctx.font = "900 24px Comic Sans MS, system-ui";
  for(const e of runner.enemies){
    const boxW = runnerMeasureEnemyWidth(e.word);
    const boxH = 46;
    const x = e.x - boxW/2;
    const y = e.y - boxH/2;

    ctx.fillStyle = e.isCorrect ? "#22c55e" : "#ef4444";
    ctx.strokeStyle = "rgba(255,255,255,.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, boxW, boxH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.fillText(e.word, e.x, e.y + 1);
  }

  // for(const p of runner.projectiles){
  //   ctx.fillStyle = p.owner === "heli" ? "#0f172a" : "#7c2d12";
  //   ctx.beginPath();
  //   ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
  //   ctx.fill();
  // }

  for(const p of runner.projectiles){
  ctx.save();

  if(p.owner === "heli"){
    ctx.fillStyle = "#38bdf8";
    ctx.shadowColor = "#7dd3fc";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#e0f2fe";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#c084fc";
    ctx.shadowColor = "#e9d5ff";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 17, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f5f3ff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

  for(const ex of runner.explosions){
    const alpha = Math.max(0, ex.life / ex.maxLife);
    ctx.globalAlpha = alpha;
    ctx.font = `${Math.round(34 + (1-alpha)*18)}px system-ui`;
    ctx.fillText(ex.text, ex.x, ex.y);
    ctx.globalAlpha = 1;
  }

  if(runner.paused && !runner.ended){
    ctx.fillStyle = "rgba(0,0,0,.38)";
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle = "#fff";
    ctx.font = "900 48px Comic Sans MS, system-ui";
    ctx.fillText("PAUSED", w/2, h/2);
  }
}

// function runnerDrawUnit(ctx, unit, fontSize = 56){
//   if(!ctx || !unit) return;

//   ctx.save();
//   ctx.translate(unit.x, unit.y);

//   if(unit.flipX){
//     ctx.scale(-1, 1);
//   }

//   ctx.font = `${fontSize}px system-ui`;
//   ctx.fillText(unit.emoji, 0, 0);

//   // Small extra barrel effect for the tank so it reads less like a car
//   if(unit.label === "tank"){
//     ctx.scale(unit.flipX ? -1 : 1, 1); // return to normal local direction for barrel
//     ctx.strokeStyle = "#1f2937";
//     ctx.lineWidth = 5;
//     ctx.lineCap = "round";
//     ctx.beginPath();
//     ctx.moveTo(8, -8);
//     ctx.lineTo(28, -8);
//     ctx.stroke();
//   }

//   if(unit.label === "heli"){
//   ctx.scale(unit.flipX ? -1 : 1, 1);
//   ctx.strokeStyle = "#111827";
//   ctx.lineWidth = 4;
//   ctx.lineCap = "round";
//   ctx.beginPath();
//   ctx.moveTo(18, 4);
//   ctx.lineTo(34, 4);
//   ctx.stroke();
// }

//   ctx.restore();
// }

function runnerDrawUnit(ctx, unit, fallbackEmoji = "✨"){
  if(!ctx || !unit) return;

  if(
    unit.spriteReady &&
    unit.spriteImg &&
    unit.frameW > 0 &&
    unit.frameH > 0
  ){
    const cols = Math.max(1, unit.spriteCols || 1);
    const count = Math.max(1, unit.frameCount || 1);
    const frame = Math.max(0, Math.min(count - 1, unit.frameIndex || 0));

    const col = frame % cols;
    const row = Math.floor(frame / cols);

    const sx = col * unit.frameW;
    const sy = row * unit.frameH;

    const dw = unit.frameW * (unit.drawScale || 1);
    const dh = unit.frameH * (unit.drawScale || 1);

    ctx.save();
    ctx.translate(unit.x, unit.y);

    if(unit.flipX){
      ctx.scale(-1, 1);
    }

    ctx.drawImage(
      unit.spriteImg,
      sx, sy, unit.frameW, unit.frameH,
      -dw / 2, -dh / 2, dw, dh
    );

    ctx.restore();
    return;
  }

  // fallback if sprite not loaded yet
  ctx.save();
  ctx.translate(unit.x, unit.y);

  if(unit.flipX){
    ctx.scale(-1, 1);
  }

  ctx.font = "56px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(fallbackEmoji, 0, 0);

  ctx.restore();
}

function runnerUpdateHud(){
  const hud = document.getElementById("runner-hud");
  const status = document.getElementById("runner-status");
  if(!hud || !runner) return;

  const timerText = runner.goalMode === "time"
    ? `⏱ ${Math.ceil(runner.timeLeft)}s`
    : `🎯 ${runner.score}/${runner.goalScore}`;

  hud.innerHTML =
    `⭐ ${runner.score} &nbsp;|&nbsp; ☠️ ${runner.wrongHits}/${runner.maxWrongHits} &nbsp;|&nbsp; ${timerText}${runner.paused ? " &nbsp;|&nbsp; PAUSED" : ""}`;

  // if(status){
  //   status.textContent =
  //     `Tap the correct flying word. ${runner.promptItem?.word ? `Current target: ${runner.promptItem.word}` : ""}`;
  // }

  if(status){
    if(runner.soloMode){
      status.textContent =
        `Solo mode. Helicopter shoots top words, tank shoots lower words. ${runner.promptItem?.word ? `Current target: ${runner.promptItem.word}` : ""}`;
    } else {
      const vehicleName = runner.vehicleChoice === "tank" ? "Tank" : "Helicopter";
      status.textContent =
        `${vehicleName} VS mode. Tap the correct word. ${runner.promptItem?.word ? `Current target: ${runner.promptItem.word}` : ""}`;
    }
  }
}

/* =========================================================
   ☄️ Sky Battle (Pro)
   Separate from Sky Patrol
   ========================================================= */
let skybattle = null;

function startSkyBattle(opts = {}){
  const launch = () => {
    gameMode = "skybattle";
    showPage("skybattle-page");
    skybattleStart(opts);
  };

  if(opts && opts.remote){
    launch();
    return;
  }

  sbRequirePro(launch);
}

function skybattleSeededItems(seed){
  const arr = Array.isArray(currentLesson?.items) ? [...currentLesson.items] : [];
  if(typeof sbRaceSeededShuffle === "function" && seed){
    return sbRaceSeededShuffle(arr, seed);
  }
  return arr.sort(() => Math.random() - 0.5);
}

function skybattleResetState(opts = {}){
  const goalScore = Number(opts.goalScore || 8);

  skybattle = {
    running: false,
    paused: false,
    ended: false,
    raf: 0,
    lastTs: 0,

    remote: !!opts.remote,
    seed: opts.seed || "",
    lessonTitle: currentLesson?.title || "Lesson",

    score: 0,
    wrongHits: 0,
    maxWrongHits: 3,
    collisions: 0,
    progressSent: 0,

    bgX: 0,
    starsX: 0,

    queue: skybattleSeededItems(opts.seed),
    promptItem: null,
    promptIndex: 0,

    spawnTimer: 0,
  spawnGap: 1.2,

    // player: {
    //   x: 110,
    //   y: 270,
    //   w: 74,
    //   h: 54,
    //   speed: 330,
    //   fireCd: 0,
    //   sprite: null,
    //   spriteReady: false
    // },

//     player: {
//   x: 110,
//   y: 270,
//   w: 70,
//   h: 50,
//   speed: 320,
//   fireCd: 0,
//   flipX: false,

//   label: (sbMyVehicle && sbMyVehicle() === "tank") ? "unicorn" : "griffin",
//   kind: (sbMyVehicle && sbMyVehicle() === "tank") ? "tank" : "heli",

//   spriteRef: (sbMyVehicle && sbMyVehicle() === "tank")
//     ? "../assets/unicorn0.png"
//     : "../assets/griffin2.png",

//   spriteImg: null,
//   spriteReady: false,

//   frameCount: (sbMyVehicle && sbMyVehicle() === "tank") ? 6 : 10,
//   spriteCols: (sbMyVehicle && sbMyVehicle() === "tank") ? 2 : 4,
//   spriteRows: (sbMyVehicle && sbMyVehicle() === "tank") ? 4 : 3,

//   frameIndex: 0,
//   frameTimer: 0,
//   frameSpeed: 0.4,

//   frameW: 0,
//   frameH: 0,
//   drawScale: (sbMyVehicle && sbMyVehicle() === "tank") ? 1.0 : 1.5
// },

player: {
  x: 110,
  y: 270,
  w: 70,
  h: 50,
  speed: 320,
  fireCd: 0,
  flipX: false,

  label: (sbMyVehicle && sbMyVehicle() === "tank") ? "unicorn" : "griffin",
  kind: (sbMyVehicle && sbMyVehicle() === "tank") ? "tank" : "heli",

  spriteRef: (sbMyVehicle && sbMyVehicle() === "tank")
    ? "../assets/unicornM02.png"
    : "../assets/griffinM.png",

  spriteImg: null,
  spriteReady: false,

  frameCount: (sbMyVehicle && sbMyVehicle() === "tank") ? 6 : 8,
  spriteCols: (sbMyVehicle && sbMyVehicle() === "tank") ? 3 : 4,
  spriteRows: 2,

  frameW: 0,
  frameH: 0,
  drawScale: (sbMyVehicle && sbMyVehicle() === "tank") ? 1.0 : 1.35,

  frameIndex: 0,
  animState: "idle",
  animTimer: 0,
  animFramePos: 0
},

    bullets: [],
    enemies: [],
    bursts: [],

    controls: {
      up: false,
      down: false,
      left: false,
      right: false
    },

    goalScore,
    timeLimit: Number(opts.timeLimit || 60),
    timeLeft: Number(opts.timeLimit || 60),
  };
}

function skybattleAnimFrames(p){
  const isTank = p.kind === "tank";

  if(isTank){
    return {
      idle:  [1, 2, 3],
      climb: [0, 1, 2],
      dive:  [3, 4, 5],
      boost: [1, 2, 3, 4]
    };
  }

  return {
    idle:  [2, 3, 4, 5],
    climb: [0, 1, 2, 3],
    dive:  [4, 5, 6, 7],
    boost: [1, 2, 3, 4, 5]
  };
}


// async function skybattleLoadSprite(){
//   if(!skybattle) return;
//   try{
//     const vehicle = sbMyVehicle && sbMyVehicle() === "tank" ? "tank" : "heli";
//     const ref = vehicle === "tank" ? "../assets/unicorn0.png" : "../assets/griffin2.png";
//     const src = (typeof sbResolveImageSrc === "function") ? await sbResolveImageSrc(ref) : ref;
//     if(!src) return;

//     const img = new Image();
//     img.onload = () => {
//       if(!skybattle) return;
//       skybattle.player.sprite = img;
//       skybattle.player.spriteReady = true;
//     };
//     img.src = src;
//   }catch(err){
//     console.warn("Sky Battle sprite load failed", err);
//   }
// }

async function skybattleLoadSprite(){
  if(!skybattle?.player?.spriteRef) return;

  const p = skybattle.player;

  try{
    const src = (typeof sbResolveImageSrc === "function")
      ? await sbResolveImageSrc(p.spriteRef)
      : p.spriteRef;

    if(!src) return;

    const img = new Image();

    img.onload = () => {
      if(!skybattle?.player) return;

      p.spriteImg = img;
      p.spriteReady = true;

      const cols = Math.max(1, p.spriteCols || 1);
      const rows = Math.max(1, p.spriteRows || 1);

      p.frameW = img.width / cols;
      p.frameH = img.height / rows;
    };

    img.onerror = () => {
      console.warn("Sky Battle sprite failed to load:", p.spriteRef);
    };

    img.src = src;
  }catch(err){
    console.warn("Sky Battle sprite load error:", err);
  }
}

function skybattleBindControls(){
  const bind = (id, key) => {
    const el = document.getElementById(id);
    if(!el || el.dataset.bound === "1") return;
    el.dataset.bound = "1";

    const onDown = (e) => {
      try{ e.preventDefault(); }catch(_){}
      if(!skybattle) return;
      skybattle.controls[key] = true;
    };

    const onUp = (e) => {
      try{ e.preventDefault(); }catch(_){}
      if(!skybattle) return;
      skybattle.controls[key] = false;
    };

    el.addEventListener("pointerdown", onDown, { passive:false });
    el.addEventListener("pointerup", onUp, { passive:false });
    el.addEventListener("pointercancel", onUp, { passive:false });
    el.addEventListener("pointerleave", onUp, { passive:false });
  };

  bind("sb-up-btn", "up");
  bind("sb-down-btn", "down");
  bind("sb-left-btn", "left");
  bind("sb-right-btn", "right");

  const fireBtn = document.getElementById("sb-fire-btn");
  if(fireBtn && fireBtn.dataset.bound !== "1"){
    fireBtn.dataset.bound = "1";
    fireBtn.addEventListener("click", () => skybattleFire());
  }

  if(!window.__sbSkyBattleKeys){
    window.__sbSkyBattleKeys = true;

    window.addEventListener("keydown", (e) => {
      if(!skybattle || gameMode !== "skybattle") return;

      if(e.key === "ArrowUp" || e.key === "w" || e.key === "W") skybattle.controls.up = true;
      if(e.key === "ArrowDown" || e.key === "s" || e.key === "S") skybattle.controls.down = true;
      if(e.key === "ArrowLeft" || e.key === "a" || e.key === "A") skybattle.controls.left = true;
      if(e.key === "ArrowRight" || e.key === "d" || e.key === "D") skybattle.controls.right = true;

      if(e.key === " "){
        e.preventDefault();
        skybattleFire();
      }
    });

    window.addEventListener("keyup", (e) => {
      if(!skybattle || gameMode !== "skybattle") return;

      if(e.key === "ArrowUp" || e.key === "w" || e.key === "W") skybattle.controls.up = false;
      if(e.key === "ArrowDown" || e.key === "s" || e.key === "S") skybattle.controls.down = false;
      if(e.key === "ArrowLeft" || e.key === "a" || e.key === "A") skybattle.controls.left = false;
      if(e.key === "ArrowRight" || e.key === "d" || e.key === "D") skybattle.controls.right = false;
    });
  }
}

function skybattleStart(opts = {}){
  if(!currentLesson || !Array.isArray(currentLesson.items) || !currentLesson.items.length){
    sbToast("No lesson loaded");
    return;
  }

  skybattleStop();
  skybattleResetState(opts);
  skybattleBindControls();
  skybattleLoadSprite();
  skybattleNextWave(true);
skybattleSpawnEnemy(true);
skybattleSpawnEnemy(false);
skybattleSpawnEnemy(false);
skybattleSpawnEnemy(false);

  skybattle.running = true;
  skybattle.paused = false;
  skybattle.lastTs = performance.now();

  const canvas = document.getElementById("skybattle-canvas");
  if(!canvas) return;
  const ctx = canvas.getContext("2d");

  function loop(ts){
    if(!skybattle || !skybattle.running) return;
    skybattle.raf = requestAnimationFrame(loop);

    if(skybattle.paused){
      skybattle.lastTs = ts;
      skybattleDraw(ctx);
      return;
    }

    const dt = Math.min(0.033, (ts - skybattle.lastTs) / 1000 || 0.016);
    skybattle.lastTs = ts;

    skybattleUpdate(dt);
    skybattleDraw(ctx);
  }

  skybattle.raf = requestAnimationFrame(loop);
  skybattleUpdateHud();
}

function skybattleStop(){
  if(skybattle?.raf) cancelAnimationFrame(skybattle.raf);
  if(skybattle) skybattle.running = false;
}

function skybattleTogglePause(){
  if(!skybattle || skybattle.ended) return;
  skybattle.paused = !skybattle.paused;
  skybattleUpdateHud();
}

function repeatSkyBattlePrompt(){
  if(!skybattle?.promptItem?.word) return;
  speak(skybattle.promptItem.word);
}

function skybattlePickPrompt(){
  if(!skybattle) return null;

  if(!skybattle.queue.length){
    skybattle.queue = skybattleSeededItems(skybattle.seed || `${Date.now()}`);
  }

  const item = skybattle.queue[skybattle.promptIndex % skybattle.queue.length];
  skybattle.promptIndex++;
  skybattle.promptItem = item || null;
  return skybattle.promptItem;
}

function skybattleSharedMakePlayer(team){
  const isBlue = team === "blue";
  return {
    team,
    character: isBlue ? "aria" : "athena",
    vehicle: isBlue ? "tank" : "heli",
    x: 220,
    y: isBlue ? 520 : 180,
    speed: 320,
    fireCd: 0,
    flipX: false,

    label: isBlue ? "unicorn" : "griffin",
    kind: isBlue ? "tank" : "heli",

    spriteRef: isBlue ? "../assets/unicornM02.png" : "../assets/griffinM.png",
    spriteImg: null,
    spriteReady: false,

    frameCount: isBlue ? 6 : 8,
    spriteCols: isBlue ? 3 : 4,
    spriteRows: 2,
    frameW: 0,
    frameH: 0,
    drawScale: isBlue ? 1.0 : 1.35,

    frameIndex: 0,
    animState: "idle",
    animTimer: 0,
    animFramePos: 0
  };
}

function startSkyBattleSharedVs(){
  gameMode = "skybattle";
  showPage("skybattle-page");

  SB_SKYBATTLE_SHARED.active = true;
  SB_SKYBATTLE_SHARED.role = SB_NET.role;
  SB_SKYBATTLE_SHARED.roomId = SB_NET.roomId;
  SB_SKYBATTLE_SHARED.roundId = sbMakeRoundId();
  SB_SKYBATTLE_SHARED.seed = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  SB_SKYBATTLE_SHARED.status = "live";
  SB_SKYBATTLE_SHARED.timeLeft = 60;
  SB_SKYBATTLE_SHARED.score = { red: 0, blue: 0 };
  SB_SKYBATTLE_SHARED.promptWord = "";
  SB_SKYBATTLE_SHARED.enemies = [];
  SB_SKYBATTLE_SHARED.bullets = [];
  SB_SKYBATTLE_SHARED.bursts = [];
  SB_SKYBATTLE_SHARED.players.red = skybattleSharedMakePlayer("red");
  SB_SKYBATTLE_SHARED.players.blue = skybattleSharedMakePlayer("blue");

  skybattleStop();
  skybattleBindSharedControls();
  skybattleSharedLoadSprites();

  const statusEl = document.getElementById("skybattle-shared-status");
  if(statusEl){
    statusEl.textContent = "Shared VS mode";
  }

  if(SB_NET.role === "host"){
    globalSend({
      type: "skybattle_shared_open",
      roomId: SB_NET.roomId,
      roundId: SB_SKYBATTLE_SHARED.roundId,
      seed: SB_SKYBATTLE_SHARED.seed
    });
    skybattleSharedHostLoopStart();
  } else {
    skybattleSharedDrawLoopStart();
  }

  skybattleSharedUpdateHud();
}

function skybattleBindSharedControls(){
  const setInput = (key, pressed) => {
    if(!SB_SKYBATTLE_SHARED.active) return;

    if(SB_NET.connected){
      globalSend({
        type: "skybattle_shared_input",
        roomId: SB_NET.roomId,
        roundId: SB_SKYBATTLE_SHARED.roundId,
        input: { [key]: !!pressed }
      });
    }
  };

  const bindHold = (id, key) => {
    const el = document.getElementById(id);
    if(!el || el.dataset.skybattleSharedBound === "1") return;
    el.dataset.skybattleSharedBound = "1";

    const onDown = (e) => {
      try{ e.preventDefault(); }catch(_){}
      setInput(key, true);
    };

    const onUp = (e) => {
      try{ e.preventDefault(); }catch(_){}
      setInput(key, false);
    };

    el.addEventListener("pointerdown", onDown, { passive:false });
    el.addEventListener("pointerup", onUp, { passive:false });
    el.addEventListener("pointercancel", onUp, { passive:false });
    el.addEventListener("pointerleave", onUp, { passive:false });
  };

  bindHold("sb-up-btn", "up");
  bindHold("sb-down-btn", "down");
  bindHold("sb-left-btn", "left");
  bindHold("sb-right-btn", "right");

  const fireBtn = document.getElementById("sb-fire-btn");
  if(fireBtn && fireBtn.dataset.skybattleSharedBound !== "1"){
    fireBtn.dataset.skybattleSharedBound = "1";
    fireBtn.addEventListener("click", () => {
      globalSend({
        type: "skybattle_shared_fire",
        roomId: SB_NET.roomId,
        roundId: SB_SKYBATTLE_SHARED.roundId
      });
    });
  }
}

async function skybattleSharedLoadSprites(){
  const players = [SB_SKYBATTLE_SHARED.players.red, SB_SKYBATTLE_SHARED.players.blue];

  for(const p of players){
    if(!p?.spriteRef) continue;

    try{
      const src = (typeof sbResolveImageSrc === "function")
        ? await sbResolveImageSrc(p.spriteRef)
        : p.spriteRef;

      if(!src) continue;

      const img = new Image();
      img.onload = () => {
        p.spriteImg = img;
        p.spriteReady = true;
        p.frameW = img.width / Math.max(1, p.spriteCols || 1);
        p.frameH = img.height / Math.max(1, p.spriteRows || 1);
      };
      img.src = src;
    }catch(err){
      console.warn("Shared Sky Battle sprite load error", err);
    }
  }
}

function skybattleSharedPickPromptWord(){
  if(!currentLesson?.items?.length) return "";
  const item = currentLesson.items[Math.floor(Math.random() * currentLesson.items.length)];
  SB_SKYBATTLE_SHARED.promptWord = item?.word || "";
  speak(SB_SKYBATTLE_SHARED.promptWord);
  return SB_SKYBATTLE_SHARED.promptWord;
}

function skybattleSharedSpawnEnemy(){
  if(!currentLesson?.items?.length) return;
  if((SB_SKYBATTLE_SHARED.enemies?.length || 0) >= 6) return;

  const items = currentLesson.items;
  const promptWord = String(SB_SKYBATTLE_SHARED.promptWord || "").toLowerCase();

  let chosen = null;
  let correct = false;

  if(promptWord && Math.random() < 0.28){
    chosen = items.find(it => String(it.word || "").toLowerCase() === promptWord) || null;
    correct = !!chosen;
  }

  if(!chosen){
    chosen = items[Math.floor(Math.random() * items.length)];
    correct = String(chosen?.word || "").toLowerCase() === promptWord;
  }

  if(!chosen) return;

  const wordText = String(chosen.word || "");
  const boxW = Math.max(120, Math.min(210, 34 + wordText.length * 16));

  SB_SKYBATTLE_SHARED.enemies.push({
    id: `sbs-${Date.now()}-${Math.random().toString(16).slice(2,8)}`,
    word: wordText,
    correct,
    x: 1320,
    y: 110 + Math.random() * 470,
    w: boxW,
    h: 56,
    vx: 90 + Math.random() * 45,
    hit: false
  });
}

function skybattleSharedApplyInput(player, input, dt){
  if(!player || !input) return;

  if(input.up) player.y -= player.speed * dt;
  if(input.down) player.y += player.speed * dt;
  if(input.left){
    player.x -= player.speed * dt;
    player.flipX = true;
  }
  if(input.right){
    player.x += player.speed * dt;
    player.flipX = false;
  }

  player.x = Math.max(80, Math.min(1120, player.x));
  player.y = Math.max(70, Math.min(650, player.y));
}

function skybattleSharedFire(team){
  const p = SB_SKYBATTLE_SHARED.players[team];
  if(!p || p.fireCd > 0) return;

  const facingLeft = !!p.flipX;
  const isTank = p.kind === "tank";

  p.fireCd = 0.18;

  SB_SKYBATTLE_SHARED.bullets.push({
    id: `sbb-${Date.now()}-${Math.random().toString(16).slice(2,7)}`,
    team,
    x: p.x + (facingLeft ? (isTank ? -28 : -34) : (isTank ? 28 : 34)),
    y: p.y + (isTank ? -2 : -6),
    r: 7,
    vx: facingLeft ? -520 : 520
  });
}

function skybattleSharedHostLoopStart(){
  SB_SKYBATTLE_SHARED.status = "live";
  skybattleSharedPickPromptWord();

  let spawnTimer = 0;
  let netStateTimer = 0;
  let lastTs = performance.now();

  const inputState = {
    red: {},
    blue: {}
  };

  const canvas = document.getElementById("skybattle-canvas");
  const ctx = canvas?.getContext("2d");

  function tick(ts){
    if(!SB_SKYBATTLE_SHARED.active || SB_NET.role !== "host") return;

    const dt = Math.min(0.033, (ts - lastTs) / 1000 || 0.016);
    lastTs = ts;

    SB_SKYBATTLE_SHARED.timeLeft = Math.max(0, SB_SKYBATTLE_SHARED.timeLeft - dt);

    skybattleSharedApplyInput(SB_SKYBATTLE_SHARED.players.red, inputState.red, dt);
    skybattleSharedApplyInput(SB_SKYBATTLE_SHARED.players.blue, inputState.blue, dt);

    for(const t of ["red", "blue"]){
      const p = SB_SKYBATTLE_SHARED.players[t];
      if(p) p.fireCd = Math.max(0, p.fireCd - dt);
    }

    spawnTimer += dt;
    if(spawnTimer >= 1.0){
      spawnTimer = 0;
      skybattleSharedSpawnEnemy();
    }

    for(const e of SB_SKYBATTLE_SHARED.enemies){
      e.x -= e.vx * dt;
    }

    for(const b of SB_SKYBATTLE_SHARED.bullets){
      b.x += b.vx * dt;
    }

    for(const burst of SB_SKYBATTLE_SHARED.bursts){
      burst.t -= dt;
    }

    for(const enemy of SB_SKYBATTLE_SHARED.enemies){
      if(enemy.hit) continue;

      if(enemy.x < -120){
        enemy.hit = true;
        if(enemy.correct){
          skybattleSharedPickPromptWord();
        }
      }
    }

    for(const b of SB_SKYBATTLE_SHARED.bullets){
      for(const enemy of SB_SKYBATTLE_SHARED.enemies){
        if(enemy.hit) continue;

        const dx = Math.abs(b.x - enemy.x);
        const dy = Math.abs(b.y - enemy.y);

        if(dx < enemy.w * 0.42 && dy < enemy.h * 0.52){
          enemy.hit = true;
          b.x = 99999;

          SB_SKYBATTLE_SHARED.bursts.push({
            x: enemy.x,
            y: enemy.y,
            text: enemy.correct ? "✨" : "🔥",
            t: 0.5
          });

          if(enemy.correct){
            SB_SKYBATTLE_SHARED.score[b.team] = (SB_SKYBATTLE_SHARED.score[b.team] || 0) + 1;
            skybattleSharedPickPromptWord();
          } else {
            SB_SKYBATTLE_SHARED.score[b.team] = Math.max(0, (SB_SKYBATTLE_SHARED.score[b.team] || 0) - 1);
          }
          break;
        }
      }
    }

    SB_SKYBATTLE_SHARED.enemies = SB_SKYBATTLE_SHARED.enemies.filter(e => !e.hit && e.x > -160);
    SB_SKYBATTLE_SHARED.bullets = SB_SKYBATTLE_SHARED.bullets.filter(b => b.x > -160 && b.x < 1440);
    SB_SKYBATTLE_SHARED.bursts = SB_SKYBATTLE_SHARED.bursts.filter(b => b.t > 0);

    netStateTimer += dt;
    if(netStateTimer >= 0.08){
      netStateTimer = 0;
      skybattleSharedBroadcastState();
    }

    if(ctx){
      skybattleSharedDraw(ctx);
    }

    skybattleSharedUpdateHud();

    if(SB_SKYBATTLE_SHARED.timeLeft <= 0){
      skybattleSharedEnd();
      return;
    }

    SB_SKYBATTLE_SHARED.raf = requestAnimationFrame(tick);
  }

  SB_SKYBATTLE_SHARED._inputState = inputState;
  SB_SKYBATTLE_SHARED.raf = requestAnimationFrame(tick);
}

function skybattleSharedAnimFrames(p){
  const isTank = p.kind === "tank";

  if(isTank){
    return {
      idle:  [1, 2, 3],
      climb: [0, 1, 2],
      dive:  [3, 4, 5],
      boost: [1, 2, 3, 4]
    };
  }

  return {
    idle:  [2, 3, 4, 5],
    climb: [0, 1, 2, 3],
    dive:  [4, 5, 6, 7],
    boost: [1, 2, 3, 4, 5]
  };
}

function skybattleSharedDrawPlayer(ctx, p){
  if(!p) return;

  let movingState = p.animState || "idle";
  const frames = skybattleSharedAnimFrames(p)[movingState] || [0];
  const animSpeed =
    movingState === "boost" ? 0.06 :
    movingState === "climb" ? 0.07 :
    movingState === "dive"  ? 0.09 :
    0.10;

  p.animTimer += 0.016;
  if(p.animTimer >= animSpeed){
    p.animTimer = 0;
    p.animFramePos = (p.animFramePos + 1) % frames.length;
  }
  p.frameIndex = frames[p.animFramePos] ?? frames[0] ?? 0;

  ctx.save();
  ctx.translate(p.x, p.y);
  if(p.flipX) ctx.scale(-1, 1);

  // if(p.spriteReady && p.spriteImg && p.frameW > 0 && p.frameH > 0){
    if(
      p.spriteReady &&
      p.spriteImg instanceof HTMLImageElement &&
      p.frameW > 0 &&
      p.frameH > 0
    ){
    const sx = (p.frameIndex % p.spriteCols) * p.frameW;
    const sy = Math.floor(p.frameIndex / p.spriteCols) * p.frameH;
    const dw = p.frameW * (p.drawScale || 1);
    const dh = p.frameH * (p.drawScale || 1);

    ctx.drawImage(
      p.spriteImg,
      sx, sy, p.frameW, p.frameH,
      -dw / 2, -dh / 2, dw, dh
    );
  } else {
    ctx.font = "52px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(p.kind === "tank" ? "🦄" : "🪽", 0, 0);
  }

  ctx.restore();
}

function skybattleSharedDraw(ctx){
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.clearRect(0, 0, w, h);

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#081225");
  g.addColorStop(0.55, "#12305f");
  g.addColorStop(1, "#182b52");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  for(const b of SB_SKYBATTLE_SHARED.bullets){
    ctx.fillStyle = b.team === "red" ? "#ff8a3d" : "#4fc3ff";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for(const enemy of SB_SKYBATTLE_SHARED.enemies){
    if(enemy.hit) continue;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    ctx.fillStyle = enemy.correct ? "#2ecc71" : "#ff7675";
    ctx.strokeStyle = "rgba(255,255,255,.25)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(-enemy.w/2, -enemy.h/2, enemy.w, enemy.h, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "900 22px Comic Sans MS, cursive";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(enemy.word, 0, 0);

    ctx.restore();
  }

  for(const burst of SB_SKYBATTLE_SHARED.bursts){
    ctx.save();
    ctx.globalAlpha = Math.max(0, burst.t / 0.5);
    ctx.font = "32px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(burst.text, burst.x, burst.y);
    ctx.restore();
  }

  skybattleSharedDrawPlayer(ctx, SB_SKYBATTLE_SHARED.players.red);
  skybattleSharedDrawPlayer(ctx, SB_SKYBATTLE_SHARED.players.blue);
}

function skybattleSharedDrawLoopStart(){
  const canvas = document.getElementById("skybattle-canvas");
  const ctx = canvas?.getContext("2d");
  if(!ctx) return;

  function loop(){
    if(!SB_SKYBATTLE_SHARED.active || SB_NET.role === "host") return;
    skybattleSharedDraw(ctx);
    skybattleSharedUpdateHud();
    SB_SKYBATTLE_SHARED.clientRaf = requestAnimationFrame(loop);
  }

  SB_SKYBATTLE_SHARED.clientRaf = requestAnimationFrame(loop);
}

function skybattleSharedUpdateHud(){
  const el = document.getElementById("skybattle-hud");
  const prompt = document.getElementById("skybattle-prompt");
  if(!el) return;

  el.innerHTML =
    `🔴 ${SB_SKYBATTLE_SHARED.score.red} &nbsp;|&nbsp; 🔵 ${SB_SKYBATTLE_SHARED.score.blue} &nbsp;|&nbsp; ⏱ ${Math.ceil(SB_SKYBATTLE_SHARED.timeLeft)}s`;

  if(prompt && SB_SKYBATTLE_SHARED.promptWord){
    prompt.innerHTML = `🎯 Shoot: <span style="color:var(--accent);">${SB_SKYBATTLE_SHARED.promptWord}</span>`;
  }
}

function skybattleSharedBroadcastState(){
  globalSend({
    type: "skybattle_shared_state",
    roomId: SB_NET.roomId,
    roundId: SB_SKYBATTLE_SHARED.roundId,
    state: {
      timeLeft: SB_SKYBATTLE_SHARED.timeLeft,
      score: SB_SKYBATTLE_SHARED.score,
      promptWord: SB_SKYBATTLE_SHARED.promptWord,
      enemies: SB_SKYBATTLE_SHARED.enemies,
      bullets: SB_SKYBATTLE_SHARED.bullets,
      bursts: SB_SKYBATTLE_SHARED.bursts,
      // players: SB_SKYBATTLE_SHARED.players
      players: {
  red: {
    x: SB_SKYBATTLE_SHARED.players.red?.x,
    y: SB_SKYBATTLE_SHARED.players.red?.y,
    flipX: SB_SKYBATTLE_SHARED.players.red?.flipX,
    animState: SB_SKYBATTLE_SHARED.players.red?.animState,
    frameIndex: SB_SKYBATTLE_SHARED.players.red?.frameIndex
  },
  blue: {
    x: SB_SKYBATTLE_SHARED.players.blue?.x,
    y: SB_SKYBATTLE_SHARED.players.blue?.y,
    flipX: SB_SKYBATTLE_SHARED.players.blue?.flipX,
    animState: SB_SKYBATTLE_SHARED.players.blue?.animState,
    frameIndex: SB_SKYBATTLE_SHARED.players.blue?.frameIndex
  }
}
    }
  });
}

function skybattleSharedEnd(){
  SB_SKYBATTLE_SHARED.active = false;

  const red = SB_SKYBATTLE_SHARED.score.red || 0;
  const blue = SB_SKYBATTLE_SHARED.score.blue || 0;

  globalSend({
    type: "skybattle_shared_end",
    roomId: SB_NET.roomId,
    roundId: SB_SKYBATTLE_SHARED.roundId,
    score: SB_SKYBATTLE_SHARED.score,
    winnerTeam: red === blue ? "" : (red > blue ? "red" : "blue")
  });
}

function skybattleMakeWaveWords(targetWord){
  const all = (currentLesson?.items || []).map(it => String(it.word || "").trim()).filter(Boolean);
  const wrong = all.filter(w => w.toLowerCase() !== String(targetWord || "").toLowerCase());
  const picks = wrong.sort(() => Math.random() - 0.5).slice(0, 3);
  const wave = [targetWord, ...picks].sort(() => Math.random() - 0.5);
  return wave;
}

// function skybattleNextWave(speakNow = false){
//   if(!skybattle) return;

//   const item = skybattlePickPrompt();
//   if(!item) return;

//   const promptEl = document.getElementById("skybattle-prompt");
//   if(promptEl){
//     promptEl.innerHTML = `🎯 Shoot: <span style="color:var(--accent);">${item.word}</span>`;
//   }

//   if(speakNow) speak(item.word);

//   const words = skybattleMakeWaveWords(item.word);

//   skybattle.enemies = words.map((word, i) => ({
//     id: `${Date.now()}-${i}-${word}`,
//     word,
//     correct: String(word).toLowerCase() === String(item.word).toLowerCase(),
//     x: 700 + (i * 120),
//     y: 110 + i * 95 + (Math.random() * 24 - 12),
//     w: 130,
//     h: 52,
//     vx: 110 + Math.random() * 40,
//     hit: false
//   }));

//   skybattle.bullets = [];
// }

function skybattleNextWave(speakNow = false){
  if(!skybattle) return;

  const item = skybattlePickPrompt();
  if(!item) return;

  const promptEl = document.getElementById("skybattle-prompt");
  if(promptEl){
    promptEl.innerHTML = `🎯 Shoot: <span style="color:var(--accent);">${item.word}</span>`;
  }

  if(speakNow) speak(item.word);
}

function skybattleCanSpawnAt(x, y, w, gapX = 150, gapY = 95){
  if(!skybattle?.enemies?.length) return true;

  for(const e of skybattle.enemies){
    if(e.hit) continue;

    const dx = Math.abs(e.x - x);
    const dy = Math.abs(e.y - y);

    if(dx < ((e.w + w) * 0.5 + gapX) && dy < gapY){
      return false;
    }
  }

  return true;
}

function skybattleSpawnEnemy(forceCorrect = false){
  if(!skybattle || !currentLesson?.items?.length) return;
  if((skybattle.enemies?.length || 0) >= 6) return;

  const items = currentLesson.items;
  const promptWord = String(skybattle?.promptItem?.word || "").toLowerCase();

  let chosen = null;
  let isCorrect = false;

  if(forceCorrect && promptWord){
    chosen = items.find(it => String(it.word || "").toLowerCase() === promptWord) || null;
    isCorrect = !!chosen;
  }

  if(!chosen){
    const makeCorrect = promptWord && Math.random() < 0.28;
    if(makeCorrect){
      chosen = items.find(it => String(it.word || "").toLowerCase() === promptWord) || null;
      isCorrect = !!chosen;
    }
  }

  if(!chosen){
    chosen = items[Math.floor(Math.random() * items.length)];
    isCorrect = String(chosen?.word || "").toLowerCase() === promptWord;
  }

  if(!chosen) return;

  const wordText = String(chosen.word || "");
  const boxW = Math.max(120, Math.min(210, 34 + wordText.length * 16));

  let placed = false;
  let tries = 0;

  while(!placed && tries < 18){
    tries++;

    const laneY = 110 + Math.random() * 470;
    const spawnX = isCorrect ? 1080 : 1030;
    const speed = 90 + Math.random() * 45;

    const gapX = isCorrect ? 230 : 150;
    const gapY = isCorrect ? 120 : 95;

    if(!skybattleCanSpawnAt(spawnX, laneY, boxW, gapX, gapY)){
      continue;
    }

    skybattle.enemies.push({
      id: `sb-${Date.now()}-${Math.random().toString(16).slice(2,8)}`,
      word: wordText,
      correct: isCorrect,
      x: spawnX,
      y: laneY,
      w: boxW,
      h: 56,
      vx: speed,
      hit: false
    });

    placed = true;
  }
}

// function skybattleFire(){
//   if(!skybattle || skybattle.paused || skybattle.ended) return;
//   if(skybattle.player.fireCd > 0) return;

//   skybattle.player.fireCd = 0.18;
//   skybattle.bullets.push({
//     x: skybattle.player.x + 34,
//     y: skybattle.player.y,
//     r: 7,
//     vx: 520
//   });
// }

function skybattleFire(){
  if(!skybattle || skybattle.paused || skybattle.ended) return;
  if(skybattle.player.fireCd > 0) return;

  const p = skybattle.player;
  const facingLeft = !!p.flipX;
  const isTank = p.kind === "tank";

  p.fireCd = 0.18;

  skybattle.bullets.push({
    x: p.x + (facingLeft ? (isTank ? -28 : -34) : (isTank ? 28 : 34)),
    y: p.y + (isTank ? -2 : -6),
    r: 7,
    vx: facingLeft ? -520 : 520
  });
}

function skybattleAddBurst(x, y, text = "💥"){
  if(!skybattle) return;
  skybattle.bursts.push({
    x, y, text,
    t: 0.5
  });
}

function skybattleDamage(reason = "wrong"){
  if(!skybattle || skybattle.ended) return;

  skybattle.wrongHits++;
  sbRewardFx({ emoji:"💥", text:"Watch out!", shake:true });

  if(skybattle.wrongHits >= skybattle.maxWrongHits){
    skybattleFinish("fail");
    return;
  }

  skybattleNextWave(false);
  skybattleUpdateHud();
}

function skybattleUpdate(dt){
  if(!skybattle || skybattle.ended) return;

  skybattle.bgX = (skybattle.bgX + 22 * dt) % 960;
  skybattle.starsX = (skybattle.starsX + 60 * dt) % 960;
  skybattle.timeLeft = Math.max(0, skybattle.timeLeft - dt);
  skybattle.player.fireCd = Math.max(0, skybattle.player.fireCd - dt);

  // const p = skybattle.player;

  // p.frameTimer += dt;
  // if(p.frameTimer >= p.frameSpeed){
  //   p.frameTimer = 0;
  //   p.frameIndex = (p.frameIndex + 1) % Math.max(1, p.frameCount || 1);
  // }

  // if(skybattle.controls.up) p.y -= p.speed * dt;
  // if(skybattle.controls.down) p.y += p.speed * dt;

  // if(skybattle.controls.left){
  //   p.x -= p.speed * dt;
  //   p.flipX = true;
  // }

  // if(skybattle.controls.right){
  //   p.x += p.speed * dt;
  //   p.flipX = false;
  // }

  // p.x = Math.max(80, Math.min(460, p.x));
  // p.y = Math.max(70, Math.min(650, p.y));

    const p = skybattle.player;

let movingUp = false;
let movingDown = false;
let movingSide = false;

if(skybattle.controls.up){
  p.y -= p.speed * dt;
  movingUp = true;
}

if(skybattle.controls.down){
  p.y += p.speed * dt;
  movingDown = true;
}

if(skybattle.controls.left){
  p.x -= p.speed * dt;
  p.flipX = true;
  movingSide = true;
}

if(skybattle.controls.right){
  p.x += p.speed * dt;
  p.flipX = false;
  movingSide = true;
}

if(movingUp){
  p.animState = "climb";
} else if(movingDown){
  p.animState = "dive";
} else if(movingSide){
  p.animState = "boost";
} else {
  p.animState = "idle";
}

const anim = skybattleAnimFrames(p);
const frames = anim[p.animState] || anim.idle || [0];

const animSpeed =
  p.animState === "boost" ? 0.06 :
  p.animState === "climb" ? 0.07 :
  p.animState === "dive"  ? 0.09 :
  0.10;

p.animTimer += dt;
if(p.animTimer >= animSpeed){
  p.animTimer = 0;
  p.animFramePos = (p.animFramePos + 1) % frames.length;
}

p.frameIndex = frames[p.animFramePos] ?? frames[0] ?? 0;

p.x = Math.max(80, Math.min(1120, p.x));
p.y = Math.max(70, Math.min(650, p.y));

  for(const b of skybattle.bullets){
    b.x += b.vx * dt;
  }
  // skybattle.bullets = skybattle.bullets.filter(b => b.x < 1040);
  skybattle.bullets = skybattle.bullets.filter(b => b.x > -120 && b.x < 1400);

  for(const e of skybattle.enemies){
    e.x -= e.vx * dt;
  }

  for(const burst of skybattle.bursts){
    burst.t -= dt;
  }
  skybattle.bursts = skybattle.bursts.filter(b => b.t > 0);

  for(const enemy of skybattle.enemies){
    if(enemy.hit) continue;

    const dx = Math.abs(enemy.x - p.x);
    const dy = Math.abs(enemy.y - p.y);

    if(dx < 60 && dy < 40){
      enemy.hit = true;
      skybattle.wrongHits++;
      sbRewardFx({ emoji:"💥", text:"Crash!", shake:true });

      if(skybattle.wrongHits >= skybattle.maxWrongHits){
        skybattleFinish(false);
        return;
      }

      if(enemy.correct){
        skybattleNextWave(false);
        skybattleSpawnEnemy(true);
      }

      skybattleUpdateHud();
      return;
    }

    if(enemy.x < -120){
      enemy.hit = true;

      if(enemy.correct){
        skybattle.wrongHits++;
        sbRecordAttempt(currentLesson.title, false);
        sbRewardFx({ emoji:"💨", text:"Missed it!", shake:true });

        if(skybattle.wrongHits >= skybattle.maxWrongHits){
          skybattleFinish(false);
          return;
        }

        skybattleNextWave(false);
        skybattleSpawnEnemy(true);
      }
    }
  }

  for(const bullet of skybattle.bullets){
    for(const enemy of skybattle.enemies){
      if(enemy.hit) continue;

      const dx = Math.abs(bullet.x - enemy.x);
      const dy = Math.abs(bullet.y - enemy.y);

      if(dx < enemy.w * 0.42 && dy < enemy.h * 0.52){
        enemy.hit = true;
        bullet.x = 99999;

        if(enemy.correct){
          skybattle.score++;
          sbRecordAttempt(skybattle.lessonTitle, true);
          sbAwardStar(skybattle.lessonTitle, 1);
          skybattleAddBurst(enemy.x, enemy.y, "✨");
          sbRewardFx({ emoji:"⭐", text:"+1 STAR!", shake:false });

          if(sbIsMultiplayerRaceActive("skybattle")){
            const pct = Math.round((skybattle.score / skybattle.goalScore) * 100);
            sbSendRaceProgress("skybattle", pct);
          }

          if(skybattle.score >= skybattle.goalScore){
            skybattleFinish("win");
            return;
          }

          skybattleNextWave(true);
          skybattleSpawnEnemy(true);
          skybattleUpdateHud();
          return;
        } else {
          sbRecordAttempt(skybattle.lessonTitle, false);
          skybattleAddBurst(enemy.x, enemy.y, "🔥");
          skybattleDamage("wrong-word");
          return;
        }
      }
    }
  }

  // skybattle.bullets = skybattle.bullets.filter(b => b.x < 9000);
  skybattle.bullets = skybattle.bullets.filter(b => b.x > -120 && b.x < 1400);

  skybattle.spawnTimer += dt;
  if(skybattle.spawnTimer >= skybattle.spawnGap){
    skybattle.spawnTimer = 0;
    skybattleSpawnEnemy(false);
  }

  skybattle.enemies = skybattle.enemies.filter(e => !e.hit && e.x > -160);

  if(skybattle.timeLeft <= 0){
    skybattleFinish(skybattle.score >= skybattle.goalScore ? "win" : "fail");
    return;
  }

  skybattleUpdateHud();
}

function skybattleFinish(result){
  if(!skybattle || skybattle.ended) return;

  skybattle.ended = true;
  skybattle.running = false;

  if(result === "win"){
    sbRewardFx({ emoji:"🏆", text:"Sky Battle Clear!", shake:true });
  } else {
    sbRewardFx({ emoji:"💨", text:"Try again!", shake:false });
  }

  if(sbIsMultiplayerRaceActive("skybattle")){
    sbSendRaceComplete("skybattle", {
      score: Number(skybattle.score || 0),
      wrongHits: Number(skybattle.wrongHits || 0),
      timeLeft: Number(Math.max(0, Math.ceil(skybattle.timeLeft || 0)))
    });
  } else {
    setTimeout(() => {
      openLessonHub(currentLessonIndex);
    }, 1200);
  }
}

function skybattleUpdateHud(){
  const el = document.getElementById("skybattle-hud");
  if(!el || !skybattle) return;

  let stars = 0;
  let streak = 0;
  try{
    const prog = sbGetLessonProgress(skybattle.lessonTitle);
    stars = prog?.entry?.stars || 0;
    streak = prog?.entry?.streak || 0;
  }catch(e){}

  el.innerHTML =
    `⭐ ${stars} &nbsp;|&nbsp; 🔥 ${streak} &nbsp;|&nbsp; ` +
    `🎯 ${skybattle.score}/${skybattle.goalScore} &nbsp;|&nbsp; ` +
    `💥 ${skybattle.wrongHits}/${skybattle.maxWrongHits} &nbsp;|&nbsp; ` +
    `⏱ ${Math.ceil(skybattle.timeLeft)}s` +
    (skybattle.paused ? ` &nbsp;|&nbsp; ⏸ Paused` : ``);
}

// function skybattleDrawPlayer(ctx, p){
//   ctx.save();
//   ctx.translate(p.x, p.y);

//   if(p.spriteReady && p.sprite){
//     const img = p.sprite;
//     const dw = 90;
//     const dh = 70;
//     ctx.drawImage(img, 0, 0, img.width, img.height, -dw/2, -dh/2, dw, dh);
//   } else {
//     ctx.font = "52px system-ui";
//     ctx.textAlign = "center";
//     ctx.textBaseline = "middle";
//     ctx.fillText(sbMyVehicle && sbMyVehicle() === "tank" ? "🦄" : "🪽", 0, 0);
//   }

//   ctx.restore();
// }

function skybattleDrawPlayer(ctx, p){
  ctx.save();
  ctx.translate(p.x, p.y);

  if(p.flipX){
    ctx.scale(-1, 1);
  }

  if(p.spriteReady && p.spriteImg && p.frameW > 0 && p.frameH > 0){
    const cols = Math.max(1, p.spriteCols || 1);
    const frameCount = Math.max(1, p.frameCount || 1);
    const safeIndex = Math.max(0, Math.min(frameCount - 1, p.frameIndex || 0));

    const sx = (safeIndex % cols) * p.frameW;
    const sy = Math.floor(safeIndex / cols) * p.frameH;

    const dw = p.frameW * (p.drawScale || 1);
    const dh = p.frameH * (p.drawScale || 1);

    ctx.drawImage(
      p.spriteImg,
      sx, sy, p.frameW, p.frameH,
      -dw / 2, -dh / 2, dw, dh
    );
  } else {
    ctx.font = "52px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(p.kind === "tank" ? "🦄" : "🪽", 0, 0);
  }

  ctx.restore();
}

function skybattleDraw(ctx){
  if(!skybattle) return;

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.clearRect(0, 0, w, h);

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#081225");
  g.addColorStop(0.55, "#12305f");
  g.addColorStop(1, "#182b52");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(255,255,255,.45)";
  for(let i = 0; i < 50; i++){
    const x = ((i * 37) - skybattle.starsX + w) % w;
    const y = (i * 29) % h;
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#ffffff";
  for(let i=0;i<6;i++){
    const x = ((i*180) - skybattle.bgX + w) % w;
    const y = 70 + (i%3)*70;
    ctx.fillRect(x, y, 90, 16);
    ctx.fillRect(x+20, y-14, 56, 14);
  }
  ctx.globalAlpha = 1;

  skybattleDrawPlayer(ctx, skybattle.player);

  for(const bullet of skybattle.bullets){
    ctx.fillStyle = "#ffd54f";
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for(const enemy of skybattle.enemies){
    if(enemy.hit) continue;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    ctx.fillStyle = enemy.correct ? "#2ecc71" : "#ff7675";
    ctx.strokeStyle = "rgba(255,255,255,.25)";
    ctx.lineWidth = 2;

    const bw = enemy.w;
    const bh = enemy.h;

    ctx.beginPath();
    ctx.roundRect(-bw/2, -bh/2, bw, bh, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "900 22px Comic Sans MS, cursive";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(enemy.word, 0, 0);

    ctx.restore();
  }

  for(const burst of skybattle.bursts){
    ctx.save();
    ctx.globalAlpha = Math.max(0, burst.t / 0.5);
    ctx.font = "32px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(burst.text, burst.x, burst.y);
    ctx.restore();
  }

  if(skybattle.paused){
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 42px Comic Sans MS, cursive";
    ctx.textAlign = "center";
    ctx.fillText("Paused", w/2, h/2);
  }
}



/* =========================================================
   ⚔️ Word Warrior (Action Lite) - Pro
   ========================================================= */
let warrior = null;


function openWarriorHub(fromRemote=false){
  sbRequirePro(()=>{
    gameMode = "warrior";
    showPage("warrior-page");
    if(SB_NET.connected && SB_NET.role === 'host' && !fromRemote){
      const payload = sbMakeNetLessonPayload(currentLesson);
      if(payload) globalSend({ type:'page_jump', roomId:SB_NET.roomId, gameId:'warrior', lesson:payload });
    }
    const c = document.getElementById("warrior-canvas");
    if(c && !c.__sbWarriorBound){
      c.__sbWarriorBound = true;
      c.addEventListener("pointerdown", (e)=> warriorHandleTap(e.clientX, e.clientY));
    }
    warriorInit("boxes", { remote: fromRemote });
    warriorLoop();
  });
}



function warriorStart(mode, opts={}){
  sbRequirePro(()=>{
    if(SB_NET.connected && mode !== 'boxes'){
      sbToast('Multiplayer uses Word Boxes first. Sword Spelling stays local for now.');
      return;
    }
    gameMode = "warrior";
    showPage("warrior-page");
    warriorInit(mode, opts);
    warriorLoop();
  });
}

function sbCharacterForTeam(team){ return team === "blue" ? "aria" : "athena"; }
function sbSpriteForTeam(team){ return team === "blue" ? "./assets/AriaSprite2.png" : "../assets/AthenaSprite3.png"; }
function sbDisplayNameForTeam(team){ return team === "blue" ? "Aria" : "Athena"; }

function warriorIsSinglePlayer(){
  return !SB_NET.connected;
}

function warriorSingleTeam(){
  return (SB_NET.team === "blue") ? "blue" : "red";
}

function warriorVisibleTeams(){
  if (warriorIsSinglePlayer()) return [warriorSingleTeam()];
  return ["red", "blue"];
}

function warriorGetCharacter(team){
  if(!warrior || !warrior.characters) return null;
  return warrior.characters[team] || null;
}

function warriorInit(mode, opts={}){
  const canvas = document.getElementById("warrior-canvas");
  if(!canvas) return;
  const ctx = canvas.getContext("2d");

  warrior = {
    mode,
    canvas,
    ctx,
    running:true,
    paused:false,
    raf:0,
    promptText:"",
    correctWord:"",
    spellingTarget:"",
    spellingProgress:"",
    countdownActive:false,
    countdownValue:0,
    countdownLabel:"",
    countdownTimer:null,
    showTargets:true,
    pendingRound:null,
    pendingScore:null,
    shake:0,
    bgX:0,
    singlePlayer: !SB_NET.connected,

    characters:{
      red:{
        team:"red",
        x:160,
        y:360,
        baseY:360,
        state:"idle",
        t:0,
        dashFromX:160,
        dashToX:160,
        pendingTargetX:null,
        pendingBox:null,
        pendingTarget:null,
        facing:1,
        facingRight:true,
        visible:true,
        emoji:"🛡️",
        spriteRef:"../assets/AthenaSprite3.png",
        spriteImg:null,
        spriteReady:false,
        cols:25,
        rows:1,
        frameW:0,
        frameH:0,
        drawW:160,
        drawH:160,
        anim:{
          idle:[0],
          walk:[4,5,6,7],
          run:[8,9],
          dash:[10,11,12,13],
          launch:[14,15,16],
          land:[17,18,19,19,19],
          fail:[24,23,21,21,23,24],
        }
      },

      blue:{
        team:"blue",
        x:740,
        y:360,
        baseY:360,
        state:"idle",
        t:0,
        dashFromX:740,
        dashToX:740,
        pendingTargetX:null,
        pendingBox:null,
        pendingTarget:null,
        facing:-1,
        facingRight:false,
        visible:true,
        emoji:"🏹",
        spriteRef:"../assets/AriaSprite3.png",
        spriteImg:null,
        spriteReady:false,
        cols:25,
        rows:1,
        frameW:0,
        frameH:0,
        drawW:160,
        drawH:160,
        anim:{
          idle:[0],
          walk:[4,5,6,7],
          run:[8,9],
          dash:[10,11,12,13],
          launch:[14,15,16,17],
          land:[17,18,19,19,19],
          fail:[24,23,21,21,23,24],
        }
      }
    },

    targets:[],
  };

  if(!Array.isArray(wordQueue)) wordQueue = [];

  // Decide which team(s) should be visible
  const visibleTeams = warriorVisibleTeams();

  for (const team of ["red", "blue"]) {
    const c = warrior.characters[team];
    c.visible = visibleTeams.includes(team);
  }

  // If single player, center the one visible hero
  if (warrior.singlePlayer) {
    const soloTeam = warriorSingleTeam();
    const c = warrior.characters[soloTeam];
    if (c) {
      c.x = 450;
      c.dashFromX = 450;
      c.dashToX = 450;
      c.facing = 1;
    }
  }

  (async ()=>{
    try{
      const chars = visibleTeams
        .map(team => warrior?.characters?.[team])
        .filter(Boolean);

      for(const c of chars){
        if(!c?.spriteRef) continue;

        const src = (typeof sbResolveImageSrc === "function")
          ? await sbResolveImageSrc(c.spriteRef)
          : c.spriteRef;

        if(!src) continue;

        const img = new Image();
        img.onload = ()=>{
          if(!warrior || !warrior.characters) return;
          c.spriteImg = img;
          c.spriteReady = true;
          c.frameW = Math.floor(img.width / c.cols);
          c.frameH = Math.floor(img.height / c.rows);
        };
        img.onerror = ()=>{
          console.warn("Warrior sprite failed to load:", c.spriteRef);
        };
        img.src = src;
      }
    }catch(err){
      console.warn("Warrior sprite load error:", err);
    }
  })();

  if (SB_NET.connected && opts?.remote) {
    warrior.promptText = "Waiting for host...";
    warrior.correctWord = "";
    warrior.targets = [];
    warrior.showTargets = false;
    warriorUpdateHud();
    sbUpdateWarriorNetStatus("Connected. Waiting for host round...");
    return;
  }

//   warriorNextRound();
//   warriorUpdateHud();
//   sbUpdateWarriorNetStatus();

if (!SB_NET.connected) {
  warriorNextRound();
} else {
  warrior.promptText = "Press Start Round";
  warrior.correctWord = "";
  warrior.targets = [];
  warrior.showTargets = false;
}

warriorUpdateHud();
sbUpdateWarriorNetStatus();
}

function warriorStartCountdown(seconds = 3){
    if (SB_NET.connected) {
  sbUpdateWarriorNetStatus(`Countdown: ${seconds}…`);
}
  if(!warrior) return;

  if(warrior.countdownTimer){
    clearInterval(warrior.countdownTimer);
    warrior.countdownTimer = null;
  }

  warrior.countdownActive = true;
  warrior.countdownValue = seconds;
  warrior.showTargets = false;
  warrior.countdownLabel = String(seconds);
  SB_NET.roundActive = false;
  warriorUpdateHud();

  warrior.countdownTimer = setInterval(() => {
    if(!warrior) return;

    warrior.countdownValue--;

    if(warrior.countdownValue > 0){
      warrior.countdownLabel = String(warrior.countdownValue);
      warriorUpdateHud();
      return;
    }

    if(warrior.countdownValue === 0){
      warrior.countdownLabel = "START!";
      warrior.showTargets = true;
      SB_NET.roundActive = true;
      warriorUpdateHud();
      sbUpdateWarriorNetStatus(`START! • Score ${SB_NET.score.red}-${SB_NET.score.blue}`);
      return;
    }

    clearInterval(warrior.countdownTimer);
    warrior.countdownTimer = null;
    warrior.countdownActive = false;
    warrior.countdownLabel = "";
    warriorUpdateHud();
  }, 1000);
}

function warriorStop(){
  if(warrior?.raf) cancelAnimationFrame(warrior.raf);
  if(warrior) warrior.running = false;
}

function warriorTogglePause(){
  if(!warrior) return;
  warrior.paused = !warrior.paused;
  warriorUpdateHud();
}

function repeatWarriorPrompt(){
  if(!warrior) return;
  // Speak current correct word (best for kids)
  if(warrior.correctWord) speak(warrior.correctWord);
}

function warriorLoop(){
  if(!warrior || !warrior.running) return;
  warrior.raf = requestAnimationFrame(warriorLoop);
  if(warrior.paused) return;
  warriorUpdate();
  warriorDraw();
}

function warriorUpdate() {
  warrior.bgX = (warrior.bgX + 1.2) % 900;

  warrior.shake *= 0.88;
  if (warrior.shake < 0.2) warrior.shake = 0;

  const chars = warriorVisibleTeams()
    .map(team => warriorGetCharacter(team))
    .filter(c => c && c.visible !== false);

  for (const c of chars) {
    c.t += 1;

    if ((c.state === "launch" || c.state === "land") && typeof c.pendingTargetX === "number") {
      c.facing = (c.pendingTargetX >= c.dashFromX) ? 1 : -1;
    }

    if (c.state === "launch") {
      const p = Math.min(1, c.t / 30);
      const height = 110 * Math.sin(Math.PI * p);
      c.y = c.baseY - height;
      if (p >= 1) {
        c.state = "land";
        c.t = 0;
        c.y = c.baseY;
      }
    }

    if (c.state === "land") {
      if (c.t > 12) {
        c.state = "idle";
        c.t = 0;
        c.y = c.baseY;
        c.pendingTargetX = null; 
      }
    }

    if (c.state === "dash") {
      const p = Math.min(1, c.t / 16);
      c.x = c.dashFromX + (c.dashToX - c.dashFromX) * easeOutCubic(p);
      c.facing = (c.dashToX >= c.dashFromX) ? 1 : -1;

      if (p >= 1) {
        if (warrior.mode === "boxes" && c.pendingBox) {
          c.state = "launch";
          c.t = 0;

          const target = c.pendingBox;
          c.pendingBox = null;

          target.hitState = "hit";
          target.hitT = 0;

          const lessonTitle = currentLesson?.title || "Lesson";
          sbRecordAttempt(lessonTitle, true);
          sbAwardStar(lessonTitle, 1);

          if (typeof sbRewardFx === "function") {
            const praise = (typeof praises !== "undefined" && Array.isArray(praises) && praises.length)
              ? praises[Math.floor(Math.random() * praises.length)]
              : "Great job!";
            sbRewardFx({
              emoji: "⭐",
              text: `${praise} ${c.team === "red" ? "Athena" : "Aria"} scored!`,
              shake: true
            });
          }

          warrior.shake = 10;

          if (!SB_NET.connected) {
            setTimeout(() => {
              if (warrior?.running) warriorNextRound();
            }, 900);
          }

        } else if (warrior.mode === "spell" && c.pendingTarget) {
          c.state = "launch";
          c.t = 0;

          const target = c.pendingTarget;
          c.pendingTarget = null;
          target.hitState = "hit";
          target.hitT = 0;

          if (warrior.spellingProgress.length >= warrior.spellingTarget.length) {
            if (typeof sbRewardFx === "function") {
              sbRewardFx({ emoji: "🔥", text: "COMBO!", shake: true });
            }
            warrior.shake = 14;
            if (!SB_NET.connected) {
              setTimeout(() => {
                if (warrior?.running) warriorNextRound();
              }, 900);
            }
          } else {
            warriorUpdatePrompt();
          }
        } else {
          c.state = "idle";
          c.t = 0;
        }
      }
    }

    if (c.state === "fail") {
      if (c.t > 55) {
        c.state = "idle";
        c.t = 0;
      }
    }

    if (c.state === "slash") {
      if (c.t > 10) {
        c.state = "idle";
        c.t = 0;
      }
    }
  }

  for (const t of warrior.targets) {
    if (t.shakeT > 0) t.shakeT -= 1;
    if (t.hitState === "hit") t.hitT += 1;
  }
}

function warriorDraw(){
  const ctx = warrior.ctx;
  const w = ctx.canvas.width, h = ctx.canvas.height;

  const camShakeX = warrior.shake ? (Math.random()-0.5) * warrior.shake : 0;
  const camShakeY = warrior.shake ? (Math.random()-0.5) * warrior.shake : 0;

  ctx.save();
  ctx.translate(camShakeX, camShakeY);

  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(0,0,w,h);

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#fff";
  for(let i=0;i<7;i++){
    const x = ((i*160) - warrior.bgX + w) % w;
    const y = 70 + (i%3)*44;
    ctx.fillRect(x, y, 92, 14);
    ctx.fillRect(x+22, y-12, 64, 12);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#121a3a";
  ctx.fillRect(0, h-90, w, 90);

  ctx.font = "900 22px system-ui";
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.fillText(warrior.promptText, 24, 38);

  if (warrior.showTargets) {
    for(const t of warrior.targets){
      drawWarriorTarget(ctx, t);
    }
  }

  const chars = warriorVisibleTeams()
    .map(team => warriorGetCharacter(team))
    .filter(c => c && c.visible !== false);

  for (const c of chars) {
    drawWarriorCharacter(ctx, c);
  }

  if (warrior.countdownActive && warrior.countdownLabel) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 72px Arial";
    ctx.fillText(warrior.countdownLabel, w / 2, h / 2);
    ctx.restore();
  }

  ctx.restore();
}

function drawWarriorCharacter(ctx, c) {
  if(!c) return;

  const bob = (c.state === "idle") ? Math.sin(Date.now() / 140) * 4 : 0;
  let x = c.x;
  if (c.state === "fail") x += Math.sin(c.t) * 6;

  ctx.save();
  ctx.imageSmoothingEnabled = true;

  // flip around center
  ctx.translate(Math.round(x), Math.round(c.y + bob));
  ctx.scale(c.facing === -1 ? -1 : 1, 1);

  if (c.spriteReady && c.spriteImg && c.frameW && c.frameH) {
    const anim = c.anim || {};
    let frames = anim[c.state] || anim.idle || [0];

    const isOneShot = (c.state === "launch" || c.state === "land" || c.state === "fail");

    const speed =
      (c.state === "dash")   ? 4 :
      (c.state === "launch") ? 5 :
      (c.state === "land")   ? 5 :
      12;

    let fi = Math.floor(c.t / speed);
    fi = isOneShot ? Math.min(frames.length - 1, fi) : (fi % frames.length);

    const frameIndex = frames[fi] ?? frames[0];
    const col = frameIndex % c.cols;
    const row = Math.floor(frameIndex / c.cols);
    const sx = col * c.frameW;
    const sy = row * c.frameH;

    const dw = c.drawW || c.frameW;
    const dh = c.drawH || c.frameH;

    ctx.drawImage(
      c.spriteImg,
      sx, sy, c.frameW, c.frameH,
      -Math.round(dw / 2), -Math.round(dh / 2),
      dw, dh
    );
  } else {
    ctx.font = "72px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(c.emoji || "✊", 0, 0);
  }

  ctx.restore();
}

function drawWarriorTarget(ctx, t){
  const shakeX = t.shakeT > 0 ? Math.sin(t.shakeT * 1.3) * 6 : 0;

  let alpha = 1;
  let scale = 1;
  if(t.hitState === "hit"){
    alpha = Math.max(0, 1 - t.hitT / 18);
    scale = 1 + t.hitT / 22;
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(t.x + t.w/2 + shakeX, t.y + t.h/2);
  ctx.scale(scale, scale);
  ctx.translate(-t.w/2, -t.h/2);

  ctx.fillStyle = "rgba(255,255,255,.08)";
  ctx.strokeStyle = t.isCorrect ? "rgba(255,204,0,.65)" : "rgba(255,255,255,.18)";
  ctx.lineWidth = 3;
  roundRect(ctx, 0, 0, t.w, t.h, 16, true, true);

  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.font = "900 28px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(t.label, t.w/2, t.h/2);

  ctx.restore();
}

function warriorHandleTap(clientX, clientY){
  if(!warrior || warrior.paused) return;
  if (warrior?.countdownActive || !warrior?.showTargets) return;

  const rect = warrior.canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (warrior.canvas.width / rect.width);
  const y = (clientY - rect.top) * (warrior.canvas.height / rect.height);

  for(const t of warrior.targets){
    if(t.hitState === "hit") continue;
    if(x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h){
      warriorPick(t);
      return;
    }
  }
}

function warriorPick(target){
  if(!warrior || !target) return;
  if (warrior.countdownActive || !warrior.showTargets) return;

  if (SB_NET.connected && SB_NET.role === 'host' && !SB_NET.hostPlays) {
    sbToast("Host is spectating and cannot answer.");
    return;
  }

  const lessonTitle = currentLesson?.title || "Lesson";

  // Multiplayer: only boxes mode is networked
  if(SB_NET.connected && warrior.mode === "boxes"){
    if(!SB_NET.roundActive) return;

    globalSend({
      type:'warrior_answer',
      roomId:SB_NET.roomId,
      team:SB_NET.team,
      targetId: target.id,
      answer: target.label
    });
    return;
  }

  // Local Mode
  const myTeam = SB_NET.connected ? (SB_NET.team || "red") : warriorSingleTeam();
  const c = warrior.characters ? warrior.characters[myTeam] : warrior.character;

  if(!c) return;

  const targetCenterX = target.x + target.w / 2;
  c.facing = (targetCenterX >= c.x) ? 1 : -1;

  // =========================
  // BOXES MODE
  // =========================
  if(warrior.mode === "boxes"){
    if(target.isCorrect){
      c.pendingBox = target;
      c.pendingTargetX = targetCenterX;
      c.state = "dash";
      c.t = 0;
      c.dashFromX = c.x;
      c.dashToX = targetCenterX;
    } else {
      warriorPerformFail(target, myTeam);
      sbRecordAttempt(lessonTitle, false);
      if(typeof sbRewardFx === "function"){
        sbRewardFx({ emoji:"😅", text:"Try again!", shake:false });
      }
    }

    warriorUpdateHud();
    return;
  }

  // =========================
  // SPELL MODE
  // =========================
  if(warrior.mode === "spell"){
    const next = warrior.spellingTarget[warrior.spellingProgress.length];

    if(target.label === next){
      c.pendingTarget = target;
      c.pendingTargetX = targetCenterX;
      c.state = "dash";
      c.t = 0;
      c.dashFromX = c.x;
      c.dashToX = targetCenterX;

      // advance spelling immediately
      warrior.spellingProgress += next;

      warriorUpdatePrompt();
    } else {
      warriorPerformFail(target, myTeam);
      sbRecordAttempt(lessonTitle, false);

      if(typeof sbRewardFx === "function"){
        sbRewardFx({ emoji:"❌", text:"Wrong letter!", shake:false });
      }
    }

    warriorUpdateHud();
    return;
  }
}

function warriorNextRound(){
  if (SB_NET.connected && SB_NET.role !== 'host') return;
  if(!currentLesson?.items?.length) return;

  if(!Array.isArray(wordQueue) || wordQueue.length === 0){
    wordQueue = [...currentLesson.items].sort(()=>0.5 - Math.random());
  }

  const item = wordQueue.pop();
  if(!item) return;

  warrior.correctWord = (item.word || "").toString();
  const upWord = warrior.correctWord.toUpperCase();

  if(warrior.mode === "boxes"){
    warrior.promptText = `Find: ${warrior.correctWord}`;
    speak(warrior.correctWord);

    const n = 3;
    const pool = currentLesson.items.filter(x => (x.word || "").toString() !== warrior.correctWord);
    const picks = [];

    while(picks.length < n - 1 && pool.length){
      picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }

    const choices = [item, ...picks].sort(()=>0.5 - Math.random());
    const totalW = n * 220 + (n - 1) * 18;
    const startX = (900 - totalW) / 2;

    warrior.targets = choices.map((c, i)=>({
      id: "box_" + i,
      label: ((c.word || "").toString()).toUpperCase(),
      isCorrect: ((c.word || "").toString() === warrior.correctWord),
      x: startX + i * (220 + 18),
      y: 160,
      w: 220,
      h: 92,
      hitState: "idle",
      hitT: 0,
      shakeT: 0,
    }));
  }

  if(warrior.mode === "spell"){
    warrior.spellingTarget = upWord;
    warrior.spellingProgress = "";
    warriorUpdatePrompt();
    speak(warrior.correctWord);

    const letters = warrior.spellingTarget.split("").sort(()=>0.5 - Math.random());
    warrior.targets = letters.map((ch, i)=>({
      id: "ltr_" + i,
      label: ch,
      isCorrect: false,
      x: 140 + (i * 180) % 720,
      y: 150 + Math.floor(i / 4) * 120,
      w: 140,
      h: 90,
      hitState: "idle",
      hitT: 0,
      shakeT: 0,
    }));
  }

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

  if(SB_NET.connected && SB_NET.role === 'host' && warrior.mode === 'boxes'){
    SB_NET.roundActive = true;
    globalSend({
      type: 'warrior_round',
      roomId: SB_NET.roomId,
      round: warriorBuildRoundPayload(),
      score: SB_NET.score
    });
    sbUpdateWarriorNetStatus(`Round live • Score ${SB_NET.score.red}-${SB_NET.score.blue}`);
  }
}

function warriorUpdatePrompt(){
  const blanks = warrior.spellingTarget
    .split("")
    .map((ch, i)=> (i < warrior.spellingProgress.length ? ch : "_"))
    .join(" ");
  warrior.promptText = `Spell: ${blanks}`;
}

function warriorUpdateHud(){
  const hud = document.getElementById("warrior-hud");
  if(!hud || !warrior) return;

  let stars = 0, streak = 0;
  try{
    const prog = sbGetLessonProgress(currentLesson?.title || "Lesson");
    stars = prog?.entry?.stars || 0;
    streak = prog?.entry?.streak || 0;
  }catch(e){}

  const redName = sbDisplayNameForTeam('red');
  const blueName = sbDisplayNameForTeam('blue');

  let extra = '';
  if(SB_NET.connected){
    extra =
      ` &nbsp;|&nbsp; 👥 ${SB_NET.role === 'host' ? 'Host' : 'Player'} ${SB_NET.team.toUpperCase()}` +
      ` &nbsp;|&nbsp; Score: ${redName}: ${SB_NET.score.red} - ${blueName}: ${SB_NET.score.blue}`;
  }

  hud.innerHTML =
    `⭐ ${stars} &nbsp;|&nbsp; 🔥 ${streak} &nbsp;|&nbsp; ` +
    `Mode: ${warrior.mode === "boxes" ? "Word Boxes" : "Sword Spelling"}` +
    `${warrior.paused ? " (Paused)" : ""}${extra}`;

  sbUpdateWarriorNetStatus();
}


function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }




function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

   

/* =========================================================
   ✅ Words import / export V1
   ========================================================= */

function sbPackTypeWords(){
  return "study_buddy_words_pack";
}
function sbAssetRef(id){ return `asset:${id}`; }
function sbIsIdbRef(v){ return typeof v === "string" && v.startsWith("idb:"); }
function sbIsAssetRef(v){ return typeof v === "string" && v.startsWith("asset:"); }
function sbDataUrlToBlob(dataUrl){
  const [meta, b64] = String(dataUrl || '').split(',');
  const mime = (meta.match(/data:(.*?);base64/) || [])[1] || "application/octet-stream";
  const bin = atob(b64 || '');
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for(let i=0;i<len;i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
function sbBlobToDataUrl(blob){
  return new Promise((resolve, reject)=>{
    const r = new FileReader();
    r.onload = ()=>resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function sbFormatAccessMode(value = ""){
  return String(value || "").toLowerCase() === "free_library" ? "Free Library" : "Paid";
}

function sbFormatLicenseType(value = ""){
  switch(String(value || "").toLowerCase()){
    case "classroom": return "Classroom License";
    case "school": return "School License";
    case "personal":
    default:
      return "Personal License";
  }
}

function sbFormatExportPolicy(value = ""){
  switch(String(value || "").toLowerCase()){
    case "owner_backup": return "Owner Backup";
    case "classroom_only": return "Classroom Sharing";
    case "full": return "Full Export";
    case "none":
    default:
      return "No Export";
  }
}

function sbGetLessonPolicyMeta(lesson){
  const data = lesson?.data_json || {};
  return {
    importedFromPackId: data.importedFromPackId || lesson?.marketplacePackId || "",
    exportPolicy: data.exportPolicy || "full",
    licenseType: data.licenseType || "personal",
    accessMode: data.accessMode || "paid",
  };
}

function sbGetLessonExportPolicy(lesson){
  return String(
    lesson?.data_json?.exportPolicy ||
    lesson?.exportPolicy ||
    "full"
  ).toLowerCase();
}

function sbIsMarketplaceImportedLesson(lesson){
  return !!(
    lesson?.data_json?.importedFromPackId ||
    lesson?.marketplacePackId
  );
}

function sbCanExportLesson(lesson){
  if(!sbIsMarketplaceImportedLesson(lesson)) return true;

  const policy = sbGetLessonExportPolicy(lesson);
  return policy === "owner_backup" || policy === "full";
}

function sbCanExportAllLessons(){
  return (lessons || []).every(sbCanExportLesson);
}

async function sbBuildWordsExportPack(selectedLessonIds = null){
  await sbLoadLessons();
  const chosen = Array.isArray(selectedLessonIds) && selectedLessonIds.length
    ? lessons.filter(l => selectedLessonIds.includes(l.id))
    : [...lessons];

  const assets = [];
  const assetMap = new Map();
  const clonedLessons = [];

  for(const lesson of chosen){
    const lessonClone = {
      id: lesson.id || sbMakeId(),
      title: lesson.title || "Lesson",
      updatedAt: lesson.updatedAt || Date.now(),
      items: []
    };

    for(const item of (lesson.items || [])){
      const nextItem = {
        word: item.word || "",
        image: item.image || ""
      };

      if(sbIsIdbRef(nextItem.image)){
        const idbId = nextItem.image.slice(4);
        if(!assetMap.has(idbId)){
          const imgRow = await sbGetImage(idbId);
          if(imgRow?.blob){
            const dataUrl = await sbBlobToDataUrl(imgRow.blob);
            const assetId = idbId;
            assetMap.set(idbId, assetId);
            assets.push({
              id: assetId,
              name: imgRow?.meta?.name || `${assetId}.jpg`,
              mimeType: imgRow?.blob?.type || imgRow?.meta?.type || "image/jpeg",
              dataUrl
            });
          }
        }
        nextItem.image = assetMap.has(idbId) ? sbAssetRef(assetMap.get(idbId)) : "";
      }
      lessonClone.items.push(nextItem);
    }
    clonedLessons.push(lessonClone);
  }

  return {
    type: sbPackTypeWords(),
    version: 1,
    app: "words_production",
    exportedAt: Date.now(),
    title: clonedLessons.length === 1 ? (clonedLessons[0].title || "Lesson Pack") : "Words Lesson Pack",
    lessons: clonedLessons,
    assets
  };
}
function sbDownloadJson(filename, obj){
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}

async function sbExportCurrentLesson(){
  let lessonId = currentLesson?.id || null;
  let title = currentLesson?.title || "lesson";

  if(!lessonId && typeof currentLessonIndex === 'number' && currentLessonIndex >= 0 && lessons[currentLessonIndex]?.id){
    lessonId = lessons[currentLessonIndex].id;
    title = lessons[currentLessonIndex].title || title;
  }

  if(!lessonId){
    sbToast("Open a lesson first.");
    return;
  }

  const lesson = lessons.find(l => l.id === lessonId);
  if(!lesson){
    sbToast("Lesson not found.");
    return;
  }

  if(!sbCanExportLesson(lesson)){
    sbToast("Export is disabled by this pack's license.");
    return;
  }

  const pack = await sbBuildWordsExportPack([lessonId]);
  const safe = String(title || 'lesson').replace(/[^a-z0-9-_]+/gi, '_');
  sbDownloadJson(`${safe}_lesson_pack.json`, pack);
  sbToast("⬇️ Lesson exported");
}

async function sbExportAllLessons(){
  if(!sbCanExportAllLessons()){
    sbToast("One or more imported marketplace lessons cannot be exported.");
    return;
  }

  const pack = await sbBuildWordsExportPack();
  sbDownloadJson("study_buddy_words_pack.json", pack);
  sbToast("⬇️ All lessons exported");
}

async function sbImportWordsPackObject(pack, mode = "merge"){
  if(!pack || typeof pack !== 'object') throw new Error("Invalid JSON file.");
  if(pack.type !== sbPackTypeWords()) throw new Error("This is not a Study Buddy words pack.");
  if(pack.version !== 1) throw new Error(`Unsupported pack version: ${pack.version}`);

  const incomingLessons = Array.isArray(pack.lessons) ? pack.lessons : [];
  const incomingAssets = Array.isArray(pack.assets) ? pack.assets : [];
  const assetRefToIdbRef = new Map();

  for(const asset of incomingAssets){
    if(!asset?.id || !asset?.dataUrl) continue;
    const blob = sbDataUrlToBlob(asset.dataUrl);
    const newId = sbMakeId();
    await sbPutImage({
      id: newId,
      blob,
      meta: {
        name: asset.name || `${asset.id}.jpg`,
        type: asset.mimeType || blob.type || "image/jpeg",
        size: blob.size
      }
    });
    assetRefToIdbRef.set(sbAssetRef(asset.id), `idb:${newId}`);
  }

  if(mode === 'replace'){
    const existing = await sbGetAllLessons();
    for(const l of existing){
      try{ await sbDeleteLesson(l.id); }catch(e){}
    }
  }

  for(const lesson of incomingLessons){
    const nextLesson = {
      id: sbMakeId(),
      title: lesson.title || "Imported Lesson",
      updatedAt: Date.now(),
      items: []
    };
    for(const item of (lesson.items || [])){
      let img = item.image || "";
      if(sbIsAssetRef(img) && assetRefToIdbRef.has(img)) img = assetRefToIdbRef.get(img);
      nextLesson.items.push({
        word: item.word || "",
        image: img
      });
    }
    await sbPutLesson(nextLesson);
  }

  await sbLoadLessons();
  await renderMenu();
  sbToast(`✅ Imported ${incomingLessons.length} lesson(s)`);
}
function sbWireWordsImport(){
  const input = document.getElementById('sb-words-import');
  if(!input || input.dataset.wired === '1') return;
  input.dataset.wired = '1';
  input.addEventListener('change', async (e)=>{
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    try{
      const text = await file.text();
      const pack = JSON.parse(text);
      const replace = confirm("Press OK to REPLACE all current lessons.\nPress Cancel to MERGE imported lessons with existing lessons.");
      await sbImportWordsPackObject(pack, replace ? 'replace' : 'merge');
    }catch(err){
      console.error(err);
      alert(err?.message || 'Import failed.');
    }finally{
      input.value = '';
    }
  });
}
/* =========================================================
       ✅ Global Expose (Vite Fix)
       ========================================================= */
    window.openNewLesson = openNewLesson;
    window.resetAllProgress = resetAllProgress;
    window.openStorageManager = openStorageManager;
    window.showPage = showPage;
    window.saveLesson = saveLesson;
    window.addWordRow = addWordRow;
    window.openLessonHub = openLessonHub;
    window.sbCloseModePicker = sbCloseModePicker;
    window.sbLaunch = sbLaunch;
    window.sbEditSelected = sbEditSelected;
    window.sbDeleteSelected = sbDeleteSelected;
    window.toggleHelp = toggleHelp;
    window.repeatTarget = repeatTarget;
    window.nextRound = nextRound;
    window.deleteOneImage = deleteOneImage;
    window.deleteUnusedImages = deleteUnusedImages;
    window.clearAllImages = clearAllImages;
    window.refreshStorageManager = refreshStorageManager;
    window.sbExportCurrentLesson = sbExportCurrentLesson;
    window.sbExportAllLessons = sbExportAllLessons;
    // window.currentLessonIndex = currentLessonIndex;
    window.sbRedeemCode = sbRedeemCode;
    window.sbStartUpgrade = sbStartUpgrade;
    window.runnerTogglePause = runnerTogglePause;
    window.repeatRunnerPrompt = repeatRunnerPrompt;
    window.globalConnect = globalConnect;
    window.globalDisconnect = globalDisconnect;
    window.warriorStart = warriorStart;
    window.warriorTogglePause = warriorTogglePause;
    window.repeatWarriorPrompt = repeatWarriorPrompt;
    window.startRunner = startRunner;
    window.dailyHearAgain = dailyHearAgain;
    window.sbSetGameLocked = sbSetGameLocked;
window.sbIsGameLocked = sbIsGameLocked;
    window.globalConnect = globalConnect;
    window.globalDisconnect = globalDisconnect;


window.sbBackToLesson = function sbBackToLesson(){
  openLessonHub(currentLessonIndex);
};

window.sbGetSafeImageRef = sbGetSafeImageRef;

window.warriorHostStartRound = warriorHostStartRound;
  window.mpHostStartSession = mpHostStartSession;
  window.mpCloseRoomModal = mpCloseRoomModal;
  window.mpOpenRoomModal = openLessonHub;
  window.sbOpenParent = sbOpenParent;
window.sbCloseParent = sbCloseParent;
window.sbSetOrUnlockParent = sbSetOrUnlockParent;
window.sbLockParentNow = sbLockParentNow;
window.startSkyBattle = startSkyBattle;
window.skybattleTogglePause = skybattleTogglePause;
window.repeatSkyBattlePrompt = repeatSkyBattlePrompt;


    /* =========================================================
       ✅ Boot sequence (Async)
       ========================================================= */
    // async function initApp() {
    //   try {
    //     sbEnsureHud();
    //     await sbMigrateLessonsIfNeeded();
    //     await sbLoadLessons();
    //     await renderMenu();
    //     sbUpdateHud();
    //     sbApplyParentMode();
    //     sbWireWordsImport();
    //     console.log("App Ready.");
    //   } catch (e) {
    //     console.error('Boot error:', e);
    //   }
    // }

    async function initApp() {
  try {
    sbEnsureHud();
    
    await sbMigrateLessonsIfNeeded();
    await sbLoadLessons();
    await renderMenu();
    sbUpdateHud();
    sbApplyParentMode();
    sbWireWordsImport();

    // Auto-open marketplace lesson if requested
    await sbAutoOpenMarketplaceWordsLesson();

    console.log("App Ready.");
  } catch (e) {
    console.error('Boot error:', e);
  }
}

initApp();

    // initApp();

/* =========================================================
   ✅ Boot
   ========================================================= */
// window.addEventListener("load", async ()=>{
//   sbEnsureHud();
//   sbUpdateHud();
//   sbApplyParentMode();
//   try{ await sbMigrateLessonsIfNeeded(); }catch(e){}
//   try{ await sbLoadLessons(); }catch(e){}
//   renderMenu();
// });

window.addEventListener("load", async ()=>{
  preloadTeamIntroAssets().catch(() => {});
  sbEnsureHud();
  sbUpdateHud();
  sbApplyParentMode();
  try{ await sbMigrateLessonsIfNeeded(); }catch(e){}
  await sbConsumePendingImportWords();
  try{ await sbLoadLessons(); }catch(e){}
  await renderMenu();
  try{ await sbAutoOpenMarketplaceWordsLesson(); }catch(e){}
});

      } catch (e) {
        console.error('Legacy boot error:', e);
      }
    });
