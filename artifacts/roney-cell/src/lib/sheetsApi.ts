import { loadConfig } from "./config";

/* ── SHA-256 via Web Crypto API (matches Apps Script output) ── */
export async function hashString(str: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(str));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ── Types ── */
export interface SheetUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: "admin" | "member" | "reseller";
  status: "pending" | "active" | "rejected";
  balance: number;
  type: "member" | "reseller";
  loginMethod: "phone" | "email" | "facebook";
  createdAt: string;
}

export interface SheetTransaction {
  refId: string;
  phone: string;
  product: string;
  category: string;
  amount: number;
  basePrice: number;
  profit: number;
  status: "success" | "failed" | "refunded";
  date: string;
  note: string;
}

interface ApiResponse {
  ok: boolean;
  message?: string;
  user?: SheetUser;
  balance?: number;
  transactions?: SheetTransaction[];
}

function getUrl(): string {
  return loadConfig().scriptsUrl?.trim() ?? "";
}

/* ─────────────────────────────────────────────────────────────
   ALL requests use GET with URLSearchParams.
   Reason: Apps Script exec URL redirects (302) which causes
   POST bodies to be lost by browsers following CORS rules.
   GET requests follow redirects correctly with no data loss.
───────────────────────────────────────────────────────────── */
async function api(params: Record<string, string>): Promise<ApiResponse> {
  const url = getUrl();
  if (!url) throw new Error("URL Apps Script belum dikonfigurasi.");

  const qs = new URLSearchParams(params).toString();
  const fullUrl = `${url}?${qs}`;

  try {
    const res = await fetch(fullUrl, {
      method: "GET",
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`Server error: HTTP ${res.status}`);
    const data = await res.json() as ApiResponse;
    return data;
  } catch (err: unknown) {
    if (err instanceof TypeError && String(err.message).includes("fetch")) {
      throw new Error("Tidak bisa terhubung ke Apps Script. Periksa URL dan pastikan 'Who has access: Anyone'.");
    }
    throw err;
  }
}

/* ── Auth ── */

export async function loginWithPhone(phone: string, password: string): Promise<ApiResponse> {
  const passwordHash = await hashString(password);
  return api({
    action: "login",
    method: "phone",
    phone: phone.replace(/\D/g, ""),
    passwordHash,
  });
}

export async function loginByEmail(email: string, password: string): Promise<ApiResponse> {
  const passwordHash = await hashString(password);
  return api({
    action: "login",
    method: "email",
    email: email.toLowerCase().trim(),
    passwordHash,
  });
}

export async function registerUser(data: {
  name: string;
  phone?: string;
  email?: string;
  password: string;
  txPin: string;
  loginMethod: "phone" | "email" | "facebook";
}): Promise<ApiResponse> {
  const passwordHash = await hashString(data.password);
  const txPinHash = await hashString(data.txPin);
  return api({
    action: "register",
    name: data.name,
    phone: data.phone ?? "",
    email: data.email ?? "",
    passwordHash,
    txPinHash,
    loginMethod: data.loginMethod,
  });
}

export async function registerFacebook(name: string): Promise<ApiResponse> {
  const uid = "fb" + Date.now();
  const passwordHash = await hashString(uid);
  const txPinHash = await hashString("123456");
  return api({
    action: "register",
    name,
    phone: "",
    email: `${name.toLowerCase().replace(/\s+/g, ".")}${Date.now()}@fb.local`,
    passwordHash,
    txPinHash,
    loginMethod: "facebook",
  });
}

/* ── Transaction PIN ── */
export async function verifyTxPin(userId: string, pin: string): Promise<ApiResponse> {
  const pinHash = await hashString(pin);
  return api({ action: "verifyTxPin", userId, pinHash });
}

/* ── Balance ── */
export async function getMemberBalance(userId: string): Promise<number> {
  const res = await api({ action: "getBalance", userId });
  return res.balance ?? 0;
}

export async function updateMemberBalance(userId: string, delta: number): Promise<ApiResponse> {
  return api({ action: "updateBalance", userId, delta: String(delta) });
}

/* ── Transactions ── */
export async function addTransactionToSheets(txn: {
  refId: string;
  phone: string;
  product: string;
  category: string;
  amount: number;
  basePrice: number;
  profit: number;
  status: "success" | "failed";
  date: string;
  note?: string;
}): Promise<ApiResponse> {
  return api({
    action: "addTransaction",
    refId: txn.refId,
    phone: txn.phone,
    product: txn.product,
    category: txn.category,
    amount: String(txn.amount),
    basePrice: String(txn.basePrice),
    profit: String(txn.profit),
    status: txn.status,
    date: txn.date,
    note: txn.note ?? "",
  });
}

export async function refundTransaction(
  userId: string,
  phone: string,
  refId: string,
  amount: number
): Promise<ApiResponse> {
  return api({ action: "refund", userId, phone, refId, amount: String(amount) });
}

export async function getMemberTransactions(phone: string, limit = 20): Promise<SheetTransaction[]> {
  const res = await api({
    action: "getTransactions",
    phone: phone.replace(/\D/g, ""),
    limit: String(limit),
  });
  return res.transactions ?? [];
}

/* ── Ping ── */
export async function pingScript(): Promise<boolean> {
  try {
    const res = await api({ action: "ping" });
    return res.ok === true;
  } catch {
    return false;
  }
}
