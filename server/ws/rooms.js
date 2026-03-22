import fs from "fs";
import path from "path";

const HOST_RECONNECT_GRACE_MS = 60_000;
const SAVE_DIR = path.join(process.cwd(), "saves");
const SAVE_PATH = path.join(SAVE_DIR, "rooms.json");

const rooms = new Map();

function ensureSaveDir() {
  if (!fs.existsSync(SAVE_DIR)) {
    fs.mkdirSync(SAVE_DIR, { recursive: true });
  }
}

function safeNow() {
  return Date.now();
}

function createRoom(roomId) {
  return {
    id: roomId,
    players: new Map(),
    offlinePlayers: new Map(),
    score: { red: 0, blue: 0 },
    lesson: null,
    currentAnswer: "",
    currentRoundId: 0,
    roundOpen: false,
    paused: false,
    pauseReason: "",
    hostMissingSince: null,
    hostGraceTimer: null,
  };
}

export function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, createRoom(roomId));
  }
  return rooms.get(roomId);
}

export function getConnectedPlayersArray(room) {
  return [...room.players.values()].map((p) => ({
    name: p.name,
    role: p.role,
    team: p.team,
    character: p.character,
    hostPlays: !!p.hostPlays,
    playerKey: p.playerKey,
    connected: true,
  }));
}

export function roomState(room) {
  return {
    roomId: room.id,
    score: room.score,
    players: getConnectedPlayersArray(room),
    roundOpen: room.roundOpen,
    currentRoundId: room.currentRoundId,
    paused: room.paused,
    pauseReason: room.pauseReason || "",
    hostMissingSince: room.hostMissingSince,
  };
}

export function send(ws, data) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}

export function broadcast(room, data) {
  const msg = JSON.stringify(data);
  for (const client of room.players.keys()) {
    if (client.readyState === 1) {
      client.send(msg);
    }
  }
}

export function makeFallbackPlayerKey(msg) {
  const name = String(msg.name || "Player").trim().toLowerCase();
  const role = msg.role === "host" ? "host" : "player";
  const team = msg.team === "blue" ? "blue" : "red";
  const character = msg.character === "aria" ? "aria" : "athena";
  return `${role}:${name}:${team}:${character}`;
}

export function getIncomingPlayerKey(msg) {
  const raw = String(msg.playerKey || "").trim();
  return raw || makeFallbackPlayerKey(msg);
}

export function hasConnectedHost(room) {
  for (const p of room.players.values()) {
    if (p.role === "host") return true;
  }
  return false;
}

export function findConnectedHostSocket(room) {
  for (const [ws, p] of room.players.entries()) {
    if (p.role === "host") return ws;
  }
  return null;
}

export function clearHostGraceTimer(room) {
  if (room.hostGraceTimer) {
    clearTimeout(room.hostGraceTimer);
    room.hostGraceTimer = null;
  }
}

export function startHostRecovery(room, hostPlayer) {
  clearHostGraceTimer(room);

  room.paused = true;
  room.pauseReason = "host_disconnected";
  room.hostMissingSince = safeNow();
  room.roundOpen = false;

  room.offlinePlayers.set(hostPlayer.playerKey, {
    ...hostPlayer,
    connected: false,
    lastSeen: safeNow(),
  });

  broadcast(room, {
    type: "host_paused",
    roomId: room.id,
    hostName: hostPlayer.name,
    graceMs: HOST_RECONNECT_GRACE_MS,
    ...roomState(room),
  });

  room.hostGraceTimer = setTimeout(() => {
    room.hostGraceTimer = null;
    room.paused = false;
    room.pauseReason = "host_timeout";
    room.hostMissingSince = null;
    room.currentAnswer = "";
    room.roundOpen = false;

    broadcast(room, {
      type: "host_timeout",
      roomId: room.id,
      message: "Host did not reconnect in time.",
      ...roomState(room),
    });

    saveRooms();
  }, HOST_RECONNECT_GRACE_MS);
}

export function resumeFromHostReconnect(room, player) {
  clearHostGraceTimer(room);
  room.paused = false;
  room.pauseReason = "";
  room.hostMissingSince = null;

  broadcast(room, {
    type: "host_resumed",
    roomId: room.id,
    hostName: player.name,
    ...roomState(room),
  });
}

export function findReconnectCandidate(room, incoming) {
  if (room.offlinePlayers.has(incoming.playerKey)) {
    return room.offlinePlayers.get(incoming.playerKey);
  }

  for (const p of room.offlinePlayers.values()) {
    if (
      p.role === incoming.role &&
      p.name === incoming.name &&
      p.team === incoming.team &&
      p.character === incoming.character
    ) {
      return p;
    }
  }

  return null;
}

export function serializeRooms() {
  const out = {};

  for (const [roomId, room] of rooms.entries()) {
    out[roomId] = {
      id: room.id,
      score: room.score || { red: 0, blue: 0 },
      lesson: room.lesson || null,
      currentAnswer: room.currentAnswer || "",
      currentRoundId: room.currentRoundId || 0,
      roundOpen: !!room.roundOpen,
      paused: !!room.paused,
      pauseReason: room.pauseReason || "",
      hostMissingSince: room.hostMissingSince || null,
      offlinePlayers: [...room.offlinePlayers.values()].map((p) => ({
        name: p.name,
        role: p.role,
        team: p.team,
        character: p.character,
        hostPlays: !!p.hostPlays,
        playerKey: p.playerKey,
        connected: false,
        lastSeen: p.lastSeen || null,
      })),
      players: [...room.players.values()].map((p) => ({
        name: p.name,
        role: p.role,
        team: p.team,
        character: p.character,
        hostPlays: !!p.hostPlays,
        playerKey: p.playerKey,
        connected: false,
        lastSeen: p.lastSeen || null,
      })),
    };
  }

  return out;
}

export function saveRooms() {
  try {
    ensureSaveDir();
    const data = serializeRooms();
    fs.writeFileSync(SAVE_PATH, JSON.stringify(data, null, 2), "utf8");
    console.log("Rooms autosaved");
  } catch (err) {
    console.error("Save error:", err);
  }
}

export function loadRooms() {
  try {
    ensureSaveDir();
    if (!fs.existsSync(SAVE_PATH)) return;

    const raw = fs.readFileSync(SAVE_PATH, "utf8");
    if (!raw.trim()) return;

    const data = JSON.parse(raw);

    for (const roomId of Object.keys(data)) {
      const saved = data[roomId] || {};
      const room = createRoom(roomId);

      room.score = saved.score || { red: 0, blue: 0 };
      room.lesson = saved.lesson || null;
      room.currentAnswer = saved.currentAnswer || "";
      room.currentRoundId = saved.currentRoundId || 0;
      room.roundOpen = false;
      room.paused = false;
      room.pauseReason = "";
      room.hostMissingSince = null;

      const offline = [
        ...(Array.isArray(saved.offlinePlayers) ? saved.offlinePlayers : []),
        ...(Array.isArray(saved.players) ? saved.players : []),
      ];

      for (const p of offline) {
        if (!p?.playerKey) continue;
        room.offlinePlayers.set(p.playerKey, {
          name: String(p.name || "Player"),
          role: p.role === "host" ? "host" : "player",
          team: p.team === "blue" ? "blue" : "red",
          character: p.character === "aria" ? "aria" : "athena",
          hostPlays: !!p.hostPlays,
          playerKey: String(p.playerKey),
          connected: false,
          lastSeen: p.lastSeen || safeNow(),
        });
      }

      rooms.set(roomId, room);
    }

    console.log("Rooms restored from save");
  } catch (err) {
    console.error("Load error:", err);
  }
}

export function removePlayerSocket(ws) {
  if (!ws.roomId) return;
  const room = rooms.get(ws.roomId);
  if (!room) return;

  const player = room.players.get(ws);
  if (!player) return;

  room.players.delete(ws);

  room.offlinePlayers.set(player.playerKey, {
    ...player,
    connected: false,
    lastSeen: safeNow(),
  });

  if (player.role === "host") {
    startHostRecovery(room, player);
  }

  broadcast(room, {
    type: "room_state",
    ...roomState(room),
  });

  saveRooms();
}
