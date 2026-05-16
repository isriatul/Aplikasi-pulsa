import { Router, type IRouter } from "express";
import { z } from "zod";
import { signToken } from "../lib/jwt.js";
import { authLimiter } from "../middlewares/rateLimiter.js";
import { isAllowedAdminPhone } from "../lib/env.js";
import { safeZodErrors } from "../lib/sanitize.js";

const router: IRouter = Router();

const TokenRequestSchema = z.object({
  memberId: z.string().min(1).max(100),
  phone: z.string().min(8).max(20),
  role: z.enum(["admin", "member"]),
  name: z.string().min(1).max(100),
});

/**
 * POST /api/auth/token — tukar sesi Google Sheets dengan JWT.
 *
 * KEAMANAN: Klaim role=admin HANYA diberikan jika nomor HP ada dalam
 * daftar ADMIN_PHONES (env) atau nomor super admin yang dikonfigurasi.
 * Jika tidak cocok, role otomatis diturunkan ke "member" — tidak pernah error,
 * agar tidak membocorkan informasi tentang daftar admin.
 */
router.post("/auth/token", authLimiter, (req, res) => {
  const parsed = TokenRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid", details: safeZodErrors(parsed.error.issues) });
    return;
  }

  const { memberId, phone, name } = parsed.data;
  let { role } = parsed.data;

  /* Jika role=admin diminta tapi nomor tidak dalam whitelist → turunkan ke member */
  if (role === "admin" && !isAllowedAdminPhone(phone)) {
    role = "member";
  }

  const token = signToken({ memberId, phone, role, name });
  /* Hanya kirim token — jangan bocorkan role yang sebenarnya diberikan */
  res.json({ token, expiresIn: "8h" });
});

export default router;
