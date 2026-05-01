import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import {
  listAdminPacks,
  getAdminPackById,
  approveAdminPack,
  rejectAdminPack,
  publishAdminPack,
} from "../services/admin.service.js";

const router = Router();
router.use(authRequired);

function requireAdmin(req, res, next) {
  const email = String(req.user?.email || "").toLowerCase();

  const allow = [
    "thienlong14th@gmail.com",
  ];

  if (!allow.includes(email)) {
    return res.status(403).json({ ok: false, error: "Admin only" });
  }

  next();
}

router.use(requireAdmin);

router.get("/packs", (req, res) => {
  try {
    const packs = listAdminPacks({
      status: req.query.status || "",
      q: req.query.q || "",
    });
    res.json({ ok: true, packs });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "Load admin packs failed" });
  }
});

router.get("/packs/:id", (req, res) => {
  try {
    const pack = getAdminPackById(req.params.id);
    if (!pack) {
      return res.status(404).json({ ok: false, error: "Pack not found" });
    }
    res.json({ ok: true, pack });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "Load admin pack failed" });
  }
});

router.post("/packs/:id/approve", (req, res) => {
  try {
    const pack = approveAdminPack(req.params.id, req.user.id, req.body?.note || "");
    res.json({ ok: true, pack });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "Approve failed" });
  }
});

router.post("/packs/:id/reject", (req, res) => {
  try {
    const pack = rejectAdminPack(req.params.id, req.user.id, req.body?.reason || "");
    res.json({ ok: true, pack });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "Reject failed" });
  }
});

router.post("/packs/:id/publish", (req, res) => {
  try {
    const pack = publishAdminPack(req.params.id, req.user.id, req.body?.note || "");
    res.json({ ok: true, pack });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "Publish failed" });
  }
});

export default router;

// import { Router } from "express";
// import { authRequired } from "../middleware/auth.js";
// import {
//   listAdminPacks,
//   getAdminPackById,
//   approveAdminPack,
//   rejectAdminPack,
//   publishAdminPack,
// } from "../services/admin.service.js";

// const router = Router();
// router.use(authRequired);

// function requireAdmin(req, res, next) {
//   const email = String(req.user?.email || "").toLowerCase();

//   const allow = [
//     "thienlong14th@gmail.com",
//   ];

//   if (!allow.includes(email)) {
//     return res.status(403).json({ ok: false, error: "Admin only" });
//   }

//   next();
// }

// router.use(requireAdmin);

// router.get("/packs", (req, res) => {
//   try {
//     const packs = listAdminPacks({
//       status: req.query.status || "",
//       q: req.query.q || "",
//     });
//     res.json({ ok: true, packs });
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message || "Load admin packs failed" });
//   }
// });

// router.get("/packs/:id", (req, res) => {
//   try {
//     const pack = getAdminPackById(req.params.id);
//     if (!pack) {
//       return res.status(404).json({ ok: false, error: "Pack not found" });
//     }
//     res.json({ ok: true, pack });
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message || "Load admin pack failed" });
//   }
// });

// router.post("/packs/:id/approve", (req, res) => {
//   try {
//     const pack = approveAdminPack(req.params.id, req.user.id);
//     res.json({ ok: true, pack });
//   } catch (err) {
//     res.status(400).json({ ok: false, error: err.message || "Approve failed" });
//   }
// });

// router.post("/packs/:id/reject", (req, res) => {
//   try {
//     const pack = rejectAdminPack(req.params.id, req.user.id, req.body?.reason || "");
//     res.json({ ok: true, pack });
//   } catch (err) {
//     res.status(400).json({ ok: false, error: err.message || "Reject failed" });
//   }
// });

// router.post("/packs/:id/publish", (req, res) => {
//   try {
//     const pack = publishAdminPack(req.params.id, req.user.id);
//     res.json({ ok: true, pack });
//   } catch (err) {
//     res.status(400).json({ ok: false, error: err.message || "Publish failed" });
//   }
// });

// export default router;

// import { Router } from "express";
// import { authRequired } from "../middleware/auth.js";
// import {
//   listAdminPacks,
//   getAdminPackById,
//   approveAdminPack,
//   rejectAdminPack,
//   publishAdminPack,
// } from "../services/admin.service.js";

// const router = Router();
// router.use(authRequired);

// // phase 1: simple allowlist
// function requireAdmin(req, res, next) {
//   const email = String(req.user?.email || "").toLowerCase();

//   const allow = [
//     "thienlong14th@gmail.com",
//   ];

//   if (!allow.includes(email)) {
//     return res.status(403).json({ ok: false, error: "Admin only" });
//   }

//   next();
// }

// router.use(requireAdmin);

// router.get("/packs", (req, res) => {
//   try {
//     const packs = listAdminPacks({
//       status: req.query.status || "",
//       q: req.query.q || "",
//     });
//     res.json({ ok: true, packs });
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message || "Load admin packs failed" });
//   }
// });

// router.get("/packs/:id", (req, res) => {
//   try {
//     const pack = getAdminPackById(req.params.id);
//     if (!pack) {
//       return res.status(404).json({ ok: false, error: "Pack not found" });
//     }
//     res.json({ ok: true, pack });
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message || "Load admin pack failed" });
//   }
// });

// router.post("/packs/:id/approve", (req, res) => {
//   try {
//     const pack = approveAdminPack(req.params.id, req.user.id);
//     res.json({ ok: true, pack });
//   } catch (err) {
//     res.status(400).json({ ok: false, error: err.message || "Approve failed" });
//   }
// });

// router.post("/packs/:id/reject", (req, res) => {
//   try {
//     const pack = rejectAdminPack(req.params.id, req.user.id, req.body?.reason || "");
//     res.json({ ok: true, pack });
//   } catch (err) {
//     res.status(400).json({ ok: false, error: err.message || "Reject failed" });
//   }
// });

// router.post("/packs/:id/publish", (req, res) => {
//   try {
//     const pack = publishAdminPack(req.params.id, req.user.id);
//     res.json({ ok: true, pack });
//   } catch (err) {
//     res.status(400).json({ ok: false, error: err.message || "Publish failed" });
//   }
// });

// export default router;

// import { Router } from "express";
// import { authRequired } from "../middleware/auth.js";
// import { adminRequired } from "../middleware/adminRequired.js";
// import {
//   listPendingReviewPacks,
//   approvePack,
//   rejectPack,
//   unpublishPack,
// } from "../services/admin.service.js";

// const router = Router();
// router.use(authRequired);
// router.use(adminRequired);

// router.get("/packs/review", (req, res) => {
//   try {
//     const packs = listPendingReviewPacks();
//     res.json({ ok: true, packs });
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message || "Load review queue failed" });
//   }
// });

// router.post("/packs/:id/approve", (req, res) => {
//   try {
//     const ok = approvePack(req.params.id, req.user.id);
//     res.json({ ok });
//   } catch (err) {
//     res.status(400).json({ ok: false, error: err.message || "Approve pack failed" });
//   }
// });

// router.post("/packs/:id/reject", (req, res) => {
//   try {
//     const ok = rejectPack(req.params.id, req.body?.reason || "");
//     res.json({ ok });
//   } catch (err) {
//     res.status(400).json({ ok: false, error: err.message || "Reject pack failed" });
//   }
// });

// router.post("/packs/:id/unpublish", (req, res) => {
//   try {
//     const ok = unpublishPack(req.params.id);
//     res.json({ ok });
//   } catch (err) {
//     res.status(400).json({ ok: false, error: err.message || "Unpublish pack failed" });
//   }
// });

// export default router;
