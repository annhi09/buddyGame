import "dotenv/config";
import path from "path";

export const PORT = Number(process.env.PORT || 8080);
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";
export const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-env";

const rawStorageRoot = process.env.STORAGE_ROOT || "./storage";
export const STORAGE_ROOT = path.resolve(process.cwd(), rawStorageRoot);
export const DATA_DIR = path.join(STORAGE_ROOT, "data");
export const UPLOADS_DIR = path.join(STORAGE_ROOT, "uploads");
export const DB_PATH = path.join(DATA_DIR, "studybuddy.db");
