/**
 * GET    /api/v2/admin/users           — list semua user
 * GET    /api/v2/admin/users/:id       — detail user
 * PUT    /api/v2/admin/users/:id       — update role/status
 * POST   /api/v2/admin/users/:id/topup — manual topup saldo
 * POST   /api/v2/admin/users/:id/suspend
 * POST   /api/v2/admin/users/:id/activate
 * DELETE /api/v2/admin/users/:id       — soft delete
 */
import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import { eq, ilike, or, desc, isNull, and, count } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable, ROLE_HIERARCHY, type UserRole } from "@workspace/db";
import { requireRole } from "../../../middlewares/requireRole.js";
import { safeZodErrors } from "../../../lib/sanitize.js";
import { safeUser, updateUserStatus, updateUserRole, softDeleteUser, findUserById } from "../../../lib/v2/userService.js";
import { creditBalance } from "../../../lib/v2/balanceService.js";
import { audit } from "../../../lib/v2/auditService.js";

const router: IRouter = Router();

const UpdateUserSchema = z.object({
  role: z.enum(["superadmin", "admin", "reseller", "member"]).optional(),
  status: z.enum(["active", "suspended", "pending"]).optional(),
  name: z.string().min(2).max(100).optional(),
});

const SuspendSchema = z.object({ reason: z.string().min(1).max(200) });

const TopupSchema = z.object({
  amount: z.number().int().min(1000).max(100_000_000),
  note: z.string().max(200).optional(),
});

function getIp(req: Request) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0]?.trim() ?? "unknown";
  return req.ip ?? "unknown";
}

function actorLevel(req: Request): number {
  return ROLE_HIERARCHY[(req.member?.role as UserRole) ?? "member"] ?? 0;
}

/** Cegah modifikasi user dengan role setara atau lebih tinggi dari actor */
async function guardTargetRole(
  targetId: number,
  actorRoleLevel: number,
  res: Parameters<Parameters<typeof router.get>[1]>[1],
): Promise<boolean> {
  const target = await findUserById(targetId);
  if (!target) {
    res.status(404).json({ error: "User tidak ditemukan" });
    return false;
  }
  const targetLevel = ROLE_HIERARCHY[target.role as UserRole] ?? 0;
  if (actorRoleLevel <= targetLevel) {
    res.status(403).json({ error: "Tidak dapat memodifikasi user dengan role yang sama atau lebih tinggi" });
    return false;
  }
  return true;
}

/* ── GET /api/v2/admin/users ── */
router.get("/v2/admin/users", requireRole("admin"), async (req, res) => {
  const page = Math.max(1, Number(req.query["page"] ?? 1));
  const limit = 50;
  /* Batasi panjang search untuk mencegah abuse */
  const rawSearch = req.query["q"] as string | undefined;
  const search = rawSearch ? rawSearch.slice(0, 50) : undefined;
  const status = req.query["status"] as string | undefined;
  const role = req.query["role"] as string | undefined;

  const conditions: Parameters<typeof and> = [isNull(usersTable.deletedAt)];

  if (search) {
    conditions.push(or(
      ilike(usersTable.name, `%${search}%`),
      ilike(usersTable.phone, `%${search}%`),
    )!);
  }
  if (status === "active" || status === "suspended" || status === "pending") {
    conditions.push(eq(usersTable.status, status));
  }
  if (role === "member" || role === "reseller" || role === "admin" || role === "superadmin") {
    conditions.push(eq(usersTable.role, role as UserRole));
  }

  const [{ total }] = await db.select({ total: count() }).from(usersTable).where(and(...conditions));
  const rows = await db
    .select()
    .from(usersTable)
    .where(and(...conditions))
    .orderBy(desc(usersTable.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  res.json({ page, limit, total, data: rows.map(safeUser) });
});

/* ── GET /api/v2/admin/users/:id ── */
router.get("/v2/admin/users/:id", requireRole("admin"), async (req, res) => {
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(and(eq(usersTable.id, id), isNull(usersTable.deletedAt)));
  if (!user) {
    res.status(404).json({ error: "User tidak ditemukan" });
    return;
  }
  res.json(safeUser(user));
});

/* ── PUT /api/v2/admin/users/:id ── */
router.put("/v2/admin/users/:id", requireRole("admin"), async (req, res) => {
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }
  const parsed = UpdateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid", details: safeZodErrors(parsed.error.issues) });
    return;
  }

  const myLevel = actorLevel(req);

  /* Cegah modifikasi user dengan role yang sama atau lebih tinggi */
  const allowed = await guardTargetRole(id, myLevel, res);
  if (!allowed) return;

  /* Cegah privilege escalation: tidak bisa assign role yang setara/lebih tinggi dari diri sendiri */
  if (parsed.data.role) {
    const targetRoleLevel = ROLE_HIERARCHY[parsed.data.role as UserRole] ?? 0;
    if (targetRoleLevel >= myLevel) {
      res.status(403).json({ error: "Tidak dapat mengatur role yang sama atau lebih tinggi dari role Anda" });
      return;
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.role) updates["role"] = parsed.data.role;
  if (parsed.data.status) updates["status"] = parsed.data.status;
  if (parsed.data.name) updates["name"] = parsed.data.name;

  await db.update(usersTable).set(updates).where(eq(usersTable.id, id));
  await audit({ userId: req.member!.userId, action: "admin_update_user", entity: "user", entityId: id, ip: getIp(req), data: parsed.data });
  const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!updated) {
    res.status(404).json({ error: "User tidak ditemukan setelah update" });
    return;
  }
  res.json(safeUser(updated));
});

/* ── POST /api/v2/admin/users/:id/topup ── */
router.post("/v2/admin/users/:id/topup", requireRole("admin"), async (req, res) => {
  const targetId = Number(req.params["id"]);
  if (!Number.isInteger(targetId) || targetId <= 0) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }
  const parsed = TopupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid", details: safeZodErrors(parsed.error.issues) });
    return;
  }

  /* Pastikan target user ada */
  const target = await findUserById(targetId);
  if (!target) {
    res.status(404).json({ error: "User tidak ditemukan" });
    return;
  }

  const adminId = req.member!.userId;
  const mutation = await creditBalance({
    userId: targetId,
    type: "manual_credit",
    amount: parsed.data.amount,
    note: parsed.data.note ?? `Manual topup oleh admin #${adminId}`,
    performedBy: adminId,
  });
  await audit({ userId: adminId, action: "admin_topup_balance", entity: "user", entityId: targetId, ip: getIp(req), data: { amount: parsed.data.amount } });
  res.json({ message: "Saldo berhasil ditambahkan", mutation });
});

/* ── POST /api/v2/admin/users/:id/suspend ── */
router.post("/v2/admin/users/:id/suspend", requireRole("admin"), async (req, res) => {
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }
  const parsed = SuspendSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Alasan suspend harus diisi", details: safeZodErrors(parsed.error.issues) });
    return;
  }

  /* Cegah suspend user dengan role yang sama atau lebih tinggi */
  const allowed = await guardTargetRole(id, actorLevel(req), res);
  if (!allowed) return;

  await updateUserStatus(id, "suspended", parsed.data.reason);
  await audit({ userId: req.member!.userId, action: "admin_suspend_user", entity: "user", entityId: id, ip: getIp(req), data: { reason: parsed.data.reason } });
  res.json({ message: "User berhasil disuspend" });
});

/* ── POST /api/v2/admin/users/:id/activate ── */
router.post("/v2/admin/users/:id/activate", requireRole("admin"), async (req, res) => {
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }

  /* Verifikasi user ada */
  const target = await findUserById(id);
  if (!target) {
    res.status(404).json({ error: "User tidak ditemukan" });
    return;
  }

  await updateUserStatus(id, "active");
  await audit({ userId: req.member!.userId, action: "admin_activate_user", entity: "user", entityId: id, ip: getIp(req) });
  res.json({ message: "User berhasil diaktifkan" });
});

/* ── DELETE /api/v2/admin/users/:id ── */
router.delete("/v2/admin/users/:id", requireRole("superadmin"), async (req, res) => {
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }

  /* Cegah superadmin menghapus dirinya sendiri */
  if (req.member!.userId === id) {
    res.status(403).json({ error: "Tidak dapat menghapus akun sendiri" });
    return;
  }

  await softDeleteUser(id);
  await audit({ userId: req.member!.userId, action: "admin_delete_user", entity: "user", entityId: id, ip: getIp(req) });
  res.json({ message: "User berhasil dihapus (soft delete)" });
});

export default router;
