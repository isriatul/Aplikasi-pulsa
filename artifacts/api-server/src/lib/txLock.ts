/* Anti-double transaction: in-memory lock set per ref_id (TTL 2 menit) */

const activeLocks = new Map<string, number>();
const TTL_MS = 120_000;

export function acquireLock(refId: string): boolean {
  const now = Date.now();
  const existing = activeLocks.get(refId);
  if (existing && now - existing < TTL_MS) return false;
  activeLocks.set(refId, now);
  return true;
}

export function releaseLock(refId: string): void {
  activeLocks.delete(refId);
}

export function isLocked(refId: string): boolean {
  const ts = activeLocks.get(refId);
  if (!ts) return false;
  if (Date.now() - ts >= TTL_MS) {
    activeLocks.delete(refId);
    return false;
  }
  return true;
}

/* Bersihkan lock kadaluarsa setiap 5 menit */
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of activeLocks.entries()) {
    if (now - ts >= TTL_MS) activeLocks.delete(key);
  }
}, 300_000);
