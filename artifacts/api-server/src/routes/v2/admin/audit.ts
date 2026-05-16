/**
 * GET /api/v2/admin/audit-log        — semua audit log
 * GET /api/v2/admin/audit-log/:userId — log per user
 */
import { Router, type IRouter } from "express";
import { requireRole } from "../../../middlewares/requireRole.js";
import { readLimiter } from "../../../middlewares/rateLimiter.js";
import { getAuditLogs, getUserAuditLogs } from "../../../lib/v2/auditService.js";

const router: IRouter = Router();

router.get("/v2/admin/audit-log", requireRole("admin"), readLimiter, async (req, res) => {
  const page = Math.max(1, Number(req.query["page"] ?? 1));
  const limit = 100;
  const logs = await getAuditLogs(limit, (page - 1) * limit);
  res.json({ page, limit, data: logs });
});

router.get("/v2/admin/audit-log/:userId", requireRole("admin"), readLimiter, async (req, res) => {
  const userId = Number(req.params["userId"]);
  if (!Number.isInteger(userId)) {
    res.status(400).json({ error: "User ID tidak valid" });
    return;
  }
  const logs = await getUserAuditLogs(userId);
  res.json({ data: logs });
});

export default router;
