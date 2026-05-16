import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../lib/jwt.js";

declare global {
  namespace Express {
    interface Request {
      member?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Autentikasi diperlukan" });
    return;
  }
  const token = header.slice(7);
  try {
    req.member = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Token tidak valid atau sudah kadaluarsa" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.member?.role !== "admin") {
      res.status(403).json({ error: "Akses ditolak: hanya admin" });
      return;
    }
    next();
  });
}
