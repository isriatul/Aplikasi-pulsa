import { Router, type IRouter } from "express";
import { getRecentLogs, getLogByRefId } from "../lib/txLog.js";
import { requireAdmin } from "../middlewares/auth.js";
import { readLimiter } from "../middlewares/rateLimiter.js";

const router: IRouter = Router();

/* GET /api/txlog — Riwayat transaksi (admin only) */
router.get("/txlog", requireAdmin, readLimiter, (req, res) => {
  const limit = Math.min(Number(req.query["limit"] ?? 50), 200);
  res.json({ logs: getRecentLogs(limit) });
});

/* GET /api/txlog/:refId — Detail satu transaksi */
router.get("/txlog/:refId", requireAdmin, readLimiter, (req, res) => {
  const entry = getLogByRefId(String(req.params["refId"] ?? ""));
  if (!entry) {
    res.status(404).json({ error: "Log tidak ditemukan" });
    return;
  }
  res.json(entry);
});

export default router;
