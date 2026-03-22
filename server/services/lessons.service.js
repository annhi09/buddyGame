import { randomUUID } from "crypto";
import { db } from "../db/index.js";

const deleteLessonStmt = db.prepare(`
  DELETE FROM lessons
  WHERE id = ? AND owner_user_id = ?
`);

const deleteLessonImagesStmt = db.prepare(`
  DELETE FROM images
  WHERE lesson_id = ? AND owner_user_id = ?
`);

const insertLessonStmt = db.prepare(`
  INSERT INTO lessons (
    id, owner_user_id, title, type, visibility, cover_image_id, data_json, created_at, updated_at
  ) VALUES (
    @id, @owner_user_id, @title, @type, @visibility, @cover_image_id, @data_json, @created_at, @updated_at
  )
`);

const listLessonsStmt = db.prepare(`
  SELECT id, owner_user_id, title, type, visibility, cover_image_id, data_json, created_at, updated_at
  FROM lessons
  WHERE owner_user_id = ?
  ORDER BY updated_at DESC
`);

const findLessonStmt = db.prepare(`
  SELECT id, owner_user_id, title, type, visibility, cover_image_id, data_json, created_at, updated_at
  FROM lessons
  WHERE id = ? AND owner_user_id = ?
`);

const updateLessonStmt = db.prepare(`
  UPDATE lessons
  SET title = @title,
      type = @type,
      visibility = @visibility,
      data_json = @data_json,
      updated_at = @updated_at
  WHERE id = @id AND owner_user_id = @owner_user_id
`);

export function createLesson(ownerUserId, payload){
  const now = new Date().toISOString();

  const lesson = {
    id: randomUUID(),
    owner_user_id: ownerUserId,
    title: String(payload.title || "").trim(),
    type: String(payload.type || "words"),
    visibility: String(payload.visibility || "private"),
    cover_image_id: null,
    data_json: JSON.stringify(payload.dataJson || {}),
    created_at: now,
    updated_at: now
  };

  insertLessonStmt.run(lesson);

  return {
    ...lesson,
    data_json: JSON.parse(lesson.data_json)
  };
}

export function listLessonsByOwner(ownerUserId){
  return listLessonsStmt.all(ownerUserId).map((row) => ({
    ...row,
    data_json: JSON.parse(row.data_json || "{}")
  }));
}

export function updateLessonById(id, ownerUserId, payload){
  const existing = findLessonStmt.get(id, ownerUserId);
  if(!existing) return null;

  const nextData = payload.dataJson ?? JSON.parse(existing.data_json || "{}");

  const next = {
    id,
    owner_user_id: ownerUserId,
    title: String(payload.title ?? existing.title).trim(),
    type: String(payload.type ?? existing.type),
    visibility: String(payload.visibility ?? existing.visibility),
    data_json: JSON.stringify(nextData),
    updated_at: new Date().toISOString()
  };

  updateLessonStmt.run(next);

  const row = findLessonStmt.get(id, ownerUserId);

  return {
    ...row,
    data_json: JSON.parse(row.data_json || "{}")
  };
}

export function deleteLessonById(id, ownerUserId){
  const existing = findLessonStmt.get(id, ownerUserId);
  if(!existing) return false;

  deleteLessonImagesStmt.run(id, ownerUserId);
  const result = deleteLessonStmt.run(id, ownerUserId);

  return result.changes > 0;
}

// import { randomUUID } from "crypto";
// import { db } from "../db/index.js";

// const insertLessonStmt = db.prepare(`
//   INSERT INTO lessons (
//     id, owner_user_id, title, type, visibility, cover_image_id, data_json, created_at, updated_at
//   ) VALUES (
//     @id, @owner_user_id, @title, @type, @visibility, @cover_image_id, @data_json, @created_at, @updated_at
//   )
// `);

// const listLessonsStmt = db.prepare(`
//   SELECT id, owner_user_id, title, type, visibility, cover_image_id, data_json, created_at, updated_at
//   FROM lessons
//   WHERE owner_user_id = ?
//   ORDER BY updated_at DESC
// `);

// const findLessonStmt = db.prepare(`
//   SELECT id, owner_user_id, title, type, visibility, cover_image_id, data_json, created_at, updated_at
//   FROM lessons
//   WHERE id = ? AND owner_user_id = ?
// `);

// const updateLessonStmt = db.prepare(`
//   UPDATE lessons
//   SET title = @title,
//       type = @type,
//       visibility = @visibility,
//       data_json = @data_json,
//       updated_at = @updated_at
//   WHERE id = @id AND owner_user_id = @owner_user_id
// `);

// export function createLesson(ownerUserId, payload){
//   const now = new Date().toISOString();

//   const lesson = {
//     id: randomUUID(),
//     owner_user_id: ownerUserId,
//     title: String(payload.title || "").trim(),
//     type: String(payload.type || "words"),
//     visibility: String(payload.visibility || "private"),
//     cover_image_id: null,
//     data_json: JSON.stringify(payload.dataJson || {}),
//     created_at: now,
//     updated_at: now
//   };

//   insertLessonStmt.run(lesson);

//   return {
//     ...lesson,
//     data_json: JSON.parse(lesson.data_json)
//   };
// }

// export function listLessonsByOwner(ownerUserId){
//   return listLessonsStmt.all(ownerUserId).map((row) => ({
//     ...row,
//     data_json: JSON.parse(row.data_json || "{}")
//   }));
// }

// // export function updateLessonById(id, ownerUserId, payload){
// //   const existing = findLessonStmt.get(id, ownerUserId);
// //   if(!existing) return null;

// //   const next = {
// //     id,
// //     owner_user_id: ownerUserId,
// //     title: String(payload.title ?? existing.title).trim(),
// //     type: String(payload.type ?? existing.type),
// //     visibility: String(payload.visibility ?? existing.visibility),
// //     data_json: JSON.stringify(payload.dataJson ?? JSON.parse(existing.data_json || "{}")),
// //     updated_at: new Date().toISOString()
// //   };

// //   updateLessonStmt.run(next);

// //   return findLessonStmt.get(id, ownerUserId);
// // }

// export function updateLessonById(id, ownerUserId, payload){
//   const existing = findLessonStmt.get(id, ownerUserId);
//   if(!existing) return null;

//   const nextData = payload.dataJson ?? JSON.parse(existing.data_json || "{}");

//   const next = {
//     id,
//     owner_user_id: ownerUserId,
//     title: String(payload.title ?? existing.title).trim(),
//     type: String(payload.type ?? existing.type),
//     visibility: String(payload.visibility ?? existing.visibility),
//     data_json: JSON.stringify(nextData),
//     updated_at: new Date().toISOString()
//   };

//   updateLessonStmt.run(next);

//   const row = findLessonStmt.get(id, ownerUserId);
//   return {
//     ...row,
//     data_json: JSON.parse(row.data_json || "{}")
//   };
// }

// import crypto from "crypto";
// import { db } from "../db/index.js";

// const insertLessonStmt = db.prepare(`
//   INSERT INTO lessons (
//     id, owner_user_id, title, type, visibility, cover_image_id, data_json, created_at, updated_at
//   ) VALUES (
//     @id, @owner_user_id, @title, @type, @visibility, @cover_image_id, @data_json, @created_at, @updated_at
//   )
// `);

// const listLessonsStmt = db.prepare(`
//   SELECT id, owner_user_id, title, type, visibility, cover_image_id, data_json, created_at, updated_at
//   FROM lessons
//   WHERE owner_user_id = ?
//   ORDER BY updated_at DESC
// `);

// function nowIso() {
//   return new Date().toISOString();
// }

// function uid() {
//   return crypto.randomUUID();
// }

// export function createLesson({ ownerUserId, title, type = "words", visibility = "private", dataJson = {} }) {
//   const cleanTitle = String(title || "").trim();
//   if (!cleanTitle) {
//     throw new Error("title required");
//   }

//   const timestamp = nowIso();
//   const lesson = {
//     id: uid(),
//     owner_user_id: ownerUserId,
//     title: cleanTitle,
//     type: String(type || "words"),
//     visibility: String(visibility || "private"),
//     cover_image_id: null,
//     data_json: JSON.stringify(dataJson || {}),
//     created_at: timestamp,
//     updated_at: timestamp,
//   };

//   insertLessonStmt.run(lesson);

//   return {
//     ...lesson,
//     data_json: JSON.parse(lesson.data_json),
//   };
// }

// export function listLessons(ownerUserId) {
//   return listLessonsStmt.all(ownerUserId).map((row) => ({
//     ...row,
//     data_json: JSON.parse(row.data_json || "{}"),
//   }));
// }
