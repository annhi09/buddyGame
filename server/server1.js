import http from "http";
import { app } from "./app.js";
import { attachWebSocketServer } from "./ws/index.js";
import { PORT } from "./config/env.js";

const server = http.createServer(app);
attachWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`API + WS server running on http://localhost:${PORT}`);
});
