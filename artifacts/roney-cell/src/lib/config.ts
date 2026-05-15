export interface AppConfig {
  username: string;
  apiKey: string;
  whatsappNumber: string;
  briAccountNumber: string;
  briAccountName: string;
  danaNumber: string;
  danaName: string;
  adminPin: string;
}

const CONFIG_KEY = "roneycell_config";

const DEFAULT_CONFIG: AppConfig = {
  username: "",
  apiKey: "",
  whatsappNumber: "",
  briAccountNumber: "",
  briAccountName: "RONEY CELL",
  danaNumber: "",
  danaName: "RONEY CELL",
  adminPin: "1234",
};

export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
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
  refId: string
): string {
  const now = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  return [
    `🧾 *BUKTI TRANSAKSI RONEY CELL*`,
    ``,
    `📱 No. Pelanggan : ${phone}`,
    `📶 Operator      : ${operator ?? "Tidak dikesan"}`,
    `🛒 Produk        : ${productName}`,
    `💰 Harga         : Rp ${price.toLocaleString("id-ID")}`,
    `🔖 Ref ID        : ${refId}`,
    `⏰ Waktu         : ${now}`,
    `✅ Status        : BERJAYA`,
    ``,
    `Terima kasih kerana menggunakan RONEY CELL!`,
  ].join("\n");
}

export function buildDepositMessage(amount: number, method: string, accountInfo: string): string {
  const now = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  return [
    `💳 *KONFIRMASI DEPOSIT RONEY CELL*`,
    ``,
    `💰 Jumlah Transfer : Rp ${amount.toLocaleString("id-ID")}`,
    `🏦 Metode          : ${method}`,
    `📋 Ke Rekening     : ${accountInfo}`,
    `⏰ Waktu           : ${now}`,
    ``,
    `Sila hantar bukti transfer ini.`,
    `Saldo akan dikreditkan selepas pengesahan.`,
  ].join("\n");
}
