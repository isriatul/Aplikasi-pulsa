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

interface ApiResponse<T = undefined> {
  ok: boolean;
  message?: string;
  user?: SheetUser;
  balance?: number;
  transactions?: SheetTransaction[];
  data?: T;
}

function getUrl(): string {
  return loadConfig().scriptsUrl?.trim() ?? "";
}

/* ── Core fetch helpers ── */

async function apiGet<T = ApiResponse>(
  action: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = getUrl();
  if (!url) throw new Error("URL Apps Script belum dikonfigurasi.");
  const qs = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`${url}?${qs}`, { redirect: "follow" });
  if (!res.ok) throw new Error(`Server error: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function apiPost<T = ApiResponse>(
  action: string,
  data: Record<string, unknown> = {}
): Promise<T> {
  const url = getUrl();
  if (!url) throw new Error("URL Apps Script belum dikonfigurasi.");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...data }),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Server error: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/* ── Auth ── */

export async function loginWithPhone(
  phone: string,
  password: string
): Promise<ApiResponse> {
  const passwordHash = await hashString(password);
  return apiGet("login", {
    method: "phone",
    phone: phone.replace(/\D/g, ""),
    passwordHash,
  });
}

export async function loginByEmail(
  email: string,
  password: string
): Promise<ApiResponse> {
  const passwordHash = await hashString(password);
  return apiGet("login", {
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
  return apiPost("register", {
    name: data.name,
    phone: data.phone ?? "",
    email: data.email ?? "",
    passwordHash,
    txPinHash,
    loginMethod: data.loginMethod,
  });
}

export async function registerFacebook(name: string): Promise<ApiResponse> {
  const fakePhone = "fb" + Date.now();
  const passwordHash = await hashString(fakePhone);
  const txPinHash = await hashString("123456");
  return apiPost("register", {
    name,
    phone: "",
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@facebook.local`,
    passwordHash,
    txPinHash,
    loginMethod: "facebook",
  });
}

/* ── Transaction PIN ── */

export async function verifyTxPin(
  userId: string,
  pin: string
): Promise<ApiResponse> {
  const pinHash = await hashString(pin);
  return apiPost("verifyTxPin", { userId, pinHash });
}

/* ── Balance ── */

export async function getMemberBalance(userId: string): Promise<number> {
  const res = await apiGet<ApiResponse>("getBalance", { userId });
  return res.balance ?? 0;
}

export async function updateMemberBalance(
  userId: string,
  delta: number
): Promise<ApiResponse> {
  return apiPost("updateBalance", { userId, delta });
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
  return apiPost("addTransaction", txn);
}

export async function refundTransaction(
  userId: string,
  phone: string,
  refId: string,
  amount: number
): Promise<ApiResponse> {
  return apiPost("refund", { userId, phone, refId, amount });
}

export async function getMemberTransactions(
  phone: string,
  limit = 20
): Promise<SheetTransaction[]> {
  const res = await apiGet<ApiResponse>("getTransactions", {
    phone: phone.replace(/\D/g, ""),
    limit: String(limit),
  });
  return res.transactions ?? [];
}

/* ── Ping (check if URL is valid) ── */
export async function pingScript(): Promise<boolean> {
  try {
    const res = await apiGet<ApiResponse>("ping");
    return res.ok === true;
  } catch {
    return false;
  }
}
