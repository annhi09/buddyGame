import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import {
  getCreatorProfile,
  upsertCreatorProfile,
  createDraftPack,
  listPacksByCreator,
  updatePackById,
  createPackVersion,
  submitPackForReview,
  getCreatorDashboard,
} from "../services/creator.service.js";
import { createUploadIntent } from "../services/s3-upload.service.js";

const router = Router();
router.use(authRequired);

router.get("/profile", (req, res) => {
  try {
    const profile = getCreatorProfile(req.user.id);
    res.json({ ok: true, profile });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "Load creator profile failed" });
  }
});

router.patch("/profile", (req, res) => {
  try {
    const profile = upsertCreatorProfile(req.user.id, req.body);
    res.json({ ok: true, profile });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "Update creator profile failed" });
  }
});

router.get("/packs", (req, res) => {
  try {
    const packs = listPacksByCreator(req.user.id);
    res.json({ ok: true, packs });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "List creator packs failed" });
  }
});

router.get("/dashboard", (req, res) => {
  try {
    const dashboard = getCreatorDashboard(req.user.id);
    res.json({ ok: true, dashboard });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "Load creator dashboard failed" });
  }
});

router.post("/packs", (req, res) => {
  try {
    const pack = createDraftPack(req.user.id, req.body);
    res.status(201).json({ ok: true, pack });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "Create draft pack failed" });
  }
});

router.patch("/packs/:id", (req, res) => {
  try {
    const pack = updatePackById(req.params.id, req.user.id, req.body);
    if (!pack) {
      return res.status(404).json({ ok: false, error: "Pack not found" });
    }
    res.json({ ok: true, pack });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "Update pack failed" });
  }
});

router.post("/packs/:id/version", (req, res) => {
  try {
    const version = createPackVersion(req.params.id, req.user.id, req.body);
    if (!version) {
      return res.status(404).json({ ok: false, error: "Pack not found" });
    }
    res.status(201).json({ ok: true, version });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "Create pack version failed" });
  }
});

router.post("/packs/:id/upload-intent", async (req, res) => {
  try {
    const versionNumber = Number(req.body?.versionNumber || 1);
    const uploads = await createUploadIntent({
      creatorId: req.user.id,
      packId: req.params.id,
      versionNumber,
      files: req.body?.files || [],
    });

    res.json({ ok: true, uploads });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "Upload intent failed" });
  }
});

router.post("/packs/:id/submit", (req, res) => {
  try {
    const ok = submitPackForReview(req.params.id, req.user.id);
    if (!ok) {
      return res.status(404).json({ ok: false, error: "Submit failed" });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "Submit for review failed" });
  }
});

export default router;
