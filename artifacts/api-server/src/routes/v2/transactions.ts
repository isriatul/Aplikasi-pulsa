/**
 * POST /api/v2/transactions        — beli produk (topup via Digiflazz)
 * GET  /api/v2/transactions        — riwayat transaksi user
 * GET  /api/v2/transactions/:id    — detail transaksi
 * POST /api/v2/transactions/:id/retry — retry manual
 */
import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import { createHash } from "crypto";
import { eq, desc, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { transactionsTable, usersTable } from "@workspace/db";
import { requireAuthV2 } from "../../middlewares/requireRole.js";
import { topupLimiter, readLimiter } from "../../middlewares/rateLimiter.js";
import { debitBalance, creditBalance, InsufficientBalanceError } from "../../lib/v2/balanceService.js";
import { audit } from "../../lib/v2/auditService.js";
import { safeZodErrors, sanitizeDigiflazzResponse } from "../../lib/sanitize.js";
import { notifyTxSuccess, notifyTxFailed } from "../../lib/v2/notificationService.js";

const router: IRouter = Router();
const DG_BASE = "https://api.digiflazz.com/v1";
const DG_TIMEOUT_MS = 25_000;

function md5(s: string) {
  return createHash("md5").update(s).digest("hex");
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

function getIp(req: Request) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0]?.trim() ?? "unknown";
  return req.ip ?? "unknown";
}

const BuySchema = z.object({
  buyer_sku_code: z.string().min(1).max(50).regex(/^[A-Za-z0-9_\-]+$/),
  customer_no: z.string().min(4).max(20).regex(/^[0-9]+$/),
  category: z.enum(["pulsa","data","pln","ewallet","pascabayar","game","tv","voucher","international","other"]).default("other"),
  selling_price: z.number().int().min(0).optional(),
});

const PAGE_LIMIT = 20;

/* ── POST /api/v2/transactions ── */
router.post("/v2/transactions", requireAuthV2, topupLimiter, async (req, res) => {
  const member = req.member!;
  if (!member.userId) {
    res.status(400).json({ error: "Token tidak mendukung v2. Login ulang." });
    return;
  }

  const parsed = BuySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Input tidak valid", details: safeZodErrors(parsed.error.issues) });
    return;
  }
  const { buyer_sku_code, customer_no, category, selling_price } = parsed.data;

  /* Ambil user + harga jual dari DB */
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, member.userId));
  if (!user || user.status !== "active") {
    res.status(403).json({ error: "Akun tidak aktif" });
    return;
  }

  const price = selling_price ?? 0;
  if (price > 0 && user.balance < price) {
    res.status(402).json({ error: `Saldo tidak cukup (Rp${user.balance.toLocaleString()})` });
    return;
  }

  const refId = `RC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const username = process.env["DIGIFLAZZ_USERNAME"]!;
  const apiKey = process.env["DIGIFLAZZ_KEY"]!;
  const sign = md5(username + apiKey + refId);

  /* Buat record transaksi pending */
  const [tx] = await db.insert(transactionsTable).values({
    userId: member.userId,
    refId,
    productCode: buyer_sku_code,
    category,
    customerNo: customer_no,
    amount: price,
    sellingPrice: price,
    profit: 0,
    status: "pending",
    ip: getIp(req),
    userAgent: (req.headers["user-agent"] ?? "").slice(0, 250),
  }).returning();

  /* Debit saldo jika harga > 0 */
  if (price > 0) {
    try {
      await debitBalance({
        userId: member.userId,
        type: "debit",
        amount: price,
        refId,
        note: `Pembelian ${buyer_sku_code} untuk ${customer_no}`,
      });
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        await db.update(transactionsTable).set({ status: "failed", message: "Saldo tidak cukup", updatedAt: new Date() }).where(eq(transactionsTable.id, tx!.id));
        res.status(402).json({ error: err.message });
        return;
      }
      throw err;
    }
  }

  try {
    const raw = (await dgPost("/transaction", { username, buyer_sku_code, customer_no, ref_id: refId, sign })) as {
      data?: { status?: string; message?: string; sn?: string };
    };
    const statusRaw = (raw?.data?.status ?? "").toLowerCase();
    const isSuccess = statusRaw === "sukses" || statusRaw === "success";
    const isFailed = statusRaw === "gagal" || statusRaw === "failed";
    const finalStatus = isSuccess ? "success" : isFailed ? "failed" : "pending";

    await db.update(transactionsTable).set({
      status: finalStatus,
      message: raw?.data?.message,
      sn: raw?.data?.sn,
      updatedAt: new Date(),
    }).where(eq(transactionsTable.id, tx!.id));

    /* Rollback saldo jika gagal */
    if (isFailed && price > 0) {
      await creditBalance({
        userId: member.userId,
        type: "refund",
        amount: price,
        refId,
        note: `Refund ${buyer_sku_code} — transaksi gagal`,
      });
      notifyTxFailed({ userName: user.name, productCode: buyer_sku_code, customerNo: customer_no, refId, message: raw?.data?.message });
    } else if (isSuccess) {
      notifyTxSuccess({ userName: user.name, productCode: buyer_sku_code, customerNo: customer_no, amount: price, refId });
    }

    await audit({ userId: member.userId, action: "topup", entity: "transaction", entityId: refId, ip: getIp(req), data: { buyer_sku_code, customer_no, status: finalStatus } });
    res.json({ refId, status: finalStatus, message: raw?.data?.message, sn: raw?.data?.sn });
  } catch (err) {
    req.log.error({ err, refId }, "Digiflazz topup error");
    /* Rollback saldo */
    if (price > 0) {
      await creditBalance({ userId: member.userId, type: "refund", amount: price, refId, note: "Refund — server error" });
    }
    await db.update(transactionsTable).set({ status: "failed", message: "Server error", updatedAt: new Date() }).where(eq(transactionsTable.id, tx!.id));
    res.status(500).json({ error: "Transaksi gagal. Saldo sudah dikembalikan." });
  }
});

/* ── GET /api/v2/transactions ── */
router.get("/v2/transactions", requireAuthV2, readLimiter, async (req, res) => {
  const userId = req.member!.userId!;
  const page = Math.max(1, Number(req.query["page"] ?? 1));
  const offset = (page - 1) * PAGE_LIMIT;

  const rows = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(PAGE_LIMIT)
    .offset(offset);

  res.json({ page, limit: PAGE_LIMIT, data: rows });
});

/* ── GET /api/v2/transactions/:id ── */
router.get("/v2/transactions/:id", requireAuthV2, readLimiter, async (req, res) => {
  const userId = req.member!.userId!;
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }
  const [tx] = await db
    .select()
    .from(transactionsTable)
    .where(and(eq(transactionsTable.id, id), eq(transactionsTable.userId, userId)));

  if (!tx) {
    res.status(404).json({ error: "Transaksi tidak ditemukan" });
    return;
  }
  res.json(tx);
});

/* ── POST /api/v2/transactions/:id/retry ── */
router.post("/v2/transactions/:id/retry", requireAuthV2, topupLimiter, async (req, res) => {
  const userId = req.member!.userId!;
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }
  const [tx] = await db
    .select()
    .from(transactionsTable)
    .where(and(eq(transactionsTable.id, id), eq(transactionsTable.userId, userId)));

  if (!tx) {
    res.status(404).json({ error: "Transaksi tidak ditemukan" });
    return;
  }
  if (tx.status !== "pending") {
    res.status(400).json({ error: "Hanya transaksi pending yang bisa di-retry" });
    return;
  }

  const username = process.env["DIGIFLAZZ_USERNAME"]!;
  const apiKey = process.env["DIGIFLAZZ_KEY"]!;
  const sign = md5(username + apiKey + tx.refId);

  const raw = (await dgPost("/transaction", {
    username, buyer_sku_code: tx.productCode, customer_no: tx.customerNo, ref_id: tx.refId, sign,
  })) as { data?: { status?: string; message?: string; sn?: string } };

  const statusRaw = (raw?.data?.status ?? "").toLowerCase();
  const isSuccess = statusRaw === "sukses" || statusRaw === "success";
  const isFailed = statusRaw === "gagal" || statusRaw === "failed";
  const finalStatus = isSuccess ? "success" : isFailed ? "failed" : "pending";

  await db.update(transactionsTable).set({
    status: finalStatus,
    message: raw?.data?.message,
    sn: raw?.data?.sn,
    retryCount: tx.retryCount + 1,
    updatedAt: new Date(),
  }).where(eq(transactionsTable.id, id));

  if (isFailed && tx.amount > 0) {
    await creditBalance({ userId, type: "refund", amount: tx.amount, refId: tx.refId, note: `Refund retry ${tx.productCode}` });
  }

  res.json({ status: finalStatus, message: raw?.data?.message });
});

export default router;
