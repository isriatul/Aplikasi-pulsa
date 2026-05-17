/**
 * GET  /api/v2/admin/transactions          — semua transaksi
 * GET  /api/v2/admin/transactions/:id      — detail
 * POST /api/v2/admin/transactions/:id/reset — reset status pending
 * GET  /api/v2/admin/deposits              — semua deposit
 * PUT  /api/v2/admin/deposits/:id/confirm  — konfirmasi deposit (atomic)
 * PUT  /api/v2/admin/deposits/:id/reject   — tolak deposit
 */
import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import { eq, desc, and, gte, lte, ne } from "drizzle-orm";
import { db } from "@workspace/db";
import { transactionsTable, depositsTable } from "@workspace/db";
import { requireRole } from "../../../middlewares/requireRole.js";
import { safeZodErrors } from "../../../lib/sanitize.js";
import { creditBalance } from "../../../lib/v2/balanceService.js";
import { audit } from "../../../lib/v2/auditService.js";

const router: IRouter = Router();

const PAGE_LIMIT = 50;

/* Schema validasi tanggal filter (YYYY-MM-DD atau ISO 8601) */
const DateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/, "Format tanggal tidak valid")
  .transform((s) => new Date(s))
  .refine((d) => !isNaN(d.getTime()), "Tanggal tidak valid");

function getIp(req: Request) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0]?.trim() ?? "unknown";
  return req.ip ?? "unknown";
}

/** Validasi dan parse date dari query string; return undefined jika tidak ada/invalid */
function parseQueryDate(value: unknown): Date | undefined {
  if (!value || typeof value !== "string") return undefined;
  const result = DateSchema.safeParse(value);
  return result.success ? result.data : undefined;
}

/* ── GET /api/v2/admin/transactions ── */
router.get("/v2/admin/transactions", requireRole("admin"), async (req, res) => {
  const page = Math.max(1, Number(req.query["page"] ?? 1));
  const status = req.query["status"] as string | undefined;
  const from = parseQueryDate(req.query["from"]);
  const to = parseQueryDate(req.query["to"]);

  const conditions = [];
  if (status === "pending" || status === "success" || status === "failed") {
    conditions.push(eq(transactionsTable.status, status));
  }
  if (from) conditions.push(gte(transactionsTable.createdAt, from));
  if (to) conditions.push(lte(transactionsTable.createdAt, to));

  const rows = await db
    .select()
    .from(transactionsTable)
    .where(conditions.length ? and(...(conditions as [ReturnType<typeof eq>])) : undefined)
    .orderBy(desc(transactionsTable.createdAt))
    .limit(PAGE_LIMIT)
    .offset((page - 1) * PAGE_LIMIT);

  res.json({ page, limit: PAGE_LIMIT, data: rows });
});

/* ── GET /api/v2/admin/transactions/:id ── */
router.get("/v2/admin/transactions/:id", requireRole("admin"), async (req, res) => {
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }
  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id));
  if (!tx) {
    res.status(404).json({ error: "Transaksi tidak ditemukan" });
    return;
  }
  res.json(tx);
});

/* ── POST /api/v2/admin/transactions/:id/reset ── */
router.post("/v2/admin/transactions/:id/reset", requireRole("admin"), async (req, res) => {
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }
  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id));
  if (!tx) {
    res.status(404).json({ error: "Transaksi tidak ditemukan" });
    return;
  }
  if (tx.status !== "pending") {
    res.status(400).json({ error: "Hanya transaksi pending yang dapat direset" });
    return;
  }
  await db.update(transactionsTable).set({ status: "failed", message: "Direset oleh admin", updatedAt: new Date() }).where(eq(transactionsTable.id, id));
  if (tx.amount > 0) {
    await creditBalance({ userId: tx.userId, type: "refund", amount: tx.amount, refId: tx.refId, note: "Refund dari reset admin" });
  }
  await audit({ userId: req.member!.userId, action: "admin_reset_transaction", entity: "transaction", entityId: id, ip: getIp(req) });
  res.json({ message: "Transaksi direset dan saldo dikembalikan" });
});

/* ── GET /api/v2/admin/deposits ── */
router.get("/v2/admin/deposits", requireRole("admin"), async (req, res) => {
  const page = Math.max(1, Number(req.query["page"] ?? 1));
  const status = req.query["status"] as string | undefined;
  const conditions = [];
  if (status === "pending" || status === "paid" || status === "confirmed" || status === "failed") {
    conditions.push(eq(depositsTable.status, status));
  }
  const rows = await db
    .select()
    .from(depositsTable)
    .where(conditions.length ? and(...(conditions as [ReturnType<typeof eq>])) : undefined)
    .orderBy(desc(depositsTable.createdAt))
    .limit(PAGE_LIMIT)
    .offset((page - 1) * PAGE_LIMIT);
  res.json({ page, limit: PAGE_LIMIT, data: rows });
});

/* ── PUT /api/v2/admin/deposits/:id/confirm ── */
router.put("/v2/admin/deposits/:id/confirm", requireRole("admin"), async (req, res) => {
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }

  /* Atomic update: hanya berhasil jika status BUKAN "confirmed" — cegah race condition double-credit */
  const updated = await db
    .update(depositsTable)
    .set({
      status: "confirmed",
      approvedBy: req.member!.userId,
      confirmedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(depositsTable.id, id), ne(depositsTable.status, "confirmed")))
    .returning();

  if (updated.length === 0) {
    /* Update tidak berhasil: deposit tidak ada atau sudah dikonfirmasi */
    const [dep] = await db.select().from(depositsTable).where(eq(depositsTable.id, id));
    if (!dep) {
      res.status(404).json({ error: "Deposit tidak ditemukan" });
    } else {
      res.status(409).json({ error: "Deposit sudah dikonfirmasi sebelumnya" });
    }
    return;
  }

  const dep = updated[0]!;
  const adminId = req.member!.userId;

  await creditBalance({
    userId: dep.userId,
    type: "credit",
    amount: dep.amount,
    refId: dep.paymentRef ?? `DEP-${id}`,
    note: `Deposit dikonfirmasi oleh admin #${adminId}`,
    performedBy: adminId,
  });
  await audit({ userId: adminId, action: "admin_confirm_deposit", entity: "deposit", entityId: id, ip: getIp(req), data: { amount: dep.amount } });
  res.json({ message: "Deposit dikonfirmasi dan saldo ditambahkan" });
});

/* ── PUT /api/v2/admin/deposits/:id/reject ── */
router.put("/v2/admin/deposits/:id/reject", requireRole("admin"), async (req, res) => {
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }
  const RejectSchema = z.object({ reason: z.string().min(1).max(200) });
  const parsed = RejectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Alasan penolakan harus diisi", details: safeZodErrors(parsed.error.issues) });
    return;
  }

  /* Hanya bisa tolak deposit yang belum dikonfirmasi */
  const updated = await db
    .update(depositsTable)
    .set({ status: "failed", note: parsed.data.reason, updatedAt: new Date() })
    .where(and(eq(depositsTable.id, id), ne(depositsTable.status, "confirmed")))
    .returning();

  if (updated.length === 0) {
    const [dep] = await db.select().from(depositsTable).where(eq(depositsTable.id, id));
    if (!dep) {
      res.status(404).json({ error: "Deposit tidak ditemukan" });
    } else {
      res.status(409).json({ error: "Deposit yang sudah dikonfirmasi tidak dapat ditolak" });
    }
    return;
  }

  await audit({ userId: req.member!.userId, action: "admin_reject_deposit", entity: "deposit", entityId: id, ip: getIp(req), data: { reason: parsed.data.reason } });
  res.json({ message: "Deposit ditolak" });
});

export default router;
