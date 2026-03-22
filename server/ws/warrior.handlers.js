const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      players: new Map(), // ws -> player
      score: { red: 0, blue: 0 },
      lesson: null,
      currentAnswer: "",
      currentRoundId: 0,
      roundOpen: false,
      race: null,
    });
  }
  return rooms.get(roomId);
}

// function roomState(room) {
//   return {
//     roomId: room.id,
//     score: room.score,
//     players: [...room.players.values()],
//     roundOpen: room.roundOpen,
//     currentRoundId: room.currentRoundId,
//     race: room.race
//       ? {
//           active: true,
//           gameId: room.race.gameId,
//           roundId: room.race.roundId,
//           progress: room.race.progress,
//           resolved: room.race.resolved,
//           winnerTeam: room.race.winnerTeam,
//         }
//       : null,
//   };
// }

function roomState(room) {
  return {
    roomId: room.id,
    score: room.score,
    players: [...room.players.values()],
    roundOpen: room.roundOpen,
    currentRoundId: room.currentRoundId,
    race: room.race
      ? {
          active: true,
          gameId: room.race.gameId,
          roundId: room.race.roundId,
          progress: room.race.progress,
          resolved: room.race.resolved,
          winnerTeam: room.race.winnerTeam,
        }
      : null,
  };
}

function send(ws, data) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(room, data) {
  const msg = JSON.stringify(data);
  for (const client of room.players.keys()) {
    if (client.readyState === 1) {
      client.send(msg);
    }
  }
}

function cleanupRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.players.size === 0) {
    rooms.delete(roomId);
  }
}

function removePlayer(ws) {
  if (!ws.roomId) return;
  const roomId = ws.roomId;
  const room = rooms.get(roomId);
  if (!room) return;

  room.players.delete(ws);

  // cancel live race if someone leaves mid-round
  if (room.race && !room.race.resolved) {
    room.race.resolved = true;
    broadcast(room, {
      type: "race_abort",
      roomId: room.id,
      roundId: room.race.roundId,
      gameId: room.race.gameId,
      reason: "player_left",
      score: room.score,
    });
  }

  broadcast(room, {
    type: "room_state",
    ...roomState(room),
  });

  cleanupRoom(roomId);
}

// function normalizeProgress(value) {
//   const n = Number(value || 0);
//   if (!Number.isFinite(n)) return 0;
//   return Math.max(0, Math.min(100, Math.round(n)));
// }

// function makeRaceState(msg, room) {
//   return {
//     gameId: String(msg.gameId || ""),
//     roundId: String(msg.roundId || `race-${Date.now()}`),
//     seed: String(msg.seed || ""),
//     lesson: msg.lesson || room.lesson || null,
//     startedAt: Date.now(),
//     resolved: false,
//     winnerTeam: "",
//     progress: { red: 0, blue: 0 },
//     completedAt: { red: null, blue: null },
//     meta: { red: null, blue: null },
//   };
// }

// function finishRace(room, winnerTeam, extra = {}) {
//   if (!room.race || room.race.resolved) return;

//   room.race.resolved = true;
//   room.race.winnerTeam = winnerTeam || "";

//   if (winnerTeam === "red" || winnerTeam === "blue") {
//     room.score[winnerTeam] = (room.score[winnerTeam] || 0) + 1;
//   }

//   broadcast(room, {
//     type: "race_result",
//     roomId: room.id,
//     gameId: room.race.gameId,
//     roundId: room.race.roundId,
//     winnerTeam: room.race.winnerTeam,
//     result: winnerTeam ? "win" : "tie",
//     score: room.score,
//     ...extra,
//   });

//   broadcast(room, {
//     type: "room_state",
//     ...roomState(room),
//   });
// }

// function handleRaceComplete(room, player, msg) {
//   if (!room.race) return;
//   if (room.race.resolved) return;
//   if (String(msg.roundId || "") !== room.race.roundId) return;
//   if (String(msg.gameId || "") !== room.race.gameId) return;

//   const team = player.team;
//   if (team !== "red" && team !== "blue") return;

//   // ignore duplicate complete from same team
//   if (room.race.completedAt[team]) return;

//   room.race.completedAt[team] = Date.now();
//   room.race.progress[team] = 100;
//   room.race.meta[team] = msg.meta || null;

//   // first finisher wins
//   finishRace(room, team, {
//     winnerName: player.name,
//     winnerCharacter: player.character,
//     meta: room.race.meta[team],
//   });
// }

function normalizeProgress(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function makeRaceState(msg, room) {
  return {
    gameId: String(msg.gameId || ""),
    roundId: String(msg.roundId || `race-${Date.now()}`),
    seed: String(msg.seed || ""),
    lesson: msg.lesson || room.lesson || null,
    startedAt: Date.now(),
    resolved: false,
    winnerTeam: "",
    progress: { red: 0, blue: 0 },
    completedAt: { red: null, blue: null },
    meta: { red: null, blue: null },
  };
}

function finishRace(room, winnerTeam, extra = {}) {
  if (!room.race || room.race.resolved) return;

  room.race.resolved = true;
  room.race.winnerTeam = winnerTeam || "";

  if (winnerTeam === "red" || winnerTeam === "blue") {
    room.score[winnerTeam] = (room.score[winnerTeam] || 0) + 1;
  }

  broadcast(room, {
    type: "race_result",
    roomId: room.id,
    gameId: room.race.gameId,
    roundId: room.race.roundId,
    winnerTeam: room.race.winnerTeam,
    result: winnerTeam ? "win" : "tie",
    score: room.score,
    ...extra,
  });

  broadcast(room, {
    type: "room_state",
    ...roomState(room),
  });
}

function handleRaceComplete(room, player, msg) {
  if (!room.race) return;
  if (room.race.resolved) return;
  if (String(msg.roundId || "") !== room.race.roundId) return;
  if (String(msg.gameId || "") !== room.race.gameId) return;

  const team = player.team;
  if (team !== "red" && team !== "blue") return;
  if (room.race.completedAt[team]) return;

  room.race.completedAt[team] = Date.now();
  room.race.progress[team] = 100;
  room.race.meta[team] = msg.meta || null;

  // Special scoring rule for Repeat Pro
  if (room.race.gameId === "repeatpro") {
    const redDone = !!room.race.completedAt.red;
    const blueDone = !!room.race.completedAt.blue;

    if (!redDone || !blueDone) return;

    const redCorrect = Number(room.race.meta.red?.correct || 0);
    const blueCorrect = Number(room.race.meta.blue?.correct || 0);

    if (redCorrect > blueCorrect) {
      finishRace(room, "red", { meta: room.race.meta.red });
      return;
    }
    if (blueCorrect > redCorrect) {
      finishRace(room, "blue", { meta: room.race.meta.blue });
      return;
    }

    const redAt = room.race.completedAt.red || 0;
    const blueAt = room.race.completedAt.blue || 0;

    if (redAt && blueAt) {
      if (redAt < blueAt) finishRace(room, "red", { meta: room.race.meta.red });
      else if (blueAt < redAt) finishRace(room, "blue", { meta: room.race.meta.blue });
      else finishRace(room, "", { meta: null });
    }
    return;
  }

  // Default race rule: first finisher wins
  finishRace(room, team, {
    winnerName: player.name,
    winnerCharacter: player.character,
    meta: room.race.meta[team],
  });
}

function handleMessage(ws, msg) {
  if (msg.type === "ping") {
    send(ws, { type: "pong", ts: Date.now() });
    return;
  }

  if (msg.type === "join_room") {
    const roomId = String(msg.roomId || "class-1");
    const room = getRoom(roomId);

    ws.roomId = roomId;

    const player = {
      name: String(msg.name || "Player"),
      role: msg.role === "host" ? "host" : "player",
      team: msg.team === "blue" ? "blue" : "red",
      character: msg.character === "aria" ? "aria" : "athena",
      hostPlays: !!msg.hostPlays,
    };

    room.players.set(ws, player);

    send(ws, {
      type: "join_ack",
      ...roomState(room),
    });

    broadcast(room, {
      type: "room_state",
      ...roomState(room),
    });

    return;
  }

  if (!ws.roomId) return;

  const room = getRoom(ws.roomId);
  const player = room.players.get(ws);
  if (!player) return;

  if (msg.type === "leave_room") {
    removePlayer(ws);
    return;
  }

  if (msg.type === "page_jump") {
    if (player.role !== "host") return;

    room.lesson = msg.lesson || null;

    broadcast(room, {
      type: "page_jump",
      roomId: room.id,
      gameId: msg.gameId || "warrior",
      lesson: room.lesson,
    });
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
    return;
  }

  if (msg.type === "session_start") {
    if (player.role !== "host") return;

    broadcast(room, {
      type: "session_start",
      roomId: room.id,
    });
    return;
  }

  // =========================
  // Generic race VS modes
  // =========================
  if (msg.type === "race_mode_start") {
    if (player.role !== "host") return;

    room.lesson = msg.lesson || room.lesson || null;
    room.race = makeRaceState(msg, room);

    broadcast(room, {
      type: "race_mode_start",
      roomId: room.id,
      gameId: room.race.gameId,
      roundId: room.race.roundId,
      seed: room.race.seed,
      lesson: room.race.lesson,
      score: room.score,
    });
    return;
  }

  if (msg.type === "race_progress") {
    if (!room.race || room.race.resolved) return;
    if (String(msg.roundId || "") !== room.race.roundId) return;
    if (String(msg.gameId || "") !== room.race.gameId) return;

    room.race.progress[player.team] = normalizeProgress(msg.progress);

    broadcast(room, {
      type: "race_progress",
      roomId: room.id,
      gameId: room.race.gameId,
      roundId: room.race.roundId,
      team: player.team,
      progress: room.race.progress[player.team],
    });
    return;
  }

  if (msg.type === "race_complete") {
    handleRaceComplete(room, player, msg);
    return;
  }

    if (msg.type === "race_mode_start") {
    if (player.role !== "host") return;

    room.lesson = msg.lesson || room.lesson || null;
    room.race = makeRaceState(msg, room);

    broadcast(room, {
      type: "race_mode_start",
      roomId: room.id,
      gameId: room.race.gameId,
      roundId: room.race.roundId,
      seed: room.race.seed,
      lesson: room.race.lesson,
      score: room.score,
    });
    return;
  }

  if (msg.type === "race_progress") {
    if (!room.race || room.race.resolved) return;
    if (String(msg.roundId || "") !== room.race.roundId) return;
    if (String(msg.gameId || "") !== room.race.gameId) return;

    room.race.progress[player.team] = normalizeProgress(msg.progress);

    broadcast(room, {
      type: "race_progress",
      roomId: room.id,
      gameId: room.race.gameId,
      roundId: room.race.roundId,
      team: player.team,
      progress: room.race.progress[player.team],
    });
    return;
  }

  if (msg.type === "race_complete") {
    handleRaceComplete(room, player, msg);
    return;
  }

  if (msg.type === "warrior_answer") {
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
  }
}

export function handleConnection(ws) {
  ws.roomId = null;

  ws.on("message", (buf) => {
    let msg;
    try {
      msg = JSON.parse(buf.toString());
    } catch {
      return;
    }
    handleMessage(ws, msg);
  });

  ws.on("close", () => removePlayer(ws));
  ws.on("error", () => removePlayer(ws));
}

// const rooms = new Map();

// function getRoom(roomId) {
//   if (!rooms.has(roomId)) {
//     rooms.set(roomId, {
//       id: roomId,
//       players: new Map(), // ws -> player
//       score: { red: 0, blue: 0 },
//       lesson: null,
//       currentAnswer: "",
//       currentRoundId: 0,
//       roundOpen: false,
//     });
//   }
//   return rooms.get(roomId);
// }

// function roomState(room) {
//   return {
//     roomId: room.id,
//     score: room.score,
//     players: [...room.players.values()],
//     roundOpen: room.roundOpen,
//     currentRoundId: room.currentRoundId,
//   };
// }

// function send(ws, data) {
//   if (ws.readyState === 1) {
//     ws.send(JSON.stringify(data));
//   }
// }

// function broadcast(room, data) {
//   const msg = JSON.stringify(data);
//   for (const client of room.players.keys()) {
//     if (client.readyState === 1) {
//       client.send(msg);
//     }
//   }
// }

// function cleanupRoom(roomId) {
//   const room = rooms.get(roomId);
//   if (!room) return;
//   if (room.players.size === 0) {
//     rooms.delete(roomId);
//   }
// }

// function removePlayer(ws) {
//   if (!ws.roomId) return;
//   const roomId = ws.roomId;
//   const room = rooms.get(roomId);
//   if (!room) return;

//   room.players.delete(ws);

//   broadcast(room, {
//     type: "room_state",
//     ...roomState(room),
//   });

//   cleanupRoom(roomId);
// }

// function handleMessage(ws, msg) {
//   if (msg.type === "ping") {
//     send(ws, { type: "pong", ts: Date.now() });
//     return;
//   }

//   if (msg.type === "join_room") {
//     const roomId = String(msg.roomId || "class-1");
//     const room = getRoom(roomId);

//     ws.roomId = roomId;

//     const player = {
//       name: String(msg.name || "Player"),
//       role: msg.role === "host" ? "host" : "player",
//       team: msg.team === "blue" ? "blue" : "red",
//       character: msg.character === "aria" ? "aria" : "athena",
//       hostPlays: !!msg.hostPlays,
//     };

//     room.players.set(ws, player);

//     send(ws, {
//       type: "join_ack",
//       ...roomState(room),
//     });

//     broadcast(room, {
//       type: "room_state",
//       ...roomState(room),
//     });

//     return;
//   }

//   if (!ws.roomId) return;

//   const room = getRoom(ws.roomId);
//   const player = room.players.get(ws);
//   if (!player) return;

//   if (msg.type === "leave_room") {
//     removePlayer(ws);
//     return;
//   }

//   if (msg.type === "page_jump") {
//     if (player.role !== "host") return;

//     room.lesson = msg.lesson || null;

//     broadcast(room, {
//       type: "page_jump",
//       roomId: room.id,
//       gameId: msg.gameId || "warrior",
//       lesson: room.lesson,
//     });
//     return;
//   }

//   if (msg.type === "warrior_match_countdown") {
//     if (player.role !== "host") return;

//     broadcast(room, {
//       type: "warrior_match_countdown",
//       roomId: room.id,
//       seconds: Number(msg.seconds || 4),
//     });
//     return;
//   }

//   if (msg.type === "warrior_round") {
//     if (player.role !== "host") return;

//     const round = msg.round || {};
//     room.currentAnswer = String(round.correctWord || "").trim().toUpperCase();
//     room.currentRoundId += 1;
//     room.roundOpen = true;

//     broadcast(room, {
//       type: "warrior_round",
//       roomId: room.id,
//       roundId: room.currentRoundId,
//       score: room.score,
//       round,
//     });
//     return;
//   }

//   if (msg.type === "session_start") {
//     if (player.role !== "host") return;

//     broadcast(room, {
//       type: "session_start",
//       roomId: room.id,
//     });
//     return;
//   }

//   if (msg.type === "warrior_answer") {
//     const answer = String(msg.answer || "").trim().toUpperCase();
//     const targetId = String(msg.targetId || "");

//     if (!room.roundOpen) {
//       send(ws, {
//         type: "warrior_result",
//         roomId: room.id,
//         roundId: room.currentRoundId,
//         team: player.team,
//         targetId,
//         correct: false,
//         ignored: true,
//         reason: "round_closed",
//         score: room.score,
//       });
//       return;
//     }

//     if (answer !== room.currentAnswer) {
//       send(ws, {
//         type: "warrior_result",
//         roomId: room.id,
//         roundId: room.currentRoundId,
//         team: player.team,
//         targetId,
//         correct: false,
//         ignored: false,
//         reason: "wrong_answer",
//         score: room.score,
//       });
//       return;
//     }

//     room.roundOpen = false;
//     room.score[player.team] = (room.score[player.team] || 0) + 1;

//     broadcast(room, {
//       type: "warrior_result",
//       roomId: room.id,
//       roundId: room.currentRoundId,
//       team: player.team,
//       targetId,
//       correct: true,
//       winnerName: player.name,
//       winnerCharacter: player.character,
//       score: room.score,
//     });

//     broadcast(room, {
//       type: "room_state",
//       ...roomState(room),
//     });
//   }
// }

// export function handleConnection(ws) {
//   ws.roomId = null;

//   ws.on("message", (buf) => {
//     let msg;
//     try {
//       msg = JSON.parse(buf.toString());
//     } catch {
//       return;
//     }
//     handleMessage(ws, msg);
//   });

//   ws.on("close", () => removePlayer(ws));
//   ws.on("error", () => removePlayer(ws));
// }
