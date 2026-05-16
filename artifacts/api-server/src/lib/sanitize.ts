/* Utilitas sanitasi response — pastikan data sensitif tidak bocor ke client */

import type { ZodIssue } from "zod";

/** Ubah Zod issues menjadi pesan error yang aman (hanya path + pesan, tanpa kode internal) */
export function safeZodErrors(issues: ZodIssue[]): Array<{ field: string; message: string }> {
  return issues.map((issue) => ({
    field: issue.path.join(".") || "input",
    message: issue.message,
  }));
}

/** Strip field sensitif dari response Digiflazz sebelum dikirim ke client */
export function sanitizeDigiflazzResponse(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;

  const SENSITIVE_KEYS = new Set([
    "username", "sign", "api_key", "apiKey", "password",
    "secret", "token", "key", "credential",
  ]);

  function stripDeep(obj: unknown): unknown {
    if (Array.isArray(obj)) return obj.map(stripDeep);
    if (obj && typeof obj === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        if (!SENSITIVE_KEYS.has(k.toLowerCase())) {
          out[k] = stripDeep(v);
        }
      }
      return out;
    }
    return obj;
  }

  return stripDeep(raw);
}

/** Buat response error yang aman — tidak bocorkan stack/detail internal */
export function safeErrorResponse(message: string): { error: string } {
  return { error: message };
}
