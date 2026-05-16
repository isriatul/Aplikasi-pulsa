/* Semua panggilan Digiflazz dirutekan melalui backend (/api/digiflazz/*)
   agar kredensial tetap aman di server dan IP Whitelist konsisten. */

export interface TransactionResult {
  success: boolean;
  message: string;
  ref_id?: string;
  status?: string;
}

/* Kirim transaksi pulsa/data/PLN melalui backend */
export async function sendTransaction(
  customerNo: string,
  productCode: string,
  refId: string,
): Promise<TransactionResult> {
  const res = await fetch("/api/digiflazz/topup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      buyer_sku_code: productCode,
      customer_no: customerNo,
      ref_id: refId,
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
    const res = await fetch("/api/digiflazz/balance");
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

/* Generate Ref ID unik untuk setiap transaksi */
export function generateRefId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RC${ts}${rand}`;
}
