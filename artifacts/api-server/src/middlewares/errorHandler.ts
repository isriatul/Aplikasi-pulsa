import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

/* Safe global error handler — tidak bocorkan stack trace ke client */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isDev = process.env["NODE_ENV"] === "development";
  const message =
    err instanceof Error ? err.message : "Terjadi kesalahan server";

  logger.error({ err, url: req.url, method: req.method }, "Unhandled error");

  res.status(500).json({
    error: isDev ? message : "Terjadi kesalahan server. Silakan coba lagi.",
    ...(isDev && err instanceof Error ? { stack: err.stack } : {}),
  });
}
