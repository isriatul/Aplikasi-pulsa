import express = require("express");
import cors = require("cors");
import helmet = require("helmet");
import pinoHttp = require("pino-http");

import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { globalLimiter } from "./middlewares/rateLimiter.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { requestTimeout } from "./middlewares/requestTimeout.js";

const app = express();

/* Trust proxy */
app.set("trust proxy", 1);

/* Security */
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

/* CORS */
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

/* Timeout */
app.use(requestTimeout);

/* Logger */
app.use(
  pinoHttp({
    logger,
  }),
);

/* Body parser */
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

/* Rate limit */
app.use(globalLimiter);

/* API */
app.use("/api", router);

/* Health */
app.get("/healthz", (_req: any, res: any) => {
  res.json({
    status: "ok",
  });
});

/* Error handler */
app.use(errorHandler);

export default app;

