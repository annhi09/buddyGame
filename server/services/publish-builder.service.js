import fs from "fs";
import path from "path";
import crypto from "crypto";
import { db } from "../db/index.js";
import { STORAGE_ROOT } from "../config/env.js";

const getLessonStmt = db.prepare(`
  SELECT *
  FROM lessons
  WHERE id = ?
  LIMIT 1
`);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeJsonParse(value, fallback = {}) {
  try {
    return typeof value === "string" ? JSON.parse(value) : (value || fallback);
  } catch {
    return fallback;
  }
}

function normalizeImage(image) {
  if (!image) return "";
  if (typeof image === "string") return image;
  return image.medium || image.thumb || image.original || "";
}

function getLessonItems(lesson) {
  const dataJson = safeJsonParse(lesson?.data_json, {});
  return Array.isArray(dataJson.items) ? dataJson.items : [];
}

function getLessonCover(lesson) {
  const dataJson = safeJsonParse(lesson?.data_json, {});
  if (dataJson.coverImage) return dataJson.coverImage;

  const items = Array.isArray(dataJson.items) ? dataJson.items : [];
  const firstImage = items?.[0]?.image;
  return normalizeImage(firstImage);
}

function buildReadingPack(pack, lesson, versionNumber) {
  const items = getLessonItems(lesson);
  const coverImage = getLessonCover(lesson);

  return {
    schemaVersion: 1,
    type: "reading",
    packId: pack.id,
    lessonId: lesson.id,
    version: versionNumber,
    title: pack.title || lesson.title || "Reading Pack",
    language: pack.language || "en",
    ageRange: {
      min: Number(pack.age_min ?? 3),
      max: Number(pack.age_max ?? 6),
    },
    coverImage,
    pages: items.map((item, index) => ({
      id: `p${index + 1}`,
      text: String(item?.word || `Page ${index + 1}`).trim(),
      image: normalizeImage(item?.image),
    })),
  };
}

function buildWordsPack(pack, lesson, versionNumber) {
  const items = getLessonItems(lesson);
  const coverImage = getLessonCover(lesson);

  return {
    schemaVersion: 1,
    type: "words",
    packId: pack.id,
    lessonId: lesson.id,
    version: versionNumber,
    title: pack.title || lesson.title || "Words Pack",
    language: pack.language || "en",
    ageRange: {
      min: Number(pack.age_min ?? 3),
      max: Number(pack.age_max ?? 6),
    },
    coverImage,
    items: items.map((item, index) => ({
      id: `w${index + 1}`,
      word: String(item?.word || `Word ${index + 1}`).trim(),
      image: normalizeImage(item?.image),
    })),
  };
}

function getPreviewUrlsFromPayload(payload) {
  if (payload.type === "reading") {
    return {
      preview1: payload.pages?.[0]?.image || payload.coverImage || "",
      preview2: payload.pages?.[1]?.image || payload.coverImage || payload.pages?.[0]?.image || "",
    };
  }

  return {
    preview1: payload.items?.[0]?.image || payload.coverImage || "",
    preview2: payload.items?.[1]?.image || payload.coverImage || payload.items?.[0]?.image || "",
  };
}

export function buildPublishedPackVersion(pack, versionNumber) {
  if (!pack?.lesson_id) {
    throw new Error("Pack has no linked lesson");
  }

  const lesson = getLessonStmt.get(pack.lesson_id);
  if (!lesson) {
    throw new Error("Linked lesson not found");
  }

  const lessonType = String(lesson.type || pack.type || "words").toLowerCase();

  const payload =
    lessonType === "reading"
      ? buildReadingPack(pack, lesson, versionNumber)
      : buildWordsPack(pack, lesson, versionNumber);

  const publishedRoot = path.join(
    STORAGE_ROOT,
    "published-packs",
    String(pack.id),
    `v${versionNumber}`
  );
  ensureDir(publishedRoot);

  const packJsonPath = path.join(publishedRoot, "pack.json");
  const manifestPath = path.join(publishedRoot, "manifest.json");

  const previews = getPreviewUrlsFromPayload(payload);

  const manifest = {
    id: crypto.randomUUID(),
    packId: pack.id,
    lessonId: lesson.id,
    version: versionNumber,
    type: payload.type,
    title: payload.title,
    language: payload.language,
    ageRange: payload.ageRange,
    preview_1_url: previews.preview1,
    preview_2_url: previews.preview2,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(packJsonPath, JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  return {
    manifest,
    payload,
    manifestUrl: `/published-packs/${pack.id}/v${versionNumber}/manifest.json`,
    fullPackUrl: `/published-packs/${pack.id}/v${versionNumber}/pack.json`,
    preview1Url: previews.preview1,
    preview2Url: previews.preview2,
  };
}