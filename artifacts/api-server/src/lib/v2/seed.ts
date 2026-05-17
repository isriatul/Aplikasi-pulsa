import { logger } from "../logger.js";
import { findUserByPhone, createUser } from "./userService.js";

/**
 * Seed superadmin jika belum ada di database.
 * Credentials: phone 081288080752 / pass 311296
 */
export async function seedSuperAdmin(): Promise<void> {
  const PHONE = "081288080752";
  const PASSWORD = "311296";
  const NAME = "Super Admin";

  const existing = await findUserByPhone(PHONE);
  if (existing) {
    logger.info({ phone: PHONE }, "Superadmin sudah ada di database");
    return;
  }

  await createUser({
    phone: PHONE,
    name: NAME,
    password: PASSWORD,
    role: "superadmin",
  });

  logger.info({ phone: PHONE }, "Superadmin berhasil di-seed ke database");
}
