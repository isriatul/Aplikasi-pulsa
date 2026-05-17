/**
 * GET /api/v2/monitoring/health            — health check detail
 * GET /api/v2/monitoring/providers         — status semua provider
 * GET /api/v2/monitoring/server-ip         — IP publik server (untuk whitelist Digiflazz)
 * GET /api/v2/monitoring/digiflazz-balance — saldo deposit Digiflazz
 */
import { Router, type IRouter } from "express";
import { createHash } from "crypto";
import { db } from "@workspace/db";
import { providersTable } from "@workspace/db";
import { requireRole, requireAuthV2 } from "../../middlewares/requireRole.js";
import { sanitizeDigiflazzResponse } from "../../lib/sanitize.js";

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

/* ── GET /api/v2/monitoring/server-ip ── */
router.get("/v2/monitoring/server-ip", requireAuthV2, async (req, res) => {
  try {
    const r = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(8_000),
    });
    const data = (await r.json()) as { ip: string };
    res.json({ ip: data.ip });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch public IP");
    res.status(500).json({ error: "Gagal mengambil IP server" });
  }
});

/* ── GET /api/v2/monitoring/digiflazz-balance ── */
router.get("/v2/monitoring/digiflazz-balance", requireRole("admin"), async (req, res) => {
  const username = process.env["DIGIFLAZZ_USERNAME"];
  const apiKey   = process.env["DIGIFLAZZ_KEY"];
  if (!username || !apiKey) {
    res.status(503).json({ error: "Kredensial Digiflazz belum dikonfigurasi di server" });
    return;
  }
  try {
    const sign = createHash("md5").update(username + apiKey + "depo").digest("hex");
    const raw  = await fetch("https://api.digiflazz.com/v1/cek-saldo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd: "deposit", username, sign }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = await raw.json();
    req.log.info({ status: raw.status }, "Digiflazz balance checked via v2");
    res.json(sanitizeDigiflazzResponse(json));
  } catch (err) {
    req.log.error({ err }, "Failed to check Digiflazz balance via v2");
    res.status(500).json({ error: "Gagal cek saldo Digiflazz" });
  }
});

export default router;
