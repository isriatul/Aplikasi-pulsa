import rateLimit from "express-rate-limit";

const createLimiter = (windowMs: number, max: number, message: string, skipSuccess = false) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
    skipSuccessfulRequests: skipSuccess,
  });

/* Login: 10 percobaan per 15 menit per IP — hanya hitung yang GAGAL */
export const loginLimiter = createLimiter(
  15 * 60_000,
  10,
  "Terlalu banyak percobaan login. Coba lagi 15 menit.",
  true, /* skipSuccessfulRequests — login berhasil tidak dihitung */
);

/* Endpoint auth lainnya (register, refresh, change-pwd, forgot-pwd): 30 req per menit */
export const authLimiter = createLimiter(
  60_000,
  30,
  "Terlalu banyak request. Coba lagi sebentar.",
);

/* Endpoint transaksi: 10 request per menit per IP */
export const topupLimiter = createLimiter(
  60_000,
  10,
  "Terlalu banyak transaksi. Coba lagi 1 menit.",
);

/* Deposit: 20 request per 5 menit per IP */
export const depositLimiter = createLimiter(
  5 * 60_000,
  20,
  "Terlalu banyak pengajuan deposit. Coba lagi 5 menit.",
);

/* Pricelist & data baca: 120 request per menit per IP */
export const readLimiter = createLimiter(
  60_000,
  120,
  "Terlalu banyak request. Coba lagi sebentar.",
);

/* Global fallback: 300 request per menit per IP */
export const globalLimiter = createLimiter(
  60_000,
  300,
  "Rate limit tercapai. Coba lagi sebentar.",
);
