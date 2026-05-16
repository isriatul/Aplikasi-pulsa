/* Sistem retry otomatis untuk transaksi dengan status PENDING.
   Digiflazz kadang mengembalikan "pending" — perlu dicek ulang secara berkala. */

import { createHash } from "crypto";
import { logger } from "./logger.js";
import { saveIdempotentResult } from "./idempotency.js";
import { appendTxLog } from "./txLog.js";

interface PendingTx {
  refId: string;
  buyer_sku_code: string;
  customer_no: string;
  memberId: string;
  memberPhone: string;
  role: string;
  ip: string;
  attempts: number;
  registeredAt: number;
  nextCheckAt: number;
}

const MAX_ATTEMPTS = 5;
const RETRY_INTERVALS_MS = [
  2 * 60_000,   // 2 menit
  5 * 60_000,   // 5 menit
  10 * 60_000,  // 10 menit
  20 * 60_000,  // 20 menit
  30 * 60_000,  // 30 menit
];
const MAX_AGE_MS = 90 * 60_000; // Drop setelah 90 menit
const DG_BASE = "https://api.digiflazz.com/v1";

const queue = new Map<string, PendingTx>();

function md5(str: string): string {
  return createHash("md5").update(str).digest("hex");
}

/** Daftarkan transaksi pending untuk di-retry otomatis. */
export function registerPendingRetry(tx: Omit<PendingTx, "attempts" | "registeredAt" | "nextCheckAt">): void {
  const now = Date.now();
  queue.set(tx.refId, {
    ...tx,
    attempts: 0,
    registeredAt: now,
    nextCheckAt: now + (RETRY_INTERVALS_MS[0] ?? 120_000),
  });
  logger.info({ refId: tx.refId }, "Pending transaction registered for retry");
}

/** Hapus dari antrian retry (misal: sudah dikonfirmasi via callback). */
export function cancelPendingRetry(refId: string): void {
  queue.delete(refId);
}

/** Kembalikan semua transaksi yang sedang di-queue retry. */
export function getPendingRetryQueue(): PendingTx[] {
  return [...queue.values()];
}

async function checkOnePending(tx: PendingTx): Promise<void> {
  const username = process.env["DIGIFLAZZ_USERNAME"];
  const apiKey = process.env["DIGIFLAZZ_KEY"];
  if (!username || !apiKey) return;

  try {
    const sign = md5(username + apiKey + tx.refId);
    const res = await fetch(`${DG_BASE}/transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, buyer_sku_code: tx.buyer_sku_code, customer_no: tx.customer_no, ref_id: tx.refId, sign }),
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json()) as { data?: { status?: string; message?: string } };
    const statusRaw = data?.data?.status?.toLowerCase() ?? "";

    if (statusRaw === "sukses" || statusRaw === "success") {
      saveIdempotentResult(tx.refId, data, "success");
      appendTxLog({
        memberId: tx.memberId, phone: tx.memberPhone, memberPhone: tx.customer_no,
        role: tx.role, refId: tx.refId, productCode: tx.buyer_sku_code,
        customerNo: tx.customer_no, status: "success",
        message: `Retry #${tx.attempts + 1}: sukses`, ip: tx.ip,
      });
      queue.delete(tx.refId);
      logger.info({ refId: tx.refId, attempt: tx.attempts + 1 }, "Pending tx resolved as success");
    } else if (statusRaw === "gagal" || statusRaw === "failed") {
      saveIdempotentResult(tx.refId, data, "failed");
      appendTxLog({
        memberId: tx.memberId, phone: tx.memberPhone, memberPhone: tx.customer_no,
        role: tx.role, refId: tx.refId, productCode: tx.buyer_sku_code,
        customerNo: tx.customer_no, status: "failed",
        message: `Retry #${tx.attempts + 1}: gagal`, ip: tx.ip,
      });
      queue.delete(tx.refId);
      logger.info({ refId: tx.refId }, "Pending tx resolved as failed");
    } else {
      /* Masih pending — jadwalkan retry berikutnya */
      const nextIdx = Math.min(tx.attempts + 1, RETRY_INTERVALS_MS.length - 1);
      queue.set(tx.refId, {
        ...tx,
        attempts: tx.attempts + 1,
        nextCheckAt: Date.now() + (RETRY_INTERVALS_MS[nextIdx] ?? 30 * 60_000),
      });
    }
  } catch (err) {
    logger.warn({ err, refId: tx.refId }, "Pending retry check failed");
  }
}

/* Jalankan pengecekan setiap menit */
setInterval(() => {
  const now = Date.now();
  for (const tx of queue.values()) {
    /* Drop transaksi yang sudah terlalu lama */
    if (now - tx.registeredAt > MAX_AGE_MS || tx.attempts >= MAX_ATTEMPTS) {
      logger.warn({ refId: tx.refId, attempts: tx.attempts }, "Pending tx dropped from retry queue");
      appendTxLog({
        memberId: tx.memberId, phone: tx.memberPhone, memberPhone: tx.customer_no,
        role: tx.role, refId: tx.refId, productCode: tx.buyer_sku_code,
        customerNo: tx.customer_no, status: "failed",
        message: "Retry habis — status tidak diketahui", ip: tx.ip,
      });
      queue.delete(tx.refId);
      continue;
    }
    if (now >= tx.nextCheckAt) {
      void checkOnePending(tx);
    }
  }
}, 60_000);
