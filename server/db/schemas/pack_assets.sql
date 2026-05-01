CREATE TABLE IF NOT EXISTS pack_assets (
  id TEXT PRIMARY KEY,
  pack_version_id TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('cover', 'preview', 'page_image', 'item_image', 'thumbnail', 'manifest', 'full_pack')),
  asset_key TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  width INTEGER,
  height INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (pack_version_id) REFERENCES pack_versions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pack_assets_pack_version_id
  ON pack_assets(pack_version_id);

CREATE INDEX IF NOT EXISTS idx_pack_assets_asset_type
  ON pack_assets(asset_type);
