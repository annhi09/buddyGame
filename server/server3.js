import http from "http";
import { app } from "./app.js";
import { attachWebSocketServer } from "./ws/index2.js";
import { PORT } from "./config/env.js";

const server = http.createServer(app);
attachWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Study Buddy API + multiplayer WS running on http://localhost:${PORT}`);
});
