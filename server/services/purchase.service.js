import crypto from "crypto";
import { db } from "../db/index.js";

function uid() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

const getPackStmt = db.prepare(`
  SELECT * FROM packs
  WHERE id = ? AND status = 'published'
`);

const getLatestApprovedVersionStmt = db.prepare(`
  SELECT *
  FROM pack_versions
  WHERE pack_id = ? AND status = 'approved'
  ORDER BY version_number DESC
  LIMIT 1
`);

const insertPurchaseStmt = db.prepare(`
  INSERT INTO purchases (
    id, buyer_user_id, pack_id, pack_version_id,
    amount_cents, currency, payment_status, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const upsertLibraryStmt = db.prepare(`
  INSERT INTO user_library (
    id, buyer_user_id, pack_id, owned_version, latest_available_version,
    downloaded_version, last_downloaded_at, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?)
  ON CONFLICT(buyer_user_id, pack_id) DO UPDATE SET
    owned_version = excluded.owned_version,
    latest_available_version = excluded.latest_available_version,
    updated_at = excluded.updated_at
`);

const insertEarningStmt = db.prepare(`
  INSERT INTO creator_earnings (
    id, creator_id, pack_id, purchase_id, gross_cents, fee_cents,
    net_cents, creator_share_cents, platform_share_cents, status, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

export function calculateNetSplit({ grossCents, feeCents }) {
  const netCents = Math.max(0, grossCents - feeCents);
  const creatorShareCents = Math.round(netCents * 0.8);
  const platformShareCents = netCents - creatorShareCents;

  return {
    netCents,
    creatorShareCents,
    platformShareCents,
  };
}

export function purchasePack({ buyerUserId, packId, paymentResult = {} }) {
  const pack = getPackStmt.get(packId);
  if (!pack) {
    throw new Error("Pack not found");
  }

  const version = getLatestApprovedVersionStmt.get(packId);
  if (!version) {
    throw new Error("Approved version not found");
  }

  const grossCents = Number(paymentResult.grossCents || pack.price_cents || 0);
  const feeCents = Number(paymentResult.feeCents || 0);
  const currency = String(paymentResult.currency || "usd").toLowerCase();

  const split = calculateNetSplit({ grossCents, feeCents });
  const purchaseId = uid();
  const now = nowIso();

  const tx = db.transaction(() => {
    insertPurchaseStmt.run(
      purchaseId,
      buyerUserId,
      packId,
      version.id,
      grossCents,
      currency,
      "paid",
      now
    );

    upsertLibraryStmt.run(
      uid(),
      buyerUserId,
      packId,
      version.version_number,
      version.version_number,
      now,
      now
    );

    insertEarningStmt.run(
      uid(),
      pack.creator_id,
      packId,
      purchaseId,
      grossCents,
      feeCents,
      split.netCents,
      split.creatorShareCents,
      split.platformShareCents,
      "pending",
      now
    );
  });

  tx();

  return {
    ok: true,
    purchaseId,
    packId,
    version: version.version_number,
    ...split,
  };
}
