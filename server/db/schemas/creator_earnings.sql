CREATE TABLE IF NOT EXISTS creator_earnings (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  purchase_id TEXT NOT NULL,
  gross_cents INTEGER NOT NULL,
  fee_cents INTEGER NOT NULL,
  net_cents INTEGER NOT NULL,
  creator_share_cents INTEGER NOT NULL,
  platform_share_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'payable', 'paid', 'reversed')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pack_id) REFERENCES packs(id) ON DELETE CASCADE,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_creator_earnings_creator_id
  ON creator_earnings(creator_id);

CREATE INDEX IF NOT EXISTS idx_creator_earnings_purchase_id
  ON creator_earnings(purchase_id);

CREATE INDEX IF NOT EXISTS idx_creator_earnings_status
  ON creator_earnings(status);
