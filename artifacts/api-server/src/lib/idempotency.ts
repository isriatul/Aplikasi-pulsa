/* Idempotency store — mencegah transaksi diproses dua kali
   jika client mengirim request duplikat dengan ref_id yang sama.
   Hasil transaksi disimpan selama 24 jam. */

interface IdempotencyEntry {
  result: unknown;
  status: "pending" | "success" | "failed";
  timestamp: number;
}

const TTL_MS = 24 * 60 * 60 * 1_000; // 24 jam
const store = new Map<string, IdempotencyEntry>();

/** Cek apakah ref_id pernah diproses sebelumnya. */
export function getIdempotentResult(refId: string): IdempotencyEntry | null {
  const entry = store.get(refId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TTL_MS) {
    store.delete(refId);
    return null;
  }
  return entry;
}

/** Simpan hasil transaksi agar dapat dikembalikan jika ada request duplikat. */
export function saveIdempotentResult(
  refId: string,
  result: unknown,
  status: IdempotencyEntry["status"],
): void {
  store.set(refId, { result, status, timestamp: Date.now() });
}

/** Tandai ref_id sebagai sedang diproses (status pending). */
export function markIdempotentPending(refId: string): void {
  store.set(refId, { result: null, status: "pending", timestamp: Date.now() });
}

/** Hapus entry (misal: transaksi dibatalkan). */
export function clearIdempotent(refId: string): void {
  store.delete(refId);
}

/** Statistik store */
export function getIdempotencyStats(): { total: number; pending: number; success: number; failed: number } {
  const entries = [...store.values()];
  return {
    total: entries.length,
    pending: entries.filter((e) => e.status === "pending").length,
    success: entries.filter((e) => e.status === "success").length,
    failed: entries.filter((e) => e.status === "failed").length,
  };
}

/* Bersihkan entri kadaluarsa setiap jam */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.timestamp > TTL_MS) store.delete(key);
  }
}, 60 * 60 * 1_000);
