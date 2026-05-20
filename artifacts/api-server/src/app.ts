import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";

import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { globalLimiter } from "./middlewares/rateLimiter.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { requestTimeout } from "./middlewares/requestTimeout.js";

const app: Express = express();

/* Percaya proxy */
app.set("trust proxy", 1);

/* Security headers */
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

/* CORS */
const allowedOrigins = process.env["REPLIT_DOMAINS"]
  ? process.env["REPLIT_DOMAINS"].split(",")
  : ["*"];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
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

/* Timeout */
app.use(requestTimeout);

/* Logging */
app.use(
  pinoHttp({
    logger,
  }),
);

/* Body parser */
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

/* Rate limiter */
app.use(globalLimiter);

/* Routes */
app.use("/api", router);

/* Error handler */
app.use(errorHandler);

export default app;

