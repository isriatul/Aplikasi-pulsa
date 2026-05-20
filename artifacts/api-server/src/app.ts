const express = require("express");
const cors = require("cors");
const helmet = require("helmet").default || require("helmet");
const pinoHttp = require("pino-http").default || require("pino-http");

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

