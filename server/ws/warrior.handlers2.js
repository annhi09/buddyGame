import {
  broadcast,
  findConnectedHostSocket,
  findReconnectCandidate,
  getIncomingPlayerKey,
  getRoom,
  loadRooms,
  removePlayerSocket,
  resumeFromHostReconnect,
  roomState,
  saveRooms,
  send,
} from "./rooms.js";

export { loadRooms, saveRooms };

export function handleWarriorMessage(ws, msg) {
  if (msg.type === "ping") {
    send(ws, { type: "pong", ts: Date.now() });
    return;
  }

  if (msg.type === "join_room") {
    const roomId = String(msg.roomId || "class-1");
    const room = getRoom(roomId);

    const incoming = {
      name: String(msg.name || "Player"),
      role: msg.role === "host" ? "host" : "player",
      team: msg.team === "blue" ? "blue" : "red",
      character: msg.character === "aria" ? "aria" : "athena",
      hostPlays: !!msg.hostPlays,
      playerKey: getIncomingPlayerKey(msg),
      connected: true,
      lastSeen: Date.now(),
    };

    ws.roomId = roomId;

    const reconnectCandidate = findReconnectCandidate(room, incoming);
    if (reconnectCandidate) {
      room.offlinePlayers.delete(reconnectCandidate.playerKey);
    }

    const activeHostWs = findConnectedHostSocket(room);
    if (incoming.role === "host" && activeHostWs && activeHostWs !== ws) {
      send(ws, {
        type: "join_denied",
        roomId,
        reason: "host_already_connected",
      });
      return;
    }

    room.players.set(ws, incoming);

    if (incoming.role === "host" && room.paused && room.pauseReason === "host_disconnected") {
      resumeFromHostReconnect(room, incoming);
    }

    send(ws, {
      type: "join_ack",
      ...roomState(room),
      playerKey: incoming.playerKey,
    });

    broadcast(room, {
      type: "room_state",
      ...roomState(room),
    });

    saveRooms();
    return;
  }

  if (!ws.roomId) return;

  const room = getRoom(ws.roomId);
  const player = room.players.get(ws);
  if (!player) return;

  const gameplayTypes = new Set([
    "warrior_round",
    "warrior_answer",
    "warrior_match_countdown",
    "session_start",
    "page_jump",
  ]);

  if (room.paused && gameplayTypes.has(msg.type) && player.role !== "host") {
    send(ws, {
      type: "room_paused",
      roomId: room.id,
      reason: room.pauseReason || "paused",
      ...roomState(room),
    });
    return;
  }

  if (msg.type === "leave_room") {
    removePlayerSocket(ws);
    return;
  }

  if (msg.type === "page_jump") {
    if (player.role !== "host") return;
    if (room.paused) return;

    room.lesson = msg.lesson || null;

    broadcast(room, {
      type: "page_jump",
      roomId: room.id,
      gameId: msg.gameId || "warrior",
      lesson: room.lesson,
    });

    saveRooms();
    return;
  }

  if (msg.type === "warrior_match_countdown") {
    if (player.role !== "host") return;
    if (room.paused) return;

    broadcast(room, {
      type: "warrior_match_countdown",
      roomId: room.id,
      seconds: Number(msg.seconds || 4),
    });
    return;
  }

  if (msg.type === "warrior_round") {
    if (player.role !== "host") return;
    if (room.paused) return;

    const round = msg.round || {};
    room.currentAnswer = String(round.correctWord || "").trim().toUpperCase();
    room.currentRoundId += 1;
    room.roundOpen = true;

    broadcast(room, {
      type: "warrior_round",
      roomId: room.id,
      roundId: room.currentRoundId,
      score: room.score,
      round,
    });

    saveRooms();
    return;
  }

  if (msg.type === "session_start") {
    if (player.role !== "host") return;
    if (room.paused) return;

    broadcast(room, {
      type: "session_start",
      roomId: room.id,
    });
    return;
  }

  if (msg.type === "warrior_answer") {
    if (room.paused) {
      send(ws, {
        type: "room_paused",
        roomId: room.id,
        reason: room.pauseReason || "paused",
        ...roomState(room),
      });
      return;
    }

    const answer = String(msg.answer || "").trim().toUpperCase();
    const targetId = String(msg.targetId || "");

    if (!room.roundOpen) {
      send(ws, {
        type: "warrior_result",
        roomId: room.id,
        roundId: room.currentRoundId,
        team: player.team,
        targetId,
        correct: false,
        ignored: true,
        reason: "round_closed",
        score: room.score,
      });
      return;
    }

    if (answer !== room.currentAnswer) {
      send(ws, {
        type: "warrior_result",
        roomId: room.id,
        roundId: room.currentRoundId,
        team: player.team,
        targetId,
        correct: false,
        ignored: false,
        reason: "wrong_answer",
        score: room.score,
      });
      return;
    }

    room.roundOpen = false;
    room.score[player.team] = (room.score[player.team] || 0) + 1;

    broadcast(room, {
      type: "warrior_result",
      roomId: room.id,
      roundId: room.currentRoundId,
      team: player.team,
      targetId,
      correct: true,
      winnerName: player.name,
      winnerCharacter: player.character,
      score: room.score,
    });

    broadcast(room, {
      type: "room_state",
      ...roomState(room),
    });

    saveRooms();
  }
}

export function handleDisconnect(ws) {
  removePlayerSocket(ws);
}
