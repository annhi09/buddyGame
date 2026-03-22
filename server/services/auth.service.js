import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "../db/index.js";
import { JWT_SECRET } from "../config/env.js";

const insertUserStmt = db.prepare(`
  INSERT INTO users (
    id, email, password_hash, display_name, role, plan, created_at, updated_at
  ) VALUES (
    @id, @email, @password_hash, @display_name, @role, @plan, @created_at, @updated_at
  )
`);

const findUserByEmailStmt = db.prepare(`SELECT * FROM users WHERE email = ?`);
const findUserSafeByIdStmt = db.prepare(`
  SELECT id, email, display_name, role, plan, created_at, updated_at
  FROM users WHERE id = ?
`);

function nowIso() {
  return new Date().toISOString();
}

function uid() {
  return crypto.randomUUID();
}

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function getUserSafeById(userId) {
  return findUserSafeByIdStmt.get(userId);
}

export async function registerUser({ email, password, displayName }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPassword = String(password || "");
  const cleanDisplayName = String(displayName || "").trim();

  if (!cleanEmail || !cleanPassword || !cleanDisplayName) {
    throw new Error("email, password, displayName required");
  }

  if (cleanPassword.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const existing = findUserByEmailStmt.get(cleanEmail);
  if (existing) {
    throw new Error("Email already registered");
  }

  const passwordHash = await bcrypt.hash(cleanPassword, 10);
  const timestamp = nowIso();

  const user = {
    id: uid(),
    email: cleanEmail,
    password_hash: passwordHash,
    display_name: cleanDisplayName,
    role: "parent",
    plan: "free",
    created_at: timestamp,
    updated_at: timestamp,
  };

  insertUserStmt.run(user);
  const safeUser = getUserSafeById(user.id);
  const token = signToken({ ...safeUser, role: user.role, plan: user.plan });

  return { user: safeUser, token };
}

export async function loginUser({ email, password }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPassword = String(password || "");

  const userRow = findUserByEmailStmt.get(cleanEmail);
  if (!userRow) {
    throw new Error("Invalid credentials");
  }

  const ok = await bcrypt.compare(cleanPassword, userRow.password_hash);
  if (!ok) {
    throw new Error("Invalid credentials");
  }

  const safeUser = getUserSafeById(userRow.id);
  const token = signToken({ ...safeUser, role: userRow.role, plan: userRow.plan });

  return { user: safeUser, token };
}
