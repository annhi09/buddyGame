import { WebSocketServer } from "ws";
import { handleDisconnect, handleWarriorMessage, loadRooms, saveRooms } from "./warrior.handlers2.js";

export function attachWebSocketServer(server) {
  loadRooms();
  setInterval(saveRooms, 5000);

  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    ws.roomId = null;

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
