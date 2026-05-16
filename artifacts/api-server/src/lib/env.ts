/* Validasi semua environment variable wajib saat startup.
   Server tidak boleh berjalan jika konfigurasi tidak lengkap. */

interface EnvConfig {
  PORT: number;
  SESSION_SECRET: string;
  DIGIFLAZZ_USERNAME: string;
  DIGIFLAZZ_KEY: string;
  NODE_ENV: "development" | "production" | "test";
}

let _config: EnvConfig | null = null;

export function validateEnv(): EnvConfig {
  const required = ["PORT", "SESSION_SECRET", "DIGIFLAZZ_USERNAME", "DIGIFLAZZ_KEY"] as const;
  const missing = required.filter((k) => !process.env[k]);

  if (missing.length > 0) {
    throw new Error(
      `[ENV] Variabel wajib tidak ditemukan: ${missing.join(", ")}.\n` +
        `Pastikan semua secret sudah dikonfigurasi di Replit Secrets.`,
    );
  }

  const port = Number(process.env["PORT"]);
  if (Number.isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`[ENV] PORT tidak valid: "${process.env["PORT"]}"`);
  }

  const nodeEnv = process.env["NODE_ENV"] ?? "development";
  if (!["development", "production", "test"].includes(nodeEnv)) {
    throw new Error(`[ENV] NODE_ENV tidak valid: "${nodeEnv}"`);
  }

  _config = {
    PORT: port,
    SESSION_SECRET: process.env["SESSION_SECRET"]!,
    DIGIFLAZZ_USERNAME: process.env["DIGIFLAZZ_USERNAME"]!,
    DIGIFLAZZ_KEY: process.env["DIGIFLAZZ_KEY"]!,
    NODE_ENV: nodeEnv as EnvConfig["NODE_ENV"],
  };

  return _config;
}

export function getEnv(): EnvConfig {
  if (!_config) throw new Error("[ENV] validateEnv() harus dipanggil sebelum getEnv()");
  return _config;
}
