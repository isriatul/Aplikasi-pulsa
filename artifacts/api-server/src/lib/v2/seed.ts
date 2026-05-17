import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { logger } from "../logger.js";
import { hashPassword } from "./userService.js";

/**
 * Seed superadmin jika belum ada di database.
 * Jika sudah ada tapi statusnya bukan "active", aktifkan.
 * Credentials: phone 081288080752 / pass 311296
 */
export async function seedSuperAdmin(): Promise<void> {
  const PHONE = "81288080752"; // tanpa leading 0
  const PASSWORD = "311296";
  const NAME = "Super Admin";

  const existing = await db.query.usersTable.findFirst({
    where: eq(usersTable.phone, PHONE),
  });

  if (existing) {
    if (existing.status !== "active") {
      await db
        .update(usersTable)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(usersTable.phone, PHONE));
      logger.info({ phone: PHONE }, "Superadmin diaktifkan (status: active)");
    } else {
      logger.info({ phone: PHONE }, "Superadmin sudah ada dan aktif");
    }
    return;
  }

  const passwordHash = await hashPassword(PASSWORD);
  await db.insert(usersTable).values({
    phone: PHONE,
    name: NAME,
    passwordHash,
    role: "superadmin",
    status: "active",
  });

  logger.info({ phone: PHONE }, "Superadmin berhasil di-seed ke database");
}
