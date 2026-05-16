import type { Request, Response, NextFunction } from "express";

const TIMEOUT_MS = 30_000; // 30 detik

/**
 * Middleware timeout — otomatis kirim 408 jika handler tidak merespons
 * dalam TIMEOUT_MS. Mencegah koneksi tergantung selamanya.
 */
export function requestTimeout(req: Request, res: Response, next: NextFunction): void {
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      req.log?.warn({ url: req.url, method: req.method }, "Request timeout");
      res.status(408).json({ error: "Request timeout. Silakan coba lagi." });
    }
  }, TIMEOUT_MS);

  /* Bersihkan timer saat respons dikirim */
  res.on("finish", () => clearTimeout(timer));
  res.on("close", () => clearTimeout(timer));

  next();
}
