/* Semua panggilan Digiflazz dirutekan melalui backend (/api/digiflazz/*)
   agar kredensial tetap aman di server dan IP Whitelist konsisten.
   Setiap request dilindungi JWT Bearer token. */

import { getAuthHeaders } from "./apiAuth";

export interface TransactionResult {
  success: boolean;
  message: string;
  ref_id?: string;
  status?: string;
}

/* Kirim transaksi pulsa/data/PLN melalui backend.
   declared_price dan declared_balance dikirim untuk validasi anti-saldo-minus di server. */
export async function sendTransaction(
  customerNo: string,
  productCode: string,
  refId: string,
  declaredPrice?: number,
  declaredBalance?: number,
): Promise<TransactionResult> {
  const res = await fetch("/api/digiflazz/topup", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({
      buyer_sku_code: productCode,
      customer_no: customerNo,
      ref_id: refId,
      ...(declaredPrice !== undefined ? { declared_price: declaredPrice } : {}),
      ...(declaredBalance !== undefined ? { declared_balance: declaredBalance } : {}),
    }),
  });

  const data = (await res.json()) as {
    data?: { status?: string; message?: string; ref_id?: string };
    error?: string;
    message?: string;
  };
  const d = data?.data;

  if (!res.ok || !d) {
    return { success: false, message: data?.error ?? data?.message ?? "Transaksi gagal" };
  }

  const status = d.status?.toLowerCase();
  if (status === "sukses" || status === "success") {
    return { success: true, message: "Transaksi berhasil!", ref_id: d.ref_id, status: d.status };
  } else if (status === "pending") {
    return {
      success: true,
      message: "Transaksi dalam proses (Pending)",
      ref_id: d.ref_id,
      status: d.status,
    };
  }
  return {
    success: false,
    message: d.message ?? "Transaksi gagal",
    ref_id: d.ref_id,
    status: d.status,
  };
}

/* Ambil IP publik server (untuk Whitelist Digiflazz) */
export async function getServerIp(): Promise<string> {
  try {
    const res = await fetch("/api/digiflazz/ip");
    if (!res.ok) return "Tidak tersedia";
    const data = (await res.json()) as { ip?: string };
    return data.ip ?? "Tidak tersedia";
  } catch {
    return "Tidak tersedia";
  }
}

/* Cek saldo deposit Digiflazz */
export async function checkDigiflazzBalance(): Promise<{
  balance: number;
  error?: string;
}> {
  try {
    const res = await fetch("/api/digiflazz/balance", {
      headers: getAuthHeaders(),
    });
    const data = (await res.json()) as {
      data?: { deposit?: number };
      error?: string;
    };
    if (!res.ok) return { balance: 0, error: data?.error ?? "Gagal" };
    return { balance: data?.data?.deposit ?? 0 };
  } catch {
    return { balance: 0, error: "Tidak dapat terhubung ke server" };
  }
}

export interface TestTransactionResult {
  ref_id: string;
  payload_sent: {
    buyer_sku_code: string;
    customer_no: string;
    ref_id: string;
    testing: boolean;
  };
  result: {
    data?: {
      ref_id?: string;
      customer_no?: string;
      buyer_sku_code?: string;
      status?: string;
      message?: string;
      sn?: string;
      price?: number;
      tele?: string;
    };
    error?: string;
  };
  error?: string;
}

/* Simulasi transaksi (testing: true — tidak motong saldo Digiflazz) */
export async function sendTestTransaction(
  customerNo: string,
  productCode: string,
): Promise<TestTransactionResult> {
  const res = await fetch("/api/digiflazz/test", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ buyer_sku_code: productCode, customer_no: customerNo }),
  });
  const data = (await res.json()) as TestTransactionResult & { error?: string };
  if (!res.ok) {
    return {
      ref_id: "-",
      payload_sent: { buyer_sku_code: productCode, customer_no: customerNo, ref_id: "-", testing: true },
      result: {},
      error: data.error ?? "Test gagal",
    };
  }
  return data;
}

/* Generate Ref ID unik untuk setiap transaksi */
export function generateRefId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RC${ts}${rand}`;
}
