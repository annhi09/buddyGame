import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { DATA_DIR, DB_PATH } from "../config/env.js";


fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
console.error("Using SQLite DB:", DB_PATH);
console.error("Resolved DB dir:", path.dirname(DB_PATH));
console.error("CWD:", process.cwd());
export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function runSchemaFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`Schema file missing: ${filePath}`);
    return;
  }

  const sql = fs.readFileSync(filePath, "utf8");
  db.exec(sql);
}

/* --------------------------------
   1) Load legacy core schema first
--------------------------------- */
const legacySchemaPath = path.join(process.cwd(), "db", "schema.sql");
runSchemaFile(legacySchemaPath);

/* --------------------------------
   2) Load new marketplace schemas
--------------------------------- */
const schemaDir = path.join(process.cwd(), "db", "schemas");

const schemaFiles = [
  "creator_profiles.sql",
  "packs.sql",
  "pack_versions.sql",
  "pack_assets.sql",
  "purchases.sql",
  "user_library.sql",
  "creator_earnings.sql",
];

for (const file of schemaFiles) {
  runSchemaFile(path.join(schemaDir, file));
}

/* -------------------------------
   MIGRATIONS
--------------------------------*/

try {
  db.exec(`ALTER TABLE images ADD COLUMN item_key TEXT`);
  console.log("DB migration: added item_key column");
} catch (err) {
  // column already exists
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'buyer'`);
  console.log("DB migration: added users.role column");
} catch (err) {
  // column already exists
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN plan_type TEXT DEFAULT 'free'`);
  console.log("DB migration: added users.plan_type column");
} catch (err) {
  // column already exists
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pack_review_events (
      id TEXT PRIMARY KEY,
      pack_id TEXT NOT NULL,
      admin_user_id TEXT,
      action TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
} catch (err) {
  console.warn("Skipping pack_review_events table creation:", err.message);
}

function columnExists(tableName, columnName) {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return rows.some(row => row.name === columnName);
}

function packsAllowsApprovedStatus() {
  const row = db.prepare(`
    SELECT sql
    FROM sqlite_master
    WHERE type = 'table' AND name = 'packs'
  `).get();

  const sql = String(row?.sql || "");
  return sql.includes("'approved'");
}

function rebuildPacksTableForApprovedStatus() {
  console.log("DB migration: rebuilding packs table to allow approved status");

  db.exec(`
    PRAGMA foreign_keys = OFF;
    BEGIN TRANSACTION;

    ALTER TABLE packs RENAME TO packs_old;

    CREATE TABLE packs (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      lesson_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      short_description TEXT,
      long_description TEXT,
      age_min INTEGER DEFAULT 3,
      age_max INTEGER DEFAULT 6,
      category TEXT,
      language TEXT DEFAULT 'en',
      status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'review', 'approved', 'published', 'rejected', 'unpublished')),
      price_cents INTEGER DEFAULT 0,
      access_mode TEXT DEFAULT 'paid',
      license_type TEXT DEFAULT 'personal',
      export_policy TEXT DEFAULT 'none',
      review_notes TEXT,
      reviewed_at TEXT,
      reviewed_by_user_id TEXT,
      approved_at TEXT,
      rejected_at TEXT,
      published_at TEXT,
      cover_url TEXT,
      thumbnail_url TEXT,
      current_version INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );

    INSERT INTO packs (
      id,
      creator_id,
      lesson_id,
      type,
      title,
      slug,
      short_description,
      long_description,
      age_min,
      age_max,
      category,
      language,
      status,
      price_cents,
      access_mode,
      license_type,
      export_policy,
      review_notes,
      reviewed_at,
      reviewed_by_user_id,
      approved_at,
      rejected_at,
      published_at,
      cover_url,
      thumbnail_url,
      current_version,
      created_at,
      updated_at
    )
    SELECT
      id,
      creator_id,
      lesson_id,
      type,
      title,
      slug,
      short_description,
      long_description,
      age_min,
      age_max,
      category,
      language,
      status,
      price_cents,
      access_mode,
      license_type,
      export_policy,
      review_notes,
      reviewed_at,
      reviewed_by_user_id,
      approved_at,
      rejected_at,
      published_at,
      cover_url,
      thumbnail_url,
      current_version,
      created_at,
      updated_at
    FROM packs_old;

    DROP TABLE packs_old;

    COMMIT;
    PRAGMA foreign_keys = ON;
  `);
}

try {
  if (tableExists("packs") && !packsAllowsApprovedStatus()) {
    try {
        rebuildPacksTableForApprovedStatus();
      } catch (e) {
        console.warn("Skipping packs rebuild:", e.message);
      }
      // rebuildPacksTableForApprovedStatus();
    }
} catch (err) {
  console.error("DB migration failed: rebuild packs for approved status", err);
}

function tableExists(tableName) {
  const row = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name = ?
  `).get(tableName);
  return !!row;
}

// import fs from "fs";
// import path from "path";
// import Database from "better-sqlite3";
// import { DATA_DIR, DB_PATH } from "../config/env.js";

// const BASE_DIR = process.cwd(); // expected: studybuddy/server
// const SCHEMAS_DIR = path.join(BASE_DIR, "db", "schemas");
// const LEGACY_SCHEMA_PATH = path.join(BASE_DIR, "db", "schema.sql");

// fs.mkdirSync(DATA_DIR, { recursive: true });
// fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// export const db = new Database(DB_PATH);
// db.pragma("journal_mode = WAL");
// db.pragma("foreign_keys = ON");

// function runSqlFile(filePath) {
//   const sql = fs.readFileSync(filePath, "utf8");
//   if (sql.trim()) {
//     db.exec(sql);
//   }
// }

// function loadSchemas() {
//   const schemaFiles = [
//     // current core schemas
//     "users.sql",
//     "lessons.sql",
//     "images.sql",
//     // creator marketplace schemas
//     "creator_profiles.sql",
//     "packs.sql",
//     "pack_versions.sql",
//     "pack_assets.sql",
//     "purchases.sql",
//     "user_library.sql",
//     "creator_earnings.sql",
//   ];

//   let loadedAny = false;

//   if (fs.existsSync(SCHEMAS_DIR)) {
//     for (const file of schemaFiles) {
//       const filePath = path.join(SCHEMAS_DIR, file);
//       if (!fs.existsSync(filePath)) continue;
//       runSqlFile(filePath);
//       loadedAny = true;
//     }
//   }

//   // fallback for older project state
//   if (!loadedAny && fs.existsSync(LEGACY_SCHEMA_PATH)) {
//     runSqlFile(LEGACY_SCHEMA_PATH);
//     loadedAny = true;
//   }

//   if (!loadedAny) {
//     console.warn("No schema files found. Checked:", SCHEMAS_DIR, "and", LEGACY_SCHEMA_PATH);
//   }
// }

// function runSafeMigration(name, sql) {
//   try {
//     db.exec(sql);
//     console.log(`DB migration: ${name}`);
//   } catch {
//     // already applied or not needed
//   }
// }

// loadSchemas();

// /* -------------------------------
//    MIGRATIONS
// --------------------------------*/

// runSafeMigration("added item_key column to images", `ALTER TABLE images ADD COLUMN item_key TEXT`);
// runSafeMigration("added role column to users", `ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'buyer'`);
// runSafeMigration("added plan_type column to users", `ALTER TABLE users ADD COLUMN plan_type TEXT DEFAULT 'free'`);
