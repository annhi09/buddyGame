const rooms = new Map();

export function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      players: new Map(),
      score: { red: 0, blue: 0 },
      currentRoundId: 0,
      roundOpen: false,
      currentAnswer: "",
      paused: false,
    });
  }
  return rooms.get(roomId);
}

export function roomState(room) {
  return {
    roomId: room.id,
    score: room.score,
    currentRoundId: room.currentRoundId,
    roundOpen: room.roundOpen,
    paused: room.paused,
    players: [...room.players.values()],
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

export function removePlayerSocket(ws) {
  if (!ws.roomId) return;
  const room = rooms.get(ws.roomId);
  if (!room) return;

  room.players.delete(ws);
  broadcast(room, { type: "room_state", ...roomState(room) });

  if (room.players.size === 0) {
    rooms.delete(ws.roomId);
  }
}
