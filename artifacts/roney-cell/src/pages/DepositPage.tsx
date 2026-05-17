/**
 * Halaman Deposit — sistem kode unik QRIS statis
 * - User pilih nominal + metode
 * - Sistem buat deposit dengan kode unik 3 digit
 * - Tampilkan instruksi bayar + QR code
 * - User upload foto bukti → notif admin
 */
import { useState, useRef, useCallback } from "react";
import { loadConfig } from "@/lib/config";
import { formatRupiah } from "@/lib/products";
import {
  v2CreateDeposit,
  v2GetDeposits,
  v2UploadDepositProof,
  type V2Deposit,
} from "@/lib/apiV2";

const PRESET_AMOUNTS = [50_000, 100_000, 200_000, 500_000, 1_000_000];
const DEFAULT_QRIS_URL = "/qris.jpeg";

/* ─── Helpers UI ─── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
      style={copied
        ? { background: "rgba(16,185,129,0.15)", color: "#34D399" }
        : { background: "rgba(59,130,246,0.1)", color: "#60A5FA" }}
    >
      {copied
        ? <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Disalin</>
        : <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Salin</>}
    </button>
  );
}

function StatusBadge({ status }: { status: V2Deposit["status"] }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: "rgba(245,158,11,0.15)", color: "#FCD34D", label: "Menunggu Bayar" },
    paid: { bg: "rgba(59,130,246,0.15)", color: "#93C5FD", label: "Bukti Terkirim" },
    confirmed: { bg: "rgba(16,185,129,0.15)", color: "#6EE7B7", label: "Dikonfirmasi ✓" },
    failed: { bg: "rgba(239,68,68,0.15)", color: "#FCA5A5", label: "Ditolak" },
    expired: { bg: "rgba(107,114,128,0.15)", color: "#9CA3AF", label: "Kedaluwarsa" },
  };
  const s = map[status] ?? map["pending"]!;
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

/* ─── Komponen: Form Upload Bukti ─── */
function UploadProofForm({ deposit, onSuccess }: { deposit: V2Deposit; onSuccess: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<"image/jpeg" | "image/png" | "image/webp">("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Format tidak didukung. Gunakan JPG, PNG, atau WebP.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Ukuran file terlalu besar (max 3MB).");
      return;
    }
    setError("");
    setMimeType(file.type as "image/jpeg" | "image/png" | "image/webp");
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleUpload() {
    if (!preview) return;
    setLoading(true);
    setError("");
    try {
      await v2UploadDepositProof(deposit.id, preview, mimeType);
      setDone(true);
      setTimeout(onSuccess, 1500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl p-4 text-center" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
        <div className="text-2xl mb-2">✅</div>
        <p className="text-sm font-bold text-emerald-400">Bukti berhasil dikirim!</p>
        <p className="text-xs text-muted-foreground mt-1">Menunggu konfirmasi admin...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Upload Bukti Pembayaran</p>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        className="rounded-xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center py-6 gap-2"
        style={{ borderColor: preview ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.15)", background: preview ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.02)" }}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="max-h-48 rounded-lg object-contain" />
        ) : (
          <>
            <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs text-muted-foreground">Ketuk untuk pilih foto struk</p>
            <p className="text-[10px] text-muted-foreground/60">JPG / PNG / WebP · max 3MB</p>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />

      {error && <p className="text-xs text-red-400">{error}</p>}

      {preview && (
        <div className="flex gap-2">
          <button
            onClick={() => { setPreview(null); if (inputRef.current) inputRef.current.value = ""; }}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-white/10 text-white/60 hover:bg-white/5"
          >
            Ganti Foto
          </button>
          <button
            onClick={() => void handleUpload()}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-opacity"
            style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}
          >
            {loading ? "Mengirim..." : "Kirim Bukti"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Komponen: Card Deposit Aktif ─── */
function ActiveDepositCard({ deposit, qrisImageSrc, onProofUploaded }: {
  deposit: V2Deposit;
  qrisImageSrc: string;
  onProofUploaded: () => void;
}) {
  const expiredAt = deposit.expiredAt ? new Date(deposit.expiredAt) : null;
  const isExpired = expiredAt ? expiredAt < new Date() : false;
  const totalAmount = deposit.totalAmount ?? deposit.amount;
  const uniqueCode = deposit.uniqueCode ?? 0;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.05)" }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ background: "rgba(168,85,247,0.1)" }}>
        <div>
          <p className="text-xs text-purple-300 font-semibold tracking-wider uppercase">Deposit Aktif</p>
          <p className="font-mono text-xs text-white/50 mt-0.5">{deposit.paymentRef}</p>
        </div>
        <StatusBadge status={isExpired ? "expired" : deposit.status} />
      </div>

      <div className="px-5 pb-5 pt-4 space-y-4">
        {/* Nominal */}
        <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Nominal deposit</span>
            <span className="text-sm font-semibold text-white">{formatRupiah(deposit.amount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Kode unik</span>
            <span className="text-sm font-semibold text-amber-400">+{uniqueCode}</span>
          </div>
          <div className="h-px bg-white/10" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">TOTAL BAYAR</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-emerald-400">{formatRupiah(totalAmount)}</span>
              <CopyButton text={String(totalAmount)} />
            </div>
          </div>
          <p className="text-[10px] text-amber-300/80 mt-1">
            ⚠️ Bayar TEPAT {formatRupiah(totalAmount)} agar teridentifikasi otomatis
          </p>
        </div>

        {/* QR Code + instruksi */}
        {deposit.status === "pending" && !isExpired && (
          <>
            <div className="text-center">
              <img
                src={qrisImageSrc}
                alt="QRIS RoneyCell"
                className="w-full max-w-[240px] mx-auto rounded-2xl block"
                style={{ border: "1px solid rgba(168,85,247,0.25)", boxShadow: "0 8px 32px rgba(168,85,247,0.15)" }}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Scan QRIS · Masukkan nominal <span className="font-bold text-emerald-400">{formatRupiah(totalAmount)}</span>
              </p>
            </div>

            {/* Timer kedaluwarsa */}
            {expiredAt && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-amber-300">Berlaku sampai {expiredAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            )}

            {/* Upload bukti */}
            <UploadProofForm deposit={deposit} onSuccess={onProofUploaded} />
          </>
        )}

        {/* Sudah upload bukti */}
        {deposit.status === "paid" && (
          <div className="rounded-xl p-4 text-center" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <p className="text-sm font-bold text-blue-300">📸 Bukti sudah dikirim</p>
            <p className="text-xs text-muted-foreground mt-1">Admin sedang memverifikasi. Biasanya dalam beberapa menit.</p>
          </div>
        )}

        {/* Sudah dikonfirmasi */}
        {deposit.status === "confirmed" && (
          <div className="rounded-xl p-4 text-center" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <p className="text-sm font-bold text-emerald-400">✅ Saldo berhasil ditambahkan</p>
            <p className="text-xs text-muted-foreground mt-1">Dikonfirmasi {deposit.confirmedAt ? new Date(deposit.confirmedAt).toLocaleString("id-ID") : ""}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Komponen: Form Buat Deposit Baru ─── */
function NewDepositForm({ onCreated }: { onCreated: (d: V2Deposit) => void }) {
  const [amount, setAmount] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [method, setMethod] = useState<"qris" | "transfer" | "manual">("qris");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function selectPreset(val: number) {
    setSelectedPreset(val);
    setAmount(String(val));
  }

  async function handleSubmit() {
    const num = Number(amount);
    if (!num || num < 10_000) { setError("Minimal deposit Rp 10.000"); return; }
    if (num > 50_000_000) { setError("Maksimal deposit Rp 50.000.000"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await v2CreateDeposit({ amount: num, method });
      onCreated(res.deposit);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Nominal */}
      <div className="glass-card rounded-2xl p-5">
        <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-3">
          Jumlah Deposit
        </label>
        <div className="relative mb-3">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">Rp</span>
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => { setAmount(e.target.value.replace(/\D/g, "")); setSelectedPreset(null); }}
            placeholder="0"
            className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/40 transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_AMOUNTS.map((p) => (
            <button
              key={p}
              onClick={() => selectPreset(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border"
              style={selectedPreset === p
                ? { borderColor: "#FBBF24", background: "rgba(251,191,36,0.1)", color: "#FBBF24" }
                : { borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
            >
              {formatRupiah(p)}
            </button>
          ))}
        </div>
      </div>

      {/* Metode */}
      <div className="glass-card rounded-2xl p-5">
        <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-3">
          Metode Pembayaran
        </label>
        <div className="space-y-2">
          {([
            { value: "qris", label: "QRIS DANA Bisnis", sub: "GoPay · OVO · DANA · ShopeePay", color: "#A855F7" },
            { value: "transfer", label: "Transfer Bank", sub: "BCA · BRI · Mandiri · dll", color: "#3B82F6" },
            { value: "manual", label: "Manual (konfirmasi WA)", sub: "Hubungi admin langsung", color: "#10B981" },
          ] as const).map((m) => (
            <button
              key={m.value}
              onClick={() => setMethod(m.value)}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-all"
              style={method === m.value
                ? { background: `${m.color}15`, border: `1px solid ${m.color}40` }
                : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${m.color}20` }}>
                <div className="w-2 h-2 rounded-full" style={{ background: method === m.value ? m.color : "rgba(255,255,255,0.2)" }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.sub}</p>
              </div>
              {method === m.value && (
                <svg className="w-4 h-4 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: m.color }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Info kode unik */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
        <svg className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Nominal bayar akan ditambah <span className="text-blue-300 font-semibold">kode unik 3 digit</span> untuk identifikasi otomatis. Misal: deposit Rp 100.000 → bayar Rp 100.123.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm text-red-400" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </div>
      )}

      <button
        onClick={() => void handleSubmit()}
        disabled={loading || !amount || Number(amount) < 10_000}
        className="w-full py-4 rounded-2xl text-sm font-black text-gray-900 disabled:opacity-40 transition-all"
        style={{ background: "linear-gradient(135deg, #FBBF24, #F59E0B)", boxShadow: "0 4px 20px rgba(251,191,36,0.3)" }}
      >
        {loading ? "Membuat Deposit..." : "Lanjutkan →"}
      </button>
    </div>
  );
}

/* ─── Komponen: Riwayat Deposit ─── */
function DepositHistory({ refreshKey }: { refreshKey: number }) {
  const [deposits, setDeposits] = useState<V2Deposit[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await v2GetDeposits(1);
      setDeposits(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useState(() => { void load(); });

  // Re-load when refreshKey changes
  const prevKey = useRef(refreshKey);
  if (prevKey.current !== refreshKey) {
    prevKey.current = refreshKey;
    void load();
  }

  if (loading) return (
    <div className="flex justify-center py-6">
      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (deposits.length === 0) return (
    <p className="text-center text-xs text-muted-foreground py-4">Belum ada riwayat deposit</p>
  );

  return (
    <div className="space-y-2">
      {deposits.map((d) => {
        const totalAmount = d.totalAmount ?? d.amount;
        return (
          <div key={d.id} className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white">{formatRupiah(totalAmount)}</div>
              <div className="text-xs text-muted-foreground truncate">{d.paymentRef}</div>
              <div className="text-[10px] text-muted-foreground">{new Date(d.createdAt).toLocaleString("id-ID")}</div>
            </div>
            <StatusBadge status={d.status} />
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main Page ─── */
export default function DepositPage() {
  const cfg = loadConfig();
  const qrisImageSrc = cfg.qrisImage || DEFAULT_QRIS_URL;

  const [activeDeposit, setActiveDeposit] = useState<V2Deposit | null>(null);
  const [step, setStep] = useState<"form" | "payment">("form");
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  function handleDepositCreated(deposit: V2Deposit) {
    setActiveDeposit(deposit);
    setStep("payment");
  }

  function handleProofUploaded() {
    if (activeDeposit) {
      setActiveDeposit({ ...activeDeposit, status: "paid" });
    }
    setHistoryRefresh((p) => p + 1);
  }

  function handleNewDeposit() {
    setActiveDeposit(null);
    setStep("form");
  }

  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto px-4 pb-28">
      {/* Header */}
      <div className="py-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)", boxShadow: "0 0 16px rgba(251,191,36,0.3)" }}>
            <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="font-black text-lg leading-none"
              style={{ background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              ISI SALDO
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-widest">DEPOSIT VIA QRIS / TRANSFER</p>
          </div>
          {step === "payment" && (
            <button
              onClick={handleNewDeposit}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/10 text-white/60 hover:bg-white/5"
            >
              ← Baru
            </button>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-5">
        {[
          { id: "form", label: "1 · Pilih Nominal" },
          { id: "payment", label: "2 · Bayar & Upload" },
        ].map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={step === s.id
                ? { background: "rgba(251,191,36,0.2)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.4)" }
                : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {s.label}
            </div>
            {s.id === "form" && <div className="w-4 h-px" style={{ background: step === "payment" ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.1)" }} />}
          </div>
        ))}
      </div>

      {/* Content */}
      {step === "form" && (
        <NewDepositForm onCreated={handleDepositCreated} />
      )}

      {step === "payment" && activeDeposit && (
        <ActiveDepositCard
          deposit={activeDeposit}
          qrisImageSrc={qrisImageSrc}
          onProofUploaded={handleProofUploaded}
        />
      )}

      {/* Riwayat */}
      <div className="mt-6">
        <button
          onClick={() => setShowHistory((p) => !p)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Riwayat Deposit</span>
          <svg className="w-4 h-4 text-white/40 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            style={{ transform: showHistory ? "rotate(180deg)" : "rotate(0)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showHistory && (
          <div className="mt-2">
            <DepositHistory refreshKey={historyRefresh} />
          </div>
        )}
      </div>
    </div>
  );
}
