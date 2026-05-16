import { Router, type IRouter, type Request } from "express";
import { createHash } from "crypto";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { topupLimiter, readLimiter } from "../middlewares/rateLimiter.js";
import { acquireLock, releaseLock } from "../lib/txLock.js";
import { appendTxLog } from "../lib/txLog.js";
import {
  getIdempotentResult,
  markIdempotentPending,
  saveIdempotentResult,
} from "../lib/idempotency.js";
import { registerPendingRetry, cancelPendingRetry, getPendingRetryQueue } from "../lib/pendingRetry.js";

const router: IRouter = Router();
const DG_BASE = "https://api.digiflazz.com/v1";
const DG_TIMEOUT_MS = 25_000; // 25 detik timeout ke Digiflazz

/* ─── Helpers ─── */

function getCredentials(): { username: string; apiKey: string } {
  const username = process.env["DIGIFLAZZ_USERNAME"];
  const apiKey = process.env["DIGIFLAZZ_KEY"];
  if (!username || !apiKey) throw new Error("Kredensial Digiflazz belum dikonfigurasi.");
  return { username, apiKey };
}

function md5(str: string): string {
  return createHash("md5").update(str).digest("hex");
}

async function dgPost(path: string, body: object): Promise<unknown> {
  const res = await fetch(`${DG_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(DG_TIMEOUT_MS),
  });
  return res.json();
}

function getClientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0]?.trim() ?? "unknown";
  return req.ip ?? "unknown";
}

function getUserAgent(req: Request): string {
  return (req.headers["user-agent"] ?? "unknown").slice(0, 250);
}

/* ─── Input schemas ─── */
const TopupSchema = z.object({
  buyer_sku_code: z
    .string().min(1).max(50)
    .regex(/^[A-Za-z0-9_\-]+$/, "Kode produk tidak valid"),
  customer_no: z
    .string().min(4).max(20)
    .regex(/^[0-9]+$/, "Nomor pelanggan harus angka"),
  ref_id: z
    .string().min(4).max(60)
    .regex(/^[A-Za-z0-9_\-]+$/, "Ref ID tidak valid"),
  declared_price: z
    .number().int().positive().max(10_000_000, "Harga melebihi batas").optional(),
  declared_balance: z
    .number().int().min(0).optional(),
});

const TestSchema = z.object({
  buyer_sku_code: z
    .string().min(1).max(50)
    .regex(/^[A-Za-z0-9_\-]+$/, "Kode produk tidak valid"),
  customer_no: z
    .string().min(4).max(20)
    .regex(/^[0-9]+$/, "Nomor pelanggan harus angka"),
});

/* ─── Routes ─── */

/* GET /api/digiflazz/ip — Public IP server (untuk whitelist, publik) */
router.get("/digiflazz/ip", async (req, res) => {
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

/* GET /api/digiflazz/balance — Saldo deposit Digiflazz (admin only) */
router.get("/digiflazz/balance", requireAdmin, readLimiter, async (req, res) => {
  try {
    const { username, apiKey } = getCredentials();
    const sign = md5(username + apiKey + "depo");
    const data = await dgPost("/cek-saldo", { cmd: "deposit", username, sign });
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to check Digiflazz balance");
    res.status(500).json({ error: "Gagal cek saldo" });
  }
});

/* GET /api/digiflazz/pricelist — Daftar produk (auth required) */
router.get("/digiflazz/pricelist", requireAuth, readLimiter, async (req, res) => {
  try {
    const { username, apiKey } = getCredentials();
    const cmd = req.query["type"] === "pasca" ? "pasca" : "prepaid";
    const sign = md5(username + apiKey + "pricelist");
    const data = await dgPost("/price-list", { cmd, username, sign });
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch pricelist");
    res.status(500).json({ error: "Gagal ambil pricelist" });
  }
});

/* GET /api/digiflazz/pending — Antrian retry pending (admin only) */
router.get("/digiflazz/pending", requireAdmin, readLimiter, (_req, res) => {
  res.json({ queue: getPendingRetryQueue() });
});

/* POST /api/digiflazz/topup — Transaksi utama (auth + idempotency + anti-saldo-minus) */
router.post("/digiflazz/topup", requireAuth, topupLimiter, async (req, res) => {
  const member = req.member!;
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);

  /* 1. Validasi input */
  const parsed = TopupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Input tidak valid", details: parsed.error.issues });
    return;
  }
  const { buyer_sku_code, customer_no, ref_id, declared_price, declared_balance } = parsed.data;

  /* 2. Atomic balance guard — server-side cek anti saldo minus */
  if (
    declared_price !== undefined &&
    declared_balance !== undefined &&
    declared_balance < declared_price
  ) {
    req.log.warn({ ref_id, declared_balance, declared_price, memberId: member.memberId }, "Balance insufficient");
    res.status(402).json({
      error: "Saldo tidak cukup",
      required: declared_price,
      available: declared_balance,
    });
    return;
  }

  /* 3. Idempotency — kembalikan hasil lama jika ref_id sudah pernah diproses */
  const cached = getIdempotentResult(ref_id);
  if (cached) {
    req.log.info({ ref_id, status: cached.status }, "Idempotent response returned");
    res.json(cached.result);
    return;
  }

  /* 4. Anti-double — tolak jika sedang diproses sekarang */
  if (!acquireLock(ref_id, member.memberId)) {
    appendTxLog({
      memberId: member.memberId, phone: member.phone, memberPhone: customer_no,
      role: member.role, refId: ref_id, productCode: buyer_sku_code,
      customerNo: customer_no, status: "double_attempt",
      message: "Double transaction blocked", ip, userAgent,
    });
    res.status(409).json({ error: "Transaksi duplikat. Ref ID sedang diproses." });
    return;
  }

  /* 5. Tandai pending di idempotency store */
  markIdempotentPending(ref_id);
  appendTxLog({
    memberId: member.memberId, phone: member.phone, memberPhone: customer_no,
    role: member.role, refId: ref_id, productCode: buyer_sku_code,
    customerNo: customer_no, status: "pending", ip, userAgent,
  });

  try {
    const { username, apiKey } = getCredentials();
    const sign = md5(username + apiKey + ref_id);
    const data = (await dgPost("/transaction", {
      username, buyer_sku_code, customer_no, ref_id, sign,
    })) as { data?: { status?: string; message?: string } };

    const txStatusRaw = data?.data?.status?.toLowerCase() ?? "";
    const isSuccess = txStatusRaw === "sukses" || txStatusRaw === "success";
    const isPending = txStatusRaw === "pending";

    if (isPending) {
      /* Daftarkan untuk retry otomatis */
      registerPendingRetry({
        refId: ref_id, buyer_sku_code, customer_no,
        memberId: member.memberId, memberPhone: member.phone,
        role: member.role, ip,
      });
    } else {
      /* Simpan hasil final ke idempotency store */
      saveIdempotentResult(ref_id, data, isSuccess ? "success" : "failed");
    }

    appendTxLog({
      memberId: member.memberId, phone: member.phone, memberPhone: customer_no,
      role: member.role, refId: ref_id, productCode: buyer_sku_code,
      customerNo: customer_no,
      status: isSuccess ? "success" : isPending ? "pending" : "failed",
      message: data?.data?.message, ip, userAgent,
    });

    req.log.info(
      { ref_id, buyer_sku_code, memberId: member.memberId, status: txStatusRaw, ip },
      "Topup processed",
    );
    res.json(data);
  } catch (err) {
    req.log.error({ err, ref_id, memberId: member.memberId }, "Digiflazz topup error");
    saveIdempotentResult(ref_id, { error: "Transaksi gagal" }, "failed");
    appendTxLog({
      memberId: member.memberId, phone: member.phone, memberPhone: customer_no,
      role: member.role, refId: ref_id, productCode: buyer_sku_code,
      customerNo: customer_no, status: "failed", message: "Server/network error", ip, userAgent,
    });
    res.status(500).json({ error: "Transaksi gagal. Silakan coba lagi." });
  } finally {
    releaseLock(ref_id);
  }
});

/* POST /api/digiflazz/status — Cek status transaksi by ref_id */
router.post("/digiflazz/status", requireAuth, readLimiter, async (req, res) => {
  const Schema = z.object({
    ref_id: z.string().min(4).max(60).regex(/^[A-Za-z0-9_\-]+$/),
    buyer_sku_code: z.string().min(1).max(50).regex(/^[A-Za-z0-9_\-]+$/),
    customer_no: z.string().min(4).max(20).regex(/^[0-9]+$/),
  });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Input tidak valid", details: parsed.error.issues });
    return;
  }
  const { ref_id, buyer_sku_code, customer_no } = parsed.data;

  /* Cek idempotency store dulu */
  const cached = getIdempotentResult(ref_id);
  if (cached && cached.status !== "pending") {
    res.json({ source: "cache", ...cached });
    return;
  }

  try {
    const { username, apiKey } = getCredentials();
    const sign = md5(username + apiKey + ref_id);
    const data = await dgPost("/transaction", { username, buyer_sku_code, customer_no, ref_id, sign });
    const statusRaw = ((data as { data?: { status?: string } })?.data?.status ?? "").toLowerCase();
    if (statusRaw === "sukses" || statusRaw === "success") {
      saveIdempotentResult(ref_id, data, "success");
      cancelPendingRetry(ref_id);
    } else if (statusRaw === "gagal" || statusRaw === "failed") {
      saveIdempotentResult(ref_id, data, "failed");
      cancelPendingRetry(ref_id);
    }
    res.json({ source: "digiflazz", data });
  } catch (err) {
    req.log.error({ err, ref_id }, "Status check failed");
    res.status(500).json({ error: "Gagal cek status transaksi" });
  }
});

/* POST /api/digiflazz/test — Simulasi transaksi (admin only) */
router.post("/digiflazz/test", requireAdmin, topupLimiter, async (req, res) => {
  const parsed = TestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Input tidak valid", details: parsed.error.issues });
    return;
  }
  const { buyer_sku_code, customer_no } = parsed.data;

  try {
    const { username, apiKey } = getCredentials();
    const ref_id = `TEST-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const sign = md5(username + apiKey + ref_id);
    const payload = { username, buyer_sku_code, customer_no, ref_id, sign, testing: true };
    req.log.info(
      { buyer_sku_code, customer_no, ref_id, memberId: req.member!.memberId },
      "Digiflazz test transaction",
    );
    const data = await dgPost("/transaction", payload);
    res.json({ ref_id, payload_sent: { buyer_sku_code, customer_no, ref_id, testing: true }, result: data });
  } catch (err) {
    req.log.error({ err }, "Digiflazz test transaction failed");
    res.status(500).json({ error: "Test transaksi gagal" });
  }
});

export default router;
