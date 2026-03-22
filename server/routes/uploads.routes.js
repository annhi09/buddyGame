import { Router } from "express";
import multer from "multer";
import { authRequired } from "../middleware/auth.js";
import {
  getImageMetadata,
  saveLessonImage,
} from "../services/uploads.service.js";
import { deleteItemImagesByLessonAndItemKey } from "../services/images.service.js";

const router = Router();
router.use(authRequired);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("Only JPG, PNG, WEBP allowed"), ok);
  },
});

router.post("/lesson-image", upload.single("image"), async (req, res) => {
  try {
    const image = await saveLessonImage({
      ownerUserId: req.user.id,
      lessonId: String(req.body?.lessonId || "").trim(),
      kind: String(req.body?.kind || "item").trim(),
      itemKey:
        req.body?.itemKey ||
        req.body?.imageKey ||
        req.body?.slug ||
        req.body?.word ||
        "",
      file: req.file,
    });

    res.status(201).json({ ok: true, image });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "Upload failed" });
  }
});

router.get("/image/:id", (req, res) => {
  const row = getImageMetadata(req.params.id);

  if (!row) {
    return res.status(404).json({ ok: false, error: "Image not found" });
  }

  if (row.owner_user_id !== req.user.id) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  res.json({ ok: true, image: row });
});

router.delete("/lesson-image", (req, res) => {
  try {
    const lessonId = String(req.query.lessonId || "").trim();
    const itemKey = String(req.query.itemKey || "").trim().toLowerCase();

    if (!lessonId || !itemKey) {
      return res.status(400).json({
        ok: false,
        error: "lessonId and itemKey required",
      });
    }

    const deleted = deleteItemImagesByLessonAndItemKey({
      lessonId,
      itemKey,
      ownerUserId: req.user.id,
    });

    res.json({
      ok: true,
      deleted,
    });
  } catch (err) {
    console.error("delete lesson image error", err);
    res.status(500).json({ ok: false, error: "Delete image failed" });
  }
});

export default router;

// import { Router } from "express";
// import multer from "multer";
// import { authRequired } from "../middleware/auth.js";
// import { getImageMetadata, saveLessonImage } from "../services/uploads.service.js";
// import { deleteItemImagesByLessonAndItemKey } from "../services/images.service.js";

// const router = Router();
// router.use(authRequired);

// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 8 * 1024 * 1024 },
//   fileFilter: (_req, file, cb) => {
//     const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
//     cb(ok ? null : new Error("Only JPG, PNG, WEBP allowed"), ok);
//   },
// });

// router.post("/lesson-image", upload.single("image"), async (req, res) => {
//   try {
//     const image = await saveLessonImage({
//       ownerUserId: req.user.id,
//       lessonId: String(req.body?.lessonId || "").trim(),
//       kind: String(req.body?.kind || "item").trim(),
//       itemKey: req.body?.itemKey,
//       file: req.file,
//     });
//     res.status(201).json({ ok: true, image });
//   } catch (err) {
//     res.status(400).json({ error: err.message || "Upload failed" });
//   }
// });

// router.get("/image/:id", (req, res) => {
//   const row = getImageMetadata(req.params.id);
//   if (!row) {
//     return res.status(404).json({ error: "Image not found" });
//   }

//   if (row.owner_user_id !== req.user.id) {
//     return res.status(403).json({ error: "Forbidden" });
//   }

//   res.json({ ok: true, image: row });
// });

// router.delete("/lesson-image", authRequired, (req, res) => {
//   try {
//     const lessonId = String(req.query.lessonId || "").trim();
//     const itemKey = String(req.query.itemKey || "").trim().toLowerCase();

//     if(!lessonId || !itemKey){
//       return res.status(400).json({ ok: false, error: "lessonId and itemKey required" });
//     }

//     const deleted = deleteItemImagesByLessonAndItemKey(lessonId, itemKey);

//     res.json({
//       ok: true,
//       deleted
//     });
//   } catch (err) {
//     console.error("delete lesson image error", err);
//     res.status(500).json({ ok: false, error: "Delete image failed" });
//   }
// });

// export default router;
