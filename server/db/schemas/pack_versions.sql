CREATE TABLE IF NOT EXISTS pack_versions (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  manifest_url TEXT,
  full_pack_url TEXT,
  preview_1_url TEXT,
  preview_2_url TEXT,
  changelog TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'rejected')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (pack_id) REFERENCES packs(id) ON DELETE CASCADE,
  UNIQUE(pack_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_pack_versions_pack_id
  ON pack_versions(pack_id);

CREATE INDEX IF NOT EXISTS idx_pack_versions_status
  ON pack_versions(status);
