/**
 * Client API v2 — PostgreSQL backend
 * Semua request otomatis menyertakan JWT dari sessionStorage
 */
import { getAuthHeaders, setApiToken, clearApiToken } from "./apiAuth";

const BASE = "/api/v2";

const RT_KEY = "roneycell_refresh_token_v2";
const AT_KEY = "roneycell_access_token_v2";

export function getV2Token(): string | null {
  return sessionStorage.getItem(AT_KEY);
}
export function setV2Token(t: string) {
  sessionStorage.setItem(AT_KEY, t);
}
export function getV2RefreshToken(): string | null {
  return localStorage.getItem(RT_KEY);
}
export function setV2RefreshToken(t: string) {
  localStorage.setItem(RT_KEY, t);
}
export function clearV2Tokens() {
  sessionStorage.removeItem(AT_KEY);
  localStorage.removeItem(RT_KEY);
}

function headers(extra?: Record<string, string>): Record<string, string> {
  const at = getV2Token();
  return {
    "Content-Type": "application/json",
    ...(at ? { Authorization: `Bearer ${at}` } : {}),
    ...extra,
  };
}

async function tryRefresh(): Promise<boolean> {
  const rt = getV2RefreshToken();
  if (!rt) return false;
  try {
    const r = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!r.ok) { clearV2Tokens(); return false; }
    const d = await r.json() as { accessToken: string; refreshToken: string };
    setV2Token(d.accessToken);
    setV2RefreshToken(d.refreshToken);
    return true;
  } catch { return false; }
}

async function apiFetch<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers as Record<string, string> ?? {}) },
  });
  if (res.status === 401 && retry) {
    const ok = await tryRefresh();
    if (ok) return apiFetch<T>(path, init, false);
    clearV2Tokens();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("v2-session-expired"));
    }
    throw new Error("Sesi habis. Silakan login ulang.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/* ─── Auth ─── */
export async function v2Register(data: { phone: string; name: string; password: string; email?: string }) {
  return apiFetch<{ message: string; userId: number }>("/auth/register", { method: "POST", body: JSON.stringify(data) });
}

export async function v2Login(data: { phone?: string; email?: string; password: string }) {
  const res = await apiFetch<{ accessToken: string; refreshToken: string; user: V2User }>("/auth/login", { method: "POST", body: JSON.stringify(data) });
  setV2Token(res.accessToken);
  setV2RefreshToken(res.refreshToken);
  /* Juga set token lama agar v1 endpoints tetap bekerja */
  setApiToken(res.accessToken);
  return res;
}

export async function v2Logout() {
  try { await apiFetch("/auth/logout", { method: "POST" }); } catch {}
  clearV2Tokens();
  clearApiToken();
}

export async function v2GetProfile() {
  return apiFetch<V2User>("/auth/profile");
}

export async function v2ChangePassword(data: { currentPassword: string; newPassword: string }) {
  return apiFetch<{ message: string }>("/auth/change-password", { method: "POST", body: JSON.stringify(data) });
}

export async function v2ForgotPassword(data: { phone?: string; email?: string }) {
  return apiFetch<{ message: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify(data) });
}

export async function v2ResetPassword(data: { token: string; newPassword: string }) {
  return apiFetch<{ message: string }>("/auth/reset-password", { method: "POST", body: JSON.stringify(data) });
}

/* ─── Balance ─── */
export async function v2GetBalance() {
  return apiFetch<{ balance: number; totalIn: number; totalOut: number }>("/balance");
}
export async function v2GetMutations(page = 1) {
  return apiFetch<{ page: number; limit: number; data: BalanceMutation[] }>(`/balance/mutations?page=${page}`);
}

/* ─── Transactions ─── */
export async function v2GetTransactions(page = 1) {
  return apiFetch<{ page: number; limit: number; data: V2Transaction[] }>(`/transactions?page=${page}`);
}
export async function v2GetTransaction(id: number) {
  return apiFetch<V2Transaction>(`/transactions/${id}`);
}
export async function v2BuyProduct(data: {
  buyer_sku_code: string; customer_no: string; category?: string; selling_price?: number;
}) {
  return apiFetch<{ refId: string; status: string; message?: string; sn?: string }>("/transactions", { method: "POST", body: JSON.stringify(data) });
}

/* ─── Deposits ─── */
export async function v2CreateDeposit(data: { amount: number; method: string; note?: string }) {
  return apiFetch<{ deposit: V2Deposit; instructions: DepositInstructions }>("/deposits", { method: "POST", body: JSON.stringify(data) });
}
export async function v2GetDeposits(page = 1) {
  return apiFetch<{ page: number; limit: number; data: V2Deposit[] }>(`/deposits?page=${page}`);
}
export async function v2UploadDepositProof(
  depositId: number,
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp",
) {
  return apiFetch<{ message: string; imageUrl: string }>(
    `/deposits/${depositId}/upload-proof`,
    { method: "POST", body: JSON.stringify({ imageBase64, mimeType }) },
  );
}

/* ─── Admin ─── */
export async function v2AdminDashboard() {
  return apiFetch<AdminDashboard>("/admin/dashboard");
}
export async function v2AdminUsers(params?: { page?: number; q?: string; status?: string; role?: string }) {
  const qs = new URLSearchParams(params as Record<string,string>).toString();
  return apiFetch<{ page: number; limit: number; data: V2User[] }>(`/admin/users?${qs}`);
}
export async function v2AdminActivateUser(id: number) {
  return apiFetch<{ message: string }>(`/admin/users/${id}/activate`, { method: "POST" });
}
export async function v2AdminSuspendUser(id: number, reason: string) {
  return apiFetch<{ message: string }>(`/admin/users/${id}/suspend`, { method: "POST", body: JSON.stringify({ reason }) });
}
export async function v2AdminTopupUser(id: number, amount: number, note?: string) {
  return apiFetch<{ message: string; mutation: BalanceMutation }>(`/admin/users/${id}/topup`, { method: "POST", body: JSON.stringify({ amount, note }) });
}
export async function v2AdminUpdateUser(id: number, data: { role?: string; status?: string; name?: string }) {
  return apiFetch<V2User>(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
export async function v2AdminTransactions(params?: { page?: number; status?: string }) {
  const qs = new URLSearchParams(params as Record<string,string>).toString();
  return apiFetch<{ page: number; limit: number; data: V2Transaction[] }>(`/admin/transactions?${qs}`);
}
export async function v2AdminResetTransaction(id: number) {
  return apiFetch<{ message: string }>(`/admin/transactions/${id}/reset`, { method: "POST" });
}
export async function v2AdminDeposits(params?: { page?: number; status?: string }) {
  const qs = new URLSearchParams(params as Record<string,string>).toString();
  return apiFetch<{ page: number; limit: number; data: V2Deposit[] }>(`/admin/deposits?${qs}`);
}
export async function v2AdminConfirmDeposit(id: number) {
  return apiFetch<{ message: string }>(`/admin/deposits/${id}/confirm`, { method: "PUT" });
}
export async function v2AdminRejectDeposit(id: number, reason: string) {
  return apiFetch<{ message: string }>(`/admin/deposits/${id}/reject`, { method: "PUT", body: JSON.stringify({ reason }) });
}
export async function v2AdminAuditLog(page = 1) {
  return apiFetch<{ page: number; limit: number; data: AuditLog[] }>(`/admin/audit-log?page=${page}`);
}
export async function v2AdminProducts(params?: { page?: number; q?: string }) {
  const qs = new URLSearchParams(params as Record<string,string>).toString();
  return apiFetch<{ page: number; limit: number; data: V2Product[] }>(`/admin/products?${qs}`);
}
export async function v2AdminAddProduct(data: Partial<V2Product>) {
  return apiFetch<V2Product>("/admin/products", { method: "POST", body: JSON.stringify(data) });
}
export async function v2AdminUpdateProduct(id: number, data: Partial<V2Product>) {
  return apiFetch<V2Product>(`/admin/products/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
export async function v2AdminProviders() {
  return apiFetch<unknown[]>("/admin/providers");
}
export async function v2MonitoringHealth() {
  return apiFetch<MonitoringHealth>("/monitoring/health");
}
export async function v2MonitoringProviders() {
  return apiFetch<{ providers: unknown[] }>("/monitoring/providers");
}

/* ─── Types ─── */
export interface V2User {
  id: number;
  phone: string;
  email?: string;
  name: string;
  role: "superadmin" | "admin" | "reseller" | "member";
  balance: number;
  status: "active" | "suspended" | "pending";
  suspendReason?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface V2Transaction {
  id: number;
  userId: number;
  refId: string;
  productCode: string;
  category: string;
  customerNo: string;
  amount: number;
  sellingPrice: number;
  profit: number;
  status: "pending" | "success" | "failed";
  message?: string;
  sn?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface V2Deposit {
  id: number;
  userId: number;
  amount: number;
  uniqueCode: number;
  totalAmount: number;
  method: string;
  status: "pending" | "paid" | "confirmed" | "failed" | "expired";
  paymentRef?: string;
  proofImageUrl?: string;
  proofUploadedAt?: string;
  note?: string;
  expiredAt?: string;
  paidAt?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DepositInstructions {
  method: string;
  nominalAsli: number;
  kodeUnik: number;
  totalBayar: number;
  ref: string;
  penting: string;
  langkah: string[];
}

export interface BalanceMutation {
  id: number;
  userId: number;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  refId?: string;
  note?: string;
  createdAt: string;
}

export interface V2Product {
  id: number;
  code: string;
  name: string;
  category: string;
  provider?: string;
  basePrice: number;
  memberPrice: number;
  resellerPrice: number;
  adminPrice: number;
  isActive: boolean;
  stock?: string;
}

export interface AuditLog {
  id: number;
  userId?: number;
  action: string;
  entity?: string;
  entityId?: string;
  ip?: string;
  data?: unknown;
  createdAt: string;
}

export interface AdminDashboard {
  users: { total: number; active: number; pending: number };
  transactions: { today: number; todaySuccess: number; pending: number };
  finance: { revenueToday: number; totalUserBalance: number; pendingDeposits: number };
  charts: {
    txByDay: { date: string; count: number; revenue: number }[];
    topProducts: { productCode: string; count: number; revenue: number }[];
  };
}

export interface MonitoringHealth {
  status: string;
  timestamp: string;
  uptime: number;
  db: { ok: boolean; latencyMs: number };
  memory: { heapUsedMB: number; heapTotalMB: number };
}

export function formatRp(n: number): string {
  return "Rp" + n.toLocaleString("id-ID");
}
