import jwt from "jsonwebtoken";

export interface JwtPayload {
  memberId: string;
  phone: string;
  role: "superadmin" | "admin" | "reseller" | "member";
  name: string;
  /** v2: numeric user id dari database */
  userId?: number;
}

function getSecret(): string {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) throw new Error("SESSION_SECRET tidak dikonfigurasi");
  return secret;
}

export function signToken(payload: JwtPayload, expiresIn: string | number = "8h"): string {
  return jwt.sign(payload, getSecret(), { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret()) as JwtPayload;
}
