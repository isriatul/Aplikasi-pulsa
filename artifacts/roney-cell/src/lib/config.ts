export interface AppConfig {
  username: string;
  apiKey: string;
  whatsappNumber: string;
  briAccountNumber: string;
  briAccountName: string;
  danaNumber: string;
  danaName: string;
  gopayNumber: string;
  gopayName: string;
  bcaAccountNumber: string;
  bcaAccountName: string;
  qrisImage: string;
  adminPin: string;
  scriptsUrl: string;
}

const CONFIG_KEY = "roneycell_config";

export const DEFAULT_CONFIG: AppConfig = {
  username: "",
  apiKey: "",
  whatsappNumber: "081288080752",
  briAccountNumber: "",
  briAccountName: "Isriatul Bahroni",
  danaNumber: "081288080752",
  danaName: "Isriatul Bahroni",
  gopayNumber: "081288080752",
  gopayName: "Isriatul Bahroni",
  bcaAccountNumber: "7255211277",
  bcaAccountName: "Isriatul Bahroni",
  qrisImage: "",
  adminPin: "1234",
  scriptsUrl: "https://script.google.com/macros/s/AKfycbyLIOiHf90vgysQrJJtPk-aor6Th2aPGXIirLVAUwgq6LFhjLQtzjKgAZz0RqMx-ezu/exec",
};

export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as Partial<AppConfig>;
      // Always use the hardcoded URL — user should never override this manually
      if (DEFAULT_CONFIG.scriptsUrl) {
        stored.scriptsUrl = DEFAULT_CONFIG.scriptsUrl;
      }
      return { ...DEFAULT_CONFIG, ...stored };
    }
  } catch {}
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(cfg: Partial<AppConfig>): void {
  const current = loadConfig();
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...cfg }));
}

export function buildWhatsAppUrl(message: string, number: string): string {
  const clean = number.replace(/\D/g, "");
  const normalized = clean.startsWith("0") ? "62" + clean.slice(1) : clean;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildOrderMessage(
  phone: string,
  productName: string,
  price: number,
  operator: string | undefined,
  refId: string,
  memberName?: string
): string {
  const now = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  const lines = [
    `🧾 *BUKTI TRANSAKSI RoneyCell*`,
    ``,
    `📱 No. Pelanggan : ${phone}`,
    `📶 Operator      : ${operator ?? "Tidak terdeteksi"}`,
    `🛒 Produk        : ${productName}`,
    `💰 Harga         : Rp ${price.toLocaleString("id-ID")}`,
    `🔖 Ref ID        : ${refId}`,
    `⏰ Waktu         : ${now}`,
    `✅ Status        : BERHASIL`,
  ];
  if (memberName) lines.push(`👤 Member         : ${memberName}`);
  lines.push(``, `Terima kasih telah menggunakan RoneyCell! 🙏`);
  return lines.join("\n");
}

export function buildDepositMessage(
  amount: number,
  method: string,
  accountInfo: string,
  memberName?: string
): string {
  const now = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  const lines = [
    `💳 *KONFIRMASI DEPOSIT RoneyCell*`,
    ``,
    `💰 Jumlah Transfer : Rp ${amount.toLocaleString("id-ID")}`,
    `🏦 Metode          : ${method}`,
    `📋 Ke Rekening     : ${accountInfo}`,
    `⏰ Waktu           : ${now}`,
  ];
  if (memberName) lines.push(`👤 Nama Member     : ${memberName}`);
  lines.push(
    ``,
    `Silakan kirim bukti transfer ini.`,
    `Saldo akan dikreditkan setelah konfirmasi.`
  );
  return lines.join("\n");
}
