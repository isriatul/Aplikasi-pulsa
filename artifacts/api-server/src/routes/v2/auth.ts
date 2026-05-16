/**
 * POST /api/v2/auth/register       — daftar akun baru
 * POST /api/v2/auth/login          — login → access + refresh token
 * POST /api/v2/auth/refresh        — perbarui access token
 * POST /api/v2/auth/logout         — revoke refresh token
 * GET  /api/v2/auth/profile        — profil user login
 * PUT  /api/v2/auth/profile        — update profil
 * POST /api/v2/auth/change-password
 * POST /api/v2/auth/forgot-password
 * POST /api/v2/auth/reset-password
 */
import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import { eq, isNull, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import {
  findUserByPhone,
  findUserByEmail,
  findUserById,
  createUser,
  verifyPassword,
  updatePassword,
  updateLastLogin,
  saveRefreshToken,
  rotateRefreshToken,
  revokeUserTokens,
  createPasswordResetToken,
  consumePasswordResetToken,
  safeUser,
} from "../../lib/v2/userService.js";
import { signToken } from "../../lib/jwt.js";
import { authLimiter, readLimiter } from "../../middlewares/rateLimiter.js";
import { requireAuthV2 } from "../../middlewares/requireRole.js";
import { audit } from "../../lib/v2/auditService.js";
import { safeZodErrors } from "../../lib/sanitize.js";
import { isAllowedAdminPhone } from "../../lib/env.js";
import type { UserRole } from "@workspace/db";

const router: IRouter = Router();

const RegisterSchema = z.object({
  phone: z.string().min(8).max(15).regex(/^[0-9]+$/),
  email: z.string().email().optional(),
  name: z.string().min(2).max(100),
  password: z.string().min(6).max(100),
});

const LoginSchema = z.object({
  phone: z.string().min(8).max(15).regex(/^[0-9]+$/).optional(),
  email: z.string().email().optional(),
  password: z.string().min(1).max(100),
}).refine((d) => d.phone || d.email, { message: "Phone atau email harus diisi" });

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

const ForgotPasswordSchema = z.object({
  phone: z.string().min(8).max(15).regex(/^[0-9]+$/).optional(),
  email: z.string().email().optional(),
}).refine((d) => d.phone || d.email, { message: "Phone atau email harus diisi" });

const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
});

function getIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0]?.trim() ?? "unknown";
  return req.ip ?? "unknown";
}

function getUa(req: Request): string {
  return (req.headers["user-agent"] ?? "").slice(0, 300);
}

function buildTokens(user: { id: number; phone: string; role: string; name: string }) {
  const role = user.role as UserRole;
  const accessToken = signToken({
    memberId: String(user.id),
    userId: user.id,
    phone: user.phone,
    role,
    name: user.name,
  }, "8h");
  return { accessToken };
}

/* ── POST /api/v2/auth/register ── */
router.post("/v2/auth/register", authLimiter, async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid", details: safeZodErrors(parsed.error.issues) });
    return;
  }
  const { phone, email, name, password } = parsed.data;
  const clean = phone.replace(/\D/g, "").replace(/^0/, "");

  const existing = await findUserByPhone(clean);
  if (existing) {
    res.status(409).json({ error: "Nomor HP sudah terdaftar" });
    return;
  }
  if (email) {
    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      res.status(409).json({ error: "Email sudah terdaftar" });
      return;
    }
  }

  /* Cek apakah nomor ini adalah admin */
  const role: UserRole = isAllowedAdminPhone(clean) ? "admin" : "member";
  const user = await createUser({ phone: clean, email, name, password, role });

  await audit({ userId: user.id, action: "register", ip: getIp(req), userAgent: getUa(req) });

  res.status(201).json({ message: "Registrasi berhasil. Akun menunggu persetujuan admin.", userId: user.id });
});

/* ── POST /api/v2/auth/login ── */
router.post("/v2/auth/login", authLimiter, async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid", details: safeZodErrors(parsed.error.issues) });
    return;
  }
  const { phone, email, password } = parsed.data;

  let user = phone ? await findUserByPhone(phone) : undefined;
  if (!user && email) user = await findUserByEmail(email);

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: "Nomor/email atau password salah" });
    return;
  }
  if (user.status === "suspended") {
    res.status(403).json({ error: `Akun disuspend. ${user.suspendReason ?? "Hubungi admin."}` });
    return;
  }
  if (user.status === "pending") {
    res.status(403).json({ error: "Akun belum diaktifkan. Hubungi admin." });
    return;
  }

  const { accessToken } = buildTokens(user);
  const refreshToken = (await import("../../lib/v2/userService.js")).generateRefreshToken();
  await saveRefreshToken(user.id, refreshToken, getIp(req), getUa(req));
  await updateLastLogin(user.id);
  await audit({ userId: user.id, action: "login", ip: getIp(req), userAgent: getUa(req) });

  res.json({ accessToken, refreshToken, user: safeUser(user) });
});

/* ── POST /api/v2/auth/refresh ── */
router.post("/v2/auth/refresh", authLimiter, async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    res.status(400).json({ error: "Refresh token diperlukan" });
    return;
  }
  const result = await rotateRefreshToken(refreshToken, getIp(req), getUa(req));
  if (!result) {
    res.status(401).json({ error: "Refresh token tidak valid atau sudah kadaluarsa" });
    return;
  }
  const user = await findUserById(result.userId);
  if (!user || user.status !== "active") {
    res.status(403).json({ error: "Akun tidak aktif" });
    return;
  }
  const { accessToken } = buildTokens(user);
  res.json({ accessToken, refreshToken: result.newToken });
});

/* ── POST /api/v2/auth/logout ── */
router.post("/v2/auth/logout", requireAuthV2, async (req, res) => {
  const userId = req.member!.userId;
  if (userId) await revokeUserTokens(userId);
  await audit({ userId, action: "logout", ip: getIp(req), userAgent: getUa(req) });
  res.json({ message: "Logout berhasil" });
});

/* ── GET /api/v2/auth/profile ── */
router.get("/v2/auth/profile", requireAuthV2, readLimiter, async (req, res) => {
  const userId = req.member!.userId;
  if (!userId) {
    res.status(400).json({ error: "User ID tidak valid" });
    return;
  }
  const user = await findUserById(userId);
  if (!user) {
    res.status(404).json({ error: "User tidak ditemukan" });
    return;
  }
  res.json(safeUser(user));
});

/* ── PUT /api/v2/auth/profile ── */
router.put("/v2/auth/profile", requireAuthV2, async (req, res) => {
  const userId = req.member!.userId;
  if (!userId) {
    res.status(400).json({ error: "User ID tidak valid" });
    return;
  }
  const parsed = UpdateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid", details: safeZodErrors(parsed.error.issues) });
    return;
  }
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.name) updates["name"] = parsed.data.name;
  if (parsed.data.email) {
    const existing = await findUserByEmail(parsed.data.email);
    if (existing && existing.id !== userId) {
      res.status(409).json({ error: "Email sudah digunakan akun lain" });
      return;
    }
    updates["email"] = parsed.data.email.toLowerCase();
  }
  await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
  await audit({ userId, action: "update_profile", ip: getIp(req), data: parsed.data });
  const updated = await findUserById(userId);
  res.json(safeUser(updated!));
});

/* ── POST /api/v2/auth/change-password ── */
router.post("/v2/auth/change-password", requireAuthV2, authLimiter, async (req, res) => {
  const userId = req.member!.userId;
  if (!userId) {
    res.status(400).json({ error: "User ID tidak valid" });
    return;
  }
  const parsed = ChangePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid", details: safeZodErrors(parsed.error.issues) });
    return;
  }
  const user = await findUserById(userId);
  if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    res.status(401).json({ error: "Password saat ini salah" });
    return;
  }
  await updatePassword(userId, parsed.data.newPassword);
  await revokeUserTokens(userId);
  await audit({ userId, action: "change_password", ip: getIp(req) });
  res.json({ message: "Password berhasil diubah. Silakan login ulang." });
});

/* ── POST /api/v2/auth/forgot-password ── */
router.post("/v2/auth/forgot-password", authLimiter, async (req, res) => {
  const parsed = ForgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid", details: safeZodErrors(parsed.error.issues) });
    return;
  }
  const { phone, email } = parsed.data;
  let user = phone ? await findUserByPhone(phone) : undefined;
  if (!user && email) user = await findUserByEmail(email);

  /* Selalu respons 200 agar tidak bocorkan info akun */
  if (!user) {
    res.json({ message: "Jika akun ditemukan, reset token telah dikirim." });
    return;
  }
  const token = await createPasswordResetToken(user.id);
  /* TODO: kirim token via WhatsApp/email */
  req.log.info({ userId: user.id, token: token.slice(0, 8) + "…" }, "Password reset token created");
  res.json({ message: "Token reset password telah dibuat. Hubungi admin untuk kode reset.", debug_token: process.env["NODE_ENV"] === "development" ? token : undefined });
});

/* ── POST /api/v2/auth/reset-password ── */
router.post("/v2/auth/reset-password", authLimiter, async (req, res) => {
  const parsed = ResetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid", details: safeZodErrors(parsed.error.issues) });
    return;
  }
  const userId = await consumePasswordResetToken(parsed.data.token);
  if (!userId) {
    res.status(400).json({ error: "Token tidak valid atau sudah kadaluarsa" });
    return;
  }
  await updatePassword(userId, parsed.data.newPassword);
  await revokeUserTokens(userId);
  await audit({ userId, action: "reset_password", ip: getIp(req) });
  res.json({ message: "Password berhasil direset. Silakan login." });
});

export default router;
