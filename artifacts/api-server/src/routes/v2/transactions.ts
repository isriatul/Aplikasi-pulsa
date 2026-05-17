/**
 * POST /api/v2/transactions        — beli produk (topup via Digiflazz)
 * GET  /api/v2/transactions        — riwayat transaksi user
 * GET  /api/v2/transactions/:id    — detail transaksi
 * POST /api/v2/transactions/:id/retry — retry manual
 */
import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import { createHash } from "crypto";
import { eq, desc, and, gte } from "drizzle-orm";
import { db } from "@workspace/db";
import { transactionsTable, usersTable } from "@workspace/db";
import { requireAuthV2 } from "../../middlewares/requireRole.js";
import { topupLimiter, readLimiter } from "../../middlewares/rateLimiter.js";
import { debitBalance, creditBalance, InsufficientBalanceError } from "../../lib/v2/balanceService.js";
import { audit } from "../../lib/v2/auditService.js";
import { safeZodErrors } from "../../lib/sanitize.js";
import { notifyTxSuccess, notifyTxFailed } from "../../lib/v2/notificationService.js";

const router: IRouter = Router();
const DG_BASE = "https://api.digiflazz.com/v1";
const DG_TIMEOUT_MS = 25_000;

/* Jendela waktu untuk deteksi double transaksi (5 menit) */
const DOUBLE_TX_WINDOW_MS = 5 * 60_000;

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

/** Deteksi apakah error adalah timeout dari AbortSignal */
function isTimeoutError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.name === "TimeoutError" ||
    err.name === "AbortError" ||
    err.message.includes("The operation was aborted") ||
    err.message.includes("timeout")
  );
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

  /* ── Anti-double transaksi ──
     Cegah request ganda untuk produk + nomor yang sama dalam 5 menit */
  const windowStart = new Date(Date.now() - DOUBLE_TX_WINDOW_MS);
  const [existing] = await db
    .select({ id: transactionsTable.id, refId: transactionsTable.refId })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.userId, member.userId),
        eq(transactionsTable.productCode, buyer_sku_code),
        eq(transactionsTable.customerNo, customer_no),
        eq(transactionsTable.status, "pending"),
        gte(transactionsTable.createdAt, windowStart),
      ),
    )
    .limit(1);

  if (existing) {
    res.status(409).json({
      error: "Transaksi serupa sedang diproses. Tunggu beberapa menit atau cek riwayat transaksi.",
      existingRefId: existing.refId,
    });
    return;
  }

  /* Ambil user + saldo terkini */
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

  if (!tx) {
    res.status(500).json({ error: "Gagal membuat transaksi. Coba lagi." });
    return;
  }

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
        await db.update(transactionsTable)
          .set({ status: "failed", message: "Saldo tidak cukup", updatedAt: new Date() })
          .where(eq(transactionsTable.id, tx.id));
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
    }).where(eq(transactionsTable.id, tx.id));

    /* Rollback saldo hanya jika final gagal — jika pending, tunggu callback */
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

    await audit({
      userId: member.userId,
      action: "topup",
      entity: "transaction",
      entityId: refId,
      ip: getIp(req),
      data: { buyer_sku_code, customer_no, status: finalStatus },
    });
    res.json({ refId, status: finalStatus, message: raw?.data?.message, sn: raw?.data?.sn });
  } catch (err) {
    req.log.error({ err, refId }, "Digiflazz topup error");

    if (isTimeoutError(err)) {
      /* Timeout: Digiflazz mungkin masih memproses — jangan refund, tunggu callback */
      await db.update(transactionsTable).set({
        status: "pending",
        message: "Menunggu konfirmasi Digiflazz (timeout). Cek kembali dalam beberapa menit.",
        updatedAt: new Date(),
      }).where(eq(transactionsTable.id, tx.id));

      res.status(202).json({
        refId,
        status: "pending",
        message: "Transaksi sedang diproses oleh provider. Saldo akan dikembalikan otomatis jika gagal.",
      });
      return;
    }

    /* Error lain (network, server error) — rollback saldo dan mark failed */
    if (price > 0) {
      await creditBalance({
        userId: member.userId,
        type: "refund",
        amount: price,
        refId,
        note: "Refund — server error saat menghubungi provider",
      });
    }
    await db.update(transactionsTable)
      .set({ status: "failed", message: "Server error", updatedAt: new Date() })
      .where(eq(transactionsTable.id, tx.id));
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

  try {
    const raw = (await dgPost("/transaction", {
      username,
      buyer_sku_code: tx.productCode,
      customer_no: tx.customerNo,
      ref_id: tx.refId,
      sign,
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

    /* Refund hanya jika final gagal */
    if (isFailed && tx.amount > 0) {
      await creditBalance({
        userId,
        type: "refund",
        amount: tx.amount,
        refId: tx.refId,
        note: `Refund retry ${tx.productCode}`,
      });
    }

    res.json({ status: finalStatus, message: raw?.data?.message });
  } catch (err) {
    req.log.error({ err, refId: tx.refId }, "Retry error");

    if (isTimeoutError(err)) {
      /* Timeout saat retry — transaction tetap pending */
      await db.update(transactionsTable).set({
        retryCount: tx.retryCount + 1,
        message: "Retry timeout — menunggu konfirmasi",
        updatedAt: new Date(),
      }).where(eq(transactionsTable.id, id));

      res.status(202).json({
        status: "pending",
        message: "Provider belum merespons. Transaksi tetap pending.",
      });
      return;
    }

    res.status(500).json({ error: "Retry gagal. Coba lagi nanti." });
  }
});

export default router;
