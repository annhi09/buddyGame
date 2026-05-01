import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import {
  listLibraryPacks,
  getLibraryPackById,
  importOwnedPackAsLesson,
  markLibraryPackImported,
} from "../services/library.service.js";

const router = Router();
router.use(authRequired);

router.get("/", (req, res) => {
  try {
    const items = listLibraryPacks(req.user.id);
    res.json({ ok: true, items });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "Load library failed" });
  }
});

router.get("/:packId", (req, res) => {
  try {
    const item = getLibraryPackById(req.user.id, req.params.packId);
    if (!item) {
      return res.status(404).json({ ok: false, error: "Library item not found" });
    }
    res.json({ ok: true, item });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "Load library item failed" });
  }
});

router.post("/:packId/import", async (req, res) => {
  try {
    const lesson = await importOwnedPackAsLesson(req.user.id, req.params.packId);
    res.json({ ok: true, lesson });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "Import failed" });
  }
});

router.post("/:packId/mark-imported", (req, res) => {
  try {
    const ok = markLibraryPackImported(
      req.user.id,
      req.params.packId,
      Number(req.body?.version || 0),
    );

    res.json({ ok });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "Mark imported failed" });
  }
});

export default router;

// import { Router } from "express";
// import { authRequired } from "../middleware/auth.js";
// import {
//   listLibraryByUser,
//   getOwnedPackDownload,
//   markPackDownloaded,
//   checkLibraryUpdates,
// } from "../services/library.service.js";

// const router = Router();
// router.use(authRequired);

// router.get("/", (req, res) => {
//   try {
//     const library = listLibraryByUser(req.user.id);
//     res.json({ ok: true, library });
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message || "Load library failed" });
//   }
// });

// router.get("/:packId/download", async (req, res) => {
//   try {
//     const payload = await getOwnedPackDownload(req.user.id, req.params.packId);
//     if (!payload) {
//       return res.status(404).json({ ok: false, error: "Owned pack not found" });
//     }
//     res.json({ ok: true, payload });
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message || "Download lookup failed" });
//   }
// });

// router.post("/check-updates", (req, res) => {
//   try {
//     const updates = checkLibraryUpdates
//       ? checkLibraryUpdates(req.user.id, req.body?.items || [])
//       : [];
//     res.json({ ok: true, updates });
//   } catch (err) {
//     res.status(400).json({ ok: false, error: err.message || "Check updates failed" });
//   }
// });

// router.post("/:packId/mark-downloaded", (req, res) => {
//   try {
//     const ok = markPackDownloaded(
//       req.user.id,
//       req.params.packId,
//       Number(req.body?.version || 0),
//     );
//     res.json({ ok });
//   } catch (err) {
//     res.status(400).json({ ok: false, error: err.message || "Mark downloaded failed" });
//   }
// });

// export default router;
