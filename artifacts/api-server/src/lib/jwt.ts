import jwt from "jsonwebtoken";

export interface JwtPayload {
  memberId: string;
  phone: string;
  role: "admin" | "member";
  name: string;
}

function getSecret(): string {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) throw new Error("SESSION_SECRET tidak dikonfigurasi");
  return secret;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: "8h" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret()) as JwtPayload;
}
