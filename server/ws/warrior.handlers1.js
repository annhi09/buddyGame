import { broadcast, getRoom, removePlayerSocket, roomState, send } from "./rooms.js";

export function handleWarriorMessage(ws, msg) {
  if (msg.type === "ping") {
    send(ws, { type: "pong", ts: Date.now() });
    return;
  }

  if (msg.type === "join_room") {
    const roomId = String(msg.roomId || "class-1");
    const room = getRoom(roomId);

    const player = {
      name: String(msg.name || "Player"),
      role: msg.role === "host" ? "host" : "player",
      team: msg.team === "blue" ? "blue" : "red",
      character: msg.character === "aria" ? "aria" : "athena",
    };

    ws.roomId = roomId;
    room.players.set(ws, player);

    send(ws, { type: "join_ack", ...roomState(room) });
    broadcast(room, { type: "room_state", ...roomState(room) });
    return;
  }

  if (!ws.roomId) return;
  const room = getRoom(ws.roomId);
  const player = room.players.get(ws);
  if (!player) return;

  if (msg.type === "leave_room") {
    removePlayerSocket(ws);
    return;
  }

  if (msg.type === "warrior_match_countdown") {
    if (player.role !== "host") return;
    broadcast(room, {
      type: "warrior_match_countdown",
      roomId: room.id,
      seconds: Number(msg.seconds || 4),
    });
    return;
  }

  if (msg.type === "warrior_round") {
    if (player.role !== "host") return;
    room.currentAnswer = String(msg.round?.correctWord || "").trim().toUpperCase();
    room.currentRoundId += 1;
    room.roundOpen = true;

    broadcast(room, {
      type: "warrior_round",
      roomId: room.id,
      roundId: room.currentRoundId,
      score: room.score,
      round: msg.round || {},
    });
    return;
  }

  if (msg.type === "warrior_answer") {
    const answer = String(msg.answer || "").trim().toUpperCase();
    if (!room.roundOpen) {
      send(ws, {
        type: "warrior_result",
        roomId: room.id,
        roundId: room.currentRoundId,
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
      correct: true,
      team: player.team,
      winnerName: player.name,
      winnerCharacter: player.character,
      score: room.score,
    });

    broadcast(room, {
      type: "room_state",
      ...roomState(room),
    });
  }
}

export function handleDisconnect(ws) {
  removePlayerSocket(ws);
}
