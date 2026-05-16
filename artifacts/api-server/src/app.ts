import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { globalLimiter } from "./middlewares/rateLimiter.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app: Express = express();

/* Percaya proxy Replit (untuk rate-limit by IP yang benar) */
app.set("trust proxy", 1);

/* Helmet: security headers */
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

/* CORS: izinkan hanya domain Replit di production */
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
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

/* Logging */
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

/* Body parsing */
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

/* Global rate limiter */
app.use(globalLimiter);

/* Routes */
app.use("/api", router);

/* Safe error handler (harus paling akhir) */
app.use(errorHandler);

export default app;
