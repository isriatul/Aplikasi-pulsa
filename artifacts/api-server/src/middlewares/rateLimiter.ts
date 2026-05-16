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

/* Endpoint transaksi: 6 request per menit per IP */
export const topupLimiter = createLimiter(
  60_000,
  6,
  "Terlalu banyak transaksi. Coba lagi 1 menit.",
);

/* Endpoint auth token: 20 request per menit per IP */
export const authLimiter = createLimiter(
  60_000,
  20,
  "Terlalu banyak percobaan login. Coba lagi 1 menit.",
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
