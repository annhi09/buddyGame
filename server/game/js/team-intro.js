// game/js/team-intro.js

const DEFAULTS = {
  mountId: "team-intro-root",
  mode: "words",
  durationScale: 1,
  soundEnabled: true,
  hostView: "full", // "full" | "own-team"
  roundId: "",
  onDone: null,
};

const playedRounds = new Set();

const ASSETS = {
  red: {
    bg: "../assets/teamIntro/red-bg.webp",
    child: "../assets/teamIntro/Athena.png",
    creature: "../assets/teamIntro/griffin.webp",
    leader: "../assets/teamIntro/G-Athena.png",
    title: "TEAM RED",
    subtitle: "Athena • Griffin • Goddess Athena",
  },
  blue: {
    bg: "../assets/teamIntro/blue-bg.webp",
    child: "../assets/teamIntro/Aria.png",
    creature: "../assets/teamIntro/unicorn.webp",
    leader: "../assets/teamIntro/Ares.png",
    title: "TEAM BLUE",
    subtitle: "Aria • Unicorn • Ares",
  },
  versusBg: "../assets/teamIntro/versus-bg.webp",
  sfx: {
    redChild: "../assets/teamIntro/sfx-whoosh-1.mp3",
    redCreature: "../assets/teamIntro/sfx-roar-griffin.mp3",
    redLeader: "../assets/teamIntro/sfx-impact-divine.mp3",
    blueChild: "../assets/teamIntro/sfx-whoosh-1.mp3",
    blueCreature: "../assets/teamIntro/sfx-unicorn.mp3",
    blueLeader: "../assets/teamIntro/sfx-impact-ares.mp3",
    versus: "../assets/teamIntro/sfx-vs-hit.mp3",
  },
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function qs(root, sel) {
  return root.querySelector(sel);
}

function safePlay(url, enabled = true) {
  if (!enabled || !url) return;
  try {
    const audio = new Audio(url);
    audio.volume = 0.8;
    audio.play().catch(() => {});
  } catch (_) {}
}

function getVariant({ role, team, hostPlays, hostView = "full" }) {
  if (role === "host" && hostPlays === false && hostView === "full") {
    return "hostFull";
  }
  if (role === "host" && hostPlays === true && hostView === "full") {
    return "hostFull";
  }
  return team === "blue" ? "blueSolo" : "redSolo";
}

function ensureRoot(mountId = "team-intro-root") {
  let root = document.getElementById(mountId);
  if (root) return root;

  root = document.createElement("div");
  root.id = mountId;
  root.className = "team-intro hidden";
  root.setAttribute("aria-hidden", "true");

  root.innerHTML = `
    <div class="team-intro-backdrop"></div>

    <div class="team-intro-scene">
      <div class="ti-bg"></div>
      <div class="ti-fx ti-fx-back"></div>

      <div class="ti-team ti-team-red hidden">
        <img class="ti-char ti-red-child" alt="Red child hero" />
        <img class="ti-char ti-red-creature" alt="Griffin" />
        <img class="ti-char ti-red-leader" alt="Goddess Athena" />
        <div class="ti-title-wrap">
          <div class="ti-title ti-title-red"></div>
          <div class="ti-subtitle ti-subtitle-red"></div>
        </div>
      </div>

      <div class="ti-team ti-team-blue hidden">
        <img class="ti-char ti-blue-child" alt="Blue child hero" />
        <img class="ti-char ti-blue-creature" alt="Unicorn" />
        <img class="ti-char ti-blue-leader" alt="Ares" />
        <div class="ti-title-wrap">
          <div class="ti-title ti-title-blue"></div>
          <div class="ti-subtitle ti-subtitle-blue"></div>
        </div>
      </div>

      <div class="ti-versus hidden">
        <div class="ti-vs-slash"></div>
        <div class="ti-vs-text">VS</div>
      </div>

      <div class="ti-fx ti-fx-front"></div>
    </div>
  `;

  document.body.appendChild(root);
  return root;
}

function resetRoot(root) {
  root.classList.remove("hidden", "open", "closing", "ti-shake");
  root.setAttribute("aria-hidden", "true");

  const red = qs(root, ".ti-team-red");
  const blue = qs(root, ".ti-team-blue");
  const versus = qs(root, ".ti-versus");
  const bg = qs(root, ".ti-bg");

  red.className = "ti-team ti-team-red hidden";
  blue.className = "ti-team ti-team-blue hidden";
  versus.className = "ti-versus hidden";

  [
    ".ti-red-child", ".ti-red-creature", ".ti-red-leader",
    ".ti-blue-child", ".ti-blue-creature", ".ti-blue-leader",
    ".ti-title-red", ".ti-title-blue",
    ".ti-subtitle-red", ".ti-subtitle-blue",
  ].forEach(sel => {
    const el = qs(root, sel);
    if (!el) return;
    el.classList.remove(
      "ti-enter-left",
      "ti-enter-right",
      "ti-enter-drop",
      "ti-lock",
      "ti-title-pop"
    );
  });

  bg.style.backgroundImage = "";
}

function openRoot(root) {
  root.classList.remove("hidden");
  root.classList.add("open");
  root.setAttribute("aria-hidden", "false");
}

async function closeRoot(root) {
  root.classList.add("closing");
  await sleep(220);
  root.classList.add("hidden");
  root.classList.remove("open", "closing", "ti-shake");
  root.setAttribute("aria-hidden", "true");
}

function setRedAssets(root) {
  qs(root, ".ti-bg").style.backgroundImage = `url("${ASSETS.red.bg}")`;
  qs(root, ".ti-red-child").src = ASSETS.red.child;
  qs(root, ".ti-red-creature").src = ASSETS.red.creature;
  qs(root, ".ti-red-leader").src = ASSETS.red.leader;
  qs(root, ".ti-title-red").textContent = ASSETS.red.title;
  qs(root, ".ti-subtitle-red").textContent = ASSETS.red.subtitle;
}

function setBlueAssets(root) {
  qs(root, ".ti-bg").style.backgroundImage = `url("${ASSETS.blue.bg}")`;
  qs(root, ".ti-blue-child").src = ASSETS.blue.child;
  qs(root, ".ti-blue-creature").src = ASSETS.blue.creature;
  qs(root, ".ti-blue-leader").src = ASSETS.blue.leader;
  qs(root, ".ti-title-blue").textContent = ASSETS.blue.title;
  qs(root, ".ti-subtitle-blue").textContent = ASSETS.blue.subtitle;
}

async function runRedSolo(root, opts) {
  const team = qs(root, ".ti-team-red");
  const child = qs(root, ".ti-red-child");
  const creature = qs(root, ".ti-red-creature");
  const leader = qs(root, ".ti-red-leader");
  const title = qs(root, ".ti-title-red");
  const subtitle = qs(root, ".ti-subtitle-red");

  setRedAssets(root);
  team.classList.remove("hidden");

  await sleep(120 * opts.durationScale);
  child.classList.add("ti-enter-left");
  safePlay(ASSETS.sfx.redChild, opts.soundEnabled);

  await sleep(340 * opts.durationScale);
  creature.classList.add("ti-enter-drop");
  safePlay(ASSETS.sfx.redCreature, opts.soundEnabled);

  await sleep(380 * opts.durationScale);
  leader.classList.add("ti-enter-left", "ti-lock");
  safePlay(ASSETS.sfx.redLeader, opts.soundEnabled);
  root.classList.add("ti-shake");

  await sleep(180 * opts.durationScale);
  title.classList.add("ti-title-pop");
  subtitle.classList.add("ti-title-pop");

  await sleep(480 * opts.durationScale);
}

async function runBlueSolo(root, opts) {
  const team = qs(root, ".ti-team-blue");
  const child = qs(root, ".ti-blue-child");
  const creature = qs(root, ".ti-blue-creature");
  const leader = qs(root, ".ti-blue-leader");
  const title = qs(root, ".ti-title-blue");
  const subtitle = qs(root, ".ti-subtitle-blue");

  setBlueAssets(root);
  team.classList.remove("hidden");

  await sleep(120 * opts.durationScale);
  child.classList.add("ti-enter-right");
  safePlay(ASSETS.sfx.blueChild, opts.soundEnabled);

  await sleep(340 * opts.durationScale);
  creature.classList.add("ti-enter-drop");
  safePlay(ASSETS.sfx.blueCreature, opts.soundEnabled);

  await sleep(380 * opts.durationScale);
  leader.classList.add("ti-enter-right", "ti-lock");
  safePlay(ASSETS.sfx.blueLeader, opts.soundEnabled);
  root.classList.add("ti-shake");

  await sleep(180 * opts.durationScale);
  title.classList.add("ti-title-pop");
  subtitle.classList.add("ti-title-pop");

  await sleep(480 * opts.durationScale);
}

async function runHostFull(root, opts) {
  const red = qs(root, ".ti-team-red");
  const blue = qs(root, ".ti-team-blue");
  const versus = qs(root, ".ti-versus");

  setRedAssets(root);
  red.classList.remove("hidden");

  await sleep(100 * opts.durationScale);
  qs(root, ".ti-red-child").classList.add("ti-enter-left");
  safePlay(ASSETS.sfx.redChild, opts.soundEnabled);

  await sleep(280 * opts.durationScale);
  qs(root, ".ti-red-creature").classList.add("ti-enter-drop");
  safePlay(ASSETS.sfx.redCreature, opts.soundEnabled);

  await sleep(320 * opts.durationScale);
  qs(root, ".ti-red-leader").classList.add("ti-enter-left", "ti-lock");
  qs(root, ".ti-title-red").classList.add("ti-title-pop");
  qs(root, ".ti-subtitle-red").classList.add("ti-title-pop");
  safePlay(ASSETS.sfx.redLeader, opts.soundEnabled);

  await sleep(360 * opts.durationScale);

  setBlueAssets(root);
  blue.classList.remove("hidden");

  await sleep(120 * opts.durationScale);
  qs(root, ".ti-blue-child").classList.add("ti-enter-right");
  safePlay(ASSETS.sfx.blueChild, opts.soundEnabled);

  await sleep(280 * opts.durationScale);
  qs(root, ".ti-blue-creature").classList.add("ti-enter-drop");
  safePlay(ASSETS.sfx.blueCreature, opts.soundEnabled);

  await sleep(320 * opts.durationScale);
  qs(root, ".ti-blue-leader").classList.add("ti-enter-right", "ti-lock");
  qs(root, ".ti-title-blue").classList.add("ti-title-pop");
  qs(root, ".ti-subtitle-blue").classList.add("ti-title-pop");
  safePlay(ASSETS.sfx.blueLeader, opts.soundEnabled);

  await sleep(260 * opts.durationScale);
  versus.classList.remove("hidden");
  versus.classList.add("ti-vs-show");
  root.classList.add("ti-shake");
  safePlay(ASSETS.sfx.versus, opts.soundEnabled);

  await sleep(520 * opts.durationScale);
}

export async function preloadTeamIntroAssets() {
  const urls = [
    ASSETS.red.bg, ASSETS.red.child, ASSETS.red.creature, ASSETS.red.leader,
    ASSETS.blue.bg, ASSETS.blue.child, ASSETS.blue.creature, ASSETS.blue.leader,
    ASSETS.versusBg,
  ].filter(Boolean);

  await Promise.all(
    urls.map(src => new Promise(resolve => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve;
      img.src = src;
    }))
  );
}

export async function playTeamIntro(options = {}) {
  const opts = { ...DEFAULTS, ...options };

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
    opts.onDone?.();
    return;
  }

  if (opts.roundId && playedRounds.has(opts.roundId)) {
    opts.onDone?.();
    return;
  }

  if (opts.roundId) {
    playedRounds.add(opts.roundId);
  }

  const root = ensureRoot(opts.mountId);
  resetRoot(root);
  openRoot(root);

  const variant = getVariant(opts);

  try {
    if (variant === "redSolo") {
      await runRedSolo(root, opts);
    } else if (variant === "blueSolo") {
      await runBlueSolo(root, opts);
    } else {
      await runHostFull(root, opts);
    }
  } finally {
    await closeRoot(root);
    opts.onDone?.();
  }
}

export function destroyTeamIntro(mountId = "team-intro-root") {
  const root = document.getElementById(mountId);
  if (root) root.remove();
}