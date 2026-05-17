/**
 * v1 auth bridge — DEPRECATED.
 * Gunakan POST /api/v2/auth/login untuk autentikasi via PostgreSQL.
 */
import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/auth/token", (_req, res) => {
  res.status(410).json({
    error: "Endpoint ini sudah tidak aktif.",
    migration: "Gunakan POST /api/v2/auth/login untuk autentikasi.",
  });
});

export default router;
