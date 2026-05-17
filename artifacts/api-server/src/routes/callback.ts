/* Webhook callback dari Digiflazz — dipanggil saat status transaksi berubah.
   Endpoint ini WAJIB memverifikasi signature sebelum memproses data apapun. */

import { Router, type IRouter } from "express";
import { createHash } from "crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db";
import { creditBalance } from "../lib/v2/balanceService.js";
import { saveIdempotentResult } from "../lib/idempotency.js";
import { cancelPendingRetry } from "../lib/pendingRetry.js";
import { logger } from "../lib/logger.js";
import { safeZodErrors } from "../lib/sanitize.js";

const router: IRouter = Router();

const CallbackSchema = z.object({
  ref_id: z.string().min(1).max(60),
  buyer_sku_code: z.string().min(1).max(50),
  customer_no: z.string().min(1).max(20),
  status: z.string().min(1).max(30),
  message: z.string().max(500).optional(),
  sn: z.string().max(200).optional(),
  sign: z.string().length(32, "Signature MD5 harus 32 karakter"),
});

function md5(str: string): string {
  return createHash("md5").update(str).digest("hex");
}

function verifyCallbackSignature(sign: string, refId: string): boolean {
  const username = process.env["DIGIFLAZZ_USERNAME"];
  const apiKey = process.env["DIGIFLAZZ_KEY"];
  if (!username || !apiKey) return false;
  const expected = md5(username + apiKey + refId);
  /* Constant-time comparison untuk cegah timing attack */
  if (expected.length !== sign.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sign.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Update v2 transactionsTable berdasarkan callback Digiflazz.
 * Hanya memproses transaksi yang masih "pending" untuk menghindari double-processing.
 * Refund saldo otomatis jika transaksi gagal dan saldo sudah didebit.
 */
async function processV2Callback(
  refId: string,
  isSuccess: boolean,
  isFailed: boolean,
  message: string | undefined,
  sn: string | undefined,
): Promise<void> {
  /* Hanya proses ref_id milik v2 (prefix "RC-") */
  if (!refId.startsWith("RC-")) return;

  const [tx] = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.refId, refId))
    .limit(1);

  if (!tx) {
    logger.warn({ refId }, "Callback v2: transaksi tidak ditemukan di DB");
    return;
  }

  /* Hanya proses jika masih pending — hindari double-processing */
  if (tx.status !== "pending") {
    logger.info({ refId, currentStatus: tx.status }, "Callback v2: transaksi sudah final, skip");
    return;
  }

  const finalStatus = isSuccess ? "success" : isFailed ? "failed" : "pending";

  await db.update(transactionsTable).set({
    status: finalStatus,
    message: message ?? tx.message,
    sn: sn ?? tx.sn,
    updatedAt: new Date(),
  }).where(eq(transactionsTable.id, tx.id));

  logger.info({ refId, finalStatus }, "Callback v2: status transaksi diperbarui");

  /* Refund saldo jika gagal dan saldo sudah didebit sebelumnya */
  if (isFailed && tx.amount > 0) {
    try {
      await creditBalance({
        userId: tx.userId,
        type: "refund",
        amount: tx.amount,
        refId: tx.refId,
        note: `Refund callback — ${tx.productCode} gagal`,
      });
      logger.info({ refId, userId: tx.userId, amount: tx.amount }, "Callback v2: saldo berhasil di-refund");
    } catch (err) {
      logger.error({ err, refId, userId: tx.userId }, "Callback v2: GAGAL refund saldo");
    }
  }
}

/* POST /api/callback/digiflazz — Webhook dari Digiflazz */
router.post("/callback/digiflazz", async (req, res) => {
  const parsed = CallbackSchema.safeParse(req.body);
  if (!parsed.success) {
    logger.warn({ count: parsed.error.issues.length }, "Callback: invalid payload");
    res.status(400).json({ error: "Payload tidak valid", details: safeZodErrors(parsed.error.issues) });
    return;
  }

  const { ref_id, buyer_sku_code, customer_no, status, message, sn, sign } = parsed.data;

  /* Verifikasi signature — tolak jika tidak cocok */
  if (!verifyCallbackSignature(sign, ref_id)) {
    logger.warn({ ref_id }, "Callback: signature verification FAILED");
    res.status(401).json({ error: "Signature tidak valid" });
    return;
  }

  const statusLow = status.toLowerCase();
  const isSuccess = statusLow === "sukses" || statusLow === "success";
  const isFailed = statusLow === "gagal" || statusLow === "failed";
  const isFinal = isSuccess || isFailed;

  logger.info({ ref_id, status, buyer_sku_code, customer_no, sn }, "Callback received");

  if (isFinal) {
    const txStatus = isSuccess ? "success" : "failed";
    saveIdempotentResult(ref_id, { data: { ref_id, buyer_sku_code, customer_no, status, message, sn } }, txStatus);
    cancelPendingRetry(ref_id);
  }

  /* ── v2: Update PostgreSQL transactionsTable ── */
  try {
    await processV2Callback(ref_id, isSuccess, isFailed, message, sn);
  } catch (err) {
    /* Jangan gagalkan response ke Digiflazz karena error DB internal */
    logger.error({ err, ref_id }, "Callback v2: error update DB (non-fatal)");
  }

  res.json({ received: true, ref_id });
});

export default router;
