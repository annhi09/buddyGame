import path from "path";

const ROOT_DIR = process.cwd();

function must(name, fallback = "") {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === null || value === "") {
    return "";
  }
  return String(value);
}

export const NODE_ENV = must("NODE_ENV", "development");
export const PORT = Number(process.env.PORT || 8080);

export const CLIENT_ORIGIN = must("CLIENT_ORIGIN", "*");

/**
 * Local filesystem roots
 * On Render Starter+ with persistent disk, set:
 *   DATA_ROOT=/var/data
 *   DB_PATH=/var/data/storage/studybuddy.db
 *   UPLOADS_DIR=/var/data/uploads
 *
 * For local dev, this falls back to:
 *   studybuddy/server/storage
 *   studybuddy/server/storage/studybuddy.db
 *   studybuddy/server/uploads
 */
export const DATA_ROOT = must("DATA_ROOT", ROOT_DIR);

export const STORAGE_ROOT = must(
  "STORAGE_ROOT",
  path.join(DATA_ROOT, "storage")
);

export const DATA_DIR = STORAGE_ROOT;

export const DB_PATH = must(
  "DB_PATH",
  path.join(STORAGE_ROOT, "studybuddy.db")
);

export const UPLOADS_DIR = must(
  "UPLOADS_DIR",
  path.join(DATA_ROOT, "uploads")
);

/**
 * JWT / auth
 */
export const JWT_SECRET = must("JWT_SECRET", "dev-only-change-me");

/**
 * AWS / S3 marketplace storage
 */
export const AWS_REGION = must("AWS_REGION", "us-east-1");
export const AWS_ACCESS_KEY_ID = must("AWS_ACCESS_KEY_ID", "");
export const AWS_SECRET_ACCESS_KEY = must("AWS_SECRET_ACCESS_KEY", "");
export const S3_BUCKET = must("S3_BUCKET", "");
export const S3_PUBLIC_BASE_URL = must("S3_PUBLIC_BASE_URL", "");

/**
 * Optional Stripe placeholders for later
 */
export const STRIPE_SECRET_KEY = must("STRIPE_SECRET_KEY", "");
export const STRIPE_WEBHOOK_SECRET = must("STRIPE_WEBHOOK_SECRET", "");

// import "dotenv/config";
// import path from "path";

// export const PORT = Number(process.env.PORT || 8080);
// export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";
// export const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-env";

// const rawStorageRoot = process.env.STORAGE_ROOT || "./storage";
// export const STORAGE_ROOT = path.resolve(process.cwd(), rawStorageRoot);
// export const DATA_DIR = path.join(STORAGE_ROOT, "data");
// export const UPLOADS_DIR = path.join(STORAGE_ROOT, "uploads");
// export const DB_PATH = path.join(DATA_DIR, "studybuddy.db");
