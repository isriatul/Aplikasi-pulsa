import { useState } from "react";
import { SheetUser, loginWithPhone, loginByEmail, registerUser, registerFacebook } from "@/lib/sheetsApi";
import { Member } from "@/lib/members";
import OtpScreen from "@/components/OtpScreen";

type LoginMethod = "phone" | "email" | "facebook";
type Mode = "login" | "register" | "otp";

interface LoginPageProps {
  onLogin: (member: Member) => void;
}

function sheetToMember(u: SheetUser): Member {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    email: u.email,
    whatsapp: u.phone,
    pin: "",
    type: "member",
    status: u.status === "active" ? "approved" : u.status === "pending" ? "pending" : "rejected",
    balance: u.balance,
    loginMethod: u.loginMethod as Member["loginMethod"],
    deviceId: u.deviceId,
    createdAt: u.createdAt,
    approvedAt: u.status === "active" ? u.createdAt : undefined,
  };
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [method, setMethod]   = useState<LoginMethod>("phone");
  const [mode, setMode]       = useState<Mode>("login");

  /* phone */
  const [phone, setPhone]     = useState("");
  const [pin, setPin]         = useState("");
  const [txPin, setTxPin]     = useState("");
  const [name, setName]       = useState("");

  /* email */
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [emailTxPin, setEmailTxPin] = useState("");
  const [emailName, setEmailName] = useState("");

  /* facebook */
  const [fbName, setFbName]   = useState("");
  const [fbStep, setFbStep]   = useState<"button" | "name">("button");

  /* OTP */
  const [otpCode, setOtpCode]       = useState("");
  const [otpContact, setOtpContact] = useState("");
  const [pendingRegData, setPendingRegData] = useState<Parameters<typeof registerUser>[0] | null>(null);

  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  function clearMsg() { setError(""); setSuccess(""); }

  /* ── Generate and start OTP flow ── */
  function startOtp(contact: string, regData: Parameters<typeof registerUser>[0]) {
    const code = generateOtp();
    setOtpCode(code);
    setOtpContact(contact);
    setPendingRegData(regData);
    setMode("otp");
  }

  /* ── OTP verified → complete registration ── */
  async function handleOtpVerified() {
    if (!pendingRegData) return;
    setLoading(true);
    try {
      const res = await registerUser({ ...pendingRegData, status: "pending" });
      if (res.ok) {
        setMode("login");
        setSuccess("✅ Verifikasi berhasil! Akun menunggu persetujuan admin. Anda akan dihubungi via WhatsApp.");
        clearAllForms();
      } else {
        setError(res.message ?? "Gagal mendaftar.");
        setMode("login");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setMode("login");
    }
    setLoading(false);
  }

  function clearAllForms() {
    setPhone(""); setPin(""); setTxPin(""); setName("");
    setEmail(""); setPassword(""); setEmailTxPin(""); setEmailName("");
    setFbName(""); setFbStep("button");
  }

  /* ── Phone submit ── */
  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || !pin) { setError("Isi nomor HP dan password."); return; }
    setLoading(true); clearMsg();
    try {
      if (mode === "login") {
        const res = await loginWithPhone(phone, pin);
        if (res.ok && res.user) onLogin(sheetToMember(res.user));
        else setError(res.message ?? "Login gagal.");
      } else {
        if (!name.trim())       { setError("Nama tidak boleh kosong."); setLoading(false); return; }
        if (txPin.length !== 6) { setError("PIN Transaksi harus 6 digit."); setLoading(false); return; }
        if (pin.length < 6)     { setError("Password minimal 6 karakter."); setLoading(false); return; }
        setLoading(false);
        startOtp(`+62 ${phone}`, { name, phone: phone.replace(/\D/g,""), password: pin, txPin, loginMethod: "phone" });
        return;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    }
    setLoading(false);
  }

  /* ── Email submit ── */
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError("Isi email dan password."); return; }
    setLoading(true); clearMsg();
    try {
      if (mode === "login") {
        const res = await loginByEmail(email, password);
        if (res.ok && res.user) onLogin(sheetToMember(res.user));
        else setError(res.message ?? "Login gagal.");
      } else {
        if (!emailName.trim())       { setError("Nama tidak boleh kosong."); setLoading(false); return; }
        if (emailTxPin.length !== 6) { setError("PIN Transaksi harus 6 digit."); setLoading(false); return; }
        if (password.length < 6)     { setError("Password minimal 6 karakter."); setLoading(false); return; }
        setLoading(false);
        startOtp(email, { name: emailName, email, password, txPin: emailTxPin, loginMethod: "email" });
        return;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    }
    setLoading(false);
  }

  /* ── Facebook submit ── */
  async function handleFacebookLogin() {
    if (!fbName.trim()) { setError("Masukkan nama Anda."); return; }
    setLoading(true); clearMsg();
    try {
      const res = await registerFacebook(fbName.trim());
      if (res.ok && res.user) onLogin(sheetToMember(res.user));
      else setError(res.message ?? "Gagal masuk dengan Facebook.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    }
    setLoading(false);
  }

  /* ── OTP screen ── */
  if (mode === "otp" && otpCode) {
    return (
      <OtpScreen
        contact={otpContact}
        method={method}
        otp={otpCode}
        onVerified={handleOtpVerified}
        onBack={() => { setMode("register"); setOtpCode(""); }}
        onResend={() => setOtpCode(generateOtp())}
      />
    );
  }

  const METHODS: { id: LoginMethod; icon: string; label: string }[] = [
    { id: "phone",    icon: "📱", label: "No. HP" },
    { id: "email",    icon: "✉️", label: "Email" },
    { id: "facebook", icon: "👤", label: "Facebook" },
  ];

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center max-w-md mx-auto px-5"
      style={{ background: "linear-gradient(160deg, hsl(220 45% 5%) 0%, hsl(230 50% 8%) 100%)" }}>

      <div className="w-full py-10 flex flex-col items-center">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg,hsl(210 90% 55%) 0%,hsl(230 80% 40%) 100%)", boxShadow: "0 0 40px rgba(59,130,246,0.5),0 8px 24px rgba(0,0,0,0.4)" }}>
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
            </svg>
          </div>
          <h1 className="font-black text-3xl leading-none tracking-tight mb-1"
            style={{ background: "linear-gradient(135deg,#60A5FA 0%,#A78BFA 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            RoneyCell
          </h1>
          <p className="text-xs text-muted-foreground tracking-widest">SISTEM JUALAN PULSA PROFESIONAL</p>
        </div>

        {/* Method tabs */}
        <div className="w-full flex gap-2 mb-6 p-1 rounded-2xl bg-white/4 border border-white/6">
          {METHODS.map((m) => (
            <button key={m.id}
              onClick={() => { setMethod(m.id); clearMsg(); }}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-bold transition-all"
              style={method === m.id
                ? { background: "linear-gradient(135deg,#3B82F6 0%,#6366F1 100%)", color: "white", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" }
                : { color: "rgba(255,255,255,0.45)" }
              }>
              <span className="text-base">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* Mode toggle pills */}
        <div className="w-full flex gap-2 mb-5">
          {(["login", "register"] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); clearMsg(); }}
              className="flex-1 py-2 rounded-xl text-xs font-bold transition-all border"
              style={mode === m
                ? { background: "rgba(59,130,246,0.15)", borderColor: "rgba(59,130,246,0.4)", color: "#60A5FA" }
                : { borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }
              }>
              {m === "login" ? "🔑 Masuk" : "✍️ Daftar"}
            </button>
          ))}
        </div>

        {/* OTP registration notice */}
        {mode === "register" && method !== "facebook" && (
          <div className="w-full flex items-start gap-2.5 px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/8 mb-4">
            <span className="flex-shrink-0 text-blue-400 mt-0.5">🔐</span>
            <div>
              <p className="text-xs font-bold text-blue-300">Verifikasi OTP Wajib</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Setelah mendaftar, Anda akan menerima kode OTP 6 digit via {method === "email" ? "email" : "WhatsApp"}. Masukkan kode untuk melanjutkan.
              </p>
            </div>
          </div>
        )}

        {/* ── Phone form ── */}
        {method === "phone" && (
          <form onSubmit={handlePhoneSubmit} className="w-full space-y-3">
            {mode === "register" && (
              <FormInput label="Nama Lengkap" type="text" value={name} onChange={setName} placeholder="Nama Anda" icon="👤" />
            )}
            <FormInput label="Nomor HP" type="tel" value={phone} onChange={setPhone} placeholder="08xxxxxxxxxx" icon="📱" numeric />
            <FormInput label={mode === "register" ? "Password (min 6 karakter)" : "Password"} type="password" value={pin} onChange={setPin} placeholder="••••••" icon="🔒" />
            {mode === "register" && (
              <FormInput label="PIN Transaksi (6 digit)" type="password" value={txPin} onChange={setTxPin} placeholder="6 digit PIN rahasia" icon="🔐" numeric maxLen={6} />
            )}
            {error && <ErrorBox msg={error} />}
            {success && <SuccessBox msg={success} />}
            <SubmitBtn loading={loading} disabled={!phone || !pin} label={mode === "login" ? "Masuk" : "Kirim Kode OTP →"} />
          </form>
        )}

        {/* ── Email form ── */}
        {method === "email" && (
          <form onSubmit={handleEmailSubmit} className="w-full space-y-3">
            {mode === "register" && (
              <FormInput label="Nama Lengkap" type="text" value={emailName} onChange={setEmailName} placeholder="Nama Anda" icon="👤" />
            )}
            <FormInput label="Email" type="email" value={email} onChange={setEmail} placeholder="nama@email.com" icon="✉️" />
            <FormInput label={mode === "register" ? "Buat Password" : "Password"} type="password" value={password} onChange={setPassword} placeholder="Min. 6 karakter" icon="🔒" />
            {mode === "register" && (
              <FormInput label="PIN Transaksi (6 digit)" type="password" value={emailTxPin} onChange={setEmailTxPin} placeholder="6 digit PIN rahasia" icon="🔐" numeric maxLen={6} />
            )}
            {error && <ErrorBox msg={error} />}
            {success && <SuccessBox msg={success} />}
            <SubmitBtn loading={loading} disabled={!email || !password} label={mode === "login" ? "Masuk dengan Email" : "Kirim Kode OTP →"} />
          </form>
        )}

        {/* ── Facebook form ── */}
        {method === "facebook" && (
          <div className="w-full space-y-4">
            {fbStep === "button" ? (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  Masuk dengan Facebook. Akun dibuat otomatis dan langsung aktif. PIN Transaksi default: <span className="font-bold text-yellow-400">123456</span> (ubah setelah masuk).
                </p>
                <button onClick={() => setFbStep("name")}
                  className="w-full py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-3"
                  style={{ background: "linear-gradient(135deg,#1877F2 0%,#0B5ED7 100%)", boxShadow: "0 6px 20px rgba(24,119,242,0.4)" }}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Lanjutkan dengan Facebook
                </button>
              </>
            ) : (
              <>
                <FormInput label="Nama Facebook Anda" type="text" value={fbName} onChange={setFbName} placeholder="Contoh: Budi Santoso" icon="👤" />
                {error && <ErrorBox msg={error} />}
                {success && <SuccessBox msg={success} />}
                <button onClick={handleFacebookLogin} disabled={loading || !fbName.trim()}
                  className="w-full py-4 rounded-2xl font-black text-base text-white disabled:opacity-40 flex items-center justify-center gap-3"
                  style={{ background: "linear-gradient(135deg,#1877F2 0%,#0B5ED7 100%)", boxShadow: "0 6px 20px rgba(24,119,242,0.4)" }}>
                  {loading ? "⏳ Memproses..." : "Masuk Sekarang"}
                </button>
                <button type="button" onClick={() => { setFbStep("button"); clearMsg(); }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                  ← Kembali
                </button>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center space-y-1">
          <p className="text-[10px] text-muted-foreground">
            Dengan mendaftar, Anda menyetujui syarat penggunaan RoneyCell.
          </p>
          <div className="h-px w-24 mx-auto bg-white/8" />
          <p className="text-[10px] font-semibold"
            style={{ background: "linear-gradient(135deg,#60A5FA 0%,#A78BFA 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Solusi Pulsa Terpercaya di Lombok
          </p>
          <p className="text-[10px] text-muted-foreground">Powered by RoneyCell</p>
        </div>
      </div>
    </div>
  );
}

/* ── Shared sub-components ── */

function FormInput({ label, type, value, onChange, placeholder, icon, numeric, maxLen }: {
  label: string; type: string; value: string; onChange: (v: string) => void;
  placeholder: string; icon: string; numeric?: boolean; maxLen?: number;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base pointer-events-none">{icon}</span>
        <input
          type={type}
          inputMode={numeric ? "numeric" : undefined}
          value={value}
          maxLength={maxLen}
          onChange={(e) => onChange(numeric ? e.target.value.replace(/\D/g,"") : e.target.value)}
          placeholder={placeholder}
          className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
        />
      </div>
    </div>
  );
}

function SubmitBtn({ loading, disabled, label }: { loading: boolean; disabled: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading || disabled}
      className="w-full py-4 rounded-2xl font-black text-base text-white transition-all disabled:opacity-40"
      style={{ background: "linear-gradient(135deg,#3B82F6 0%,#6366F1 100%)", boxShadow: "0 6px 20px rgba(59,130,246,0.35)" }}>
      {loading ? "⏳ Memproses..." : label}
    </button>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25">
      <span className="text-base flex-shrink-0">⚠️</span>
      <p className="text-xs text-red-300 leading-relaxed">{msg}</p>
    </div>
  );
}

function SuccessBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
      <span className="text-base flex-shrink-0">✅</span>
      <p className="text-xs text-emerald-300 leading-relaxed">{msg}</p>
    </div>
  );
}
