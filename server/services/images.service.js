import fs from "fs";
import path from "path";
import { db } from "../db/index.js";
import { UPLOADS_DIR } from "../config/env.js";

const findImagesByLessonAndItemKeyStmt = db.prepare(`
  SELECT id, owner_user_id, lesson_id, kind, item_key, path_original
  FROM images
  WHERE lesson_id = ? AND kind = 'item' AND item_key = ?
`);

const deleteImagesByLessonAndItemKeyStmt = db.prepare(`
  DELETE FROM images
  WHERE lesson_id = ? AND kind = 'item' AND item_key = ?
`);

function safeRemoveDir(folder) {
  try {
    fs.rmSync(folder, { recursive: true, force: true });
  } catch (err) {
    console.warn("Could not remove image folder:", err);
  }
}

export function deleteItemImagesByLessonAndItemKey({
  lessonId,
  itemKey,
  ownerUserId,
}) {
  const safeLessonId = String(lessonId || "").trim();
  const safeKey = String(itemKey || "").trim().toLowerCase();

  if (!safeLessonId || !safeKey) return 0;

  const rows = findImagesByLessonAndItemKeyStmt.all(safeLessonId, safeKey);

  if (!rows.length) return 0;

  const ownedRows = rows.filter((row) => row.owner_user_id === ownerUserId);

  if (!ownedRows.length) return 0;

  const folder = path.join(UPLOADS_DIR, "lessons", safeLessonId, "item", safeKey);
  safeRemoveDir(folder);

  const result = deleteImagesByLessonAndItemKeyStmt.run(safeLessonId, safeKey);
  return result.changes || 0;
}

// import fs from "fs";
// import path from "path";
// import { db } from "../db/index.js";
// import { UPLOADS_DIR } from "../config/env.js";

// const deleteImagesByLessonAndItemKeyStmt = db.prepare(`
//   DELETE FROM images
//   WHERE lesson_id = ? AND kind = 'item' AND item_key = ?
// `);

// export function deleteItemImagesByLessonAndItemKey(lessonId, itemKey){
//   const safeKey = String(itemKey || "").trim().toLowerCase();
//   if(!lessonId || !safeKey) return 0;

//   const folder = path.join(UPLOADS_DIR, "lessons", lessonId, "item", safeKey);

//   try {
//     fs.rmSync(folder, { recursive: true, force: true });
//   } catch (err) {
//     console.warn("Could not remove image folder:", err);
//   }

//   const result = deleteImagesByLessonAndItemKeyStmt.run(lessonId, safeKey);
//   return result.changes || 0;
// }

// import { db } from "../db/index.js";

// const deleteImagesByLessonAndItemKeyStmt = db.prepare(`
//   DELETE FROM images
//   WHERE lesson_id = ? AND kind = 'item' AND item_key = ?
// `);

// export function deleteItemImagesByLessonAndItemKey(lessonId, itemKey){
//   const safeKey = String(itemKey || "").trim().toLowerCase();
//   if(!safeKey) return 0;

//   const result = deleteImagesByLessonAndItemKeyStmt.run(lessonId, safeKey);
//   return result.changes || 0;
// }

// import { db } from "../db/index.js";

// const deleteImagesByLessonAndItemKeyStmt = db.prepare(`
//   DELETE FROM images
//   WHERE lesson_id = ? AND kind = 'item' AND lower(original_filename) LIKE ?
// `);

// export function deleteItemImagesByLessonAndWord(lessonId, word){
//   const safeWord = String(word || "").trim().toLowerCase();
//   if(!safeWord) return 0;

//   // Simple metadata cleanup using original filename match fallback.
//   // This is not perfect long-term, but good enough for current flow.
//   const result = deleteImagesByLessonAndItemKeyStmt.run(
//     lessonId,
//     `%${safeWord}%`
//   );

//   return result.changes || 0;
// }