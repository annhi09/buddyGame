import crypto from "crypto";
import { db } from "../db/index.js";

const listPacksBase = `
  SELECT
    p.*,
    u.email AS creator_email,
    l.title AS lesson_title,
    l.data_json AS lesson_data_json,
    ru.email AS reviewer_email
  FROM packs p
  LEFT JOIN users u ON u.id = p.creator_id
  LEFT JOIN lessons l ON l.id = p.lesson_id
  LEFT JOIN users ru ON ru.id = p.reviewed_by_user_id
`;

const getPackStmt = db.prepare(`
  SELECT
    p.*,
    u.email AS creator_email,
    l.title AS lesson_title,
    l.data_json AS lesson_data_json,
    ru.email AS reviewer_email
  FROM packs p
  LEFT JOIN users u ON u.id = p.creator_id
  LEFT JOIN lessons l ON l.id = p.lesson_id
  LEFT JOIN users ru ON ru.id = p.reviewed_by_user_id
  WHERE p.id = ?
  LIMIT 1
`);

const getLatestVersionStmt = db.prepare(`
  SELECT *
  FROM pack_versions
  WHERE pack_id = ?
  ORDER BY version_number DESC
  LIMIT 1
`);

const insertPackVersionStmt = db.prepare(`
  INSERT INTO pack_versions (
    id,
    pack_id,
    version_number,
    manifest_url,
    full_pack_url,
    preview_1_url,
    preview_2_url,
    changelog,
    status,
    created_at
  ) VALUES (
    @id,
    @pack_id,
    @version_number,
    @manifest_url,
    @full_pack_url,
    @preview_1_url,
    @preview_2_url,
    @changelog,
    @status,
    @created_at
  )
`);

const updateApprovedStmt = db.prepare(`
  UPDATE packs
  SET
    status = 'approved',
    review_notes = @review_notes,
    reviewed_at = @reviewed_at,
    reviewed_by_user_id = @reviewed_by_user_id,
    approved_at = @approved_at,
    rejected_at = NULL,
    updated_at = @updated_at
  WHERE id = @id
`);

const updateRejectedStmt = db.prepare(`
  UPDATE packs
  SET
    status = 'rejected',
    review_notes = @review_notes,
    reviewed_at = @reviewed_at,
    reviewed_by_user_id = @reviewed_by_user_id,
    rejected_at = @rejected_at,
    updated_at = @updated_at
  WHERE id = @id
`);

const updatePublishedStmt = db.prepare(`
  UPDATE packs
  SET
    status = 'published',
    review_notes = @review_notes,
    reviewed_at = @reviewed_at,
    reviewed_by_user_id = @reviewed_by_user_id,
    published_at = @published_at,
    updated_at = @updated_at
  WHERE id = @id
`);

const insertPackReviewEventStmt = db.prepare(`
  INSERT INTO pack_review_events (
    id,
    pack_id,
    reviewer_user_id,
    action,
    note,
    created_at
  ) VALUES (
    @id,
    @pack_id,
    @reviewer_user_id,
    @action,
    @note,
    @created_at
  )
`);

const listPackReviewEventsStmt = db.prepare(`
  SELECT
    e.*,
    u.email AS reviewer_email
  FROM pack_review_events e
  LEFT JOIN users u ON u.id = e.reviewer_user_id
  WHERE e.pack_id = ?
  ORDER BY e.created_at DESC
`);

function nowIso() {
  return new Date().toISOString();
}

function uid() {
  return crypto.randomUUID();
}

function cleanNote(value = "") {
  return String(value || "").trim();
}

function resolveLessonCoverFromDataJson(dataJson) {
  try {
    const parsed = typeof dataJson === "string" ? JSON.parse(dataJson) : (dataJson || {});
    const coverImage = parsed?.coverImage || "";
    if (coverImage) return coverImage;

    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    const firstImage = items?.[0]?.image;

    if (typeof firstImage === "string") return firstImage || "";
    if (firstImage && typeof firstImage === "object") {
      return firstImage.thumb || firstImage.medium || firstImage.original || "";
    }

    return "";
  } catch {
    return "";
  }
}

function buildStatusTimeline(pack) {
  const items = [];

  if (pack.created_at) {
    items.push({ key: "created", label: "Draft Created", at: pack.created_at });
  }
  if (pack.reviewed_at && String(pack.status || "").toLowerCase() === "review") {
    items.push({ key: "review", label: "In Review", at: pack.reviewed_at });
  }
  if (pack.approved_at) {
    items.push({ key: "approved", label: "Approved", at: pack.approved_at });
  }
  if (pack.rejected_at) {
    items.push({ key: "rejected", label: "Rejected", at: pack.rejected_at });
  }
  if (pack.published_at) {
    items.push({ key: "published", label: "Published", at: pack.published_at });
  }

  return items.sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

function decorateAdminPack(pack, includeHistory = false) {
  const lessonCover = resolveLessonCoverFromDataJson(pack.lesson_data_json);
  const decorated = {
    ...pack,
    resolved_cover_url:
      pack.cover_url ||
      pack.thumbnail_url ||
      lessonCover ||
      "",
    status_timeline: buildStatusTimeline(pack),
  };

  if (includeHistory) {
    decorated.review_history = listPackReviewEventsStmt.all(pack.id);
  }

  return decorated;
}

function insertReviewEvent(packId, reviewerUserId, action, note = "") {
  insertPackReviewEventStmt.run({
    id: uid(),
    pack_id: packId,
    reviewer_user_id: reviewerUserId || null,
    action,
    note: cleanNote(note),
    created_at: nowIso(),
  });
}

export function listAdminPacks({ status = "", q = "" } = {}) {
  const clauses = [];
  const params = {};

  if (status) {
    clauses.push(`LOWER(p.status) = LOWER(@status)`);
    params.status = String(status).trim();
  }

  if (q) {
    clauses.push(`(
      LOWER(COALESCE(p.title, '')) LIKE LOWER(@q) OR
      LOWER(COALESCE(p.short_description, '')) LIKE LOWER(@q) OR
      LOWER(COALESCE(p.long_description, '')) LIKE LOWER(@q) OR
      LOWER(COALESCE(u.email, '')) LIKE LOWER(@q) OR
      LOWER(COALESCE(p.type, '')) LIKE LOWER(@q) OR
      LOWER(COALESCE(p.category, '')) LIKE LOWER(@q) OR
      LOWER(COALESCE(p.language, '')) LIKE LOWER(@q) OR
      LOWER(COALESCE(p.review_notes, '')) LIKE LOWER(@q)
    )`);
    params.q = `%${String(q).trim()}%`;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const stmt = db.prepare(`
    ${listPacksBase}
    ${where}
    ORDER BY p.updated_at DESC
  `);

  return stmt.all(params).map(pack => decorateAdminPack(pack, false));
}

export function getAdminPackById(packId) {
  const pack = getPackStmt.get(packId);
  return pack ? decorateAdminPack(pack, true) : null;
}

export function approveAdminPack(packId, reviewerUserId, note = "") {
  const pack = getPackStmt.get(packId);
  if (!pack) throw new Error("Pack not found");

  const status = String(pack.status || "").toLowerCase();
  if (!["review", "rejected"].includes(status)) {
    throw new Error("Only review or rejected packs can be approved");
  }

  const now = nowIso();
  const reviewNote = cleanNote(note);

  updateApprovedStmt.run({
    id: packId,
    review_notes: reviewNote,
    reviewed_at: now,
    reviewed_by_user_id: reviewerUserId,
    approved_at: now,
    updated_at: now,
  });

  insertReviewEvent(packId, reviewerUserId, "approved", reviewNote);
  return getAdminPackById(packId);
}

export function rejectAdminPack(packId, reviewerUserId, reason = "") {
  const pack = getPackStmt.get(packId);
  if (!pack) throw new Error("Pack not found");

  const cleanReason = cleanNote(reason);
  if (!cleanReason) {
    throw new Error("Rejection reason is required");
  }

  const now = nowIso();

  updateRejectedStmt.run({
    id: packId,
    review_notes: cleanReason,
    reviewed_at: now,
    reviewed_by_user_id: reviewerUserId,
    rejected_at: now,
    updated_at: now,
  });

  insertReviewEvent(packId, reviewerUserId, "rejected", cleanReason);
  return getAdminPackById(packId);
}

export function publishAdminPack(packId, reviewerUserId, note = "") {
  const pack = getPackStmt.get(packId);
  if (!pack) throw new Error("Pack not found");

  const status = String(pack.status || "").toLowerCase();
  if (status !== "approved") {
    throw new Error("Only approved packs can be published");
  }

  const latest = getLatestVersionStmt.get(packId);
  const nextVersion = Number(latest?.version_number || 0) + 1;
  const now = nowIso();
  const publishNote = cleanNote(note);

  insertPackVersionStmt.run({
    id: uid(),
    pack_id: packId,
    version_number: nextVersion,
    manifest_url: latest?.manifest_url || "",
    full_pack_url: latest?.full_pack_url || "",
    preview_1_url: latest?.preview_1_url || pack.cover_url || "",
    preview_2_url: latest?.preview_2_url || pack.thumbnail_url || pack.cover_url || "",
    changelog: publishNote,
    status: "approved",
    created_at: now,
  });

  updatePublishedStmt.run({
    id: packId,
    review_notes: publishNote,
    reviewed_at: now,
    reviewed_by_user_id: reviewerUserId,
    published_at: now,
    updated_at: now,
  });

  insertReviewEvent(packId, reviewerUserId, "published", publishNote);
  return getAdminPackById(packId);
}

// import { buildPublishedPackVersion } from "./publish-builder.service.js";
// import crypto from "crypto";
// import { db } from "../db/index.js";

// const listPacksBase = `
//   SELECT
//     p.*,
//     u.email AS creator_email,
//     l.title AS lesson_title,
//     l.data_json AS lesson_data_json
//   FROM packs p
//   LEFT JOIN users u ON u.id = p.creator_id
//   LEFT JOIN lessons l ON l.id = p.lesson_id
// `;

// const getPackStmt = db.prepare(`
//   SELECT
//     p.*,
//     u.email AS creator_email,
//     l.title AS lesson_title,
//     l.data_json AS lesson_data_json
//   FROM packs p
//   LEFT JOIN users u ON u.id = p.creator_id
//   LEFT JOIN lessons l ON l.id = p.lesson_id
//   WHERE p.id = ?
//   LIMIT 1
// `);

// const updatePackStatusStmt = db.prepare(`
//   UPDATE packs
//   SET status = ?, updated_at = ?
//   WHERE id = ?
// `);

// const insertPackVersionStmt = db.prepare(`
//   INSERT INTO pack_versions (
//     id,
//     pack_id,
//     version_number,
//     manifest_url,
//     full_pack_url,
//     preview_1_url,
//     preview_2_url,
//     changelog,
//     status,
//     created_at
//   ) VALUES (
//     @id,
//     @pack_id,
//     @version_number,
//     @manifest_url,
//     @full_pack_url,
//     @preview_1_url,
//     @preview_2_url,
//     @changelog,
//     @status,
//     @created_at
//   )
// `);

// const getLatestVersionStmt = db.prepare(`
//   SELECT *
//   FROM pack_versions
//   WHERE pack_id = ?
//   ORDER BY version_number DESC
//   LIMIT 1
// `);

// function nowIso() {
//   return new Date().toISOString();
// }

// function uid() {
//   return crypto.randomUUID();
// }

// export function listAdminPacks({ status = "", q = "" } = {}) {
//   const clauses = [];
//   const params = {};

//   if (status) {
//     clauses.push(`LOWER(p.status) = LOWER(@status)`);
//     params.status = String(status).trim();
//   }

//   if (q) {
//     clauses.push(`(
//       LOWER(COALESCE(p.title, '')) LIKE LOWER(@q) OR
//       LOWER(COALESCE(p.short_description, '')) LIKE LOWER(@q) OR
//       LOWER(COALESCE(p.long_description, '')) LIKE LOWER(@q) OR
//       LOWER(COALESCE(u.email, '')) LIKE LOWER(@q) OR
//       LOWER(COALESCE(p.type, '')) LIKE LOWER(@q) OR
//       LOWER(COALESCE(p.category, '')) LIKE LOWER(@q) OR
//       LOWER(COALESCE(p.language, '')) LIKE LOWER(@q)
//     )`);
//     params.q = `%${String(q).trim()}%`;
//   }

//   const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
//   const stmt = db.prepare(`
//     ${listPacksBase}
//     ${where}
//     ORDER BY p.updated_at DESC
//   `);

//   return stmt.all(params).map(decorateAdminPack);
// }

// export function getAdminPackById(packId) {
//   const pack = getPackStmt.get(packId);
//   return pack ? decorateAdminPack(pack) : null;
// }

// export function approveAdminPack(packId, reviewerUserId) {
//   const pack = getPackStmt.get(packId);
//   if (!pack) throw new Error("Pack not found");

//   const status = String(pack.status || "").toLowerCase();
//   if (status !== "review") {
//     throw new Error("Only review packs can be approved");
//   }

//   db.prepare(`
//     UPDATE packs
//     SET status = ?, review_notes = '', updated_at = ?
//     WHERE id = ?
//   `).run("unpublished", nowIso(), packId);

//   void reviewerUserId;
//   return getPackStmt.get(packId);
// }
// export function rejectAdminPack(packId, reviewerUserId, reason = "") {
//   const pack = getPackStmt.get(packId);
//   if (!pack) throw new Error("Pack not found");

//   const cleanReason = String(reason || "").trim();
//   if (!cleanReason) {
//     throw new Error("Rejection reason is required");
//   }

//   updatePackRejectedStmt.run(
//     "rejected",
//     cleanReason,
//     nowIso(),
//     packId
//   );

//   void reviewerUserId;
//   return getPackStmt.get(packId);
// }

// const updatePackRejectedStmt = db.prepare(`
//   UPDATE packs
//   SET status = ?, review_notes = ?, updated_at = ?
//   WHERE id = ?
// `);

// function resolveLessonCoverFromDataJson(dataJson) {
//   try {
//     const parsed = typeof dataJson === "string" ? JSON.parse(dataJson) : (dataJson || {});
//     const coverImage = parsed?.coverImage || "";
//     if (coverImage) return coverImage;

//     const items = Array.isArray(parsed?.items) ? parsed.items : [];
//     const firstImage = items?.[0]?.image;

//     if (typeof firstImage === "string") return firstImage || "";
//     if (firstImage && typeof firstImage === "object") {
//       return firstImage.thumb || firstImage.medium || firstImage.original || "";
//     }

//     return "";
//   } catch {
//     return "";
//   }
// }

// function decorateAdminPack(pack) {
//   const lessonCover = resolveLessonCoverFromDataJson(pack.lesson_data_json);
//   return {
//     ...pack,
//     resolved_cover_url:
//       pack.cover_url ||
//       pack.thumbnail_url ||
//       lessonCover ||
//       "",
//   };
// }

// export function publishAdminPack(packId, reviewerUserId) {
//   const pack = getPackStmt.get(packId);
//   if (!pack) throw new Error("Pack not found");

//   const decoratedPack = decorateAdminPack(pack);

//   const status = String(pack.status || "").toLowerCase();
//   if (status !== "unpublished") {
//     throw new Error("Only approved packs can be published");
//   }

//   const latest = getLatestVersionStmt.get(packId);
//   const nextVersion = Number(latest?.version_number || 0) + 1;
//   const now = nowIso();

//   const built = buildPublishedPackVersion(pack, nextVersion);

//   insertPackVersionStmt.run({
//     id: uid(),
//     pack_id: packId,
//     version_number: nextVersion,
//     manifest_url: built.manifestUrl,
//     full_pack_url: built.fullPackUrl,
//     preview_1_url: built.preview1Url || decoratedPack.resolved_cover_url || "",
//     preview_2_url: built.preview2Url || decoratedPack.resolved_cover_url || "",
//     changelog: "",
//     status: "approved",
//     created_at: now,
//   });

//   db.prepare(`
//     UPDATE packs
//     SET status = ?, review_notes = '', current_version = ?, updated_at = ?
//     WHERE id = ?
//   `).run("published", nextVersion, now, packId);

//   void reviewerUserId;

//   return getPackStmt.get(packId);
// }

// export function publishAdminPack(packId, reviewerUserId) {
//   const pack = getPackStmt.get(packId);
//   if (!pack) throw new Error("Pack not found");

//   const decoratedPack = decorateAdminPack(pack);

//   const status = String(pack.status || "").toLowerCase();
//   if (status !== "unpublished") {
//     throw new Error("Only approved packs can be published");
//   }

//   const latest = getLatestVersionStmt.get(packId);
//   const nextVersion = Number(latest?.version_number || 0) + 1;
//   const now = nowIso();

//   insertPackVersionStmt.run({
//     id: uid(),
//     pack_id: packId,
//     version_number: nextVersion,
//     manifest_url: latest?.manifest_url || "",
//     full_pack_url: latest?.full_pack_url || "",
//     preview_1_url: latest?.preview_1_url || decoratedPack.resolved_cover_url || "",
//     preview_2_url: latest?.preview_2_url || decoratedPack.resolved_cover_url || "",
//     changelog: "",
//     status: "approved",
//     created_at: now,
//   });

//   db.prepare(`
//     UPDATE packs
//     SET status = ?, review_notes = '', updated_at = ?
//     WHERE id = ?
//   `).run("published", now, packId);

//   void reviewerUserId;
//   return getPackStmt.get(packId);
// }