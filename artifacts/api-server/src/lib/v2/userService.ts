import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "crypto";
import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  refreshTokensTable,
  passwordResetsTable,
  type User,
  type UserRole,
} from "@workspace/db";

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_TTL_DAYS = 30;
const PASSWORD_RESET_TTL_MIN = 30;

/* ─── Password ─── */

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/* ─── Users ─── */

export async function findUserByPhone(phone: string): Promise<User | undefined> {
  const clean = phone.replace(/\D/g, "").replace(/^0/, "");
  return db.query.usersTable.findFirst({
    where: and(eq(usersTable.phone, clean), isNull(usersTable.deletedAt)),
  });
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  return db.query.usersTable.findFirst({
    where: and(eq(usersTable.email, email.toLowerCase()), isNull(usersTable.deletedAt)),
  });
}

export async function findUserById(id: number): Promise<User | undefined> {
  return db.query.usersTable.findFirst({
    where: and(eq(usersTable.id, id), isNull(usersTable.deletedAt)),
  });
}

export async function createUser(data: {
  phone: string;
  email?: string;
  name: string;
  password: string;
  role?: UserRole;
}): Promise<User> {
  const clean = data.phone.replace(/\D/g, "").replace(/^0/, "");
  const passwordHash = await hashPassword(data.password);
  const [user] = await db
    .insert(usersTable)
    .values({
      phone: clean,
      email: data.email?.toLowerCase(),
      name: data.name,
      passwordHash,
      role: data.role ?? "member",
    })
    .returning();
  return user!;
}

export async function updateUserStatus(
  id: number,
  status: "active" | "suspended" | "pending",
  reason?: string,
): Promise<void> {
  await db
    .update(usersTable)
    .set({ status, suspendReason: reason ?? null, updatedAt: new Date() })
    .where(eq(usersTable.id, id));
}

export async function updateLastLogin(id: number): Promise<void> {
  await db
    .update(usersTable)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(usersTable.id, id));
}

export async function updateUserRole(id: number, role: UserRole): Promise<void> {
  await db
    .update(usersTable)
    .set({ role, updatedAt: new Date() })
    .where(eq(usersTable.id, id));
}

export async function updatePassword(id: number, newPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  await db
    .update(usersTable)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(usersTable.id, id));
}

export async function softDeleteUser(id: number): Promise<void> {
  await db
    .update(usersTable)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(usersTable.id, id));
}

/* Kembalikan data user aman (tanpa password/pin hash) */
export function safeUser(u: User) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, transactionPin, ...safe } = u;
  return safe;
}

/* ─── Refresh Tokens ─── */

export function generateRefreshToken(): string {
  return randomBytes(40).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function saveRefreshToken(
  userId: number,
  token: string,
  ip?: string,
  userAgent?: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  await db.insert(refreshTokensTable).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
    ip: ip?.slice(0, 64),
    userAgent: userAgent?.slice(0, 500),
  });
}

export async function rotateRefreshToken(
  oldToken: string,
  ip?: string,
  userAgent?: string,
): Promise<{ userId: number; newToken: string } | null> {
  const hash = hashToken(oldToken);
  const now = new Date();
  const row = await db.query.refreshTokensTable.findFirst({
    where: and(
      eq(refreshTokensTable.tokenHash, hash),
      eq(refreshTokensTable.revoked, false),
      sql`${refreshTokensTable.expiresAt} > ${now}`,
    ),
  });
  if (!row) return null;

  /* Revoke old */
  await db
    .update(refreshTokensTable)
    .set({ revoked: true })
    .where(eq(refreshTokensTable.id, row.id));

  const newToken = generateRefreshToken();
  await saveRefreshToken(row.userId, newToken, ip, userAgent);
  return { userId: row.userId, newToken };
}

export async function revokeUserTokens(userId: number): Promise<void> {
  await db
    .update(refreshTokensTable)
    .set({ revoked: true })
    .where(and(eq(refreshTokensTable.userId, userId), eq(refreshTokensTable.revoked, false)));
}

/* ─── Password Reset ─── */

export async function createPasswordResetToken(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MIN * 60_000);
  await db.insert(passwordResetsTable).values({ userId, tokenHash: hashToken(token), expiresAt });
  return token;
}

export async function consumePasswordResetToken(token: string): Promise<number | null> {
  const hash = hashToken(token);
  const now = new Date();
  const row = await db.query.passwordResetsTable.findFirst({
    where: and(
      eq(passwordResetsTable.tokenHash, hash),
      eq(passwordResetsTable.used, false),
      sql`${passwordResetsTable.expiresAt} > ${now}`,
    ),
  });
  if (!row) return null;
  await db
    .update(passwordResetsTable)
    .set({ used: true })
    .where(eq(passwordResetsTable.id, row.id));
  return row.userId;
}
