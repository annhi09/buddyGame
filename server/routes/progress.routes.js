import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { listProgressByChild, saveProgress } from "../services/progress.service.js";

const router = Router();
router.use(authRequired);

router.get("/:childId", (req, res) => {
  try {
    const rows = listProgressByChild(req.user.id, req.params.childId);
    res.json({ ok: true, progress: rows });
  } catch (err) {
    res.status(500).json({ error: err.message || "Fetch progress failed" });
  }
});

router.post("/save", (req, res) => {
  try {
    const row = saveProgress({
      userId: req.user.id,
      progressId: req.body?.id,
      childId: req.body?.childId,
      lessonId: req.body?.lessonId,
      stars: req.body?.stars,
      streak: req.body?.streak,
      bestScore: req.body?.bestScore,
      progressJson: req.body?.progressJson,
    });
    res.json({ ok: true, progress: row });
  } catch (err) {
    res.status(400).json({ error: err.message || "Save progress failed" });
  }
});

export default router;
