import crypto from "crypto";
import { db } from "../db/index.js";

function uid() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

function makeSlug(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `pack-${Date.now()}`;
}

const getCreatorProfileStmt = db.prepare(`
  SELECT * FROM creator_profiles
  WHERE user_id = ?
`);

const upsertCreatorProfileStmt = db.prepare(`
  INSERT INTO creator_profiles (
    id, user_id, studio_name, bio, country, payout_status, created_at, updated_at
  ) VALUES (
    @id, @user_id, @studio_name, @bio, @country, @payout_status, @created_at, @updated_at
  )
  ON CONFLICT(user_id) DO UPDATE SET
    studio_name = excluded.studio_name,
    bio = excluded.bio,
    country = excluded.country,
    updated_at = excluded.updated_at
`);

const insertPackStmt = db.prepare(`
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
    cover_url,
    thumbnail_url,
    current_version,
    created_at,
    updated_at
  ) VALUES (
    @id,
    @creator_id,
    @lesson_id,
    @type,
    @title,
    @slug,
    @short_description,
    @long_description,
    @age_min,
    @age_max,
    @category,
    @language,
    @status,
    @price_cents,
    @access_mode,
    @license_type,
    @export_policy,
    @cover_url,
    @thumbnail_url,
    @current_version,
    @created_at,
    @updated_at
  )
`);

const listCreatorPacksStmt = db.prepare(`
  SELECT * FROM packs
  WHERE creator_id = ?
  ORDER BY updated_at DESC
`);

const getPackByIdStmt = db.prepare(`
  SELECT * FROM packs
  WHERE id = ?
`);

const updatePackStmt = db.prepare(`
  UPDATE packs
  SET
    lesson_id = @lesson_id,
    type = @type,
    title = @title,
    slug = @slug,
    short_description = @short_description,
    long_description = @long_description,
    age_min = @age_min,
    age_max = @age_max,
    category = @category,
    language = @language,
    price_cents = @price_cents,
    access_mode = @access_mode,
    license_type = @license_type,
    export_policy = @export_policy,
    cover_url = @cover_url,
    thumbnail_url = @thumbnail_url,
    updated_at = @updated_at
  WHERE id = @id AND creator_id = @creator_id
`);

const getMaxVersionStmt = db.prepare(`
  SELECT MAX(version_number) AS max_version
  FROM pack_versions
  WHERE pack_id = ?
`);

const insertPackVersionStmt = db.prepare(`
  INSERT INTO pack_versions (
    id, pack_id, version_number, manifest_url, full_pack_url,
    preview_1_url, preview_2_url, changelog, status, created_at
  ) VALUES (
    @id, @pack_id, @version_number, @manifest_url, @full_pack_url,
    @preview_1_url, @preview_2_url, @changelog, @status, @created_at
  )
`);

const updatePackReviewStmt = db.prepare(`
  UPDATE packs
  SET status = 'review', updated_at = ?
  WHERE id = ? AND creator_id = ?
`);

// const getCreatorDashboardTotalsStmt = db.prepare(`
//   SELECT
//     COUNT(DISTINCT CASE WHEN LOWER(COALESCE(p.status, '')) = 'published' THEN p.id END) AS published_packs,
//     COUNT(DISTINCT CASE WHEN LOWER(COALESCE(p.status, '')) = 'review' THEN p.id END) AS review_packs,
//     COUNT(DISTINCT CASE WHEN LOWER(COALESCE(p.status, '')) = 'draft' THEN p.id END) AS draft_packs,
//     COUNT(CASE WHEN LOWER(COALESCE(ul.source_access_mode, p.access_mode, 'paid')) = 'free_library' THEN 1 END) AS free_downloads,
//     COUNT(CASE WHEN LOWER(COALESCE(ul.source_access_mode, p.access_mode, 'paid')) != 'free_library' THEN 1 END) AS total_sales,
//     COALESCE(SUM(CASE
//       WHEN LOWER(COALESCE(ul.source_access_mode, p.access_mode, 'paid')) != 'free_library'
//       THEN COALESCE(ul.gross_cents, 0)
//       ELSE 0
//     END), 0) AS gross_revenue_cents,
//     COALESCE(SUM(CASE
//       WHEN LOWER(COALESCE(ul.source_access_mode, p.access_mode, 'paid')) != 'free_library'
//       THEN MAX(COALESCE(ul.gross_cents, 0) - COALESCE(ul.fee_cents, 0), 0)
//       ELSE 0
//     END), 0) AS estimated_earnings_cents
//   FROM packs p
//   LEFT JOIN user_library ul ON ul.pack_id = p.id
//   WHERE p.creator_id = ?
// `);

// const listCreatorTopPacksStmt = db.prepare(`
//   SELECT
//     p.id,
//     p.title,
//     p.type,
//     p.status,
//     p.access_mode,
//     p.license_type,
//     p.export_policy,
//     p.price_cents,
//     p.updated_at,
//     COUNT(CASE WHEN LOWER(COALESCE(ul.source_access_mode, p.access_mode, 'paid')) = 'free_library' THEN 1 END) AS free_downloads,
//     COUNT(CASE WHEN LOWER(COALESCE(ul.source_access_mode, p.access_mode, 'paid')) != 'free_library' THEN 1 END) AS total_sales,
//     COALESCE(SUM(CASE
//       WHEN LOWER(COALESCE(ul.source_access_mode, p.access_mode, 'paid')) != 'free_library'
//       THEN COALESCE(ul.gross_cents, 0)
//       ELSE 0
//     END), 0) AS gross_revenue_cents,
//     COALESCE(SUM(CASE
//       WHEN LOWER(COALESCE(ul.source_access_mode, p.access_mode, 'paid')) != 'free_library'
//       THEN MAX(COALESCE(ul.gross_cents, 0) - COALESCE(ul.fee_cents, 0), 0)
//       ELSE 0
//     END), 0) AS estimated_earnings_cents
//   FROM packs p
//   LEFT JOIN user_library ul ON ul.pack_id = p.id
//   WHERE p.creator_id = ?
//   GROUP BY
//     p.id, p.title, p.type, p.status, p.access_mode, p.license_type, p.export_policy, p.price_cents, p.updated_at
//   ORDER BY gross_revenue_cents DESC, total_sales DESC, free_downloads DESC, p.updated_at DESC
//   LIMIT 8
// `);

const getCreatorDashboardPackCountsStmt = db.prepare(`
  SELECT
    COUNT(DISTINCT CASE WHEN LOWER(COALESCE(status, '')) = 'published' THEN id END) AS published_packs,
    COUNT(DISTINCT CASE WHEN LOWER(COALESCE(status, '')) = 'review' THEN id END) AS review_packs,
    COUNT(DISTINCT CASE WHEN LOWER(COALESCE(status, '')) = 'draft' THEN id END) AS draft_packs
  FROM packs
  WHERE creator_id = ?
`);

const getCreatorDashboardFreeDownloadsStmt = db.prepare(`
  SELECT
    COUNT(*) AS free_downloads
  FROM user_library ul
  JOIN packs p ON p.id = ul.pack_id
  WHERE p.creator_id = ?
    AND LOWER(COALESCE(p.access_mode, 'paid')) = 'free_library'
`);

const getCreatorDashboardSalesStmt = db.prepare(`
  SELECT
    COUNT(*) AS total_sales,
    COALESCE(SUM(COALESCE(pr.amount_cents, 0)), 0) AS gross_revenue_cents
  FROM purchases pr
  JOIN packs p ON p.id = pr.pack_id
  WHERE p.creator_id = ?
    AND pr.payment_status = 'paid'
`);

const listCreatorTopPacksStmt = db.prepare(`
  SELECT
    p.id,
    p.title,
    p.type,
    p.status,
    p.access_mode,
    p.license_type,
    p.export_policy,
    p.price_cents,
    p.updated_at,

    COALESCE((
      SELECT COUNT(*)
      FROM user_library ul
      WHERE ul.pack_id = p.id
        AND LOWER(COALESCE(p.access_mode, 'paid')) = 'free_library'
    ), 0) AS free_downloads,

    COALESCE((
      SELECT COUNT(*)
      FROM purchases pr
      WHERE pr.pack_id = p.id
        AND pr.payment_status = 'paid'
    ), 0) AS total_sales,

    COALESCE((
      SELECT SUM(COALESCE(pr.amount_cents, 0))
      FROM purchases pr
      WHERE pr.pack_id = p.id
        AND pr.payment_status = 'paid'
    ), 0) AS gross_revenue_cents

  FROM packs p
  WHERE p.creator_id = ?
  ORDER BY gross_revenue_cents DESC, total_sales DESC, free_downloads DESC, p.updated_at DESC
  LIMIT 8
`);

function estimateCreatorNetFromGross(grossCents = 0) {
  const gross = Number(grossCents || 0);

  // Using your current marketplace platform fee idea:
  // 8% platform cut on paid sales
  const creatorNet = Math.round(gross * 0.92);

  return Math.max(0, creatorNet);
}

export function getCreatorDashboard(userId) {
  const packCounts = getCreatorDashboardPackCountsStmt.get(userId) || {};
  const freeStats = getCreatorDashboardFreeDownloadsStmt.get(userId) || {};
  const salesStats = getCreatorDashboardSalesStmt.get(userId) || {};
  const topPacksRaw = listCreatorTopPacksStmt.all(userId) || [];

  const grossRevenueCents = Number(salesStats.gross_revenue_cents || 0);

  const topPacks = topPacksRaw.map(pack => {
    const gross = Number(pack.gross_revenue_cents || 0);
    return {
      ...pack,
      free_downloads: Number(pack.free_downloads || 0),
      total_sales: Number(pack.total_sales || 0),
      gross_revenue_cents: gross,
      estimated_earnings_cents: estimateCreatorNetFromGross(gross),
    };
  });

  return {
    totals: {
      published_packs: Number(packCounts.published_packs || 0),
      review_packs: Number(packCounts.review_packs || 0),
      draft_packs: Number(packCounts.draft_packs || 0),
      free_downloads: Number(freeStats.free_downloads || 0),
      total_sales: Number(salesStats.total_sales || 0),
      gross_revenue_cents: grossRevenueCents,
      estimated_earnings_cents: estimateCreatorNetFromGross(grossRevenueCents),
    },
    topPacks,
  };
}

export function getCreatorProfile(userId) {
  return getCreatorProfileStmt.get(userId) || null;
}

export function upsertCreatorProfile(userId, payload = {}) {
  const now = nowIso();
  const existing = getCreatorProfile(userId);

  const row = {
    id: existing?.id || uid(),
    user_id: userId,
    studio_name: String(payload.studio_name || existing?.studio_name || "").trim(),
    bio: String(payload.bio || existing?.bio || "").trim(),
    country: String(payload.country || existing?.country || "").trim(),
    payout_status: existing?.payout_status || "pending",
    created_at: existing?.created_at || now,
    updated_at: now,
  };

  upsertCreatorProfileStmt.run(row);
  return getCreatorProfile(userId);
}

export function createDraftPack(userId, payload = {}) {
  const now = nowIso();
  const title = String(payload.title || "Untitled Pack").trim();

  const row = {
    id: uid(),
    creator_id: userId,
    lesson_id: String(payload.lesson_id || "").trim(),
    type: String(payload.type || "reading").trim(),
    title,
    slug: makeSlug(payload.slug || title),
    short_description: String(payload.short_description || "").trim(),
    long_description: String(payload.long_description || "").trim(),
    age_min: Number(payload.age_min || 3),
    age_max: Number(payload.age_max || 6),
    category: String(payload.category || "").trim(),
    language: String(payload.language || "en").trim(),
    status: "draft",
    price_cents: Number(payload.price_cents || 299),
    access_mode: String(payload.access_mode || "paid").trim(),
    license_type: String(payload.license_type || "personal").trim(),
    export_policy: String(payload.export_policy || "none").trim(),
    cover_url: String(payload.cover_url || "").trim(),
    thumbnail_url: String(payload.thumbnail_url || "").trim(),
    current_version: 0,
    created_at: now,
    updated_at: now,
  };

  insertPackStmt.run(row);
  return getPackByIdStmt.get(row.id);
}

export function listPacksByCreator(userId) {
  return listCreatorPacksStmt.all(userId);
}

export function updatePackById(packId, userId, payload = {}) {
  const existing = getPackByIdStmt.get(packId);
  if (!existing || existing.creator_id !== userId) return null;

  const row = {
    id: packId,
    creator_id: userId,
    lesson_id: String(payload.lesson_id || existing.lesson_id || "").trim(),
    type: String(payload.type || existing.type || "reading").trim(),
    title: String(payload.title || existing.title || "Untitled Pack").trim(),
    slug: makeSlug(payload.slug || existing.slug || payload.title || existing.title),
    short_description: String(payload.short_description || existing.short_description || "").trim(),
    long_description: String(payload.long_description || existing.long_description || "").trim(),
    age_min: Number(payload.age_min ?? existing.age_min ?? 3),
    age_max: Number(payload.age_max ?? existing.age_max ?? 6),
    category: String(payload.category || existing.category || "").trim(),
    language: String(payload.language || existing.language || "en").trim(),
    price_cents: Number(payload.price_cents ?? existing.price_cents ?? 299),
    access_mode: String(payload.access_mode || existing.access_mode || "paid").trim(),
    license_type: String(payload.license_type || existing.license_type || "personal").trim(),
    export_policy: String(payload.export_policy || existing.export_policy || "none").trim(),
    cover_url: String(payload.cover_url || existing.cover_url || "").trim(),
    thumbnail_url: String(payload.thumbnail_url || existing.thumbnail_url || "").trim(),
    updated_at: nowIso(),
  };

  updatePackStmt.run(row);
  return getPackByIdStmt.get(packId);
}

export function createPackVersion(packId, userId, payload = {}) {
  const pack = getPackByIdStmt.get(packId);
  if (!pack || pack.creator_id !== userId) return null;

  const maxRow = getMaxVersionStmt.get(packId);
  const nextVersion = Number(maxRow?.max_version || 0) + 1;

  const row = {
    id: uid(),
    pack_id: packId,
    version_number: nextVersion,
    manifest_url: String(payload.manifest_url || "").trim(),
    full_pack_url: String(payload.full_pack_url || "").trim(),
    preview_1_url: String(payload.preview_1_url || "").trim(),
    preview_2_url: String(payload.preview_2_url || "").trim(),
    changelog: String(payload.changelog || "").trim(),
    status: "review",
    created_at: nowIso(),
  };

  insertPackVersionStmt.run(row);
  return row;
}

export function submitPackForReview(packId, userId) {
  const result = updatePackReviewStmt.run(nowIso(), packId, userId);
  return result.changes > 0;
}