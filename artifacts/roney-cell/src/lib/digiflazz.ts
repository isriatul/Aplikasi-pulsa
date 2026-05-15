export interface DigiflazzConfig {
  username: string;
  apiKey: string;
}

export interface TransactionResult {
  success: boolean;
  message: string;
  ref_id?: string;
  status?: string;
}

export async function sendTransaction(
  config: DigiflazzConfig,
  customerNo: string,
  productCode: string,
  refId: string
): Promise<TransactionResult> {
  const body = {
    username: config.username,
    buyer_sku_code: productCode,
    customer_no: customerNo,
    ref_id: refId,
    sign: await generateSign(config.username, config.apiKey, refId),
  };

  const res = await fetch("https://api.digiflazz.com/v1/transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  const d = data?.data;

  if (!res.ok || !d) {
    return { success: false, message: data?.message ?? "Transaksi gagal" };
  }

  const status = d.status?.toLowerCase();
  if (status === "sukses" || status === "success") {
    return { success: true, message: "Transaksi berjaya!", ref_id: d.ref_id, status: d.status };
  } else if (status === "pending") {
    return { success: true, message: "Transaksi dalam proses (Pending)", ref_id: d.ref_id, status: d.status };
  } else {
    return { success: false, message: d.message ?? "Transaksi gagal", ref_id: d.ref_id, status: d.status };
  }
}

async function generateSign(username: string, apiKey: string, refId: string): Promise<string> {
  const str = username + apiKey + refId;
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("MD5", msgBuffer).catch(() => null);

  if (!hashBuffer) {
    return md5Fallback(str);
  }

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function md5Fallback(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(32, "0");
}

export function generateRefId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RC${ts}${rand}`;
}
