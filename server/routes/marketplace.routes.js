import { Router } from "express";
import {
  listPublishedPacks,
  getPublishedPackById,
  getPackPreview,
} from "../services/marketplace.service.js";

const router = Router();

router.get("/packs", (req, res) => {
  try {
    const packs = listPublishedPacks(req.query || {});
    res.json({ ok: true, packs });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "Load marketplace packs failed" });
  }
});

router.get("/packs/:id", (req, res) => {
  try {
    const pack = getPublishedPackById(req.params.id);
    if (!pack) {
      return res.status(404).json({ ok: false, error: "Pack not found" });
    }
    res.json({ ok: true, pack });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "Load pack failed" });
  }
});

router.get("/packs/:id/preview", (req, res) => {
  try {
    const preview = getPackPreview(req.params.id);
    if (!preview) {
      return res.status(404).json({ ok: false, error: "Preview not found" });
    }
    res.json({ ok: true, preview });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "Load preview failed" });
  }
});

export default router;
