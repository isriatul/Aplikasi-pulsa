import { Router, type IRouter } from "express";
import { createHash } from "crypto";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { topupLimiter, readLimiter } from "../middlewares/rateLimiter.js";
import { acquireLock, releaseLock } from "../lib/txLock.js";
import { appendTxLog } from "../lib/txLog.js";

const router: IRouter = Router();
const DG_BASE = "https://api.digiflazz.com/v1";

function getCredentials(): { username: string; apiKey: string } {
  const username = process.env["DIGIFLAZZ_USERNAME"];
  const apiKey = process.env["DIGIFLAZZ_KEY"];
  if (!username || !apiKey) {
    throw new Error("Kredensial Digiflazz belum dikonfigurasi di Secrets.");
  }
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
  });
  return res.json();
}

function getClientIp(req: import("express").Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() ?? "unknown";
  return req.ip ?? "unknown";
}

/* ─── Input schemas ─── */
const TopupSchema = z.object({
  buyer_sku_code: z.string().min(1).max(50).regex(/^[A-Za-z0-9_\-]+$/, "Kode produk tidak valid"),
  customer_no: z.string().min(4).max(20).regex(/^[0-9]+$/, "Nomor pelanggan harus angka"),
  ref_id: z.string().min(4).max(60).regex(/^[A-Za-z0-9_\-]+$/, "Ref ID tidak valid"),
});

const TestSchema = z.object({
  buyer_sku_code: z.string().min(1).max(50).regex(/^[A-Za-z0-9_\-]+$/, "Kode produk tidak valid"),
  customer_no: z.string().min(4).max(20).regex(/^[0-9]+$/, "Nomor pelanggan harus angka"),
});

/* GET /api/digiflazz/ip — Public IP server (publik, untuk whitelist) */
router.get("/digiflazz/ip", async (req, res) => {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const data = (await r.json()) as { ip: string };
    res.json({ ip: data.ip });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch public IP");
    res.status(500).json({ error: "Gagal mengambil IP server" });
  }
});

/* GET /api/digiflazz/balance — Cek saldo deposit (admin only) */
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
    req.log.error({ err }, "Failed to fetch Digiflazz pricelist");
    res.status(500).json({ error: "Gagal ambil pricelist" });
  }
});

/* POST /api/digiflazz/topup — Kirim transaksi (auth required, rate limited) */
router.post("/digiflazz/topup", requireAuth, topupLimiter, async (req, res) => {
  const member = req.member!;
  const ip = getClientIp(req);

  const parsed = TopupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Input tidak valid", details: parsed.error.issues });
    return;
  }
  const { buyer_sku_code, customer_no, ref_id } = parsed.data;

  /* Anti-double: tolak jika ref_id sedang diproses */
  if (!acquireLock(ref_id)) {
    appendTxLog({
      memberId: member.memberId,
      phone: member.phone,
      memberPhone: customer_no,
      role: member.role,
      refId: ref_id,
      productCode: buyer_sku_code,
      customerNo: customer_no,
      status: "double_attempt",
      message: "Double transaction rejected",
      ip,
    });
    res.status(409).json({ error: "Transaksi duplikat. Ref ID sedang diproses." });
    return;
  }

  appendTxLog({
    memberId: member.memberId,
    phone: member.phone,
    memberPhone: customer_no,
    role: member.role,
    refId: ref_id,
    productCode: buyer_sku_code,
    customerNo: customer_no,
    status: "pending",
    ip,
  });

  try {
    const { username, apiKey } = getCredentials();
    const sign = md5(username + apiKey + ref_id);
    const data = (await dgPost("/transaction", {
      username,
      buyer_sku_code,
      customer_no,
      ref_id,
      sign,
    })) as { data?: { status?: string; message?: string } };

    const txStatus = data?.data?.status?.toLowerCase();
    appendTxLog({
      memberId: member.memberId,
      phone: member.phone,
      memberPhone: customer_no,
      role: member.role,
      refId: ref_id,
      productCode: buyer_sku_code,
      customerNo: customer_no,
      status: txStatus === "sukses" || txStatus === "success" ? "success" : "failed",
      message: data?.data?.message,
      ip,
    });

    req.log.info({ ref_id, buyer_sku_code, memberId: member.memberId, status: txStatus }, "Topup processed");
    res.json(data);
  } catch (err) {
    req.log.error({ err, ref_id }, "Digiflazz topup failed");
    appendTxLog({
      memberId: member.memberId,
      phone: member.phone,
      memberPhone: customer_no,
      role: member.role,
      refId: ref_id,
      productCode: buyer_sku_code,
      customerNo: customer_no,
      status: "failed",
      message: "Server error",
      ip,
    });
    res.status(500).json({ error: "Transaksi gagal. Silakan coba lagi." });
  } finally {
    releaseLock(ref_id);
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
    req.log.info({ buyer_sku_code, customer_no, ref_id }, "Digiflazz test transaction");
    const data = await dgPost("/transaction", payload);
    res.json({ ref_id, payload_sent: { buyer_sku_code, customer_no, ref_id, testing: true }, result: data });
  } catch (err) {
    req.log.error({ err }, "Digiflazz test transaction failed");
    res.status(500).json({ error: "Test transaksi gagal" });
  }
});

export default router;
