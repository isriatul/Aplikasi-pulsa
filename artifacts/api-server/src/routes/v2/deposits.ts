/**
 * POST /api/v2/deposits            — ajukan deposit
 * GET  /api/v2/deposits            — riwayat deposit user
 * GET  /api/v2/deposits/:id        — detail deposit
 */
import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { depositsTable } from "@workspace/db";
import { requireAuthV2 } from "../../middlewares/requireRole.js";
import { readLimiter } from "../../middlewares/rateLimiter.js";
import { safeZodErrors } from "../../lib/sanitize.js";
import { audit } from "../../lib/v2/auditService.js";
import { notifyDeposit } from "../../lib/v2/notificationService.js";
import { findUserById } from "../../lib/v2/userService.js";

const router: IRouter = Router();

const DepositSchema = z.object({
  amount: z.number().int().min(10_000).max(50_000_000),
  method: z.enum(["qris", "va_bca", "va_mandiri", "va_bni", "transfer", "manual"]),
  note: z.string().max(200).optional(),
});

function getIp(req: Request) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0]?.trim() ?? "unknown";
  return req.ip ?? "unknown";
}

/** Buat referensi pembayaran unik */
function buildPaymentRef(method: string, userId: number): string {
  const now = Date.now().toString(36).toUpperCase();
  return `${method.toUpperCase().replace("_", "")}-${userId}-${now}`;
}

/** TTL 3 jam untuk pembayaran QRIS/VA */
function buildExpiry(method: string): Date {
  const ttl = method === "qris" ? 30 : 180; /* menit */
  return new Date(Date.now() + ttl * 60_000);
}

/* ── POST /api/v2/deposits ── */
router.post("/v2/deposits", requireAuthV2, async (req, res) => {
  const userId = req.member!.userId;
  if (!userId) {
    res.status(400).json({ error: "Token tidak mendukung v2. Login ulang." });
    return;
  }
  const parsed = DepositSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid", details: safeZodErrors(parsed.error.issues) });
    return;
  }
  const { amount, method, note } = parsed.data;
  const paymentRef = buildPaymentRef(method, userId);
  const expiredAt = buildExpiry(method);

  const [deposit] = await db.insert(depositsTable).values({
    userId,
    amount,
    method,
    paymentRef,
    expiredAt,
    note: note ?? null,
  }).returning();

  if (!deposit) {
    res.status(500).json({ error: "Gagal membuat deposit. Coba lagi." });
    return;
  }

  const user = await findUserById(userId);
  if (user) notifyDeposit({ userName: user.name, amount, method, userId });

  await audit({ userId, action: "deposit_request", entity: "deposit", entityId: deposit.id, ip: getIp(req), data: { amount, method } });

  /* Kembalikan instruksi pembayaran sesuai metode */
  const instructions = buildInstructions(method, amount, paymentRef);
  res.status(201).json({ deposit, instructions });
});

/* ── GET /api/v2/deposits ── */
router.get("/v2/deposits", requireAuthV2, readLimiter, async (req, res) => {
  const userId = req.member!.userId!;
  const page = Math.max(1, Number(req.query["page"] ?? 1));
  const limit = 20;
  const rows = await db
    .select()
    .from(depositsTable)
    .where(eq(depositsTable.userId, userId))
    .orderBy(desc(depositsTable.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
  res.json({ page, limit, data: rows });
});

/* ── GET /api/v2/deposits/:id ── */
router.get("/v2/deposits/:id", requireAuthV2, readLimiter, async (req, res) => {
  const userId = req.member!.userId!;
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }
  const [dep] = await db
    .select()
    .from(depositsTable)
    .where(and(eq(depositsTable.id, id), eq(depositsTable.userId, userId)));
  if (!dep) {
    res.status(404).json({ error: "Deposit tidak ditemukan" });
    return;
  }
  res.json(dep);
});

/** Bangun instruksi pembayaran per metode */
function buildInstructions(method: string, amount: number, ref: string) {
  const base = { amount, ref, method };
  switch (method) {
    case "qris":
      return { ...base, type: "QRIS", info: "Scan QRIS di aplikasi e-wallet atau m-banking Anda.", qris_placeholder: "QRIS_PAYMENT_GATEWAY_URL" };
    case "va_bca":
      return { ...base, type: "Virtual Account BCA", va_number: `8277${String(amount).slice(-8)}`, bank: "BCA" };
    case "va_mandiri":
      return { ...base, type: "Virtual Account Mandiri", va_number: `8888${String(amount).slice(-8)}`, bank: "Mandiri" };
    case "va_bni":
      return { ...base, type: "Virtual Account BNI", va_number: `9999${String(amount).slice(-8)}`, bank: "BNI" };
    case "transfer":
      return { ...base, type: "Transfer Bank", note: "Transfer ke rekening yang tertera di kontak admin." };
    case "manual":
      return { ...base, type: "Manual", note: "Admin akan memproses deposit setelah konfirmasi pembayaran." };
    default:
      return base;
  }
}

export default router;
