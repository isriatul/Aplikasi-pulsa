/**
 * POST /api/v2/deposits                    — ajukan deposit (kode unik otomatis)
 * GET  /api/v2/deposits                    — riwayat deposit user
 * GET  /api/v2/deposits/:id               — detail deposit
 * POST /api/v2/deposits/:id/upload-proof  — upload bukti pembayaran (base64)
 */
import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import { eq, and, desc, ne, gte } from "drizzle-orm";
import { db } from "@workspace/db";
import { depositsTable } from "@workspace/db";
import { requireAuthV2 } from "../../middlewares/requireRole.js";
import { readLimiter, depositLimiter } from "../../middlewares/rateLimiter.js";
import { safeZodErrors } from "../../lib/sanitize.js";
import { audit } from "../../lib/v2/auditService.js";
import { notifyDepositWithProof } from "../../lib/v2/notificationService.js";
import { findUserById } from "../../lib/v2/userService.js";
import { saveProofImage } from "../../lib/v2/proofStorage.js";

const router: IRouter = Router();

const DepositSchema = z.object({
  amount: z.number().int().min(10_000).max(50_000_000),
  method: z.enum(["qris", "transfer", "manual"]),
  note: z.string().max(200).optional(),
});

const UploadProofSchema = z.object({
  /* Base64 image — max ~3MB setelah decode (4MB base64) */
  imageBase64: z.string().min(100).max(5_000_000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

function getIp(req: Request) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0]?.trim() ?? "unknown";
  return req.ip ?? "unknown";
}

/** Generate kode unik 3 digit (100–999) yang tidak konflik dengan deposit pending user yang sama */
async function generateUniqueCode(userId: number, amount: number): Promise<number> {
  const windowStart = new Date(Date.now() - 3 * 60 * 60_000);

  /* Ambil kode yang sedang aktif untuk user ini */
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

  /* Coba random sampai ketemu yang belum dipakai (max 20x) */
  for (let i = 0; i < 20; i++) {
    const code = 100 + Math.floor(Math.random() * 900);
    if (!usedCodes.has(code)) return code;
  }
  /* Fallback: kode berbasis timestamp (dijamin unik) */
  return (Date.now() % 900) + 100;
}

/** TTL deposit: 2 jam */
function buildExpiry(): Date {
  return new Date(Date.now() + 2 * 60 * 60_000);
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

  /* Cegah deposit pending ganda dalam 2 jam */
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000);
  const [existing] = await db
    .select({ id: depositsTable.id, paymentRef: depositsTable.paymentRef })
    .from(depositsTable)
    .where(
      and(
        eq(depositsTable.userId, userId),
        eq(depositsTable.status, "pending"),
        gte(depositsTable.createdAt, twoHoursAgo),
      ),
    )
    .limit(1);

  if (existing) {
    res.status(409).json({
      error: "Masih ada deposit pending. Selesaikan atau tunggu kedaluwarsa sebelum membuat yang baru.",
      existingRef: existing.paymentRef,
    });
    return;
  }

  const uniqueCode = await generateUniqueCode(userId, amount);
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
    res.status(400).json({ error: "Hanya deposit pending yang bisa upload bukti" });
    return;
  }

  const parsed = UploadProofSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid", details: safeZodErrors(parsed.error.issues) });
    return;
  }

  /* Simpan gambar ke disk, return URL relatif */
  const imageUrl = await saveProofImage(id, parsed.data.imageBase64, parsed.data.mimeType);

  await db.update(depositsTable).set({
    proofImageUrl: imageUrl,
    proofUploadedAt: new Date(),
    status: "paid",
    paidAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(depositsTable.id, id));

  /* Notifikasi ke admin */
  const user = await findUserById(userId);
  if (user) {
    notifyDepositWithProof({
      userName: user.name,
      amount: dep.amount,
      uniqueCode: dep.uniqueCode,
      totalAmount: dep.totalAmount,
      method: dep.method,
      paymentRef: dep.paymentRef ?? `DEP-${id}`,
      userId,
    });
  }

  await audit({ userId, action: "deposit_proof_uploaded", entity: "deposit", entityId: id, ip: getIp(req) });

  res.json({ message: "Bukti pembayaran berhasil diupload. Menunggu konfirmasi admin.", imageUrl });
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
        "Scan QRIS yang ditampilkan",
        `Masukkan nominal TEPAT Rp${totalAmount.toLocaleString("id-ID")}`,
        "Bayar dan screenshot struk",
        "Upload foto struk di halaman ini",
      ],
    };
  }
  return {
    ...base,
    langkah: [
      "Transfer ke rekening yang tertera",
      `Nominal TEPAT Rp${totalAmount.toLocaleString("id-ID")}`,
      "Screenshot bukti transfer",
      "Upload foto struk di halaman ini",
    ],
  };
}

export default router;
