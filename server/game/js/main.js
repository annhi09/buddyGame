import { apiGet, wsUrl } from "./api.js";

const output = document.getElementById("output");
const btnHealth = document.getElementById("btn-health");
const btnWs = document.getElementById("btn-ws");

function log(value) {
  if (!output) return;
  output.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

btnHealth?.addEventListener("click", async () => {
  try {
    log("Checking API...");
    const data = await apiGet("/health");
    log(data);
  } catch (err) {
    log(`API error: ${err.message}`);
  }
});

btnWs?.addEventListener("click", () => {
  try {
    const socket = new WebSocket(wsUrl());
    socket.onopen = () => {
      log("WebSocket connected. Sending ping...");
      socket.send(JSON.stringify({ type: "ping" }));
    };
    socket.onmessage = (event) => {
      log(JSON.parse(event.data));
      socket.close();
    };
    socket.onerror = () => {
      log("WebSocket error.");
    };
  } catch (err) {
    log(`WS error: ${err.message}`);
  }
});
