import fs from "fs";
import Database from "better-sqlite3";
import { DATA_DIR, DB_PATH } from "../config/env.js";
import path from "path";

fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

const schemaPath = path.join(process.cwd(), "db", "schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");
db.exec(schemaSql);

/* -------------------------------
   MIGRATIONS
--------------------------------*/

try {
  db.exec(`ALTER TABLE images ADD COLUMN item_key TEXT`);
  console.log("DB migration: added item_key column");
} catch (err) {
  // column already exists
}

// import fs from "fs";
// import Database from "better-sqlite3";
// import { DATA_DIR, DB_PATH } from "../config/env.js";
// import path from "path";

// fs.mkdirSync(DATA_DIR, { recursive: true });

// export const db = new Database(DB_PATH);
// db.pragma("journal_mode = WAL");

// const schemaPath = path.join(process.cwd(), "db", "schema.sql");
// const schemaSql = fs.readFileSync(schemaPath, "utf8");
// db.exec(schemaSql);
