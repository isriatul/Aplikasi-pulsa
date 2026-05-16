import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../lib/jwt.js";
import { ROLE_HIERARCHY, type UserRole } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      member?: JwtPayload;
      user?: JwtPayload;
    }
  }
}

/** Ekstrak dan verifikasi JWT dari header Authorization */
function extractToken(req: Request): JwtPayload | null {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) return null;
  try {
    return verifyToken(header.slice(7));
  } catch {
    return null;
  }
}

/** Middleware: wajib autentikasi (semua role) */
export function requireAuthV2(req: Request, res: Response, next: NextFunction): void {
  const payload = extractToken(req);
  if (!payload) {
    res.status(401).json({ error: "Autentikasi diperlukan" });
    return;
  }
  req.member = payload;
  req.user = payload;
  next();
}

/**
 * Middleware: wajib minimal role tertentu.
 * Hierarchy: superadmin(4) > admin(3) > reseller(2) > member(1)
 */
export function requireRole(minRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const payload = extractToken(req);
    if (!payload) {
      res.status(401).json({ error: "Autentikasi diperlukan" });
      return;
    }
    const userLevel = ROLE_HIERARCHY[payload.role as UserRole] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minRole];
    if (userLevel < requiredLevel) {
      res.status(403).json({ error: `Akses ditolak: minimal role ${minRole}` });
      return;
    }
    req.member = payload;
    req.user = payload;
    next();
  };
}

/** Shortcut: hanya superadmin */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  requireRole("superadmin")(req, res, next);
}

/** Shortcut: admin atau superadmin */
export function requireAdminV2(req: Request, res: Response, next: NextFunction): void {
  requireRole("admin")(req, res, next);
}
