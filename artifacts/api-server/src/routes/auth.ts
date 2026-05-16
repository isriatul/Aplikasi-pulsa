import { Router, type IRouter } from "express";
import { z } from "zod";
import { signToken } from "../lib/jwt.js";
import { authLimiter } from "../middlewares/rateLimiter.js";

const router: IRouter = Router();

const TokenRequestSchema = z.object({
  memberId: z.string().min(1).max(100),
  phone: z.string().min(8).max(15),
  role: z.enum(["admin", "member"]),
  name: z.string().min(1).max(100),
});

/* POST /api/auth/token — tukar sesi Google Sheets dengan JWT */
router.post("/auth/token", authLimiter, (req, res) => {
  const parsed = TokenRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid", details: parsed.error.issues });
    return;
  }
  const { memberId, phone, role, name } = parsed.data;
  const token = signToken({ memberId, phone, role, name });
  res.json({ token, expiresIn: "8h" });
});

export default router;
