import { db } from "../db/index.js";
import fs from "fs";
import path from "path";
import { STORAGE_ROOT } from "../config/env.js";

const listLibraryStmt = db.prepare(`
  SELECT
    ul.*,
    p.id AS pack_id,
    p.title,
    p.type,
    p.short_description,
    p.long_description,
    p.cover_url,
    p.thumbnail_url,
    p.category,
    p.language,
    p.age_min,
    p.age_max,
    p.price_cents,
    p.access_mode,
    p.license_type,
    p.export_policy
  FROM user_library ul
  JOIN packs p ON p.id = ul.pack_id
  WHERE ul.buyer_user_id = ?
  ORDER BY ul.updated_at DESC
`);

const getOwnedStmt = db.prepare(`
  SELECT
    ul.*,
    p.id AS pack_id,
    p.title,
    p.type,
    p.short_description,
    p.long_description,
    p.cover_url,
    p.thumbnail_url,
    p.category,
    p.language,
    p.age_min,
    p.age_max,
    p.price_cents,
    p.access_mode,
    p.license_type,
    p.export_policy
  FROM user_library ul
  JOIN packs p ON p.id = ul.pack_id
  WHERE ul.buyer_user_id = ? AND ul.pack_id = ?
  LIMIT 1
`);

const getLatestApprovedVersionStmt = db.prepare(`
  SELECT *
  FROM pack_versions
  WHERE pack_id = ? AND status = 'approved'
  ORDER BY version_number DESC
  LIMIT 1
`);

const updateImportedVersionStmt = db.prepare(`
  UPDATE user_library
  SET downloaded_version = ?,
      last_downloaded_at = ?,
      updated_at = ?
  WHERE buyer_user_id = ? AND pack_id = ?
`);

function nowIso() {
  return new Date().toISOString();
}

function decorateLibraryItem(row) {
  const latest = getLatestApprovedVersionStmt.get(row.pack_id);
  const latestVersion = Number(latest?.version_number || row.owned_version || 0);
  const downloadedVersion = Number(row.downloaded_version || 0);

  return {
    ...row,
    latest_version: latestVersion,
    has_update: latestVersion > Math.max(downloadedVersion, 0),
    latest_preview_1_url: latest?.preview_1_url || "",
    latest_preview_2_url: latest?.preview_2_url || "",
  };
}

export function listLibraryPacks(userId) {
  const rows = listLibraryStmt.all(userId);
  return rows.map(decorateLibraryItem);
}

export function getLibraryPackById(userId, packId) {
  const row = getOwnedStmt.get(userId, packId);
  if (!row) return null;
  return decorateLibraryItem(row);
}

function buildDemoReadingLesson(pack, version) {
  return {
    id: `import-${pack.pack_id}`,
    title: pack.title || "Reading Pack",
    type: "reading",
    visibility: "private",
    data_json: {
      items: [
        {
          word: "The blue cat runs fast.",
          image: pack.cover_url || "https://placehold.co/600x400/png?text=Blue+Cat+1",
        },
        {
          word: "It jumps over the moon.",
          image: pack.cover_url || "https://placehold.co/600x400/png?text=Blue+Cat+2",
        },
        {
          word: "Then it sleeps under the stars.",
          image: pack.cover_url || "https://placehold.co/600x400/png?text=Blue+Cat+3",
        },
      ],
      importedFromPackId: pack.pack_id,
      importedVersion: version.version_number,
      exportPolicy: pack.export_policy || "none",
      licenseType: pack.license_type || "personal",
      accessMode: pack.access_mode || "paid",
    },
  };
}

function buildDemoWordsLesson(pack, version) {
  return {
    id: `import-${pack.pack_id}`,
    title: pack.title || "Words Pack",
    type: "words",
    visibility: "private",
    data_json: {
      items: [
        { word: "Cow", image: pack.cover_url || "https://placehold.co/600x400/png?text=Cow" },
        { word: "Pig", image: pack.cover_url || "https://placehold.co/600x400/png?text=Pig" },
        { word: "Duck", image: pack.cover_url || "https://placehold.co/600x400/png?text=Duck" },
      ],
      importedFromPackId: pack.pack_id,
      importedVersion: version.version_number,
      exportPolicy: pack.export_policy || "none",
      licenseType: pack.license_type || "personal",
      accessMode: pack.access_mode || "paid",
    },
  };
}

async function loadPackJson(version, pack) {
  const url = String(version?.full_pack_url || "").trim();

  if (!url || url.includes("example.com")) {
    return null;
  }

  if (url.startsWith("/published-packs/")) {
    const relativePath = url.replace(/^\/published-packs\//, "");
    const filePath = path.join(STORAGE_ROOT, "published-packs", relativePath);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Published pack file not found: ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch pack JSON: ${res.status}`);
  }

  return res.json();
}

function normalizeReadingLesson(pack, version, packJson) {
  const pages = Array.isArray(packJson?.pages) ? packJson.pages : [];
  const items = pages.map((page, index) => ({
    word: String(page?.text || page?.word || `Page ${index + 1}`).trim(),
    image: String(page?.image || pack.cover_url || "").trim(),
  }));

  return {
    id: `import-${pack.pack_id}`,
    title: pack.title || packJson?.title || "Reading Pack",
    type: "reading",
    visibility: "private",
    data_json: {
      items,
      importedFromPackId: pack.pack_id,
      importedVersion: version.version_number,
      exportPolicy: pack.export_policy || "none",
      licenseType: pack.license_type || "personal",
      accessMode: pack.access_mode || "paid",
    },
  };
}
function normalizeWordsLesson(pack, version, packJson) {
  const srcItems = Array.isArray(packJson?.items) ? packJson.items : [];
  const items = srcItems.map((item, index) => ({
    word: String(item?.word || `Word ${index + 1}`).trim(),
    image: String(item?.image || pack.cover_url || "").trim(),
  }));

  return {
    id: `import-${pack.pack_id}`,
    title: pack.title || packJson?.title || "Words Pack",
    type: "words",
    visibility: "private",
    data_json: {
      items,
      importedFromPackId: pack.pack_id,
      importedVersion: version.version_number,
      exportPolicy: pack.export_policy || "none",
      licenseType: pack.license_type || "personal",
      accessMode: pack.access_mode || "paid",
    },
  };
}
export function markLibraryPackImported(userId, packId, version) {
  const safeVersion = Number(version || 0);
  if (!safeVersion) {
    throw new Error("Valid version required");
  }

  const now = nowIso();
  const result = updateImportedVersionStmt.run(
    safeVersion,
    now,
    now,
    userId,
    packId,
  );

  return result.changes > 0;
}

export async function importOwnedPackAsLesson(userId, packId) {
  const owned = getOwnedStmt.get(userId, packId);
  if (!owned) {
    throw new Error("Owned pack not found");
  }

  const version = getLatestApprovedVersionStmt.get(packId);
  if (!version) {
    throw new Error("Approved pack version not found");
  }

  let packJson = null;
  try {
    packJson = await loadPackJson(version, owned);
  } catch (err) {
    console.error("loadPackJson failed:", err);
    packJson = null;
  }

  if (owned.type === "reading") {
    if (packJson) return normalizeReadingLesson(owned, version, packJson);
    return buildDemoReadingLesson(owned, version);
  }

  if (owned.type === "words") {
    if (packJson) return normalizeWordsLesson(owned, version, packJson);
    return buildDemoWordsLesson(owned, version);
  }

  throw new Error(`Unsupported pack type: ${owned.type}`);
}

// import { db } from "../db/index.js";

// const listLibraryStmt = db.prepare(`
//   SELECT ul.*, p.title, p.type, p.cover_url, p.thumbnail_url
//   FROM user_library ul
//   JOIN packs p ON p.id = ul.pack_id
//   WHERE ul.buyer_user_id = ?
//   ORDER BY ul.updated_at DESC
// `);

// const getOwnedStmt = db.prepare(`
//   SELECT ul.*, p.id AS pack_id, p.title, p.type, p.cover_url, p.thumbnail_url
//   FROM user_library ul
//   JOIN packs p ON p.id = ul.pack_id
//   WHERE ul.buyer_user_id = ? AND ul.pack_id = ?
// `);

// const getLatestApprovedVersionStmt = db.prepare(`
//   SELECT *
//   FROM pack_versions
//   WHERE pack_id = ? AND status = 'approved'
//   ORDER BY version_number DESC
//   LIMIT 1
// `);

// const updateDownloadedStmt = db.prepare(`
//   UPDATE user_library
//   SET downloaded_version = ?, last_downloaded_at = ?, updated_at = ?
//   WHERE buyer_user_id = ? AND pack_id = ?
// `);

// function nowIso() {
//   return new Date().toISOString();
// }

// export function listLibraryByUser(userId) {
//   return listLibraryStmt.all(userId);
// }

// function buildDemoReadingPack(pack, version) {
//   return {
//     schemaVersion: 1,
//     type: "reading",
//     packId: pack.pack_id,
//     version: version.version_number,
//     title: pack.title || "The Blue Cat",
//     language: "en",
//     ageRange: { min: 3, max: 6 },
//     coverImage: pack.cover_url || "https://placehold.co/600x400/png?text=The+Blue+Cat",
//     previewPages: [0, 1],
//     pages: [
//       {
//         id: "p1",
//         text: "The blue cat runs fast.",
//         image: "https://placehold.co/600x400/png?text=Blue+Cat+1",
//       },
//       {
//         id: "p2",
//         text: "It jumps over the moon.",
//         image: "https://placehold.co/600x400/png?text=Blue+Cat+2",
//       },
//       {
//         id: "p3",
//         text: "Then it sleeps under the stars.",
//         image: "https://placehold.co/600x400/png?text=Blue+Cat+3",
//       },
//     ],
//   };
// }

// // async function loadPackJson(version, pack) {
// //   const url = String(version?.full_pack_url || "").trim();

// //   // Demo fallback so your seeded "The Blue Cat" works immediately
// //   if (!url || url.includes("example.com")) {
// //     return buildDemoReadingPack(pack, version);
// //   }

// //   const res = await fetch(url);
// //   if (!res.ok) {
// //     throw new Error(`Failed to fetch pack JSON: ${res.status}`);
// //   }

// //   return res.json();
// // }

// async function loadPackJson(version, pack) {
//   const url = String(version?.full_pack_url || "").trim();

//   if (!url || url.includes("example.com")) {
//     if (pack.type === "reading") {
//       return buildDemoReadingPack(pack, version);
//     }
//     if (pack.type === "words") {
//       return buildDemoWordsPack(pack, version);
//     }
//   }

//   const res = await fetch(url);
//   if (!res.ok) {
//     throw new Error(`Failed to fetch pack JSON: ${res.status}`);
//   }

//   return res.json();
// }

// export async function getOwnedPackDownload(userId, packId) {
//   const owned = getOwnedStmt.get(userId, packId);
//   if (!owned) return null;

//   const version = getLatestApprovedVersionStmt.get(packId);
//   if (!version) return null;

//   const packJson = await loadPackJson(version, owned);

//   return {
//     packId,
//     title: owned.title,
//     type: owned.type,
//     version: version.version_number,
//     manifest_url: version.manifest_url,
//     full_pack_url: version.full_pack_url,
//     pack: packJson,
//   };
// }

// export function checkLibraryUpdates(userId, items = []) {
//   const updates = [];

//   for (const item of items) {
//     const packId = String(item?.packId || "").trim();
//     const knownVersion = Number(item?.version || 0);
//     if (!packId) continue;

//     const latest = getLatestApprovedVersionStmt.get(packId);
//     if (latest && Number(latest.version_number) > knownVersion) {
//       updates.push({
//         packId,
//         latestVersion: Number(latest.version_number),
//       });
//     }
//   }

//   return updates;
// }

// export function markPackDownloaded(userId, packId, version) {
//   const now = nowIso();
//   const result = updateDownloadedStmt.run(version, now, now, userId, packId);
//   return result.changes > 0;
// }

// function buildDemoWordsPack(pack, version) {
//   return {
//     schemaVersion: 1,
//     type: "words",
//     packId: pack.pack_id,
//     version: version.version_number,
//     title: pack.title || "Farm Animals",
//     language: "en",
//     ageRange: { min: 3, max: 7 },
//     coverImage: pack.cover_url || "https://placehold.co/600x400/png?text=Farm+Animals",
//     previewItems: [0, 1],
//     items: [
//       {
//         id: "w1",
//         word: "Cow",
//         image: "https://placehold.co/600x400/png?text=Cow",
//       },
//       {
//         id: "w2",
//         word: "Pig",
//         image: "https://placehold.co/600x400/png?text=Pig",
//       },
//       {
//         id: "w3",
//         word: "Duck",
//         image: "https://placehold.co/600x400/png?text=Duck",
//       },
//     ],
//   };
// }