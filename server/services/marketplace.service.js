import { db } from "../db/index.js";

function resolveLessonCoverFromDataJson(dataJson) {
  try {
    const parsed = typeof dataJson === "string" ? JSON.parse(dataJson) : (dataJson || {});
    if (parsed?.coverImage) return parsed.coverImage;

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

function decorateMarketplacePack(pack) {
  const lessonCover = resolveLessonCoverFromDataJson(pack.lesson_data_json);
  const resolvedCover =
    pack.cover_url ||
    pack.thumbnail_url ||
    lessonCover ||
    "";

  return {
    ...pack,
    resolved_cover_url: resolvedCover,
    preview_1_url: pack.preview_1_url || resolvedCover || "",
    preview_2_url: pack.preview_2_url || resolvedCover || "",
  };
}

const baseSelect = `
  SELECT
    p.*,
    l.title AS lesson_title,
    l.data_json AS lesson_data_json,
    pv.preview_1_url,
    pv.preview_2_url
  FROM packs p
  LEFT JOIN lessons l ON l.id = p.lesson_id
  LEFT JOIN pack_versions pv
    ON pv.pack_id = p.id
   AND pv.version_number = (
      SELECT MAX(version_number)
      FROM pack_versions
      WHERE pack_id = p.id AND status = 'approved'
   )
`;

export function listPublishedPacks(filters = {}) {
  const clauses = [`p.status = 'published'`];
  const params = {};

  const type = String(filters.type || "").trim();
  const q = String(filters.q || "").trim();
  const category = String(filters.category || "").trim();
  const language = String(filters.language || "").trim();
  const accessMode = String(filters.access_mode || "").trim();

  if (type) {
    clauses.push(`LOWER(p.type) = LOWER(@type)`);
    params.type = type;
  }

  if (category) {
    clauses.push(`LOWER(p.category) = LOWER(@category)`);
    params.category = category;
  }

  if (language) {
    clauses.push(`LOWER(p.language) = LOWER(@language)`);
    params.language = language;
  }

  if (accessMode) {
    clauses.push(`LOWER(COALESCE(p.access_mode, 'paid')) = LOWER(@access_mode)`);
    params.access_mode = accessMode;
  }

  if (q) {
    clauses.push(`(
      LOWER(COALESCE(p.title, '')) LIKE LOWER(@q) OR
      LOWER(COALESCE(p.short_description, '')) LIKE LOWER(@q) OR
      LOWER(COALESCE(p.long_description, '')) LIKE LOWER(@q) OR
      LOWER(COALESCE(p.category, '')) LIKE LOWER(@q) OR
      LOWER(COALESCE(p.language, '')) LIKE LOWER(@q) OR
      LOWER(COALESCE(p.license_type, '')) LIKE LOWER(@q) OR
      LOWER(COALESCE(p.access_mode, '')) LIKE LOWER(@q) OR
      LOWER(COALESCE(p.export_policy, '')) LIKE LOWER(@q) OR
      LOWER(COALESCE(l.title, '')) LIKE LOWER(@q)
    )`);
    params.q = `%${q}%`;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const stmt = db.prepare(`
    ${baseSelect}
    ${where}
    ORDER BY p.updated_at DESC
  `);

  return stmt.all(params).map(decorateMarketplacePack);
}

export function getPublishedPackById(packId) {
  const stmt = db.prepare(`
    ${baseSelect}
    WHERE p.id = ? AND p.status = 'published'
    LIMIT 1
  `);

  const pack = stmt.get(packId);
  return pack ? decorateMarketplacePack(pack) : null;
}

export function getPackPreview(packId) {
  const packStmt = db.prepare(`
    ${baseSelect}
    WHERE p.id = ? AND p.status = 'published'
    LIMIT 1
  `);

  const versionStmt = db.prepare(`
    SELECT *
    FROM pack_versions
    WHERE pack_id = ? AND status = 'approved'
    ORDER BY version_number DESC
    LIMIT 1
  `);

  const rawPack = packStmt.get(packId);
  if (!rawPack) return null;

  const pack = decorateMarketplacePack(rawPack);
  const version = versionStmt.get(packId);
  if (!version) return null;

  return {
    pack,
    version,
    preview_1_url: version.preview_1_url || pack.resolved_cover_url || "",
    preview_2_url: version.preview_2_url || pack.resolved_cover_url || "",
  };
}

// import { db } from "../db/index.js";

// export function listPublishedPacks(filters = {}) {
//   const clauses = [`status = 'published'`];
//   const params = {};

//   const type = String(filters.type || "").trim();
//   const q = String(filters.q || "").trim();
//   const category = String(filters.category || "").trim();
//   const language = String(filters.language || "").trim();

//   if (type) {
//     clauses.push(`LOWER(type) = LOWER(@type)`);
//     params.type = type;
//   }

//   if (category) {
//     clauses.push(`LOWER(category) = LOWER(@category)`);
//     params.category = category;
//   }

//   if (language) {
//     clauses.push(`LOWER(language) = LOWER(@language)`);
//     params.language = language;
//   }

//   if (q) {
//     clauses.push(`(
//       LOWER(COALESCE(title, '')) LIKE LOWER(@q) OR
//       LOWER(COALESCE(short_description, '')) LIKE LOWER(@q) OR
//       LOWER(COALESCE(long_description, '')) LIKE LOWER(@q) OR
//       LOWER(COALESCE(category, '')) LIKE LOWER(@q) OR
//       LOWER(COALESCE(language, '')) LIKE LOWER(@q)
//     )`);
//     params.q = `%${q}%`;
//   }

//   const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

//   const stmt = db.prepare(`
//     SELECT *
//     FROM packs
//     ${where}
//     ORDER BY updated_at DESC
//   `);

//   return stmt.all(params);
// }

// export function getPublishedPackById(packId) {
//   const stmt = db.prepare(`
//     SELECT *
//     FROM packs
//     WHERE id = ? AND status = 'published'
//     LIMIT 1
//   `);

//   return stmt.get(packId) || null;
// }

// export function getPackPreview(packId) {
//   const packStmt = db.prepare(`
//     SELECT *
//     FROM packs
//     WHERE id = ? AND status = 'published'
//     LIMIT 1
//   `);

//   const versionStmt = db.prepare(`
//     SELECT *
//     FROM pack_versions
//     WHERE pack_id = ? AND status = 'approved'
//     ORDER BY version_number DESC
//     LIMIT 1
//   `);

//   const pack = packStmt.get(packId);
//   if (!pack) return null;

//   const version = versionStmt.get(packId);
//   if (!version) return null;

//   return {
//     pack,
//     version,
//     preview_1_url: version.preview_1_url || "",
//     preview_2_url: version.preview_2_url || "",
//   };
// }
