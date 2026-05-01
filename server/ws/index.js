// import { WebSocketServer } from "ws";
// import { handleConnection } from "./warrior.handlers.js";

// export function attachWebSocketServer(server) {
//   const wss = new WebSocketServer({ server });

//   wss.on("connection", (ws) => {
//     handleConnection(ws);
//   });

//   console.log("WebSocket server attached");
// }

import { WebSocketServer } from "ws";
import { handleConnection } from "./warrior.handlers.js";
import { loadRooms } from "./rooms.js";

let roomsLoaded = false;

export function attachWebSocketServer(server) {
  if (!roomsLoaded) {
    loadRooms();
    roomsLoaded = true;
  }

  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    handleConnection(ws);
  });

  console.log("WebSocket server attached");
}
