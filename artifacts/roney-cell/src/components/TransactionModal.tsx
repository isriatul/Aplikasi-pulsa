import { Product, formatRupiah } from "@/lib/products";
import { Operator } from "@/lib/operator";
import { loadConfig, buildOrderMessage, buildWhatsAppUrl } from "@/lib/config";

interface TransactionModalProps {
  phase: "quick" | "confirm" | "loading" | "success" | "failed" | "insufficient";
  product: Product | null;
  phone: string;
  operator: Operator | null;
  balance: number;
  errorMessage?: string;
  failureType?: "number_invalid" | "other";
  refId?: string;
  memberName?: string;
  onBuyNow?: () => void;
  onConfirm: () => void;
  onClose: () => void;
}

export default function TransactionModal({
  phase, product, phone, operator, balance,
  errorMessage, failureType = "other", refId, memberName,
  onBuyNow, onConfirm, onClose,
}: TransactionModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 modal-backdrop"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && phase !== "loading") onClose(); }}
    >
      <div className="w-full max-w-md modal-content">
        {phase === "quick" && (
          <QuickConfirmSheet product={product!} phone={phone} operator={operator} balance={balance} memberName={memberName} onBuyNow={onBuyNow!} onClose={onClose} />
        )}
        {phase === "confirm" && (
          <ConfirmSheet product={product!} phone={phone} operator={operator} balance={balance} memberName={memberName} onConfirm={onConfirm} onClose={onClose} />
        )}
        {phase === "loading" && <LoadingSheet />}
        {phase === "success" && (
          <ResultSheet success phone={phone} product={product} operator={operator} refId={refId} memberName={memberName} onClose={onClose} />
        )}
        {phase === "failed" && (
          <ResultSheet success={false} phone={phone} product={product} operator={operator} refId={refId} onClose={onClose} message={errorMessage} failureType={failureType} />
        )}
        {phase === "insufficient" && (
          <InsufficientSheet balance={balance} required={product?.price ?? 0} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function QuickConfirmSheet({ product, phone, operator, balance, memberName, onBuyNow, onClose }: {
  product: Product; phone: string; operator: Operator | null;
  balance: number; memberName?: string; onBuyNow: () => void; onClose: () => void;
}) {
  const canAfford = balance >= product.price;
  return (
    <div className="glass-card rounded-2xl p-5 border border-blue-500/25" style={{ animation: "slide-up 0.22s ease" }}>
      {/* Handle bar */}
      <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-4" />

      {/* Product row */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/8">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: "rgba(59,130,246,0.12)", border: "1.5px solid rgba(59,130,246,0.25)" }}>
          {product.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm text-foreground leading-tight truncate">{product.name}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {operator && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${operator.color}20`, color: operator.color }}>
                {operator.name}
              </span>
            )}
            <span className="text-xs text-muted-foreground font-mono">{phone}</span>
          </div>
          {memberName && <p className="text-[10px] text-muted-foreground mt-0.5">Untuk: {memberName}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-black"
            style={{ background: "linear-gradient(135deg,#FBBF24 0%,#F59E0B 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {formatRupiah(product.price)}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: canAfford ? "#34D399" : "#F87171" }}>
            Saldo: {formatRupiah(balance)}
          </p>
        </div>
      </div>

      {/* Insufficient warning */}
      {!canAfford && (
        <div className="mb-4 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-red-300 font-semibold">Saldo tidak cukup. Kekurangan {formatRupiah(product.price - balance)}.</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-3.5 rounded-xl text-sm font-bold text-muted-foreground border border-white/10 hover:bg-white/5 transition-all">
          Nanti
        </button>
        <button
          onClick={onBuyNow}
          disabled={!canAfford}
          className="flex-1 py-3.5 rounded-xl text-sm font-black text-white transition-all disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={canAfford ? {
            background: "linear-gradient(135deg,hsl(210 90% 55%) 0%,hsl(230 80% 45%) 100%)",
            boxShadow: "0 4px 20px rgba(59,130,246,0.4)",
          } : undefined}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Beli Sekarang
        </button>
      </div>
    </div>
  );
}

function ConfirmSheet({ product, phone, operator, balance, memberName, onConfirm, onClose }: {
  product: Product; phone: string; operator: Operator | null;
  balance: number; memberName?: string; onConfirm: () => void; onClose: () => void;
}) {
  const canAfford = balance >= product.price;
  return (
    <div className="glass-card rounded-2xl p-6 border border-blue-500/20">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-lg text-foreground">Konfirmasi Transaksi</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="space-y-3 mb-5">
        <Row label="Produk" value={product.name} />
        <Row label="Nomor Tujuan" value={phone} />
        <Row label="Operator" value={operator?.name ?? "Tidak terdeteksi"} valueStyle={{ color: operator?.color }} />
        {memberName && <Row label="Pembeli" value={memberName} />}
        <div className="h-px bg-white/5" />
        <Row label="Harga" value={formatRupiah(product.price)} valueClass="text-gold font-bold text-base" />
        <Row label="Saldo Sekarang" value={formatRupiah(balance)} valueClass="text-muted-foreground" />
        <Row
          label="Saldo Setelah"
          value={formatRupiah(balance - product.price)}
          valueClass={canAfford ? "text-emerald-400 font-semibold" : "text-destructive font-semibold"}
        />
      </div>
      {!canAfford && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
          <svg className="w-5 h-5 text-destructive flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-destructive font-medium">Saldo Tidak Mencukupi</p>
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-semibold text-muted-foreground hover:bg-white/5 transition-all">
          Batal
        </button>
        <button
          onClick={onConfirm}
          disabled={!canAfford}
          className="flex-1 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={canAfford ? {
            background: "linear-gradient(135deg, hsl(210 90% 55%) 0%, hsl(230 80% 45%) 100%)",
            color: "white",
            boxShadow: "0 4px 15px rgba(59,130,246,0.3)",
          } : undefined}
        >
          Proses Sekarang
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, valueClass, valueStyle }: {
  label: string; value: string; valueClass?: string; valueStyle?: React.CSSProperties;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground flex-shrink-0">{label}</span>
      <span className={`text-sm font-semibold text-foreground text-right ${valueClass ?? ""}`} style={valueStyle}>{value}</span>
    </div>
  );
}

function LoadingSheet() {
  return (
    <div className="glass-card rounded-2xl p-8 text-center border border-blue-500/20">
      <div className="w-16 h-16 rounded-full border-2 border-blue-500/20 border-t-blue-400 spinner mx-auto mb-4" />
      <h3 className="font-bold text-lg text-foreground mb-1">Memproses Transaksi</h3>
      <p className="text-sm text-muted-foreground mb-1">Sedang menghubungi server Digiflazz...</p>
      <p className="text-xs text-muted-foreground">Jangan tutup aplikasi</p>
      <div className="mt-4 flex justify-center gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400"
            style={{ animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

function ResultSheet({ success, phone, product, operator, refId, onClose, message, failureType, memberName }: {
  success: boolean; phone: string; product: Product | null; operator: Operator | null;
  refId?: string; onClose: () => void; message?: string;
  failureType?: "number_invalid" | "other"; memberName?: string;
}) {
  const cfg = loadConfig();
  const isNumberFail = !success && failureType === "number_invalid";

  function sendWhatsApp() {
    if (!cfg.whatsappNumber || !product) return;
    const msg = buildOrderMessage(phone, product.name, product.price, operator?.name, refId ?? "-", memberName);
    window.open(buildWhatsAppUrl(msg, cfg.whatsappNumber), "_blank");
  }

  return (
    <div className={`glass-card rounded-2xl p-6 text-center border ${success ? "border-emerald-500/20" : "border-red-500/20"}`}>
      {/* Icon */}
      <div
        className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{
          background: success ? "rgba(16,185,129,0.15)" : isNumberFail ? "rgba(251,191,36,0.12)" : "rgba(239,68,68,0.1)",
          boxShadow: success ? "0 0 30px rgba(16,185,129,0.3)" : isNumberFail ? "0 0 30px rgba(251,191,36,0.2)" : "0 0 30px rgba(239,68,68,0.2)",
        }}
      >
        {success ? (
          <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : isNumberFail ? (
          <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>

      {/* Title */}
      <h3 className={`font-black text-xl mb-2 ${success ? "text-emerald-400" : isNumberFail ? "text-yellow-400" : "text-red-400"}`}>
        {success ? "Transaksi Berhasil!" : isNumberFail ? "Nomor Tidak Valid" : "Transaksi Gagal"}
      </h3>

      {/* Ref ID */}
      {refId && (
        <p className="text-xs text-muted-foreground mb-2">
          Ref ID: <span className="font-mono text-foreground/80">{refId}</span>
        </p>
      )}

      {/* Message */}
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        {success
          ? "Produk telah berhasil dikirim ke nomor tujuan."
          : message ?? "Terdapat masalah saat memproses transaksi."}
      </p>

      {/* ── REFUND NOTICE for number failures ── */}
      {isNumberFail && (
        <div className="mb-5 p-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 text-left">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(52,211,153,0.15)" }}>
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-black text-emerald-300 mb-1">✅ Saldo Otomatis Dikembalikan</p>
              <p className="text-xs text-emerald-400/80 leading-relaxed">
                Karena transaksi gagal akibat nomor tidak valid / tidak aktif, <span className="font-bold">saldo Anda tidak dipotong</span>. Pesanan dibatalkan secara otomatis.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Generic failure notice */}
      {!success && !isNumberFail && (
        <div className="mb-5 p-3 rounded-xl border border-blue-500/20 bg-blue-500/8">
          <p className="text-xs text-blue-300">
            💡 <span className="font-semibold">Saldo tidak dipotong</span> karena transaksi tidak berhasil diproses.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {success && cfg.whatsappNumber && (
          <button
            onClick={sendWhatsApp}
            className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)", color: "white", boxShadow: "0 4px 15px rgba(37,211,102,0.3)" }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Kirim Bukti ke WhatsApp Owner
          </button>
        )}
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-xl text-sm font-bold transition-all text-white"
          style={{
            background: success
              ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
              : "linear-gradient(135deg, hsl(210 90% 55%) 0%, hsl(230 80% 45%) 100%)",
            boxShadow: success ? "0 4px 15px rgba(16,185,129,0.3)" : "0 4px 15px rgba(59,130,246,0.3)",
          }}
        >
          {success ? "Selesai" : isNumberFail ? "Coba Lagi (Ganti Nomor)" : "Tutup"}
        </button>
      </div>
    </div>
  );
}

function InsufficientSheet({ balance, required, onClose }: { balance: number; required: number; onClose: () => void; }) {
  const waUrl = `https://wa.me/6281288080752?text=${encodeURIComponent("Halo Admin, saya ingin isi saldo RoneyCell saya. Mohon bantuannya 🙏")}`;
  return (
    <div className="glass-card rounded-2xl p-8 text-center border border-yellow-500/20">
      <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center bg-yellow-500/10"
        style={{ boxShadow: "0 0 30px rgba(251,191,36,0.2)" }}>
        <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="font-black text-xl mb-2 text-yellow-400">Saldo Tidak Mencukupi</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Saldo tidak cukup. Silakan hubungi Admin untuk <span className="font-bold text-yellow-300">isi saldo</span> terlebih dahulu.
      </p>
      <div className="my-4 p-4 rounded-2xl bg-white/3 border border-white/8 text-left space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Saldo Sekarang</span>
          <span className="text-foreground font-semibold">{formatRupiah(balance)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Dibutuhkan</span>
          <span className="text-red-400 font-semibold">{formatRupiah(required)}</span>
        </div>
        <div className="h-px bg-white/5" />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Kekurangan</span>
          <span className="text-red-400 font-bold">{formatRupiah(required - balance)}</span>
        </div>
      </div>
      <a href={waUrl} target="_blank" rel="noopener noreferrer"
        className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 mb-2 transition-all hover:opacity-90"
        style={{ background: "linear-gradient(135deg,#25D366 0%,#128C7E 100%)", boxShadow: "0 4px 15px rgba(37,211,102,0.3)", display: "flex" }}>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Hubungi Admin untuk Isi Saldo
      </a>
      <button onClick={onClose}
        className="w-full py-3 rounded-xl text-sm font-semibold text-muted-foreground border border-white/10 hover:bg-white/5 transition-all">
        Tutup
      </button>
    </div>
  );
}
