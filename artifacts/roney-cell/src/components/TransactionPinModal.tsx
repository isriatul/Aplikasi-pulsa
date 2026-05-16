import { useState, useEffect } from "react";

interface TransactionPinModalProps {
  onVerified: () => void;
  onCancel: () => void;
  onPinEntered: (pin: string) => Promise<{ ok: boolean; message?: string }>;
}

export default function TransactionPinModal({
  onVerified,
  onCancel,
  onPinEntered,
}: TransactionPinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  /* Auto-submit when 6 digits entered */
  useEffect(() => {
    if (pin.length === 6 && !loading) {
      void handleVerify(pin);
    }
  }, [pin]);

  async function handleVerify(p: string) {
    setLoading(true);
    setError("");
    try {
      const result = await onPinEntered(p);
      if (result.ok) {
        onVerified();
      } else {
        setError(result.message ?? "PIN salah. Coba lagi.");
        setPin("");
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
    } catch {
      setError("Gagal terhubung ke server.");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  function press(digit: string) {
    if (loading || pin.length >= 6) return;
    setError("");
    setPin((p) => p + digit);
  }

  function backspace() {
    if (loading) return;
    setPin((p) => p.slice(0, -1));
    setError("");
  }

  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(10px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onCancel(); }}
    >
      <div
        className="w-full max-w-md glass-card rounded-3xl p-6 border border-blue-500/20"
        style={{ animation: "slide-up 0.25s ease" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#3B82F6 0%,#6366F1 100%)", boxShadow: "0 0 16px rgba(59,130,246,0.4)" }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="font-black text-base text-foreground">PIN Transaksi</p>
              <p className="text-[10px] text-muted-foreground tracking-widest">KEAMANAN BERLAPIS</p>
            </div>
          </div>
          {!loading && (
            <button onClick={onCancel}
              className="text-muted-foreground hover:text-foreground transition-colors p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* PIN dots */}
        <div
          className="flex justify-center gap-4 mb-6"
          style={{ animation: shake ? "shake 0.5s ease" : undefined }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full transition-all duration-200"
              style={i < pin.length
                ? { background: "linear-gradient(135deg,#3B82F6 0%,#6366F1 100%)", boxShadow: "0 0 8px rgba(59,130,246,0.6)" }
                : { background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.2)" }
              }
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-center">
            <p className="text-xs text-red-300 font-semibold">⚠️ {error}</p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
            <p className="text-xs text-blue-300 font-semibold">🔄 Memverifikasi PIN...</p>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {keys.map((k, idx) => {
            if (k === "") return <div key={idx} />;
            if (k === "⌫") {
              return (
                <button
                  key={idx}
                  onClick={backspace}
                  disabled={loading}
                  className="h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-muted-foreground transition-all active:scale-95 disabled:opacity-40"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  ⌫
                </button>
              );
            }
            return (
              <button
                key={idx}
                onClick={() => press(k)}
                disabled={loading || pin.length >= 6}
                className="h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-foreground transition-all active:scale-95 disabled:opacity-40"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                {k}
              </button>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Masukkan 6 digit PIN Transaksi Anda
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
