import crypto from "crypto";
import { db } from "../db/index.js";

const upsertProgressStmt = db.prepare(`
  INSERT INTO progress (
    id, user_id, child_id, lesson_id, stars, streak, best_score, progress_json, updated_at
  ) VALUES (
    @id, @user_id, @child_id, @lesson_id, @stars, @streak, @best_score, @progress_json, @updated_at
  )
  ON CONFLICT(id) DO UPDATE SET
    stars = excluded.stars,
    streak = excluded.streak,
    best_score = excluded.best_score,
    progress_json = excluded.progress_json,
    updated_at = excluded.updated_at
`);

const findProgressByChildStmt = db.prepare(`
  SELECT * FROM progress
  WHERE user_id = ? AND child_id = ?
  ORDER BY updated_at DESC
`);

function nowIso() {
  return new Date().toISOString();
}

function uid() {
  return crypto.randomUUID();
}

export function saveProgress({ userId, childId, lessonId = null, stars = 0, streak = 0, bestScore = 0, progressJson = {}, progressId = null }) {
  const cleanChildId = String(childId || "").trim();
  if (!cleanChildId) {
    throw new Error("childId required");
  }

  const row = {
    id: progressId || uid(),
    user_id: userId,
    child_id: cleanChildId,
    lesson_id: lessonId,
    stars: Number(stars || 0),
    streak: Number(streak || 0),
    best_score: Number(bestScore || 0),
    progress_json: JSON.stringify(progressJson || {}),
    updated_at: nowIso(),
  };

  upsertProgressStmt.run(row);
  return {
    ...row,
    progress_json: JSON.parse(row.progress_json),
  };
}

export function listProgressByChild(userId, childId) {
  return findProgressByChildStmt.all(userId, childId).map((row) => ({
    ...row,
    progress_json: JSON.parse(row.progress_json || "{}"),
  }));
}
