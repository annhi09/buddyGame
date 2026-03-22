import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { loginUser, registerUser } from "../services/auth.service.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const result = await registerUser(req.body || {});
    res.status(201).json({ ok: true, ...result });
  } catch (err) {
    const message = err.message || "Register failed";
    const status = message.includes("already") ? 409 : 400;
    res.status(status).json({ error: message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const result = await loginUser(req.body || {});
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(401).json({ error: err.message || "Login failed" });
  }
});

router.get("/me", authRequired, (req, res) => {
  res.json({ ok: true, user: req.user });
});

export default router;
