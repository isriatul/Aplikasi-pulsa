import { Product, formatRupiah } from "@/lib/products";
import { Operator } from "@/lib/operator";

interface TransactionModalProps {
  phase: "confirm" | "loading" | "success" | "failed" | "insufficient";
  product: Product | null;
  phone: string;
  operator: Operator | null;
  balance: number;
  errorMessage?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function TransactionModal({
  phase,
  product,
  phone,
  operator,
  balance,
  errorMessage,
  onConfirm,
  onClose,
}: TransactionModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 modal-backdrop"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && phase !== "loading") onClose();
      }}
    >
      <div className="w-full max-w-md modal-content">
        {phase === "confirm" && (
          <ConfirmSheet
            product={product!}
            phone={phone}
            operator={operator}
            balance={balance}
            onConfirm={onConfirm}
            onClose={onClose}
          />
        )}
        {phase === "loading" && <LoadingSheet />}
        {phase === "success" && <ResultSheet success onClose={onClose} />}
        {phase === "failed" && (
          <ResultSheet success={false} onClose={onClose} message={errorMessage} />
        )}
        {phase === "insufficient" && (
          <InsufficientSheet
            balance={balance}
            required={product?.price ?? 0}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

function ConfirmSheet({
  product, phone, operator, balance, onConfirm, onClose,
}: {
  product: Product;
  phone: string;
  operator: Operator | null;
  balance: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const canAfford = balance >= product.price;
  return (
    <div className="glass-card rounded-2xl p-6 border border-blue-500/20">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-lg text-foreground">Sahkan Transaksi</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-3 mb-5">
        <Row label="Produk" value={product.name} />
        <Row label="Nombor" value={phone} />
        <Row
          label="Operator"
          value={operator?.name ?? "Tidak dikesan"}
          valueStyle={{ color: operator?.color }}
        />
        <div className="h-px bg-white/5" />
        <Row label="Harga" value={formatRupiah(product.price)} valueClass="text-gold font-bold text-base" />
        <Row label="Saldo Semasa" value={formatRupiah(balance)} valueClass="text-muted-foreground" />
        <Row
          label="Saldo Selepas"
          value={formatRupiah(balance - product.price)}
          valueClass={canAfford ? "text-emerald-400 font-semibold" : "text-destructive font-semibold"}
        />
      </div>

      {!canAfford && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
          <svg className="w-5 h-5 text-destructive flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-sm text-destructive font-medium">Saldo Tidak Mencukupi</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-semibold text-muted-foreground hover:bg-white/5 transition-all"
        >
          Batal
        </button>
        <button
          onClick={onConfirm}
          disabled={!canAfford}
          className="flex-1 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: canAfford
              ? "linear-gradient(135deg, hsl(210 90% 55%) 0%, hsl(230 80% 45%) 100%)"
              : undefined,
            color: canAfford ? "white" : undefined,
            boxShadow: canAfford ? "0 4px 15px rgba(59,130,246,0.3)" : undefined,
          }}
        >
          Hantar Transaksi
        </button>
      </div>
    </div>
  );
}

function Row({
  label, value, valueClass, valueStyle,
}: {
  label: string;
  value: string;
  valueClass?: string;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold text-foreground ${valueClass ?? ""}`} style={valueStyle}>
        {value}
      </span>
    </div>
  );
}

function LoadingSheet() {
  return (
    <div className="glass-card rounded-2xl p-8 text-center border border-blue-500/20">
      <div
        className="w-16 h-16 rounded-full border-2 border-blue-500/20 border-t-blue-400 spinner mx-auto mb-4"
      />
      <h3 className="font-bold text-lg text-foreground mb-1">Memproses Transaksi</h3>
      <p className="text-sm text-muted-foreground">Sila tunggu sebentar...</p>
      <div className="mt-4 flex justify-center gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-blue-400"
            style={{ animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}

function ResultSheet({
  success, onClose, message,
}: {
  success: boolean;
  onClose: () => void;
  message?: string;
}) {
  return (
    <div className={`glass-card rounded-2xl p-8 text-center border ${
      success ? "border-emerald-500/20" : "border-destructive/20"
    }`}>
      <div
        className={`w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center ${
          success ? "bg-emerald-500/15 glow-neon" : "bg-destructive/10"
        }`}
        style={{
          boxShadow: success
            ? "0 0 30px rgba(16,185,129,0.3)"
            : "0 0 30px rgba(239,68,68,0.2)",
        }}
      >
        {success ? (
          <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-10 h-10 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>

      <h3 className={`font-bold text-xl mb-2 ${success ? "text-emerald-400" : "text-destructive"}`}>
        {success ? "Transaksi Berjaya!" : "Transaksi Gagal"}
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        {success
          ? "Pulsa telah berjaya dihantar kepada pelanggan."
          : message ?? "Terdapat masalah semasa memproses transaksi."}
      </p>

      <button
        onClick={onClose}
        className="w-full py-3.5 rounded-xl text-sm font-bold transition-all"
        style={{
          background: success
            ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
            : "linear-gradient(135deg, hsl(210 90% 55%) 0%, hsl(230 80% 45%) 100%)",
          color: "white",
          boxShadow: success
            ? "0 4px 15px rgba(16,185,129,0.3)"
            : "0 4px 15px rgba(59,130,246,0.3)",
        }}
      >
        Tutup
      </button>
    </div>
  );
}

function InsufficientSheet({
  balance, required, onClose,
}: {
  balance: number;
  required: number;
  onClose: () => void;
}) {
  return (
    <div className="glass-card rounded-2xl p-8 text-center border border-destructive/20">
      <div
        className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center bg-yellow-500/10"
        style={{ boxShadow: "0 0 30px rgba(251,191,36,0.2)" }}
      >
        <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h3 className="font-bold text-xl mb-2 text-yellow-400">Saldo Tidak Mencukupi</h3>
      <p className="text-sm text-muted-foreground mb-2">
        Saldo anda tidak mencukupi untuk transaksi ini.
      </p>
      <div className="my-4 p-4 rounded-xl bg-white/3 border border-white/8 text-left space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Saldo Semasa</span>
          <span className="text-foreground font-semibold">{formatRupiah(balance)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Diperlukan</span>
          <span className="text-destructive font-semibold">{formatRupiah(required)}</span>
        </div>
        <div className="h-px bg-white/5" />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Kekurangan</span>
          <span className="text-destructive font-bold">{formatRupiah(required - balance)}</span>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full py-3.5 rounded-xl text-sm font-bold gradient-blue text-white transition-all"
        style={{ boxShadow: "0 4px 15px rgba(59,130,246,0.3)" }}
      >
        Faham
      </button>
    </div>
  );
}
