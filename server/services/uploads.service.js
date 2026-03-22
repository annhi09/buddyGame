import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { UPLOADS_DIR } from "../config/env.js";
import { db } from "../db/index.js";

const insertImageStmt = db.prepare(`
  INSERT INTO images (
    id, owner_user_id, lesson_id, kind, item_key, original_filename, mime_type,
    size_original, size_medium, size_thumb,
    path_original, path_medium, path_thumb,
    width_original, height_original,
    width_medium, height_medium,
    width_thumb, height_thumb,
    created_at
  ) VALUES (
    @id, @owner_user_id, @lesson_id, @kind, @item_key, @original_filename, @mime_type,
    @size_original, @size_medium, @size_thumb,
    @path_original, @path_medium, @path_thumb,
    @width_original, @height_original,
    @width_medium, @height_medium,
    @width_thumb, @height_thumb,
    @created_at
  )
`);

const findImageByIdStmt = db.prepare(`
  SELECT * FROM images WHERE id = ?
`);

function nowIso() {
  return new Date().toISOString();
}

function uid() {
  return crypto.randomUUID();
}

function safeSlug(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || `item-${Date.now()}`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function fileSizeOrNull(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return null;
  }
}

export async function saveLessonImage({
  ownerUserId,
  lessonId,
  kind = "item",
  itemKey,
  file,
}) {
  if (!lessonId) {
    throw new Error("lessonId required");
  }

  if (!file) {
    throw new Error("image file required");
  }

  const cleanKind = String(kind || "item").trim();
  const cleanItemKey = safeSlug(itemKey || uid());
  const imageId = uid();

  const baseDir = path.join(
    UPLOADS_DIR,
    "lessons",
    lessonId,
    cleanKind,
    cleanItemKey
  );
  ensureDir(baseDir);

  const originalPathFs = path.join(baseDir, "original.webp");
  const mediumPathFs = path.join(baseDir, "medium.webp");
  const thumbPathFs = path.join(baseDir, "thumb.webp");

  const originalUrl = `/uploads/lessons/${lessonId}/${cleanKind}/${cleanItemKey}/original.webp`;
  const mediumUrl = `/uploads/lessons/${lessonId}/${cleanKind}/${cleanItemKey}/medium.webp`;
  const thumbUrl = `/uploads/lessons/${lessonId}/${cleanKind}/${cleanItemKey}/thumb.webp`;

  const image = sharp(file.buffer).rotate();
  const meta = await image.metadata();

  await image
    .clone()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(originalPathFs);

  await image
    .clone()
    .resize({ width: 768, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(mediumPathFs);

  await image
    .clone()
    .resize({ width: 256, withoutEnlargement: true })
    .webp({ quality: 72 })
    .toFile(thumbPathFs);

  const row = {
    id: imageId,
    owner_user_id: ownerUserId,
    lesson_id: lessonId,
    kind: cleanKind,
    item_key: cleanItemKey,
    original_filename: file.originalname,
    mime_type: "image/webp",
    size_original: fileSizeOrNull(originalPathFs),
    size_medium: fileSizeOrNull(mediumPathFs),
    size_thumb: fileSizeOrNull(thumbPathFs),
    path_original: originalUrl,
    path_medium: mediumUrl,
    path_thumb: thumbUrl,
    width_original: meta.width || null,
    height_original: meta.height || null,
    width_medium: 768,
    height_medium: null,
    width_thumb: 256,
    height_thumb: null,
    created_at: nowIso(),
  };

  insertImageStmt.run(row);

  return {
    id: imageId,
    lessonId,
    kind: cleanKind,
    item_key: cleanItemKey,
    originalUrl,
    mediumUrl,
    thumbUrl,
    originalFilename: file.originalname,
    originalWidth: meta.width || null,
    originalHeight: meta.height || null,
    sizeOriginal: row.size_original,
    sizeMedium: row.size_medium,
    sizeThumb: row.size_thumb,
  };
}

export function getImageMetadata(imageId) {
  return findImageByIdStmt.get(imageId);
}

// import fs from "fs";
// import path from "path";
// import crypto from "crypto";
// import sharp from "sharp";
// import { UPLOADS_DIR } from "../config/env.js";
// import { db } from "../db/index.js";

// const insertImageStmt = db.prepare(`
//   INSERT INTO images (
//     id, owner_user_id, lesson_id, kind, item_key, original_filename, mime_type,
//     size_original, size_medium, size_thumb,
//     path_original, path_medium, path_thumb,
//     width_original, height_original,
//     width_medium, height_medium,
//     width_thumb, height_thumb,
//     created_at
//   ) VALUES (
//     @id, @owner_user_id, @lesson_id, @kind, @item_key, @original_filename, @mime_type,
//     @size_original, @size_medium, @size_thumb,
//     @path_original, @path_medium, @path_thumb,
//     @width_original, @height_original,
//     @width_medium, @height_medium,
//     @width_thumb, @height_thumb,
//     @created_at
//   )
// `);

// const findImageByIdStmt = db.prepare(`SELECT * FROM images WHERE id = ?`);

// function nowIso() {
//   return new Date().toISOString();
// }

// function uid() {
//   return crypto.randomUUID();
// }

// function safeSlug(input) {
//   return String(input || "")
//     .trim()
//     .toLowerCase()
//     .replace(/[^a-z0-9-_]+/g, "-")
//     .replace(/-+/g, "-")
//     .replace(/^-|-$/g, "") || `item-${Date.now()}`;
// }

// function ensureDir(dir) {
//   fs.mkdirSync(dir, { recursive: true });
// }

// function fileSizeOrNull(filePath) {
//   try {
//     return fs.statSync(filePath).size;
//   } catch {
//     return null;
//   }
// }

// export async function saveLessonImage({ ownerUserId, lessonId, kind = "item", itemKey, file }) {
//   if (!lessonId) {
//     throw new Error("lessonId required");
//   }

//   if (!file) {
//     throw new Error("image file required");
//   }

//   const cleanKind = String(kind || "item").trim();
//   const cleanItemKey = safeSlug(itemKey || uid());
//   const imageId = uid();

//   const baseDir = path.join(UPLOADS_DIR, "lessons", lessonId, cleanKind, cleanItemKey);
//   ensureDir(baseDir);

//   const originalPathFs = path.join(baseDir, "original.webp");
//   const mediumPathFs = path.join(baseDir, "medium.webp");
//   const thumbPathFs = path.join(baseDir, "thumb.webp");

//   const originalUrl = `/uploads/lessons/${lessonId}/${cleanKind}/${cleanItemKey}/original.webp`;
//   const mediumUrl = `/uploads/lessons/${lessonId}/${cleanKind}/${cleanItemKey}/medium.webp`;
//   const thumbUrl = `/uploads/lessons/${lessonId}/${cleanKind}/${cleanItemKey}/thumb.webp`;

//   const image = sharp(file.buffer).rotate();
//   const meta = await image.metadata();

//   await image
//     .clone()
//     .resize({ width: 1600, withoutEnlargement: true })
//     .webp({ quality: 82 })
//     .toFile(originalPathFs);

//   await image
//     .clone()
//     .resize({ width: 768, withoutEnlargement: true })
//     .webp({ quality: 78 })
//     .toFile(mediumPathFs);

//   await image
//     .clone()
//     .resize({ width: 256, withoutEnlargement: true })
//     .webp({ quality: 72 })
//     .toFile(thumbPathFs);

//   const row = {
//     id: imageId,
//     owner_user_id: ownerUserId,
//     lesson_id: lessonId,
//     kind: cleanKind,
//     item_key: cleanItemKey,
//     original_filename: file.originalname,
//     mime_type: "image/webp",
//     size_original: fileSizeOrNull(originalPathFs),
//     size_medium: fileSizeOrNull(mediumPathFs),
//     size_thumb: fileSizeOrNull(thumbPathFs),
//     path_original: originalUrl,
//     path_medium: mediumUrl,
//     path_thumb: thumbUrl,
//     width_original: meta.width || null,
//     height_original: meta.height || null,
//     width_medium: 768,
//     height_medium: null,
//     width_thumb: 256,
//     height_thumb: null,
//     created_at: nowIso(),
//   };

//   insertImageStmt.run(row);

//   return {
//     id: imageId,
//     lessonId,
//     kind: cleanKind,
//     item_key: cleanItemKey,
//     originalUrl,
//     mediumUrl,
//     thumbUrl,
//     originalFilename: file.originalname,
//     originalWidth: meta.width || null,
//     originalHeight: meta.height || null,
//     sizeOriginal: row.size_original,
//     sizeMedium: row.size_medium,
//     sizeThumb: row.size_thumb,
//   };
// }

// export function getImageMetadata(imageId) {
//   return findImageByIdStmt.get(imageId);
// }
