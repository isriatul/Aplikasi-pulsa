import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { globalLimiter } from "./middlewares/rateLimiter.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { requestTimeout } from "./middlewares/timeout.js";

const app: Express = express();

/* Percaya proxy Replit (untuk IP yang benar pada rate-limit & logging) */
app.set("trust proxy", 1);

/* ── Helmet: security headers ── */
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

/* ── CORS: izinkan hanya domain Replit di production ── */
const allowedOrigins = process.env["REPLIT_DOMAINS"]
  ? process.env["REPLIT_DOMAINS"].split(",").map((d) => `https://${d.trim()}`)
  : ["*"];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error("Origin tidak diizinkan oleh CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

/* ── Request timeout: 30 detik ── */
app.use(requestTimeout);

/* ── Logging dengan IP dan User-Agent ── */
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
          ip:
            (req.headers?.["x-forwarded-for"] as string | undefined)
              ?.split(",")[0]
              ?.trim() ?? req.socket?.remoteAddress ?? "unknown",
          ua: ((req.headers?.["user-agent"] as string | undefined) ?? "").slice(0, 150),
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

/* ── Body parsing ── */
/* Limit 5MB untuk mendukung upload bukti deposit (base64 gambar terkompresi) */
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

/* ── Global rate limiter ── */
app.use(globalLimiter);

/* ── Routes ── */
app.use("/api", router);

/* ── Safe error handler (paling akhir) ── */
app.use(errorHandler);

export default app;
