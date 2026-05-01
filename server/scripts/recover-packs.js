import fs from "fs";
import path from "path";
import { db } from "../db/index.js";
import { STORAGE_ROOT } from "../config/env.js";

function nowIso() {
  return new Date().toISOString();
}

function safeReadJsonFromPublishedUrl(url = "") {
  try {
    if (!url || !url.startsWith("/published-packs/")) return null;
    const relativePath = url.replace(/^\/published-packs\//, "");
    const filePath = path.join(STORAGE_ROOT, "published-packs", relativePath);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

const getLatestVersions = db.prepare(`
  SELECT pv.*
  FROM pack_versions pv
  JOIN (
    SELECT pack_id, MAX(version_number) AS max_version
    FROM pack_versions
    GROUP BY pack_id
  ) latest
    ON latest.pack_id = pv.pack_id
   AND latest.max_version = pv.version_number
  ORDER BY pv.pack_id
`);

const getAnyPurchasePackIds = db.prepare(`
  SELECT DISTINCT pack_id FROM purchases
`);

const getAnyLibraryPackIds = db.prepare(`
  SELECT DISTINCT pack_id FROM user_library
`);

const getCreatorIds = db.prepare(`
  SELECT user_id FROM creator_profiles ORDER BY created_at
`);

const insertPack = db.prepare(`
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

const existingCount = db.prepare(`SELECT COUNT(*) AS count FROM packs`).get().count;
if (existingCount > 0) {
  console.log("packs table is not empty; aborting recovery.");
  process.exit(0);
}

const creatorIds = getCreatorIds.all().map(r => r.user_id);
const fallbackCreatorId = creatorIds[0] || "unknown-creator";

const ids = new Set([
  ...getLatestVersions.all().map(r => r.pack_id),
  ...getAnyPurchasePackIds.all().map(r => r.pack_id),
  ...getAnyLibraryPackIds.all().map(r => r.pack_id),
]);

const latestVersions = new Map(getLatestVersions.all().map(r => [r.pack_id, r]));

const tx = db.transaction(() => {
  for (const packId of ids) {
    const version = latestVersions.get(packId) || null;
    const packJson = safeReadJsonFromPublishedUrl(version?.full_pack_url || "");

    const isDemo = packId === "pack_demo_reading_1" || packId === "pack_demo_words_1";
    const inferredType =
      packJson?.type ||
      (packId.includes("reading") ? "reading" : (packId.includes("words") ? "words" : "reading"));

    const inferredTitle =
      packJson?.title ||
      (packId === "pack_demo_reading_1" ? "The Blue Cat" :
       packId === "pack_demo_words_1" ? "Farm Animals" :
       `Recovered Pack ${packId.slice(0, 8)}`);

    const cover =
      packJson?.coverImage ||
      packJson?.cover_image ||
      "";

    const priceCents = isDemo ? 0 : 299;
    const accessMode = isDemo ? "free_library" : "paid";
    const status =
      version?.full_pack_url && String(version.full_pack_url).startsWith("/published-packs/")
        ? "published"
        : "draft";

    insertPack.run({
      id: packId,
      creator_id: fallbackCreatorId,
      lesson_id: packJson?.lessonId || "",
      type: inferredType,
      title: inferredTitle,
      slug: packId,
      short_description: "",
      long_description: "",
      age_min: Number(packJson?.ageRange?.min || 3),
      age_max: Number(packJson?.ageRange?.max || 6),
      category: "General",
      language: String(packJson?.language || "en"),
      status,
      price_cents: priceCents,
      access_mode: accessMode,
      license_type: "personal",
      export_policy: "none",
      cover_url: cover,
      thumbnail_url: cover,
      current_version: Number(version?.version_number || 1),
      created_at: nowIso(),
      updated_at: nowIso(),
    });
  }
});

tx();

console.log(`Recovered ${ids.size} packs.`);