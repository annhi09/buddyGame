import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
// import {
//   createLesson,
//   listLessonsByOwner,
//   updateLessonById
// } from "../services/lessons.service.js";

import {
  createLesson,
  listLessonsByOwner,
  updateLessonById,
  deleteLessonById
} from "../services/lessons.service.js";

const router = Router();

router.post("/", authRequired, (req, res) => {
  try {
    const lesson = createLesson(req.user.id, req.body);
    res.status(201).json({ ok: true, lesson });
  } catch (err) {
    console.error("create lesson error", err);
    res.status(500).json({ ok: false, error: "Create lesson failed" });
  }
});

router.get("/", authRequired, (req, res) => {
  try {
    const lessons = listLessonsByOwner(req.user.id);
    res.json({ ok: true, lessons });
  } catch (err) {
    console.error("list lessons error", err);
    res.status(500).json({ ok: false, error: "List lessons failed" });
  }
});

router.patch("/:id", authRequired, (req, res) => {
  try {
    const lesson = updateLessonById(req.params.id, req.user.id, req.body);

    if (!lesson) {
      return res.status(404).json({ ok: false, error: "Lesson not found" });
    }

    res.json({ ok: true, lesson });
  } catch (err) {
    console.error("update lesson error", err);
    res.status(500).json({ ok: false, error: "Update lesson failed" });
  }
});

router.delete("/:id", authRequired, (req, res) => {
  try {
    const ok = deleteLessonById(req.params.id, req.user.id);

    if(!ok){
      return res.status(404).json({ ok: false, error: "Lesson not found" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("delete lesson error", err);
    res.status(500).json({ ok: false, error: "Delete lesson failed" });
  }
});

export default router;

// import { Router } from "express";
// import { authRequired } from "../middleware/auth.js";
// import { createLesson, listLessonsByOwner, updateLessonById } from "../services/lessons.service.js";

// const router = Router();

// router.post("/", authRequired, (req, res) => {
//   try {
//     const lesson = createLesson(req.user.id, req.body);
//     res.status(201).json({ ok: true, lesson });
//   } catch (err) {
//     console.error("create lesson error", err);
//     res.status(500).json({ ok: false, error: "Create lesson failed" });
//   }
// });

// router.get("/", authRequired, (req, res) => {
//   try {
//     const lessons = listLessonsByOwner(req.user.id);
//     res.json({ ok: true, lessons });
//   } catch (err) {
//     console.error("list lessons error", err);
//     res.status(500).json({ ok: false, error: "List lessons failed" });
//   }
// });

// router.patch("/:id", authRequired, (req, res) => {
//   try {
//     const lesson = updateLessonById(req.params.id, req.user.id, req.body);
//     if(!lesson){
//       return res.status(404).json({ ok: false, error: "Lesson not found" });
//     }
//     res.json({ ok: true, lesson });
//   } catch (err) {
//     console.error("update lesson error", err);
//     res.status(500).json({ ok: false, error: "Update lesson failed" });
//   }
// });

// export default router;

// import { Router } from "express";
// import { authRequired } from "../middleware/auth.js";
// import { createLesson, listLessons } from "../services/lessons.service.js";

// const router = Router();
// router.use(authRequired);

// router.get("/", (req, res) => {
//   try {
//     const lessons = listLessons(req.user.id);
//     res.json({ ok: true, lessons });
//   } catch (err) {
//     res.status(500).json({ error: err.message || "List lessons failed" });
//   }
// });

// router.post("/", (req, res) => {
//   try {
//     const lesson = createLesson({
//       ownerUserId: req.user.id,
//       title: req.body?.title,
//       type: req.body?.type,
//       visibility: req.body?.visibility,
//       dataJson: req.body?.dataJson,
//     });
//     res.status(201).json({ ok: true, lesson });
//   } catch (err) {
//     res.status(400).json({ error: err.message || "Create lesson failed" });
//   }
// });

// export default router;
