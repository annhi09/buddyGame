import { Router } from "express";
import { DB_PATH, PORT, STORAGE_ROOT } from "../config/env.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    ok: true,
    apiBaseUrl: `http://localhost:${PORT}`,
    dbType: "sqlite",
    dbPath: DB_PATH,
    storageRoot: STORAGE_ROOT,
  });
});

export default router;
