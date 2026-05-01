CREATE TABLE IF NOT EXISTS packs (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('reading', 'words')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  long_description TEXT,
  age_min INTEGER,
  age_max INTEGER,
  category TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'rejected', 'unpublished')),
  price_cents INTEGER NOT NULL DEFAULT 0,
  cover_url TEXT,
  thumbnail_url TEXT,
  current_version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_packs_creator_id
  ON packs(creator_id);

CREATE INDEX IF NOT EXISTS idx_packs_status
  ON packs(status);

CREATE INDEX IF NOT EXISTS idx_packs_type_status
  ON packs(type, status);
