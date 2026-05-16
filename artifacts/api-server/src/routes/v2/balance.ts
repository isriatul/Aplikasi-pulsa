/**
 * GET  /api/v2/balance             — saldo user
 * GET  /api/v2/balance/mutations   — riwayat mutasi saldo
 */
import { Router, type IRouter } from "express";
import { requireAuthV2 } from "../../middlewares/requireRole.js";
import { readLimiter } from "../../middlewares/rateLimiter.js";
import { getBalance, getMutations, getBalanceSummary } from "../../lib/v2/balanceService.js";

const router: IRouter = Router();

/* ── GET /api/v2/balance ── */
router.get("/v2/balance", requireAuthV2, readLimiter, async (req, res) => {
  const userId = req.member!.userId;
  if (!userId) {
    res.status(400).json({ error: "Token tidak mendukung v2. Login ulang." });
    return;
  }
  const [balance, summary] = await Promise.all([
    getBalance(userId),
    getBalanceSummary(userId),
  ]);
  res.json({ balance, ...summary });
});

/* ── GET /api/v2/balance/mutations ── */
router.get("/v2/balance/mutations", requireAuthV2, readLimiter, async (req, res) => {
  const userId = req.member!.userId;
  if (!userId) {
    res.status(400).json({ error: "Token tidak mendukung v2. Login ulang." });
    return;
  }
  const page = Math.max(1, Number(req.query["page"] ?? 1));
  const limit = 20;
  const offset = (page - 1) * limit;
  const mutations = await getMutations(userId, limit, offset);
  res.json({ page, limit, data: mutations });
});

export default router;
