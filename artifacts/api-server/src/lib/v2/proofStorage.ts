/**
 * Penyimpanan lokal untuk foto bukti deposit.
 * File disimpan di ./uploads/proofs/ dan diakses via /api/v2/uploads/:filename
 */
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { logger } from "../logger.js";

const UPLOAD_DIR = join(process.cwd(), "uploads", "proofs");
const MAX_SIZE_BYTES = 4 * 1024 * 1024; /* 4MB base64 ~ 3MB gambar asli */

/** Pastikan direktori upload ada */
async function ensureDir(): Promise<void> {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

/** Simpan gambar base64 ke disk, return URL publik relatif */
export async function saveProofImage(
  depositId: number,
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp",
): Promise<string> {
  await ensureDir();

  /* Validasi ukuran */
  if (imageBase64.length > MAX_SIZE_BYTES) {
    throw new Error("Ukuran gambar terlalu besar (max 3MB)");
  }

  /* Strip data URI header jika ada: "data:image/jpeg;base64,..." */
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Data, "base64");
  } catch {
    throw new Error("Format gambar tidak valid");
  }

  /* Validasi magic bytes (JPEG / PNG / WebP) */
  if (!isValidImage(buffer, mimeType)) {
    throw new Error("File bukan gambar yang valid");
  }

  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const filename = `proof-${depositId}-${randomBytes(8).toString("hex")}.${ext}`;
  const filepath = join(UPLOAD_DIR, filename);

  await writeFile(filepath, buffer);
  logger.info({ depositId, filename, size: buffer.length }, "Proof image saved");

  return `/api/v2/uploads/${filename}`;
}

function isValidImage(buf: Buffer, mimeType: string): boolean {
  if (buf.length < 4) return false;
  if (mimeType === "image/jpeg") {
    return buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
  }
  if (mimeType === "image/png") {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
  }
  if (mimeType === "image/webp") {
    return buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP";
  }
  return false;
}
