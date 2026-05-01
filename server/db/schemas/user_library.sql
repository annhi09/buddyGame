CREATE TABLE IF NOT EXISTS user_library (
  id TEXT PRIMARY KEY,
  buyer_user_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  owned_version INTEGER NOT NULL,
  latest_available_version INTEGER NOT NULL,
  downloaded_version INTEGER,
  last_downloaded_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (buyer_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pack_id) REFERENCES packs(id) ON DELETE CASCADE,
  UNIQUE(buyer_user_id, pack_id)
);

CREATE INDEX IF NOT EXISTS idx_user_library_buyer_user_id
  ON user_library(buyer_user_id);

CREATE INDEX IF NOT EXISTS idx_user_library_pack_id
  ON user_library(pack_id);
