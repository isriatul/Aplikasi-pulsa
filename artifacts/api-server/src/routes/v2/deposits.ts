/**
 * POST /api/v2/deposits                    — ajukan deposit (kode unik otomatis)
 * GET  /api/v2/deposits                    — riwayat deposit user
 * GET  /api/v2/deposits/:id               — detail deposit
 * POST /api/v2/deposits/:id/upload-proof  — upload bukti → AUTO-CREDIT saldo
 */
import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import { eq, and, desc, ne, gte, lt } from "drizzle-orm";
import { db } from "@workspace/db";
import { depositsTable } from "@workspace/db";
import { requireAuthV2 } from "../../middlewares/requireRole.js";
import { readLimiter, depositLimiter } from "../../middlewares/rateLimiter.js";
import { safeZodErrors } from "../../lib/sanitize.js";
import { audit } from "../../lib/v2/auditService.js";
import { notifyDepositWithProof, notifyDepositAutoConfirmed } from "../../lib/v2/notificationService.js";
import { findUserById } from "../../lib/v2/userService.js";
import { saveProofImage } from "../../lib/v2/proofStorage.js";
import { creditBalance } from "../../lib/v2/balanceService.js";

const router: IRouter = Router();

/** TTL tiket deposit: 1 jam. Lebih dari ini dianggap abandoned dan di-expire otomatis. */
const DEPOSIT_TTL_MS = 60 * 60_000; /* 1 jam */

const DepositSchema = z.object({
  amount: z.number().int().min(10_000).max(50_000_000),
  method: z.enum(["qris", "transfer", "manual"]),
  note: z.string().max(200).optional(),
});

const UploadProofSchema = z.object({
  imageBase64: z.string().min(100).max(5_000_000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

function getIp(req: Request) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0]?.trim() ?? "unknown";
  return req.ip ?? "unknown";
}

/** Expire otomatis deposit pending yang sudah lebih dari 1 jam (abandoned) */
async function autoExpireOldDeposits(userId: number): Promise<number> {
  const cutoff = new Date(Date.now() - DEPOSIT_TTL_MS);
  const expired = await db
    .update(depositsTable)
    .set({ status: "expired", updatedAt: new Date() })
    .where(
      and(
        eq(depositsTable.userId, userId),
        eq(depositsTable.status, "pending"),
        lt(depositsTable.createdAt, cutoff),
      ),
    )
    .returning({ id: depositsTable.id });
  return expired.length;
}

/** Generate kode unik 3 digit (100–999) yang tidak konflik dengan deposit aktif user */
async function generateUniqueCode(userId: number): Promise<number> {
  const windowStart = new Date(Date.now() - 3 * 60 * 60_000);
  const active = await db
    .select({ uniqueCode: depositsTable.uniqueCode })
    .from(depositsTable)
    .where(
      and(
        eq(depositsTable.userId, userId),
        ne(depositsTable.status, "confirmed"),
        ne(depositsTable.status, "failed"),
        ne(depositsTable.status, "expired"),
        gte(depositsTable.createdAt, windowStart),
      ),
    );
  const usedCodes = new Set(active.map((r) => r.uniqueCode));
  for (let i = 0; i < 20; i++) {
    const code = 100 + Math.floor(Math.random() * 900);
    if (!usedCodes.has(code)) return code;
  }
  return (Date.now() % 900) + 100;
}

function buildExpiry(): Date {
  return new Date(Date.now() + DEPOSIT_TTL_MS);
}

function buildPaymentRef(userId: number): string {
  return `DEP-${userId}-${Date.now().toString(36).toUpperCase()}`;
}

/* ── POST /api/v2/deposits ── */
router.post("/v2/deposits", requireAuthV2, depositLimiter, async (req, res) => {
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

  /* Auto-expire tiket lama yang sudah lewat 1 jam — agar user tidak terbloking */
  await autoExpireOldDeposits(userId);

  /* Cek apakah masih ada deposit pending AKTIF (< 1 jam) */
  const cutoff = new Date(Date.now() - DEPOSIT_TTL_MS);
  const [existing] = await db
    .select({ id: depositsTable.id, paymentRef: depositsTable.paymentRef, totalAmount: depositsTable.totalAmount, uniqueCode: depositsTable.uniqueCode, createdAt: depositsTable.createdAt })
    .from(depositsTable)
    .where(
      and(
        eq(depositsTable.userId, userId),
        eq(depositsTable.status, "pending"),
        gte(depositsTable.createdAt, cutoff),
      ),
    )
    .limit(1);

  if (existing) {
    /* Kembalikan tiket yang masih aktif — user bisa langsung lanjut bayar */
    const [fullDep] = await db.select().from(depositsTable).where(eq(depositsTable.id, existing.id));
    res.status(409).json({
      error: "Masih ada tiket deposit aktif. Gunakan tiket yang sudah ada atau tunggu 1 jam.",
      existingDeposit: fullDep,
    });
    return;
  }

  const uniqueCode = await generateUniqueCode(userId);
  const totalAmount = amount + uniqueCode;
  const paymentRef = buildPaymentRef(userId);
  const expiredAt = buildExpiry();

  const [deposit] = await db.insert(depositsTable).values({
    userId,
    amount,
    uniqueCode,
    totalAmount,
    method,
    paymentRef,
    expiredAt,
    note: note ?? null,
  }).returning();

  if (!deposit) {
    res.status(500).json({ error: "Gagal membuat deposit. Coba lagi." });
    return;
  }

  await audit({ userId, action: "deposit_request", entity: "deposit", entityId: deposit.id, ip: getIp(req), data: { amount, method, uniqueCode, totalAmount } });

  res.status(201).json({
    deposit,
    instructions: buildInstructions(method, amount, uniqueCode, totalAmount, paymentRef),
  });
});

/* ── POST /api/v2/deposits/:id/upload-proof ── */
/* AUTO-CREDIT: saldo langsung dikreditkan setelah bukti diupload */
router.post("/v2/deposits/:id/upload-proof", requireAuthV2, async (req, res) => {
  const userId = req.member!.userId!;
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id) || id <= 0) {
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
  if (dep.status !== "pending") {
    /* Jika sudah confirmed, kembalikan sukses agar idempoten */
    if (dep.status === "confirmed") {
      res.json({ message: "Deposit sudah dikonfirmasi.", autoConfirmed: true });
      return;
    }
    res.status(400).json({ error: `Status deposit saat ini: ${dep.status}. Hanya pending yang bisa upload bukti.` });
    return;
  }

  const parsed = UploadProofSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid", details: safeZodErrors(parsed.error.issues) });
    return;
  }

  /* Simpan gambar ke disk */
  const imageUrl = await saveProofImage(id, parsed.data.imageBase64, parsed.data.mimeType);

  /* ─── AUTO-CONFIRM: kredit saldo secara atomik ─── */
  const now = new Date();

  /* Atomic update: hanya berhasil jika status masih "pending" — cegah double-credit */
  const updated = await db
    .update(depositsTable)
    .set({
      proofImageUrl: imageUrl,
      proofUploadedAt: now,
      status: "confirmed",
      paidAt: now,
      confirmedAt: now,
      updatedAt: now,
    })
    .where(and(eq(depositsTable.id, id), eq(depositsTable.status, "pending")))
    .returning();

  if (updated.length === 0) {
    /* Race condition: deposit sudah diproses bersamaan */
    res.json({ message: "Deposit sudah dikonfirmasi sebelumnya.", autoConfirmed: true });
    return;
  }

  /* Kredit saldo user */
  await creditBalance({
    userId,
    type: "credit",
    amount: dep.amount, /* Kredit hanya nominal asli (tanpa kode unik) */
    refId: `DEP-AUTO-${id}`,
    note: `Auto-credit deposit ${dep.paymentRef ?? `#${id}`}`,
  });

  /* Notifikasi admin via Telegram/Discord */
  const user = await findUserById(userId);
  if (user) {
    notifyDepositAutoConfirmed({
      userName: user.name,
      amount: dep.amount,
      uniqueCode: dep.uniqueCode,
      totalAmount: dep.totalAmount,
      method: dep.method,
      paymentRef: dep.paymentRef ?? `DEP-${id}`,
      userId,
    });
  }

  await audit({
    userId,
    action: "deposit_auto_confirmed",
    entity: "deposit",
    entityId: id,
    ip: getIp(req),
    data: { amount: dep.amount, uniqueCode: dep.uniqueCode, totalAmount: dep.totalAmount },
  });

  res.json({
    message: `Bukti diterima! Saldo Rp${dep.amount.toLocaleString("id-ID")} langsung ditambahkan.`,
    autoConfirmed: true,
    creditedAmount: dep.amount,
    imageUrl,
  });
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
  if (!Number.isInteger(id) || id <= 0) {
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

/** Instruksi pembayaran sesuai metode */
function buildInstructions(
  method: string,
  amount: number,
  uniqueCode: number,
  totalAmount: number,
  ref: string,
) {
  const base = {
    method,
    nominalAsli: amount,
    kodeUnik: uniqueCode,
    totalBayar: totalAmount,
    ref,
    penting: `Bayar TEPAT Rp${totalAmount.toLocaleString("id-ID")} (termasuk kode unik +${uniqueCode})`,
  };
  if (method === "qris") {
    return {
      ...base,
      langkah: [
        "Buka DANA / GoPay / OVO / m-banking",
        "Scan QRIS di bawah ini",
        `Masukkan nominal TEPAT Rp${totalAmount.toLocaleString("id-ID")}`,
        "Bayar → screenshot struk",
        "Upload foto struk → saldo langsung masuk",
      ],
    };
  }
  return {
    ...base,
    langkah: [
      "Transfer ke rekening yang tertera",
      `Nominal TEPAT Rp${totalAmount.toLocaleString("id-ID")}`,
      "Screenshot bukti transfer",
      "Upload foto struk → saldo langsung masuk",
    ],
  };
}

export default router;
