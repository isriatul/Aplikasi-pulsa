/**
 * GET  /api/v2/admin/transactions          — semua transaksi
 * GET  /api/v2/admin/transactions/:id      — detail
 * POST /api/v2/admin/transactions/:id/reset — reset status pending
 * GET  /api/v2/admin/deposits              — semua deposit
 * PUT  /api/v2/admin/deposits/:id/confirm  — konfirmasi deposit
 * PUT  /api/v2/admin/deposits/:id/reject   — tolak deposit
 */
import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { db } from "@workspace/db";
import { transactionsTable, depositsTable } from "@workspace/db";
import { requireRole } from "../../../middlewares/requireRole.js";
import { safeZodErrors } from "../../../lib/sanitize.js";
import { creditBalance } from "../../../lib/v2/balanceService.js";
import { audit } from "../../../lib/v2/auditService.js";

const router: IRouter = Router();

const PAGE_LIMIT = 50;

function getIp(req: Request) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0]?.trim() ?? "unknown";
  return req.ip ?? "unknown";
}

/* ── GET /api/v2/admin/transactions ── */
router.get("/v2/admin/transactions", requireRole("admin"), async (req, res) => {
  const page = Math.max(1, Number(req.query["page"] ?? 1));
  const status = req.query["status"] as string | undefined;
  const from = req.query["from"] ? new Date(req.query["from"] as string) : undefined;
  const to = req.query["to"] ? new Date(req.query["to"] as string) : undefined;

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
  if (!Number.isInteger(id)) {
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
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }
  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id));
  if (!tx) {
    res.status(404).json({ error: "Transaksi tidak ditemukan" });
    return;
  }
  await db.update(transactionsTable).set({ status: "failed", message: "Direset oleh admin", updatedAt: new Date() }).where(eq(transactionsTable.id, id));
  if (tx.amount > 0 && tx.status === "pending") {
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
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }
  const [dep] = await db.select().from(depositsTable).where(eq(depositsTable.id, id));
  if (!dep) {
    res.status(404).json({ error: "Deposit tidak ditemukan" });
    return;
  }
  if (dep.status === "confirmed") {
    res.status(400).json({ error: "Deposit sudah dikonfirmasi sebelumnya" });
    return;
  }
  const adminId = req.member!.userId;
  await db.update(depositsTable).set({
    status: "confirmed",
    approvedBy: adminId,
    confirmedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(depositsTable.id, id));

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
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }
  const RejectSchema = z.object({ reason: z.string().min(1).max(200) });
  const parsed = RejectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Alasan penolakan harus diisi", details: safeZodErrors(parsed.error.issues) });
    return;
  }
  await db.update(depositsTable).set({ status: "failed", note: parsed.data.reason, updatedAt: new Date() }).where(eq(depositsTable.id, id));
  await audit({ userId: req.member!.userId, action: "admin_reject_deposit", entity: "deposit", entityId: id, ip: getIp(req), data: { reason: parsed.data.reason } });
  res.json({ message: "Deposit ditolak" });
});

export default router;
