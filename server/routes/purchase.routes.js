import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { purchasePack } from "../services/purchase.service.js";

const router = Router();
router.use(authRequired);

router.post("/packs/:id", (req, res) => {
  try {
    const result = purchasePack({
      buyerUserId: req.user.id,
      packId: req.params.id,
      paymentResult: {
        grossCents: Number(req.body?.grossCents || 0),
        feeCents: Number(req.body?.feeCents || 0),
        currency: String(req.body?.currency || "usd").toLowerCase(),
        paymentIntentId: req.body?.paymentIntentId || null,
      },
    });

    res.json({ ok: true, result });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "Purchase failed" });
  }
});

export default router;
