import express = require("express");
import cors = require("cors");
import helmet = require("helmet");
import pinoHttp = require("pino-http");

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(
  pinoHttp(),
);

app.get("/healthz", (_req: any, res: any) => {
  res.json({
    status: "ok",
  });
});

export default app;

