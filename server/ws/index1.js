import { WebSocketServer } from "ws";
import { handleDisconnect, handleWarriorMessage } from "./warrior.handlers.js";

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ type: "welcome", message: "WebSocket connected" }));

    ws.on("message", (buf) => {
      let msg;
      try {
        msg = JSON.parse(buf.toString());
      } catch {
        return;
      }
      handleWarriorMessage(ws, msg);
    });

    ws.on("close", () => handleDisconnect(ws));
    ws.on("error", () => handleDisconnect(ws));
  });
}
