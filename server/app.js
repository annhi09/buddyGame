import fs from "fs";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { CLIENT_ORIGIN, DATA_DIR, STORAGE_ROOT, UPLOADS_DIR } from "./config/env.js";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import lessonsRoutes from "./routes/lessons.routes.js";
import uploadsRoutes from "./routes/uploads.routes.js";
import progressRoutes from "./routes/progress.routes.js";
import { errorHandler, notFound } from "./middleware/error.js";
import "./db/index.js";

fs.mkdirSync(STORAGE_ROOT, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: CLIENT_ORIGIN === "*" ? true : CLIENT_ORIGIN }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(UPLOADS_DIR));

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/lessons", lessonsRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/progress", progressRoutes);

app.use(notFound);
app.use(errorHandler);
