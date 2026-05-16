import { useState, useEffect, useRef } from "react";

interface OtpScreenProps {
  contact: string;       /* phone number or email shown to user */
  method: "phone" | "email" | "facebook";
  otp: string;           /* the generated OTP to verify against */
  onVerified: () => void;
  onBack: () => void;
  onResend: () => void;
}

export default function OtpScreen({ contact, method, otp, onVerified, onBack, onResend }: OtpScreenProps) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [revealOtp, setRevealOtp] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* countdown */
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  /* auto-reveal OTP after 3s for demo (admin relays via WhatsApp in production) */
  useEffect(() => {
    const t = setTimeout(() => setRevealOtp(true), 3000);
    return () => clearTimeout(t);
  }, []);

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
    if (entered !== otp) {
      setError("Kode OTP salah. Coba lagi.");
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
    setRevealOtp(false);
    setDigits(["", "", "", "", "", ""]);
    setError("");
    onResend();
    setTimeout(() => setRevealOtp(true), 3000);
  }

  const methodLabel = method === "email" ? "email" : method === "phone" ? "WhatsApp" : "Facebook";
  const methodIcon  = method === "email" ? "✉️" : method === "phone" ? "💬" : "👤";

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center max-w-md mx-auto px-5 py-10"
      style={{ background: "linear-gradient(160deg, hsl(220 45% 5%) 0%, hsl(230 50% 8%) 100%)" }}>

      {/* Icon */}
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 text-4xl"
        style={{ background: "linear-gradient(135deg,rgba(59,130,246,0.2) 0%,rgba(99,102,241,0.2) 100%)", border: "1.5px solid rgba(99,102,241,0.3)", boxShadow: "0 0 40px rgba(99,102,241,0.2)" }}>
        🔐
      </div>

      <h2 className="font-black text-2xl text-foreground mb-1 text-center">Verifikasi OTP</h2>
      <p className="text-sm text-muted-foreground text-center mb-1">
        Kode OTP dikirim ke {methodLabel}
      </p>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/25 bg-blue-500/8 mb-8">
        <span>{methodIcon}</span>
        <span className="text-xs font-bold text-blue-300">{contact}</span>
      </div>

      {/* OTP reveal box (simulated — admin relays via WhatsApp in production) */}
      {revealOtp && (
        <div className="w-full mb-5 p-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-emerald-400 text-sm">✅</span>
            <p className="text-xs font-bold text-emerald-400">Kode OTP diterima via {methodLabel}</p>
          </div>
          <div className="flex items-center justify-center gap-3 mt-2">
            <span className="text-3xl font-black tracking-[0.3em] text-emerald-300">{otp}</span>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Berlaku selama {countdown}s · Jangan bagikan kode ini
          </p>
        </div>
      )}

      {/* 6-digit boxes */}
      <div className={`flex gap-2.5 mb-4 ${shake ? "animate-[shake_0.5s_ease]" : ""}`}
        style={shake ? { animation: "shake 0.4s ease" } : {}}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            className="w-12 h-14 text-center text-xl font-black rounded-xl border-2 bg-white/5 text-foreground
              focus:outline-none transition-all duration-200"
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

      <button onClick={verifyOtp}
        className="w-full py-4 rounded-2xl font-black text-base text-white mb-3 transition-all"
        style={{ background: "linear-gradient(135deg,#6366F1 0%,#4F46E5 100%)", boxShadow: "0 6px 20px rgba(99,102,241,0.4)" }}>
        ✅ Verifikasi Sekarang
      </button>

      <div className="flex items-center gap-2 mb-4">
        {canResend ? (
          <button onClick={handleResend} className="text-xs text-blue-400 hover:text-blue-300 font-bold transition-colors">
            🔄 Kirim ulang OTP
          </button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Kirim ulang dalam <span className="font-bold text-foreground">{countdown}s</span>
          </p>
        )}
      </div>

      <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
        ← Kembali ke form pendaftaran
      </button>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-6px); }
          80%      { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
