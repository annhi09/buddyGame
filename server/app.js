import 'dotenv/config';
import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import {
  CLIENT_ORIGIN,
  DATA_DIR,
  STORAGE_ROOT,
  UPLOADS_DIR,
} from "./config/env.js";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import lessonsRoutes from "./routes/lessons.routes.js";
import uploadsRoutes from "./routes/uploads.routes.js";
import progressRoutes from "./routes/progress.routes.js";
import { errorHandler, notFound } from "./middleware/error.js";
import "./db/index.js";
import { db } from "./db/index.js";

// --- 1. Import Gemini ---
import { GoogleGenerativeAI } from "@google/generative-ai";

console.log("Checking Aria's Key:", process.env.GEMINI_API_KEY ? "✅ Key Found" : "❌ Key Missing");
// --- 2. Initialize Aria ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aiModel = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    systemInstruction: "You are Aria Core, Long's personal AI assistant. You can help with general questions, coding, business ideas, creative projects... Be warm, smart, concise, and helpful."
    // systemInstruction: "You are Aria, the AI assistant for StudyBuddy. You help parents understand progress and games. You are warm, encouraging, and concise. Refer to the kids as Athena and Aria when appropriate."
});



const ROOT_DIR = process.cwd(); // expected: studybuddy/server
const GAME_DIR = path.join(ROOT_DIR, "game");
const ICONS_DIR = path.join(ROOT_DIR, "icons");
const ROOT_INDEX_HTML = path.join(ROOT_DIR, "index.html");
const GAME_INDEX_HTML = path.join(GAME_DIR, "index.html");

fs.mkdirSync(STORAGE_ROOT, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export const app = express();


app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  })
);
app.use(cors({ origin: CLIENT_ORIGIN === "*" ? true : CLIENT_ORIGIN }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(UPLOADS_DIR));
if (fs.existsSync(ICONS_DIR)) {
  app.use("/icons", express.static(ICONS_DIR));
}
if (fs.existsSync(GAME_DIR)) {
  app.use("/game", express.static(GAME_DIR));
  app.use(express.static(GAME_DIR));
}

app.get("/", (_req, res) => {
  if (fs.existsSync(ROOT_INDEX_HTML)) {
    return res.sendFile(ROOT_INDEX_HTML);
  }
  if (fs.existsSync(GAME_INDEX_HTML)) {
    return res.sendFile(GAME_INDEX_HTML);
  }
  return res.status(404).send("index.html not found");
});

app.use("/published-packs", express.static(path.join(STORAGE_ROOT, "published-packs")));

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/lessons", lessonsRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/progress", progressRoutes);

async function registerOptionalRoute(mountPath, relativeModulePath) {
  const absoluteModulePath = path.join(ROOT_DIR, relativeModulePath);
  if (!fs.existsSync(absoluteModulePath)) return;

  const mod = await import(relativeModulePath);
  const router = mod.default;
  if (router) {
    app.use(mountPath, router);
    console.log(`Mounted optional route: ${mountPath}`);
  }
}

await registerOptionalRoute("/api/creator", "./routes/creator.routes.js");
await registerOptionalRoute("/api/marketplace", "./routes/marketplace.routes.js");
await registerOptionalRoute("/api/me/library", "./routes/library.routes.js");
await registerOptionalRoute("/api/purchase", "./routes/purchase.routes.js");
await registerOptionalRoute("/api/admin", "./routes/admin.routes.js");

// Non-API fallback for game pages / future marketplace pages.
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  if (req.path.startsWith("/uploads/")) return next();
  if (req.path.startsWith("/icons/")) return next();

  if (fs.existsSync(ROOT_INDEX_HTML)) {
    return res.sendFile(ROOT_INDEX_HTML);
  }
  if (fs.existsSync(GAME_INDEX_HTML)) {
    return res.sendFile(GAME_INDEX_HTML);
  }
  return next();
});

// --- 3. The AI Chat Route ---

// --- 3. The AI Chat Route ---
app.post("/api/aria-chat", async (req, res) => {
  try {
    const { message = "", context = "Unknown page" } = req.body || {};

    // Read the real progress table shape first
    // const progressColumns = db.prepare(`PRAGMA table_info(progress)`).all();
    // const columnNames = progressColumns.map((c) => c.name);

    // let recentProgress = [];

    // if (columnNames.length) {
    //   const safeColumns = [
    //     "id",
    //     "user_id",
    //     "lesson_id",
    //     "lessonId",
    //     "stars",
    //     "streak",
    //     "score",
    //     "bestScore",
    //     "completed",
    //     "updated_at",
    //     "created_at",
    //   ].filter((name) => columnNames.includes(name));

    //   if (safeColumns.length) {
    //     const orderColumn = columnNames.includes("updated_at")
    //       ? "updated_at"
    //       : columnNames.includes("created_at")
    //         ? "created_at"
    //         : safeColumns[0];

    //     recentProgress = db.prepare(`
    //       SELECT ${safeColumns.join(", ")}
    //       FROM progress
    //       ORDER BY ${orderColumn} DESC
    //       LIMIT 3
    //     `).all();
    //   }
    // }

    // const dataReport = recentProgress.length > 0
    //   ? JSON.stringify(recentProgress)
    //   : "No recent activity recorded yet.";

    let dataReport = "No progress data connected.";

try {
  if (db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='progress'`).get()) {
    const progressColumns = db.prepare(`PRAGMA table_info(progress)`).all();
    const columnNames = progressColumns.map((c) => c.name);

    let recentProgress = [];

    const safeColumns = [
      "id",
      "user_id",
      "lesson_id",
      "lessonId",
      "stars",
      "streak",
      "score",
      "bestScore",
      "completed",
      "updated_at",
      "created_at",
    ].filter((name) => columnNames.includes(name));

    if (safeColumns.length) {
      const orderColumn = columnNames.includes("updated_at")
        ? "updated_at"
        : columnNames.includes("created_at")
          ? "created_at"
          : safeColumns[0];

      recentProgress = db.prepare(`
        SELECT ${safeColumns.join(", ")}
        FROM progress
        ORDER BY ${orderColumn} DESC
        LIMIT 3
      `).all();
    }

    dataReport = recentProgress.length
      ? JSON.stringify(recentProgress)
      : "No recent activity recorded yet.";
  }
} catch (dbErr) {
  console.warn("Aria progress lookup skipped:", dbErr.message);
}

      const prompt = `
SYSTEM CONTEXT:
You are Aria Core, Long's personal AI assistant.
The user is talking via voice from: ${context}.
Keep responses brief and natural, usually 1-2 sentences.

USER QUESTION:
"${message}"

INSTRUCTION:
Answer the user's question directly.
`;

//     const prompt = `
// SYSTEM CONTEXT:
// You are Aria, the AI assistant for StudyBuddy.
// The user is on the page: ${context}.
// You are talking via voice. Keep your responses very brief (1-2 sentences max) so the conversation feels natural.

// LATEST PROGRESS DATA:
// ${dataReport}

// USER QUESTION:
// "${message}"

// INSTRUCTION:
// Use the LATEST PROGRESS DATA to answer. Be warm, encouraging, and concise.
// If there is no progress data, explain that cloud progress is not connected yet.
//     `;

    const result = await aiModel.generateContent(prompt);
    res.json({ ok: true, reply: result.response.text() });

  } catch (error) {
    console.error("Aria Analytics Error:", error);
    res.status(500).json({
      ok: false,
      error: "Aria's database link is flickering. Try again!"
    });
  }
});

// --- Inside your aria-agent server file ---
app.post('/api/voice-command', async (req, res) => {
    try {
        const { message } = req.body;
        
        // Use your existing Gemini instance
        const prompt = `You are Aria, a brilliant personal assistant. 
                        The user is speaking to you via voice. 
                        Keep your response brief and helpful.
                        User says: "${message}"`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        res.json({ reply: responseText });
    } catch (error) {
        console.error("Voice Route Error:", error);
        res.status(500).json({ error: "Aria is offline." });
    }
});

// --- Studio Admin Analytics Route ---
app.get('/api/admin/raw-stats', (req, res) => {
    try {
        const progress = db.prepare('SELECT * FROM progress ORDER BY updated_at DESC LIMIT 50').all();
        const users = db.prepare('SELECT id, username, email FROM users').all();
        const lessons = db.prepare('SELECT id, name, category FROM lessons').all();
        
        res.json({ progress, users, lessons });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch analytics" });
    }
});

app.use(notFound);
app.use(errorHandler);
