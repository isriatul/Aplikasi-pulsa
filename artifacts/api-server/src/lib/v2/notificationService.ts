/**
 * Layanan notifikasi — Telegram, Discord, WhatsApp (Fonnte).
 * Dirancang sebagai hook pluggable: tambah channel baru tanpa ubah caller.
 */
import { logger } from "../logger.js";

export type NotifChannel = "telegram" | "discord" | "whatsapp";

export interface NotifPayload {
  title: string;
  message: string;
  level?: "info" | "warning" | "error" | "success";
  data?: Record<string, unknown>;
}

/* ─── Telegram ─── */
async function sendTelegram(payload: NotifPayload): Promise<void> {
  const botToken = process.env["TELEGRAM_BOT_TOKEN"];
  const chatId = process.env["TELEGRAM_CHAT_ID"];
  if (!botToken || !chatId) return;

  const levelEmoji = { info: "ℹ️", warning: "⚠️", error: "🔴", success: "✅" };
  const emoji = levelEmoji[payload.level ?? "info"];
  const text = `${emoji} *${payload.title}*\n\n${payload.message}`;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch (err) {
    logger.warn({ err }, "Telegram notification failed");
  }
}

/* ─── Discord ─── */
async function sendDiscord(payload: NotifPayload): Promise<void> {
  const webhookUrl = process.env["DISCORD_WEBHOOK_URL"];
  if (!webhookUrl) return;

  const colorMap = { info: 0x3498db, warning: 0xf39c12, error: 0xe74c3c, success: 0x2ecc71 };
  const color = colorMap[payload.level ?? "info"];

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{ title: payload.title, description: payload.message, color }],
      }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch (err) {
    logger.warn({ err }, "Discord notification failed");
  }
}

/* ─── WhatsApp via Fonnte ─── */
async function sendWhatsApp(phone: string, payload: NotifPayload): Promise<void> {
  const token = process.env["VITE_FONNTE_TOKEN"];
  if (!token || !phone) return;

  try {
    await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: token },
      body: new URLSearchParams({
        target: phone,
        message: `*${payload.title}*\n\n${payload.message}`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    logger.warn({ err }, "WhatsApp notification failed");
  }
}

/* ─── Public API ─── */

/** Kirim notifikasi ke semua channel yang dikonfigurasi */
export async function notify(
  payload: NotifPayload,
  channels: NotifChannel[] = ["telegram"],
  targetPhone?: string,
): Promise<void> {
  const tasks: Promise<void>[] = [];
  if (channels.includes("telegram")) tasks.push(sendTelegram(payload));
  if (channels.includes("discord")) tasks.push(sendDiscord(payload));
  if (channels.includes("whatsapp") && targetPhone) tasks.push(sendWhatsApp(targetPhone, payload));
  await Promise.allSettled(tasks);
}

/** Notifikasi transaksi sukses */
export function notifyTxSuccess(opts: {
  userName: string;
  productCode: string;
  customerNo: string;
  amount: number;
  refId: string;
}): void {
  void notify(
    {
      title: "Transaksi Sukses ✅",
      message: `User: ${opts.userName}\nProduk: ${opts.productCode}\nNomor: ${opts.customerNo}\nNominal: Rp${opts.amount.toLocaleString()}\nRef: ${opts.refId}`,
      level: "success",
    },
    ["telegram", "discord"],
  );
}

/** Notifikasi transaksi gagal */
export function notifyTxFailed(opts: {
  userName: string;
  productCode: string;
  customerNo: string;
  refId: string;
  message?: string;
}): void {
  void notify(
    {
      title: "Transaksi Gagal ❌",
      message: `User: ${opts.userName}\nProduk: ${opts.productCode}\nNomor: ${opts.customerNo}\nRef: ${opts.refId}\nPesan: ${opts.message ?? "-"}`,
      level: "error",
    },
    ["telegram"],
  );
}

/** Notifikasi deposit baru */
export function notifyDeposit(opts: {
  userName: string;
  amount: number;
  method: string;
  userId: number;
}): void {
  void notify(
    {
      title: "Deposit Masuk 💰",
      message: `User: ${opts.userName} (#${opts.userId})\nJumlah: Rp${opts.amount.toLocaleString()}\nMetode: ${opts.method}`,
      level: "info",
    },
    ["telegram"],
  );
}
