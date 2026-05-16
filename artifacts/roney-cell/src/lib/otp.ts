import { getCountryInfo } from "./operator";

/* Format phone number for Fonnte API (international format, no + prefix) */
export function toFonnteNumber(dialCode: string, phone: string): string {
  const cc    = dialCode.replace("+", "");
  const local = phone.replace(/\D/g, "").replace(/^0/, "");
  return cc + local;
}

/* Validate phone number length per country standard */
export function isValidPhoneLength(dialCode: string, phone: string): boolean {
  const digits     = phone.replace(/\D/g, "");
  const info       = getCountryInfo(dialCode);
  return digits.length >= info.minLen && digits.length <= info.maxLen;
}

/* Generate cryptographically random 6-digit OTP */
export function generateOtp(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(100000 + (arr[0] % 900000));
}

/* ── Fonnte WhatsApp OTP sender ── */
export async function sendOtpViaFonnte(
  target: string,  /* international format e.g. 6281234567890 */
  otp: string,
): Promise<{ ok: boolean; message: string }> {
  const token = (import.meta.env.VITE_FONNTE_TOKEN as string | undefined) ?? "";

  if (!token) {
    return {
      ok: false,
      message: "Token Fonnte belum dikonfigurasi. Hubungi admin untuk mengatur VITE_FONNTE_TOKEN.",
    };
  }

  const message =
    `🔐 *Kode OTP RoneyCell*\n\n` +
    `Kode Anda: *${otp}*\n\n` +
    `⏱ Berlaku selama 10 menit.\n` +
    `⚠️ JANGAN berikan kode ini kepada siapapun, termasuk admin.\n\n` +
    `_RoneyCell – Solusi Pulsa Terpercaya di Lombok_`;

  try {
    const resp = await fetch("https://api.fonnte.com/send", {
      method:  "POST",
      headers: { Authorization: token, "Content-Type": "application/json" },
      body:    JSON.stringify({ target, message }),
    });

    /* Fonnte may return 200 even on error; parse body to confirm */
    const data: { status: boolean; reason?: string; message?: string } = await resp.json();

    if (data.status === true) {
      return { ok: true, message: "OTP berhasil dikirim" };
    }

    const reason = data.reason ?? data.message ?? `HTTP ${resp.status}`;
    return { ok: false, message: `Gagal kirim OTP: ${reason}` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network error";
    return { ok: false, message: `Tidak dapat terhubung ke Fonnte: ${msg}` };
  }
}
