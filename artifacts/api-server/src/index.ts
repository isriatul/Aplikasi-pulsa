import { validateEnv } from "./lib/env.js";
import { logger } from "./lib/logger.js";

/* Validasi semua env vars wajib sebelum apapun diinisialisasi */
let cfg: ReturnType<typeof validateEnv>;
try {
  cfg = validateEnv();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

import app from "./app.js";
import { seedSuperAdmin } from "./lib/v2/seed.js";

app.listen(cfg.PORT, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info(
    {
      port: cfg.PORT,
      env: cfg.NODE_ENV,
      security: ["helmet", "cors", "rate-limit", "jwt", "idempotency", "timeout", "callback-verify"],
    },
    "RoneyCell API Server started",
  );

  /* Seed superadmin jika belum ada di database */
  seedSuperAdmin().catch((e: unknown) => {
    logger.error({ err: e }, "Gagal seed superadmin");
  });
});
