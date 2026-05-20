import express, { t
ype Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";

import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { globalLimiter } from "./middlewares/rateLimiter.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { requestTimeout } from "./middlewares/requestTimeout.js";

const app: Express = express();

/* Percaya proxy deployment */
app.set("trust proxy", 1);

/* ── Helmet: security headers ── */
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

/* ── CORS ── */
const allowedOrigins = process.env["REPLIT_DOMAINS"]
  ? process.env["REPLIT_DOMAINS"].split(",")
  : ["*"];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error("Origin tidak diizinkan"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

/* ── Request timeout ── */
app.use(requestTimeout);

/* ── Logging ── */
app.use(
  pinoHttp({
    logger,
  }),
);

/* ── Body parser ── */
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

/* ── Global rate limiter ── */
app.use(globalLimiter);

/* ── Routes ── */
app.use("/api", router);

/* ── Health check ── */
app.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

/* ── Error handler ── */
app.use(errorHandler);

export default app;
