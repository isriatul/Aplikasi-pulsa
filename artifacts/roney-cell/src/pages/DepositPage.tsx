/**
 * Halaman Isi Saldo — QRIS Statis + Kode Unik + Upload Bukti → Auto-Credit
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { formatRupiah } from "@/lib/products";
import {
  v2CreateDeposit,
  v2CancelDeposit,
  v2GetDeposits,
  v2UploadDepositProof,
  type V2Deposit,
} from "@/lib/apiV2";

/* URL QRIS DANA Bisnis yang sudah dicopy ke public/ */
const QRIS_URL = "/roney-cell/qris-dana.jpeg";

const PRESET_AMOUNTS = [50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000];

/* ─── Helper: format rupiah ringkas ─── */
function rp(n: number) {
  return `Rp\u00A0${n.toLocaleString("id-ID")}`;
}

/* ─── Tombol salin ─── */
function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text).catch(() => {});
    setOk(true);
    setTimeout(() => setOk(false), 2000);
  }
  return (
    <button onClick={copy}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0"
      style={ok
        ? { background: "rgba(16,185,129,0.2)", color: "#34D399", border: "1px solid rgba(16,185,129,0.3)" }
        : { background: "rgba(251,191,36,0.15)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.25)" }}>
      {ok
        ? <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Disalin</>
        : <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Salin</>}
    </button>
  );
}

/* ─── Badge status deposit ─── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string, string]> = {
    pending:   ["rgba(245,158,11,0.15)",  "#FCD34D", "⏳ Menunggu Bayar"],
    paid:      ["rgba(59,130,246,0.15)",  "#93C5FD", "📸 Bukti Terkirim"],
    confirmed: ["rgba(16,185,129,0.15)", "#6EE7B7", "✅ Saldo Masuk"],
    failed:    ["rgba(239,68,68,0.15)",  "#FCA5A5", "❌ Ditolak"],
    expired:   ["rgba(107,114,128,0.15)","#9CA3AF", "🕐 Kedaluwarsa"],
  };
  const [bg, color, label] = map[status] ?? map["pending"]!;
  return <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: bg, color }}>{label}</span>;
}

/* ─── Countdown timer ─── */
function Countdown({ expiredAt }: { expiredAt: string }) {
  const [sisa, setSisa] = useState("");
  useEffect(() => {
    function tick() {
      const diff = new Date(expiredAt).getTime() - Date.now();
      if (diff <= 0) { setSisa("Kedaluwarsa"); return; }
      const m = Math.floor(diff / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setSisa(`${m}:${String(s).padStart(2, "0")}`);
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiredAt]);
  return <span className="font-mono font-bold text-amber-400">{sisa}</span>;
}

/* ─── Form Upload Bukti ─── */
function UploadProofForm({ deposit, onSuccess }: { deposit: V2Deposit; onSuccess: (credited: number) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [mime, setMime] = useState<"image/jpeg" | "image/png" | "image/webp">("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
    setMime(file.type as typeof mime);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleUpload() {
    if (!preview) return;
    setLoading(true);
    setError("");
    try {
      const res = await v2UploadDepositProof(deposit.id, preview, mime);
      onSuccess(res.creditedAmount ?? deposit.amount);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 mt-2">
      {/* Drop area */}
      <div
        onClick={() => inputRef.current?.click()}
        className="rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center py-5 gap-2 transition-all"
        style={preview
          ? { borderColor: "rgba(16,185,129,0.5)", background: "rgba(16,185,129,0.04)" }
          : { borderColor: "rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.02)" }}>
        {preview
          ? <img src={preview} alt="Preview struk" className="max-h-44 rounded-xl object-contain" />
          : <>
              <svg className="w-9 h-9 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-semibold text-white/50">Ketuk untuk pilih foto struk</p>
              <p className="text-xs text-white/30">JPG / PNG / WebP · max 3MB</p>
            </>}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />

      {error && <p className="text-xs text-red-400 px-1">{error}</p>}

      <button
        onClick={() => void handleUpload()}
        disabled={!preview || loading}
        className="w-full py-4 rounded-2xl text-sm font-black tracking-wide disabled:opacity-40 transition-all flex items-center justify-center gap-2"
        style={{ background: preview ? "linear-gradient(135deg,#10B981,#059669)" : "rgba(255,255,255,0.08)", color: preview ? "#fff" : "rgba(255,255,255,0.3)", boxShadow: preview ? "0 4px 20px rgba(16,185,129,0.35)" : "none" }}>
        {loading
          ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Mengirim bukti...</>
          : <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>Saya Sudah Bayar &amp; Upload Bukti</>}
      </button>

      {!preview && (
        <p className="text-[11px] text-center text-white/30">
          Screenshot struk pembayaran → pilih gambar → kirim → saldo otomatis masuk
        </p>
      )}
    </div>
  );
}

/* ─── Layar sukses auto-credit ─── */
function SuccessScreen({ amount, onReset }: { amount: number; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-5 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl animate-bounce"
        style={{ background: "rgba(16,185,129,0.15)", border: "2px solid rgba(16,185,129,0.4)" }}>
        ✅
      </div>
      <div>
        <p className="text-xl font-black text-white">Saldo Berhasil Ditambahkan!</p>
        <p className="text-3xl font-black mt-1" style={{ color: "#34D399" }}>{rp(amount)}</p>
        <p className="text-sm text-muted-foreground mt-2">Cek saldo di halaman utama</p>
      </div>
      <button
        onClick={onReset}
        className="px-8 py-3 rounded-2xl text-sm font-bold text-white"
        style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.35)" }}>
        Deposit Lagi
      </button>
    </div>
  );
}

/* ─── Panel instruksi + QRIS setelah tiket dibuat ─── */
function PaymentInstructions({
  deposit,
  onProofUploaded,
  onNewTicket,
}: {
  deposit: V2Deposit;
  onProofUploaded: (credited: number) => void;
  onNewTicket: () => void;
}) {
  const totalAmount = deposit.totalAmount;
  const uniqueCode = deposit.uniqueCode;
  const isExpired = deposit.expiredAt ? new Date(deposit.expiredAt) < new Date() : false;

  return (
    <div className="space-y-4">
      {/* Header tiket */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.04)" }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ background: "rgba(251,191,36,0.08)", borderBottom: "1px solid rgba(251,191,36,0.15)" }}>
          <div>
            <p className="text-[10px] text-amber-400/70 uppercase tracking-widest font-semibold">Tiket Deposit Aktif</p>
            <p className="font-mono text-xs text-white/50">{deposit.paymentRef}</p>
          </div>
          <StatusBadge status={deposit.status} />
        </div>

        {/* Nominal bayar — tampilan besar */}
        <div className="px-4 pt-4 pb-3">
          <p className="text-xs text-muted-foreground mb-1">Nominal asli</p>
          <p className="text-sm font-semibold text-white">{rp(deposit.amount)}</p>
          <p className="text-xs text-muted-foreground mt-2 mb-1">Kode unik</p>
          <p className="text-sm font-semibold text-amber-400">+{uniqueCode}</p>

          {/* Total — warna merah supaya menonjol */}
          <div className="mt-3 rounded-xl px-4 py-3" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <p className="text-xs font-bold text-red-300 uppercase tracking-wider mb-1">⚠️ BAYAR TEPAT NOMINAL INI</p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-2xl font-black text-white">{rp(totalAmount)}</p>
              <CopyBtn text={String(totalAmount)} />
            </div>
            <p className="text-xs text-red-300/80 mt-1">Nominal berbeda = tidak terdeteksi otomatis</p>
          </div>

          {/* Timer */}
          {deposit.expiredAt && !isExpired && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-amber-300">Berlaku </span>
              <Countdown expiredAt={deposit.expiredAt} />
            </div>
          )}
        </div>
      </div>

      {/* QRIS image + instruksi */}
      {!isExpired && deposit.status === "pending" && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.04)" }}>
          {/* Banner instruksi — teks besar mencolok */}
          <div className="px-4 py-3 text-center" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(59,130,246,0.2))", borderBottom: "1px solid rgba(168,85,247,0.2)" }}>
            <p className="text-xs font-black tracking-widest uppercase text-purple-300 mb-0.5">Cara Bayar</p>
            <p className="text-base font-black text-white leading-snug">
              TRANSFER HARUS SESUAI<br />
              <span style={{ color: "#FBBF24" }}>NOMINAL + KODE UNIK</span>
            </p>
          </div>

          {/* QRIS */}
          <div className="px-4 pt-4 pb-2 flex flex-col items-center gap-3">
            <div className="relative">
              <img
                src={QRIS_URL}
                alt="QRIS Dana Bisnis RoneyCell"
                className="w-full max-w-[260px] rounded-2xl"
                style={{ border: "2px solid rgba(168,85,247,0.4)", boxShadow: "0 8px 32px rgba(168,85,247,0.2)" }}
              />
              {/* Overlay nominal di atas QR */}
              <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
                <div className="px-3 py-1 rounded-lg text-xs font-black text-gray-900"
                  style={{ background: "#FBBF24", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
                  Bayar: {rp(totalAmount)}
                </div>
              </div>
            </div>
            <p className="text-xs text-center text-purple-300/80">
              DANA · GoPay · OVO · ShopeePay · m-banking
            </p>
          </div>

          {/* Langkah-langkah */}
          <div className="px-4 pb-4 space-y-2">
            {[
              { no: "1", text: "Buka aplikasi dompet digital atau m-banking" },
              { no: "2", text: "Scan QRIS di atas" },
              { no: "3", text: `Masukkan nominal TEPAT ${rp(totalAmount)}` },
              { no: "4", text: "Bayar → screenshot struk pembayaran" },
              { no: "5", text: "Upload struk di bawah → saldo otomatis masuk ⚡" },
            ].map((s) => (
              <div key={s.no} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-black mt-0.5"
                  style={{ background: "rgba(168,85,247,0.25)", color: "#C084FC" }}>{s.no}</div>
                <p className="text-xs text-white/70 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload bukti */}
      {!isExpired && deposit.status === "pending" && (
        <div className="rounded-2xl p-4 space-y-1" style={{ border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.04)" }}>
          <p className="text-xs font-black text-emerald-400 uppercase tracking-wider">Upload Bukti Pembayaran</p>
          <p className="text-xs text-muted-foreground">Screenshot struk → kirim → saldo langsung masuk ⚡</p>
          <UploadProofForm deposit={deposit} onSuccess={onProofUploaded} />
        </div>
      )}

      {/* Sudah bayar tapi sistem auto delay */}
      {deposit.status === "paid" && (
        <div className="rounded-2xl p-4 text-center space-y-1" style={{ border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.05)" }}>
          <p className="text-sm font-black text-blue-300">📸 Bukti Sudah Dikirim</p>
          <p className="text-xs text-muted-foreground">Saldo sedang diproses. Biasanya instan, maks 5 menit.</p>
        </div>
      )}

      {/* Sudah confirmed */}
      {deposit.status === "confirmed" && (
        <div className="rounded-2xl p-4 text-center space-y-2" style={{ border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.05)" }}>
          <p className="text-xl font-black text-emerald-400">✅ Saldo Sudah Masuk!</p>
          <p className="text-sm text-white">{rp(deposit.amount)} dikreditkan ke akun Anda</p>
        </div>
      )}

      {/* Expired */}
      {isExpired && (
        <div className="rounded-2xl p-4 text-center space-y-2" style={{ border: "1px solid rgba(107,114,128,0.3)", background: "rgba(107,114,128,0.05)" }}>
          <p className="text-sm font-bold text-gray-400">🕐 Tiket Kedaluwarsa</p>
          <p className="text-xs text-muted-foreground">Tiket ini sudah tidak aktif.</p>
          <button
            onClick={onNewTicket}
            className="mt-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg,#FBBF24,#F59E0B)" }}>
            Buat Tiket Baru
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Card: tiket lama ditemukan — lanjutkan atau batalkan ─── */
function ExistingTicketCard({
  deposit,
  onContinue,
  onCancelled,
}: {
  deposit: V2Deposit;
  onContinue: () => void;
  onCancelled: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  async function handleCancel() {
    setCancelling(true);
    setError("");
    try {
      await v2CancelDeposit(deposit.id);
      onCancelled();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCancelling(false);
    }
  }

  const totalAmount = deposit.totalAmount;
  const expiredAt = deposit.expiredAt ? new Date(deposit.expiredAt) : null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.04)" }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: "rgba(251,191,36,0.1)", borderBottom: "1px solid rgba(251,191,36,0.15)" }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base" style={{ background: "rgba(251,191,36,0.2)" }}>
          🎫
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-amber-400 uppercase tracking-wide">Tiket Aktif Ditemukan</p>
          <p className="text-[10px] text-white/50 font-mono truncate">{deposit.paymentRef}</p>
        </div>
        <StatusBadge status="pending" />
      </div>

      {/* Info tiket */}
      <div className="px-4 py-4 space-y-3">
        <div className="rounded-xl px-4 py-3 space-y-1.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Nominal asli</span>
            <span className="text-white font-semibold">{rp(deposit.amount)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Kode unik</span>
            <span className="text-amber-400 font-semibold">+{deposit.uniqueCode}</span>
          </div>
          <div className="h-px bg-white/10 my-1" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">Total bayar</span>
            <span className="text-lg font-black text-amber-400">{rp(totalAmount)}</span>
          </div>
        </div>

        {expiredAt && (
          <div className="flex items-center gap-2 text-xs text-amber-300/80">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Berlaku sampai <Countdown expiredAt={deposit.expiredAt!} /></span>
          </div>
        )}

        {error && <p className="text-xs text-red-400 px-1">{error}</p>}

        {/* Dua tombol pilihan */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex-1 py-3 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            style={{ background: "rgba(239,68,68,0.1)", color: "#F87171", border: "1px solid rgba(239,68,68,0.25)" }}>
            {cancelling
              ? <><div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />Membatalkan...</>
              : <>✕ Batalkan Tiket</>}
          </button>
          <button
            onClick={onContinue}
            className="flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5"
            style={{ background: "linear-gradient(135deg,#FBBF24,#F59E0B)", color: "#1a1a1a", boxShadow: "0 2px 16px rgba(251,191,36,0.35)" }}>
            ▶ Lanjutkan Bayar
          </button>
        </div>

        <p className="text-[10px] text-center text-muted-foreground">
          Batalkan untuk buat tiket dengan nominal berbeda
        </p>
      </div>
    </div>
  );
}

/* ─── Form pilih nominal & metode ─── */
function NewDepositForm({
  onCreated,
  onExisting,
}: {
  onCreated: (d: V2Deposit) => void;
  onExisting: (d: V2Deposit) => void;
}) {
  const [amount, setAmount] = useState("");
  const [preset, setPreset] = useState<number | null>(null);
  const [method, setMethod] = useState<"qris" | "transfer" | "manual">("qris");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function selectPreset(v: number) { setPreset(v); setAmount(String(v)); setError(""); }

  async function handleSubmit() {
    const num = parseInt(amount.replace(/\D/g, "") || "0");
    if (num < 10_000) { setError("Minimal deposit Rp 10.000"); return; }
    if (num > 50_000_000) { setError("Maksimal deposit Rp 50.000.000"); return; }
    setLoading(true); setError("");
    try {
      const res = await v2CreateDeposit({ amount: num, method });
      if (res.isExisting) {
        onExisting(res.deposit);
      } else {
        onCreated(res.deposit);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Nominal */}
      <div className="rounded-2xl p-5 space-y-3" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Jumlah Deposit</p>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-sm text-muted-foreground">Rp</span>
          <input
            type="number" inputMode="numeric"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setPreset(null); setError(""); }}
            placeholder="0"
            className="w-full pl-10 pr-4 py-3.5 rounded-xl text-base font-black bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/50 transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_AMOUNTS.map((p) => (
            <button key={p} onClick={() => selectPreset(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border"
              style={preset === p
                ? { borderColor: "#FBBF24", background: "rgba(251,191,36,0.12)", color: "#FBBF24" }
                : { borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
              {rp(p)}
            </button>
          ))}
        </div>
      </div>

      {/* Metode */}
      <div className="rounded-2xl p-5 space-y-3" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Metode Bayar</p>
        <div className="space-y-2">
          {([
            { v: "qris",     label: "QRIS DANA Bisnis",        sub: "GoPay · OVO · DANA · ShopeePay", color: "#A855F7" },
            { v: "transfer", label: "Transfer Bank",            sub: "BCA · BRI · Mandiri · dll",      color: "#3B82F6" },
            { v: "manual",   label: "Manual (konfirmasi WA)",   sub: "Hubungi admin langsung",          color: "#10B981" },
          ] as const).map((m) => (
            <button key={m.v} onClick={() => setMethod(m.v)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
              style={method === m.v
                ? { background: `${m.color}18`, border: `1px solid ${m.color}40` }
                : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${m.color}20` }}>
                <div className="w-2 h-2 rounded-full transition-all"
                  style={{ background: method === m.v ? m.color : "rgba(255,255,255,0.2)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.sub}</p>
              </div>
              {method === m.v && (
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: m.color }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Info kode unik */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
        style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.18)" }}>
        <svg className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Sistem menambahkan <span className="text-blue-300 font-semibold">kode unik 3 digit</span> ke nominal.
          Setelah upload struk, saldo langsung masuk otomatis ⚡ tanpa perlu menunggu admin.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm text-red-400"
          style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)" }}>
          {error}
        </div>
      )}

      <button
        onClick={() => void handleSubmit()}
        disabled={loading || parseInt(amount || "0") < 10_000}
        className="w-full py-4 rounded-2xl text-sm font-black tracking-wide text-gray-900 disabled:opacity-40 transition-all"
        style={{ background: "linear-gradient(135deg,#FBBF24,#F59E0B)", boxShadow: "0 4px 24px rgba(251,191,36,0.35)" }}>
        {loading ? "Membuat tiket..." : "Lanjutkan →"}
      </button>
    </div>
  );
}

/* ─── Riwayat deposit ─── */
function DepositHistory({ refreshKey }: { refreshKey: number }) {
  const [deposits, setDeposits] = useState<V2Deposit[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await v2GetDeposits(1); setDeposits(res.data); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load, refreshKey]);

  if (loading) return <div className="flex justify-center py-5"><div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (deposits.length === 0) return <p className="text-center text-xs text-muted-foreground py-4">Belum ada riwayat</p>;

  return (
    <div className="space-y-2">
      {deposits.map((d) => (
        <div key={d.id} className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white">{rp(d.totalAmount ?? d.amount)}</div>
            <div className="text-xs text-muted-foreground font-mono truncate">{d.paymentRef}</div>
            <div className="text-[10px] text-muted-foreground">{new Date(d.createdAt).toLocaleString("id-ID")}</div>
          </div>
          <StatusBadge status={d.status} />
        </div>
      ))}
    </div>
  );
}

/* ─── Main Page ─── */
export default function DepositPage() {
  const [activeDeposit, setActiveDeposit] = useState<V2Deposit | null>(null);
  const [existingDeposit, setExistingDeposit] = useState<V2Deposit | null>(null);
  const [step, setStep] = useState<"form" | "existing" | "payment">("form");
  const [credited, setCredited] = useState<number | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  function handleCreated(deposit: V2Deposit) {
    setActiveDeposit(deposit);
    setExistingDeposit(null);
    setStep("payment");
    setCredited(null);
  }

  function handleExisting(deposit: V2Deposit) {
    setExistingDeposit(deposit);
    setStep("existing");
  }

  function handleContinueExisting() {
    if (existingDeposit) {
      setActiveDeposit(existingDeposit);
      setExistingDeposit(null);
      setStep("payment");
    }
  }

  function handleExistingCancelled() {
    setExistingDeposit(null);
    setStep("form");
    setHistoryRefresh((p) => p + 1);
  }

  function handleProofUploaded(amount: number) {
    setCredited(amount);
    setHistoryRefresh((p) => p + 1);
  }

  function handleReset() {
    setActiveDeposit(null);
    setExistingDeposit(null);
    setStep("form");
    setCredited(null);
    setHistoryRefresh((p) => p + 1);
  }

  /* Stepper: form=1, existing=1.5, payment=2 */
  const stepperActive = step === "payment" ? "payment" : "form";

  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto px-4 pb-28">
      {/* Header */}
      <div className="py-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#FBBF24,#F59E0B)", boxShadow: "0 0 20px rgba(251,191,36,0.35)" }}>
          <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <h1 className="font-black text-xl leading-none tracking-wide"
            style={{ background: "linear-gradient(135deg,#FBBF24,#F59E0B)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            ISI SALDO
          </h1>
          <p className="text-[10px] text-muted-foreground tracking-widest mt-0.5">QRIS · TRANSFER · AUTO-CREDIT</p>
        </div>
        {step === "payment" && !credited && (
          <button onClick={handleReset}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/10 text-white/50 hover:bg-white/5">
            ← Baru
          </button>
        )}
        {step === "existing" && (
          <button onClick={() => setStep("form")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/10 text-white/50 hover:bg-white/5">
            ← Kembali
          </button>
        )}
      </div>

      {/* Stepper — hanya tampil saat belum sukses */}
      {!credited && (
        <div className="flex items-center gap-2 mb-5">
          {[
            { id: "form",    label: "1 · Pilih Nominal" },
            { id: "payment", label: "2 · Bayar & Upload" },
          ].map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className="flex-1 px-3 py-1 rounded-full text-xs font-semibold text-center transition-all"
                style={stepperActive === s.id
                  ? { background: "rgba(251,191,36,0.18)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.4)" }
                  : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {s.label}
              </div>
              {i === 0 && <div className="w-3 h-px shrink-0" style={{ background: stepperActive === "payment" ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.1)" }} />}
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {credited !== null
        ? <SuccessScreen amount={credited} onReset={handleReset} />
        : step === "form"
          ? <NewDepositForm onCreated={handleCreated} onExisting={handleExisting} />
          : step === "existing" && existingDeposit
            ? <ExistingTicketCard
                deposit={existingDeposit}
                onContinue={handleContinueExisting}
                onCancelled={handleExistingCancelled}
              />
            : step === "payment" && activeDeposit
              ? <PaymentInstructions
                  deposit={activeDeposit}
                  onProofUploaded={handleProofUploaded}
                  onNewTicket={handleReset}
                />
              : null}

      {/* Riwayat */}
      {credited === null && (
        <div className="mt-6">
          <button
            onClick={() => setShowHistory((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Riwayat Deposit</span>
            <svg className="w-4 h-4 text-white/35 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              style={{ transform: showHistory ? "rotate(180deg)" : "none" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showHistory && <div className="mt-2"><DepositHistory refreshKey={historyRefresh} /></div>}
        </div>
      )}
    </div>
  );
}
