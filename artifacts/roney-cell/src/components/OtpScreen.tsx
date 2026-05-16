import { useState, useEffect, useRef } from "react";

interface OtpScreenProps {
  contact: string;
  method: "phone" | "email" | "facebook";
  sending: boolean;                          /* true while Fonnte API call is in progress */
  sendError: string;                         /* non-empty if Fonnte failed */
  onVerify: (input: string) => boolean;      /* returns true if code is correct */
  onVerified: () => void;
  onBack: () => void;
  onResend: () => void;
}

export default function OtpScreen({
  contact, method, sending, sendError,
  onVerify, onVerified, onBack, onResend,
}: OtpScreenProps) {
  const [digits, setDigits]       = useState(["", "", "", "", "", ""]);
  const [error, setError]         = useState("");
  const [attempts, setAttempts]   = useState(0);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [shake, setShake]         = useState(false);
  const inputRefs                 = useRef<(HTMLInputElement | null)[]>([]);

  /* auto-focus first box once sent */
  useEffect(() => {
    if (!sending && !sendError) {
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    }
  }, [sending, sendError]);

  /* countdown timer */
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function handleDigit(idx: number, val: string) {
    const v = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = v;
    setDigits(next);
    setError("");
    if (v && idx < 5) inputRefs.current[idx + 1]?.focus();
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === "Enter") verifyOtp();
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setDigits(text.split(""));
      inputRefs.current[5]?.focus();
    }
  }

  function verifyOtp() {
    const entered = digits.join("");
    if (entered.length < 6) { setError("Masukkan 6 digit kode OTP."); return; }

    const correct = onVerify(entered);
    if (!correct) {
      const next = attempts + 1;
      setAttempts(next);
      setError(next >= 3
        ? "Kode salah 3 kali. Klik 'Kirim ulang' untuk mendapatkan kode baru."
        : `Kode OTP salah. Sisa percobaan: ${3 - next}`);
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      return;
    }
    onVerified();
  }

  function handleResend() {
    if (!canResend) return;
    setCountdown(60);
    setCanResend(false);
    setAttempts(0);
    setDigits(["", "", "", "", "", ""]);
    setError("");
    onResend();
  }

  const methodLabel = method === "email" ? "WhatsApp / email" : "WhatsApp";
  const methodIcon  = method === "email" ? "✉️" : "💬";
  const blocked     = attempts >= 3;

  /* ── Sending state ── */
  if (sending) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center max-w-md mx-auto px-5 py-10"
        style={{ background: "linear-gradient(160deg, hsl(220 45% 5%) 0%, hsl(230 50% 8%) 100%)" }}>
        <div className="flex flex-col items-center gap-5">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
            style={{ background: "linear-gradient(135deg,rgba(59,130,246,0.2) 0%,rgba(99,102,241,0.2) 100%)", border: "1.5px solid rgba(99,102,241,0.3)" }}>
            📤
          </div>
          <div className="text-center">
            <h2 className="font-black text-xl text-foreground mb-2">Mengirim Kode OTP…</h2>
            <p className="text-sm text-muted-foreground">Mohon tunggu, kode sedang dikirim ke {methodLabel} Anda.</p>
          </div>
          <div className="flex gap-1.5 mt-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-blue-400"
                style={{ animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />
            ))}
          </div>
        </div>
        <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
      </div>
    );
  }

  /* ── Send failed state ── */
  if (sendError) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center max-w-md mx-auto px-5 py-10"
        style={{ background: "linear-gradient(160deg, hsl(220 45% 5%) 0%, hsl(230 50% 8%) 100%)" }}>
        <div className="flex flex-col items-center gap-5 w-full">
          <div className="text-5xl">⚠️</div>
          <div className="text-center">
            <h2 className="font-black text-xl text-red-400 mb-2">Gagal Kirim OTP</h2>
            <p className="text-sm text-muted-foreground">{sendError}</p>
          </div>
          <div className="w-full p-4 rounded-2xl bg-yellow-500/8 border border-yellow-500/20">
            <p className="text-xs font-bold text-yellow-400 mb-1">💡 Tips</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Pastikan nomor HP aktif dan bisa menerima WhatsApp</li>
              <li>Pastikan format nomor benar (contoh: 081234567890)</li>
              <li>Coba lagi setelah beberapa saat</li>
            </ul>
          </div>
          <button onClick={onBack}
            className="w-full py-4 rounded-2xl font-black text-base text-white"
            style={{ background: "linear-gradient(135deg,#3B82F6 0%,#6366F1 100%)" }}>
            ← Kembali & Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center max-w-md mx-auto px-5 py-10"
      style={{ background: "linear-gradient(160deg, hsl(220 45% 5%) 0%, hsl(230 50% 8%) 100%)" }}>

      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 text-4xl"
        style={{ background: "linear-gradient(135deg,rgba(59,130,246,0.2) 0%,rgba(99,102,241,0.2) 100%)", border: "1.5px solid rgba(99,102,241,0.3)", boxShadow: "0 0 40px rgba(99,102,241,0.2)" }}>
        🔐
      </div>

      <h2 className="font-black text-2xl text-foreground mb-1 text-center">Verifikasi OTP</h2>
      <p className="text-sm text-muted-foreground text-center mb-1">
        Kode 6 digit telah dikirim ke {methodLabel}
      </p>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/25 bg-blue-500/8 mb-6">
        <span>{methodIcon}</span>
        <span className="text-xs font-bold text-blue-300">{contact}</span>
      </div>

      {/* Info box — no code shown here */}
      <div className="w-full mb-6 p-4 rounded-2xl border border-blue-500/15 bg-blue-500/5">
        <div className="flex items-start gap-3">
          <span className="text-xl flex-shrink-0">💬</span>
          <div>
            <p className="text-xs font-bold text-blue-300 mb-1">Cek WhatsApp Anda</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Buka WhatsApp dan masukkan kode 6 digit yang dikirim ke nomor <strong className="text-foreground/70">{contact}</strong>. Jangan bagikan kode ini ke siapapun.
            </p>
          </div>
        </div>
      </div>

      {/* 6-digit input boxes */}
      <div className={`flex gap-2.5 mb-4`}
        style={shake ? { animation: "shake 0.4s ease" } : {}}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            disabled={blocked}
            onChange={(e) => handleDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            className="w-12 h-14 text-center text-xl font-black rounded-xl border-2 bg-white/5 text-foreground
              focus:outline-none transition-all duration-200 disabled:opacity-30"
            style={{
              borderColor: d ? "#6366F1" : "rgba(255,255,255,0.12)",
              boxShadow: d ? "0 0 12px rgba(99,102,241,0.3)" : "none",
            }}
          />
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 mb-4 w-full">
          <span>⚠️</span>
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      <button onClick={verifyOtp} disabled={blocked}
        className="w-full py-4 rounded-2xl font-black text-base text-white mb-3 transition-all disabled:opacity-30"
        style={{ background: "linear-gradient(135deg,#6366F1 0%,#4F46E5 100%)", boxShadow: "0 6px 20px rgba(99,102,241,0.4)" }}>
        ✅ Verifikasi Sekarang
      </button>

      <div className="flex items-center justify-center gap-2 mb-4">
        {canResend ? (
          <button onClick={handleResend}
            className="text-xs text-blue-400 hover:text-blue-300 font-bold transition-colors">
            🔄 Kirim ulang kode
          </button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Kirim ulang dalam{" "}
            <span className="font-bold text-foreground">{countdown}s</span>
          </p>
        )}
      </div>

      <button onClick={onBack}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors">
        ← Kembali ke form pendaftaran
      </button>

      <style>{`
        @keyframes shake {
          0%,100% { transform:translateX(0); }
          20%      { transform:translateX(-8px); }
          40%      { transform:translateX(8px); }
          60%      { transform:translateX(-6px); }
          80%      { transform:translateX(6px); }
        }
      `}</style>
    </div>
  );
}
