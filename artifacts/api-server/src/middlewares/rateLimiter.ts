import rateLimit from "express-rate-limit";

const createLimiter = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
    skipSuccessfulRequests: false,
  });

/* Login: sangat ketat — 5 percobaan per 10 menit per IP (anti brute-force) */
export const loginLimiter = createLimiter(
  10 * 60_000,
  5,
  "Terlalu banyak percobaan login. Coba lagi 10 menit.",
);

/* Endpoint auth lainnya (register, refresh, change-pwd, forgot-pwd): 10 req per menit */
export const authLimiter = createLimiter(
  60_000,
  10,
  "Terlalu banyak request. Coba lagi 1 menit.",
);

/* Endpoint transaksi: 6 request per menit per IP */
export const topupLimiter = createLimiter(
  60_000,
  6,
  "Terlalu banyak transaksi. Coba lagi 1 menit.",
);

/* Deposit: 10 request per 5 menit per IP */
export const depositLimiter = createLimiter(
  5 * 60_000,
  10,
  "Terlalu banyak pengajuan deposit. Coba lagi 5 menit.",
);

/* Pricelist & data baca: 60 request per menit per IP */
export const readLimiter = createLimiter(
  60_000,
  60,
  "Terlalu banyak request. Coba lagi sebentar.",
);

/* Global fallback: 200 request per menit per IP */
export const globalLimiter = createLimiter(
  60_000,
  200,
  "Rate limit tercapai. Coba lagi sebentar.",
);
