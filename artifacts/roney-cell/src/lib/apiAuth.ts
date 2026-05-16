/* JWT token manager — token disimpan di sessionStorage (bukan localStorage)
   sehingga otomatis terhapus saat tab/browser ditutup. */

const TOKEN_KEY = "roneycell_api_token";

export function getApiToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setApiToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearApiToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getApiToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* Minta JWT dari backend setelah login berhasil via Google Sheets */
export async function fetchApiToken(params: {
  memberId: string;
  phone: string;
  role: "admin" | "member";
  name: string;
}): Promise<void> {
  try {
    const res = await fetch("/api/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { token?: string };
    if (data.token) setApiToken(data.token);
  } catch {
    /* Jika gagal, operasi lain akan mendapat 401 — bisa retry saat itu */
  }
}
