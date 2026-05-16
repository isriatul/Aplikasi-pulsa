/* Webhook callback dari Digiflazz — dipanggil saat status transaksi berubah.
   Endpoint ini WAJIB memverifikasi signature sebelum memproses data apapun. */

import { Router, type IRouter } from "express";
import { createHash } from "crypto";
import { z } from "zod";
import { appendTxLog } from "../lib/txLog.js";
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

/* POST /api/callback/digiflazz — Webhook dari Digiflazz */
router.post("/callback/digiflazz", (req, res) => {
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
  const isFinal = statusLow === "sukses" || statusLow === "success" || statusLow === "gagal" || statusLow === "failed";

  logger.info({ ref_id, status, buyer_sku_code, customer_no, sn }, "Callback received");

  appendTxLog({
    memberId: "CALLBACK",
    phone: "CALLBACK",
    memberPhone: customer_no,
    role: "system",
    refId: ref_id,
    productCode: buyer_sku_code,
    customerNo: customer_no,
    status: statusLow === "sukses" || statusLow === "success" ? "success" : "failed",
    message: message ?? `Callback: ${status}`,
    ip: "digiflazz-server",
    userAgent: "Digiflazz-Callback",
  });

  if (isFinal) {
    const txStatus = statusLow === "sukses" || statusLow === "success" ? "success" : "failed";
    saveIdempotentResult(ref_id, { data: { ref_id, buyer_sku_code, customer_no, status, message, sn } }, txStatus);
    cancelPendingRetry(ref_id);
  }

  res.json({ received: true, ref_id });
});

export default router;
