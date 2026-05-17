/**
 * Halaman Isi Saldo — QRIS Statis + Kode Unik + Upload Bukti → Auto-Credit
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import { formatRupiah } from "@/lib/products";
import {
  v2CreateDeposit,
  v2CancelDeposit,
  v2GetDeposits,
  v2UploadDepositProof,
  type V2Deposit,
} from "@/lib/apiV2";

/* URL QRIS DANA Bisnis — pakai BASE_URL agar tidak hardcoded */
const QRIS_URL = `${(import.meta.env.BASE_URL as string).replace(/\/$/, "")}/qris-dana.jpg`;

/* Info rekening BCA */
const BCA_INFO = {
  bank: "BCA",
  noRek: "7255211277",
  atasNama: "Isriatul Bahroni",
};

/* Info Virtual Account DANA */
const VA_DANA_INFO = {
  noVA: "88810081288080752",
  bank: "Permata / DANA",
  atasNama: "Isriatul Bahroni",
};

/* Info DANA untuk Alfamart / Indomaret */
const DANA_ALFAMART = "081288080752";

/* ─── Logo komponen tiap metode ─── */
function LogoDANA({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="#108EE9"/>
      <text x="18" y="23" textAnchor="middle" fontSize="9" fontWeight="900" fill="white" fontFamily="Arial,sans-serif">DANA</text>
    </svg>
  );
}

function LogoBCA({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="#005DAA"/>
      <text x="18" y="23" textAnchor="middle" fontSize="10" fontWeight="900" fill="white" fontFamily="Arial,sans-serif">BCA</text>
    </svg>
  );
}

function LogoPermata({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="#00529B"/>
      <text x="18" y="16" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="white" fontFamily="Arial,sans-serif">BANK</text>
      <text x="18" y="26" textAnchor="middle" fontSize="7" fontWeight="900" fill="#F5C518" fontFamily="Arial,sans-serif">PERMATA</text>
    </svg>
  );
}

function LogoAlfamart({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="#E31E24"/>
      <text x="18" y="16" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="white" fontFamily="Arial,sans-serif">alfa</text>
      <text x="18" y="25" textAnchor="middle" fontSize="5" fontWeight="700" fill="white" fontFamily="Arial,sans-serif">mart</text>
    </svg>
  );
}

function LogoIndomaret({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="#003F8A"/>
      <text x="18" y="15" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="#FFCE00" fontFamily="Arial,sans-serif">indo</text>
      <text x="18" y="24" textAnchor="middle" fontSize="5" fontWeight="700" fill="white" fontFamily="Arial,sans-serif">maret</text>
    </svg>
  );
}

function LogoWA({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="#25D366"/>
      <path d="M18 8C12.477 8 8 12.477 8 18c0 1.84.498 3.562 1.365 5.044L8 28l5.098-1.34A9.953 9.953 0 0018 28c5.523 0 10-4.477 10-10S23.523 8 18 8zm0 18a7.963 7.963 0 01-4.066-1.114l-.292-.173-3.023.795.808-2.954-.19-.304A7.963 7.963 0 0110 18c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8zm4.39-5.956c-.24-.12-1.42-.702-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.014-.374-1.931-1.19-.714-.636-1.196-1.422-1.336-1.662-.14-.24-.016-.37.105-.49.108-.107.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.195-.468-.394-.404-.54-.412l-.46-.008c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.694 2.587 4.107 3.628.574.248 1.022.396 1.37.507.576.183 1.1.157 1.514.095.462-.069 1.42-.582 1.62-1.144.2-.562.2-1.044.14-1.144-.058-.1-.218-.16-.46-.28z" fill="white"/>
    </svg>
  );
}

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
    if (!["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type)) {
      setError("Format tidak didukung. Gunakan JPG, PNG, atau WebP.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("Ukuran file terlalu besar (max 15MB).");
      return;
    }
    setError("");
    /* Baca file lalu kompres otomatis menggunakan Canvas */
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        /* Resize ke max 1200px sisi terpanjang, lalu encode JPEG 80% */
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width >= height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.82);
        setMime("image/jpeg");
        setPreview(compressed);
      };
      img.onerror = () => {
        /* Fallback: pakai data asli tanpa kompresi */
        setMime(file.type as typeof mime);
        setPreview(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  async function handleUpload() {
    if (!preview) return;
    setLoading(true);
    setError("");
    try {
      await v2UploadDepositProof(deposit.id, preview, mime);
      /* Kirim nominal asli ke parent untuk ditampilkan di SuccessScreen */
      onSuccess(deposit.amount);
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

/* ─── Layar sukses upload bukti (menunggu konfirmasi admin) ─── */
function SuccessScreen({ amount, onReset }: { amount: number; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 space-y-5 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
        style={{ background: "rgba(59,130,246,0.15)", border: "2px solid rgba(59,130,246,0.4)" }}>
        📸
      </div>
      <div className="space-y-2">
        <p className="text-xl font-black text-white">Bukti Pembayaran Terkirim!</p>
        <div className="px-4 py-3 rounded-2xl text-sm space-y-1"
          style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)" }}>
          <p className="font-bold text-blue-300">⏳ Menunggu Konfirmasi Admin</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Nominal <span className="font-bold text-white">{rp(amount)}</span> akan masuk ke saldo
            setelah admin mengkonfirmasi bukti pembayaran Anda.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Biasanya dikonfirmasi dalam 1–15 menit.</p>
      </div>
      <button
        onClick={onReset}
        className="px-8 py-3 rounded-2xl text-sm font-bold text-white"
        style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.35)" }}>
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

      {/* Instruksi pembayaran — beda tampilan sesuai metode */}
      {!isExpired && deposit.status === "pending" && deposit.method === "qris" && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.04)" }}>
          <div className="px-4 py-3 text-center" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(59,130,246,0.2))", borderBottom: "1px solid rgba(168,85,247,0.2)" }}>
            <p className="text-xs font-black tracking-widest uppercase text-purple-300 mb-0.5">Cara Bayar QRIS</p>
            <p className="text-base font-black text-white leading-snug">
              SCAN QR & BAYAR TEPAT<br />
              <span style={{ color: "#FBBF24" }}>NOMINAL + KODE UNIK</span>
            </p>
          </div>

          {/* Gambar QRIS */}
          <div className="px-4 pt-4 pb-2 flex flex-col items-center gap-3">
            <div className="relative bg-white p-3 rounded-2xl" style={{ boxShadow: "0 8px 32px rgba(168,85,247,0.25)", border: "2px solid rgba(168,85,247,0.4)" }}>
              <img
                src={QRIS_URL}
                alt="QRIS Dana Bisnis RoneyCell"
                className="w-[220px] h-[220px] object-contain rounded-lg"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
              {/* Overlay nominal */}
              <div className="absolute -bottom-3 left-0 right-0 flex justify-center pointer-events-none">
                <div className="px-4 py-1.5 rounded-full text-xs font-black text-gray-900"
                  style={{ background: "#FBBF24", boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}>
                  Bayar: {rp(totalAmount)}
                </div>
              </div>
            </div>
            <p className="text-xs text-center text-purple-300/80 mt-2">DANA · GoPay · OVO · ShopeePay · m-banking</p>
          </div>

          <div className="px-4 pb-4 space-y-2">
            {[
              { no: "1", text: "Buka aplikasi dompet digital atau m-banking" },
              { no: "2", text: "Pilih menu QRIS / Scan QR" },
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

      {/* Instruksi Transfer BCA */}
      {!isExpired && deposit.status === "pending" && deposit.method === "transfer" && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(59,130,246,0.35)", background: "rgba(59,130,246,0.04)" }}>
          <div className="px-4 py-3 text-center" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(6,182,212,0.15))", borderBottom: "1px solid rgba(59,130,246,0.2)" }}>
            <p className="text-xs font-black tracking-widest uppercase text-blue-300 mb-0.5">Transfer Bank BCA</p>
            <p className="text-base font-black text-white leading-snug">
              TRANSFER TEPAT NOMINAL<br />
              <span style={{ color: "#FBBF24" }}>TERMASUK KODE UNIK</span>
            </p>
          </div>

          {/* Info rekening BCA */}
          <div className="px-4 py-4 space-y-3">
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(59,130,246,0.25)", background: "rgba(59,130,246,0.06)" }}>
              {/* Logo BCA */}
              <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(59,130,246,0.15)", background: "rgba(59,130,246,0.1)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white"
                  style={{ background: "linear-gradient(135deg,#005DAA,#0071CE)" }}>BCA</div>
                <div>
                  <p className="text-xs font-black text-white">Bank BCA</p>
                  <p className="text-[10px] text-blue-300/80">Bank Central Asia</p>
                </div>
              </div>
              <div className="px-4 py-3 space-y-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Nomor Rekening</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xl font-black text-white tracking-widest">{BCA_INFO.noRek}</p>
                    <CopyBtn text={BCA_INFO.noRek} />
                  </div>
                </div>
                <div className="h-px bg-white/8" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Atas Nama</p>
                  <p className="text-sm font-semibold text-white">{BCA_INFO.atasNama}</p>
                </div>
              </div>
            </div>

            {/* Nominal transfer */}
            <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <p className="text-xs font-black text-red-300 uppercase tracking-wider">⚠️ Transfer TEPAT nominal ini</p>
              <div className="flex items-center justify-between gap-3">
                <p className="text-2xl font-black text-white">{rp(totalAmount)}</p>
                <CopyBtn text={String(totalAmount)} />
              </div>
              <p className="text-xs text-red-300/80">Nominal berbeda = tidak terdeteksi otomatis</p>
            </div>

            {/* Langkah */}
            <div className="space-y-2">
              {[
                { no: "1", text: "Buka m-banking atau ATM BCA / bank lain" },
                { no: "2", text: `Transfer ke BCA ${BCA_INFO.noRek} a.n. ${BCA_INFO.atasNama}` },
                { no: "3", text: `Masukkan nominal TEPAT ${rp(totalAmount)} (sudah termasuk kode unik)` },
                { no: "4", text: "Simpan struk / screenshot bukti transfer" },
                { no: "5", text: "Upload struk di bawah → saldo otomatis masuk ⚡" },
              ].map((s) => (
                <div key={s.no} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-black mt-0.5"
                    style={{ background: "rgba(59,130,246,0.25)", color: "#60A5FA" }}>{s.no}</div>
                  <p className="text-xs text-white/70 leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Instruksi Virtual Account DANA */}
      {!isExpired && deposit.status === "pending" && deposit.method === "va_dana" && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(16,142,233,0.35)", background: "rgba(16,142,233,0.04)" }}>
          <div className="px-4 py-3 text-center" style={{ background: "linear-gradient(135deg, rgba(16,142,233,0.2), rgba(0,82,155,0.2))", borderBottom: "1px solid rgba(16,142,233,0.2)" }}>
            <p className="text-xs font-black tracking-widest uppercase text-blue-300 mb-0.5">Virtual Account DANA</p>
            <p className="text-base font-black text-white leading-snug">
              TRANSFER KE NO. VA BERIKUT<br />
              <span style={{ color: "#FBBF24" }}>TEPAT NOMINAL + KODE UNIK</span>
            </p>
          </div>
          <div className="px-4 py-4 space-y-3">
            {/* Info VA */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(16,142,233,0.25)", background: "rgba(16,142,233,0.06)" }}>
              <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(16,142,233,0.15)", background: "rgba(16,142,233,0.1)" }}>
                <LogoDANA size={34} />
                <LogoPermata size={34} />
                <div className="ml-1">
                  <p className="text-xs font-black text-white">Virtual Account DANA</p>
                  <p className="text-[10px] text-blue-300/80">via Bank Permata</p>
                </div>
              </div>
              <div className="px-4 py-3 space-y-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Nomor Virtual Account</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-lg font-black text-white tracking-wider">{VA_DANA_INFO.noVA}</p>
                    <CopyBtn text={VA_DANA_INFO.noVA} />
                  </div>
                </div>
                <div className="h-px bg-white/8" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Atas Nama</span>
                  <span className="font-semibold text-white">{VA_DANA_INFO.atasNama}</span>
                </div>
              </div>
            </div>
            {/* Nominal */}
            <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <p className="text-xs font-black text-red-300 uppercase tracking-wider">⚠️ Transfer TEPAT nominal ini</p>
              <div className="flex items-center justify-between gap-3">
                <p className="text-2xl font-black text-white">{rp(totalAmount)}</p>
                <CopyBtn text={String(totalAmount)} />
              </div>
              <p className="text-xs text-red-300/80">Nominal berbeda = tidak terdeteksi otomatis</p>
            </div>
            {/* Langkah */}
            <div className="space-y-2">
              {[
                { no: "1", text: "Buka m-banking atau ATM bank manapun (BCA, BNI, Mandiri, dll)" },
                { no: "2", text: `Pilih Transfer → Virtual Account → masukkan ${VA_DANA_INFO.noVA}` },
                { no: "3", text: `Masukkan nominal TEPAT ${rp(totalAmount)} (sudah termasuk kode unik)` },
                { no: "4", text: "Konfirmasi nama penerima: " + VA_DANA_INFO.atasNama },
                { no: "5", text: "Screenshot / cetak struk bukti transfer" },
                { no: "6", text: "Upload struk di bawah → saldo otomatis masuk ⚡" },
              ].map((s) => (
                <div key={s.no} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-black mt-0.5"
                    style={{ background: "rgba(16,142,233,0.25)", color: "#60A5FA" }}>{s.no}</div>
                  <p className="text-xs text-white/70 leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Instruksi Alfamart / Indomaret */}
      {!isExpired && deposit.status === "pending" && deposit.method === "alfamart" && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(227,30,36,0.35)", background: "rgba(227,30,36,0.04)" }}>
          <div className="px-4 py-3 text-center" style={{ background: "linear-gradient(135deg, rgba(227,30,36,0.2), rgba(0,63,138,0.2))", borderBottom: "1px solid rgba(227,30,36,0.2)" }}>
            <p className="text-xs font-black tracking-widest uppercase text-red-300 mb-0.5">Alfamart / Indomaret</p>
            <p className="text-base font-black text-white leading-snug">
              BAYAR DI KASIR<br />
              <span style={{ color: "#FBBF24" }}>UPLOAD STRUK FISIK</span>
            </p>
          </div>
          <div className="px-4 py-4 space-y-3">
            {/* Logo minimarket */}
            <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <LogoAlfamart size={38} />
              <LogoIndomaret size={38} />
              <div className="ml-1">
                <p className="text-xs font-black text-white">Alfamart & Indomaret</p>
                <p className="text-[10px] text-muted-foreground">Bayar melalui DANA di kasir</p>
              </div>
            </div>

            {/* Info DANA untuk kasir */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(16,142,233,0.3)", background: "rgba(16,142,233,0.06)" }}>
              <div className="px-4 py-2 flex items-center gap-2" style={{ background: "rgba(16,142,233,0.12)", borderBottom: "1px solid rgba(16,142,233,0.15)" }}>
                <LogoDANA size={22} />
                <p className="text-xs font-black text-blue-300">Nomor DANA untuk disebutkan ke kasir</p>
              </div>
              <div className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-2xl font-black text-white tracking-widest">{DANA_ALFAMART}</p>
                  <CopyBtn text={DANA_ALFAMART} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">a.n. Isriatul Bahroni</p>
              </div>
            </div>

            {/* Nominal */}
            <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <p className="text-xs font-black text-red-300 uppercase tracking-wider">⚠️ Sebutkan nominal TEPAT ini ke kasir</p>
              <div className="flex items-center justify-between gap-3">
                <p className="text-2xl font-black text-white">{rp(totalAmount)}</p>
                <CopyBtn text={String(totalAmount)} />
              </div>
              <p className="text-xs text-red-300/80">Nominal berbeda = tidak terdeteksi otomatis</p>
            </div>

            {/* Langkah */}
            <div className="space-y-2">
              {[
                { no: "1", text: "Pergi ke Alfamart atau Indomaret terdekat" },
                { no: "2", text: `Ke kasir: "Mau kirim DANA ke nomor ${DANA_ALFAMART}"` },
                { no: "3", text: `Sebutkan nominal TEPAT ${rp(totalAmount)} (termasuk kode unik)` },
                { no: "4", text: "Bayar tunai ke kasir dan minta struk" },
                { no: "5", text: "Foto / scan struk fisik dari kasir" },
                { no: "6", text: "Upload foto struk di bawah → saldo otomatis masuk ⚡" },
              ].map((s) => (
                <div key={s.no} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-black mt-0.5"
                    style={{ background: "rgba(227,30,36,0.25)", color: "#F87171" }}>{s.no}</div>
                  <p className="text-xs text-white/70 leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Instruksi Manual/WA */}
      {!isExpired && deposit.status === "pending" && deposit.method === "manual" && (
        <div className="rounded-2xl px-4 py-4 space-y-2" style={{ border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.04)" }}>
          <p className="text-xs font-black text-emerald-400 uppercase tracking-wider">Konfirmasi via WhatsApp</p>
          <p className="text-xs text-white/70 leading-relaxed">
            Hubungi admin RoneyCell via WhatsApp untuk konfirmasi deposit manual sebesar <span className="font-bold text-white">{rp(totalAmount)}</span>.<br />
            Sertakan nomor tiket: <span className="font-mono text-amber-400">{deposit.paymentRef}</span>
          </p>
        </div>
      )}

      {/* Upload bukti */}
      {!isExpired && deposit.status === "pending" && (
        <div className="rounded-2xl p-4 space-y-1" style={{ border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.04)" }}>
          <p className="text-xs font-black text-emerald-400 uppercase tracking-wider">Upload Bukti Pembayaran</p>
          <p className="text-xs text-muted-foreground">Screenshot struk → upload → menunggu konfirmasi admin ⏳</p>
          <UploadProofForm deposit={deposit} onSuccess={onProofUploaded} />
        </div>
      )}

      {/* Sudah upload bukti, menunggu konfirmasi admin */}
      {deposit.status === "paid" && (
        <div className="rounded-2xl p-4 space-y-2" style={{ border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.05)" }}>
          <p className="text-sm font-black text-blue-300">📸 Bukti Sudah Dikirim</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Bukti pembayaran Anda sudah diterima dan sedang menunggu konfirmasi admin.
            Saldo akan masuk setelah admin menyetujui. Biasanya 1–15 menit.
          </p>
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
  const [method, setMethod] = useState<"qris" | "transfer" | "va_dana" | "alfamart" | "manual">("qris");
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
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 pb-1">Pilih Metode Bayar</p>
        {([
          {
            v: "qris" as const,
            label: "QRIS DANA Bisnis",
            sub: "GoPay · OVO · DANA · ShopeePay",
            accent: "#108EE9",
            logos: [<LogoDANA key="dana" size={40} />],
          },
          {
            v: "transfer" as const,
            label: "Transfer Bank BCA",
            sub: "Rek 7255211277 · a.n. Isriatul Bahroni",
            accent: "#005DAA",
            logos: [<LogoBCA key="bca" size={40} />],
          },
          {
            v: "va_dana" as const,
            label: "Virtual Account DANA",
            sub: "VA 88810081288080752 · Permata",
            accent: "#108EE9",
            logos: [<LogoDANA key="dana" size={40} />, <LogoPermata key="pmt" size={40} />],
          },
          {
            v: "alfamart" as const,
            label: "Alfamart / Indomaret",
            sub: "Bayar di kasir · Upload struk fisik",
            accent: "#E31E24",
            logos: [<LogoAlfamart key="alfa" size={40} />, <LogoIndomaret key="indo" size={40} />],
          },
          {
            v: "manual" as const,
            label: "Konfirmasi via WhatsApp",
            sub: "Hubungi admin langsung",
            accent: "#25D366",
            logos: [<LogoWA key="wa" size={40} />],
          },
        ]).map((m) => {
          const active = method === m.v;
          return (
            <button key={m.v} onClick={() => setMethod(m.v)}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all"
              style={{
                background: active ? `${m.accent}12` : "rgba(255,255,255,0.025)",
                border: active ? `2px solid ${m.accent}60` : "1.5px solid rgba(255,255,255,0.07)",
                boxShadow: active ? `0 4px 20px ${m.accent}20` : "none",
              }}>
              {/* Logo container — ukuran seragam 40×40 tiap logo */}
              <div className="shrink-0 flex items-center gap-1.5">
                {m.logos.map((logo) => (
                  <div key={(logo as React.ReactElement).key}
                    className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center"
                    style={{ background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.18)" }}>
                    {logo}
                  </div>
                ))}
              </div>
              {/* Label */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-tight">{m.label}</p>
                <p className="text-[11px] text-white/45 leading-tight mt-0.5 truncate">{m.sub}</p>
              </div>
              {/* Radio indicator */}
              <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center border-2 transition-all"
                style={active
                  ? { borderColor: m.accent, background: m.accent }
                  : { borderColor: "rgba(255,255,255,0.18)", background: "transparent" }}>
                {active && (
                  <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Info kode unik */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
        style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.18)" }}>
        <svg className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Sistem menambahkan <span className="text-blue-300 font-semibold">kode unik 3 digit</span> ke nominal agar pembayaran mudah diverifikasi admin.
          Setelah upload struk, admin akan mengkonfirmasi dan saldo masuk dalam 1–15 menit.
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
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await v2GetDeposits(1); setDeposits(res.data); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load, refreshKey]);

  async function handleCancel(id: number) {
    setCancellingId(id);
    setConfirmId(null);
    try {
      await v2CancelDeposit(id);
      setDeposits((prev) => prev.map((d) => d.id === id ? { ...d, status: "failed" } : d));
    } catch { /* silent — status stays */ }
    finally { setCancellingId(null); }
  }

  if (loading) return <div className="flex justify-center py-5"><div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (deposits.length === 0) return <p className="text-center text-xs text-muted-foreground py-4">Belum ada riwayat</p>;

  return (
    <div className="space-y-2">
      {deposits.map((d) => (
        <div key={d.id}>
          <div className="rounded-2xl px-4 py-3 flex items-center gap-3 transition-all"
            style={{
              background: d.status === "pending" ? "rgba(251,191,36,0.04)" : "rgba(255,255,255,0.025)",
              border: d.status === "pending" ? "1px solid rgba(251,191,36,0.2)" : "1px solid rgba(255,255,255,0.06)",
            }}>
            {/* Info deposit */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white">{rp(d.totalAmount ?? d.amount)}</span>
                <StatusBadge status={d.status} />
              </div>
              <div className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">{d.paymentRef}</div>
              <div className="text-[10px] text-muted-foreground">{new Date(d.createdAt).toLocaleString("id-ID")}</div>
            </div>

            {/* Tombol batalkan — hanya untuk pending */}
            {d.status === "pending" && (
              cancellingId === d.id
                ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin shrink-0" />
                : <button
                    onClick={() => setConfirmId(d.id)}
                    className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                    style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}
                    title="Batalkan tiket">
                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
            )}
          </div>

          {/* Dialog konfirmasi inline */}
          {confirmId === d.id && (
            <div className="mx-1 mt-1 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <p className="text-xs text-red-300 font-semibold flex-1">Yakin ingin membatalkan tiket ini?</p>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setConfirmId(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/60 border border-white/10 hover:bg-white/5">
                  Tidak
                </button>
                <button
                  onClick={() => void handleCancel(d.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                  style={{ background: "rgba(239,68,68,0.7)" }}>
                  Ya, Batalkan
                </button>
              </div>
            </div>
          )}
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
    <div className="min-h-dvh flex flex-col max-w-md mx-auto pb-28">
      {/* Header sticky */}
      <header className="sticky top-0 z-40 pt-safe px-4"
        style={{ background: "rgba(11,15,26,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", boxShadow: "0 0 12px rgba(245,158,11,0.45)" }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#111" strokeWidth="2.2">
                <rect x="2" y="6" width="20" height="14" rx="3"/><path d="M2 10h20"/><circle cx="7" cy="15" r="1" fill="#111" stroke="none"/>
              </svg>
            </div>
            <div>
              <h1 className="font-black text-base gradient-text-gold leading-none">Top Up Saldo</h1>
              <p className="text-[9px] text-white/30 tracking-widest mt-0.5">QRIS · TRANSFER · AUTO-CREDIT</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step === "payment" && !credited && (
              <button onClick={handleReset}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/10 text-white/45 hover:bg-white/6 hover:text-white/70 transition-all">
                ← Baru
              </button>
            )}
            {step === "existing" && (
              <button onClick={() => setStep("form")}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/10 text-white/45 hover:bg-white/6 hover:text-white/70 transition-all">
                ← Kembali
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 pt-4">
      {/* Stepper — hanya tampil saat belum sukses */}
      {!credited && (
        <div className="flex items-center gap-2 mb-5">
          {[
            { id: "form",    label: "1. Pilih Nominal" },
            { id: "payment", label: "2. Bayar & Upload" },
          ].map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className="flex-1 px-3 py-2 rounded-xl text-xs font-bold text-center transition-all"
                style={stepperActive === s.id
                  ? { background: "rgba(245,158,11,0.15)", color: "#FBBF24", border: "1px solid rgba(245,158,11,0.35)" }
                  : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.28)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {s.label}
              </div>
              {i === 0 && <div className="w-4 h-px shrink-0" style={{ background: stepperActive === "payment" ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.1)" }} />}
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
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2.5">
              <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.8" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4l3 3"/>
              </svg>
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Riwayat Deposit</span>
            </div>
            <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" viewBox="0 0 24 24"
              style={{ transform: showHistory ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          {showHistory && <div className="mt-2"><DepositHistory refreshKey={historyRefresh} /></div>}
        </div>
      )}
      </div>
    </div>
  );
}
