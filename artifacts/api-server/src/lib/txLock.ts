/* Anti-double transaction: in-memory lock per ref_id dengan TTL otomatis.
   Setiap lock membawa metadata untuk keperluan audit dan monitoring. */

interface LockEntry {
  acquiredAt: number;
  memberId: string;
}

const TTL_MS = 120_000; // 2 menit
const activeLocks = new Map<string, LockEntry>();

/** Coba akuisisi lock. Kembalikan false jika sudah terkunci. */
export function acquireLock(refId: string, memberId = "unknown"): boolean {
  const now = Date.now();
  const existing = activeLocks.get(refId);
  if (existing && now - existing.acquiredAt < TTL_MS) return false;
  activeLocks.set(refId, { acquiredAt: now, memberId });
  return true;
}

/** Lepas lock setelah transaksi selesai. */
export function releaseLock(refId: string): void {
  activeLocks.delete(refId);
}

/** Cek apakah ref_id sedang dikunci tanpa mengakuisisi. */
export function isLocked(refId: string): boolean {
  const entry = activeLocks.get(refId);
  if (!entry) return false;
  if (Date.now() - entry.acquiredAt >= TTL_MS) {
    activeLocks.delete(refId);
    return false;
  }
  return true;
}

/** Statistik lock aktif */
export function getLockStats(): { active: number; ids: string[] } {
  pruneExpired();
  return {
    active: activeLocks.size,
    ids: [...activeLocks.keys()],
  };
}

/** Hapus semua lock kadaluarsa dan kembalikan jumlah yang dihapus. */
export function pruneExpired(): number {
  const now = Date.now();
  let pruned = 0;
  for (const [key, entry] of activeLocks.entries()) {
    if (now - entry.acquiredAt >= TTL_MS) {
      activeLocks.delete(key);
      pruned++;
    }
  }
  return pruned;
}

/* Auto-cleanup setiap 2 menit — sama dengan TTL lock */
setInterval(() => {
  const pruned = pruneExpired();
  if (pruned > 0) {
    /* Tidak bisa import logger di sini karena circular, gunakan console sebagai fallback */
    console.info(`[txLock] Auto-pruned ${pruned} expired lock(s)`);
  }
}, 120_000);
