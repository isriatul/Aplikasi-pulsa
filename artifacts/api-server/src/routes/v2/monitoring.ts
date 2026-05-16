/**
 * GET /api/v2/monitoring/health     — health check detail
 * GET /api/v2/monitoring/providers  — status semua provider
 */
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { providersTable } from "@workspace/db";
import { requireRole } from "../../middlewares/requireRole.js";

const router: IRouter = Router();

/* ── GET /api/v2/monitoring/health ── */
router.get("/v2/monitoring/health", async (_req, res) => {
  const start = Date.now();
  let dbOk = false;
  let dbLatencyMs = -1;

  try {
    await db.execute("SELECT 1");
    dbLatencyMs = Date.now() - start;
    dbOk = true;
  } catch {
    /* DB error — masih lanjutkan response */
  }

  const status = dbOk ? "ok" : "degraded";
  res.status(dbOk ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    db: { ok: dbOk, latencyMs: dbLatencyMs },
    memory: {
      heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1_048_576),
      heapTotalMB: Math.round(process.memoryUsage().heapTotal / 1_048_576),
    },
    version: process.env["npm_package_version"] ?? "0.0.0",
  });
});

/* ── GET /api/v2/monitoring/providers ── */
router.get("/v2/monitoring/providers", requireRole("admin"), async (_req, res) => {
  const providers = await db.select().from(providersTable);

  /* Ping status URL setiap provider (non-blocking, best-effort) */
  const checks = await Promise.allSettled(
    providers.map(async (p) => {
      if (!p.statusUrl) return { id: p.id, reachable: null };
      try {
        const r = await fetch(p.statusUrl, { signal: AbortSignal.timeout(5_000) });
        return { id: p.id, reachable: r.ok, httpStatus: r.status };
      } catch {
        return { id: p.id, reachable: false };
      }
    }),
  );

  const result = providers.map((p, i) => {
    const check = checks[i];
    return {
      ...p,
      reachable: check?.status === "fulfilled" ? (check.value as { reachable: boolean | null }).reachable : null,
    };
  });

  res.json({ providers: result });
});

export default router;
