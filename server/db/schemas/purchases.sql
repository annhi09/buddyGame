CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  buyer_user_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  pack_version_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (buyer_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pack_id) REFERENCES packs(id) ON DELETE CASCADE,
  FOREIGN KEY (pack_version_id) REFERENCES pack_versions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_purchases_buyer_user_id
  ON purchases(buyer_user_id);

CREATE INDEX IF NOT EXISTS idx_purchases_pack_id
  ON purchases(pack_id);

CREATE INDEX IF NOT EXISTS idx_purchases_payment_status
  ON purchases(payment_status);
