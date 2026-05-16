import { useState } from "react";
import {
  SheetUser, loginWithPhone, loginByEmail,
  registerUser, registerFacebook,
} from "@/lib/sheetsApi";
import { Member } from "@/lib/members";
import { getCountryInfo, COUNTRY_MAP } from "@/lib/operator";

type LoginMethod = "phone" | "email" | "facebook";
type Mode = "login" | "register" | "registered";

/* ── Super Admin bypass (hardcoded, always active) ── */
const SUPER_ADMIN_PHONE = "81288080752"; // tanpa leading 0, tanpa kode negara
const SUPER_ADMIN_PASS  = "311296";

function buildSuperAdminMember(): Member {
  return {
    id:          "SUPER_ADMIN",
    name:        "Admin RoneyCell",
    phone:       "081288080752",
    whatsapp:    "081288080752",
    pin:         "",
    type:        "reseller",
    status:      "approved",
    balance:     0,
    loginMethod: "phone",
    createdAt:   new Date().toISOString(),
    approvedAt:  new Date().toISOString(),
    notes:       "__superadmin__",
  };
}

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

const ADMIN_WA = "6281288080752";

const DIAL_OPTIONS = Object.values(COUNTRY_MAP).map((c) => ({
  code: c.dialCode,
  flag: c.flag,
  name: c.name,
  label: `${c.flag} ${c.dialCode}`,
}));

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [method, setMethod]     = useState<LoginMethod>("phone");
  const [mode, setMode]         = useState<Mode>("login");

  /* phone */
  const [dialCode, setDialCode] = useState("+62");
  const [phone, setPhone]       = useState("");
  const [pin, setPin]           = useState("");
  const [txPin, setTxPin]       = useState("");
  const [name, setName]         = useState("");

  /* email */
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [emailTxPin, setEmailTxPin] = useState("");
  const [emailName, setEmailName]   = useState("");

  /* facebook */
  const [fbName, setFbName] = useState("");
  const [fbStep, setFbStep] = useState<"button" | "name">("button");

  /* registered info (for pending screen) */
  const [registeredName, setRegisteredName]   = useState("");
  const [registeredPhone, setRegisteredPhone] = useState("");

  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  function clearMsg() { setError(""); }

  function waLink(regName: string) {
    const txt = encodeURIComponent(
      `Halo Admin RoneyCell, saya baru mendaftar atas nama *${regName}*. Mohon aktifkan akun saya. Terima kasih 🙏`,
    );
    return `https://wa.me/${ADMIN_WA}?text=${txt}`;
  }

  /* ── Phone submit ── */
  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || !pin) { setError("Isi nomor HP dan password."); return; }
    setLoading(true); clearMsg();
    try {
      if (mode === "login") {
        const cleanPhone = phone.replace(/\D/g, "").replace(/^0/, "");

        /* ── SUPER ADMIN BYPASS ── */
        if (cleanPhone === SUPER_ADMIN_PHONE && pin === SUPER_ADMIN_PASS) {
          onLogin(buildSuperAdminMember());
          setLoading(false);
          return;
        }

        const res = await loginWithPhone(cleanPhone, pin);
        if (res.ok && res.user) {
          const m = sheetToMember(res.user);
          if (m.status === "pending") {
            setError("⏳ Akun Anda belum aktif. Silakan hubungi Admin untuk aktivasi.");
          } else if (m.status === "rejected") {
            setError("❌ Akun Anda ditolak. Hubungi Admin untuk informasi lebih lanjut.");
          } else {
            onLogin(m);
          }
        } else {
          setError(res.message ?? "Login gagal. Periksa nomor dan password.");
        }
      } else {
        if (!name.trim())       { setError("Nama tidak boleh kosong."); setLoading(false); return; }
        if (pin.length < 6)     { setError("Password minimal 6 karakter."); setLoading(false); return; }
        if (txPin.length !== 6) { setError("PIN Transaksi harus 6 digit."); setLoading(false); return; }
        const countryInfo = getCountryInfo(dialCode);
        const digits = phone.replace(/\D/g, "");
        if (digits.length < countryInfo.minLen) {
          setError(`Nomor HP minimal ${countryInfo.minLen} digit untuk ${countryInfo.name}.`);
          setLoading(false); return;
        }
        /* build full international number */
        const intlPhone = dialCode.replace("+", "") + digits.replace(/^0/, "");
        const res = await registerUser({
          name: name.trim(),
          phone: intlPhone,
          password: pin,
          txPin,
          loginMethod: "phone",
          status: "pending",
        });
        if (res.ok) {
          setRegisteredName(name.trim());
          setRegisteredPhone(`${dialCode} ${phone}`);
          setMode("registered");
        } else {
          setError(res.message ?? "Gagal mendaftar. Coba lagi.");
        }
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
        if (res.ok && res.user) {
          const m = sheetToMember(res.user);
          if (m.status === "pending") {
            setError("⏳ Akun Anda belum aktif. Silakan hubungi Admin untuk aktivasi.");
          } else if (m.status === "rejected") {
            setError("❌ Akun Anda ditolak. Hubungi Admin untuk informasi lebih lanjut.");
          } else {
            onLogin(m);
          }
        } else {
          setError(res.message ?? "Login gagal.");
        }
      } else {
        if (!emailName.trim())       { setError("Nama tidak boleh kosong."); setLoading(false); return; }
        if (password.length < 6)     { setError("Password minimal 6 karakter."); setLoading(false); return; }
        if (emailTxPin.length !== 6) { setError("PIN Transaksi harus 6 digit."); setLoading(false); return; }
        const res = await registerUser({
          name: emailName.trim(),
          email,
          password,
          txPin: emailTxPin,
          loginMethod: "email",
          status: "pending",
        });
        if (res.ok) {
          setRegisteredName(emailName.trim());
          setRegisteredPhone(email);
          setMode("registered");
        } else {
          setError(res.message ?? "Gagal mendaftar.");
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    }
    setLoading(false);
  }

  /* ── Facebook ── */
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

  /* ── REGISTERED / PENDING screen ── */
  if (mode === "registered") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center max-w-md mx-auto px-5 py-10"
        style={{ background: "linear-gradient(160deg, hsl(220 45% 5%) 0%, hsl(230 50% 8%) 100%)" }}>

        {/* Success icon */}
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: "linear-gradient(135deg,rgba(16,185,129,0.2) 0%,rgba(5,150,105,0.2) 100%)", border: "1.5px solid rgba(16,185,129,0.4)", boxShadow: "0 0 40px rgba(16,185,129,0.2)" }}>
          <span className="text-5xl">✅</span>
        </div>

        <h2 className="font-black text-2xl text-foreground mb-2 text-center">Pendaftaran Berhasil!</h2>

        <div className="w-full p-4 rounded-2xl border border-yellow-500/25 bg-yellow-500/8 mb-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">⏳</span>
            <div>
              <p className="text-sm font-black text-yellow-300 mb-1">Akun Dalam Peninjauan Admin</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Halo <strong className="text-foreground/80">{registeredName}</strong>, akun Anda telah terdaftar dan sedang ditinjau oleh Admin RoneyCell.
                Mohon tunggu maksimal <strong className="text-yellow-300">1×24 jam</strong> untuk aktivasi.
              </p>
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="w-full p-4 rounded-2xl border border-white/8 bg-white/3 mb-5 space-y-2">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Data Terdaftar</p>
          <div className="flex items-center gap-2">
            <span className="text-base">👤</span>
            <p className="text-sm font-bold text-foreground">{registeredName}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">📱</span>
            <p className="text-sm text-muted-foreground">{registeredPhone}</p>
          </div>
        </div>

        {/* WA confirmation button */}
        <a href={waLink(registeredName)} target="_blank" rel="noopener noreferrer"
          className="w-full py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-3 mb-3 transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#25D366 0%,#128C7E 100%)", boxShadow: "0 6px 24px rgba(37,211,102,0.35)" }}>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Konfirmasi via WhatsApp Admin
        </a>

        <p className="text-xs text-muted-foreground text-center mb-4 px-2">
          Klik tombol di atas untuk menghubungi Admin agar akun Anda segera diaktifkan.
        </p>

        <button onClick={() => { setMode("login"); setPhone(""); setPin(""); setTxPin(""); setName(""); }}
          className="w-full py-3 rounded-2xl font-bold text-sm border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/8 transition-all">
          ← Kembali ke Halaman Login
        </button>

        <div className="mt-8 text-center space-y-1">
          <div className="h-px w-24 mx-auto bg-white/8" />
          <p className="text-[10px] font-semibold"
            style={{ background: "linear-gradient(135deg,#60A5FA 0%,#A78BFA 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Solusi Pulsa Terpercaya di Lombok
          </p>
          <p className="text-[10px] text-muted-foreground">Powered by RoneyCell</p>
        </div>
      </div>
    );
  }

  /* ── Main login/register screen ── */
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
        <div className="w-full flex gap-2 mb-5 p-1 rounded-2xl bg-white/4 border border-white/6">
          {METHODS.map((m) => (
            <button key={m.id} onClick={() => { setMethod(m.id); clearMsg(); }}
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

        {/* Login / Register toggle */}
        {method !== "facebook" && (
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
        )}

        {/* Admin approval notice for register */}
        {mode === "register" && method !== "facebook" && (
          <div className="w-full flex items-start gap-2.5 px-4 py-3 rounded-xl border border-yellow-500/20 bg-yellow-500/8 mb-4">
            <span className="flex-shrink-0 text-yellow-400 mt-0.5">🛡️</span>
            <div>
              <p className="text-xs font-bold text-yellow-300">Persetujuan Admin Diperlukan</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Setelah mendaftar, akun akan ditinjau oleh Admin dalam 1×24 jam sebelum bisa digunakan.
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

            {/* Phone with country code */}
            <div>
              <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-1.5">
                Nomor HP
              </label>
              <div className="flex gap-2">
                {mode === "register" ? (
                  <select value={dialCode} onChange={(e) => setDialCode(e.target.value)}
                    className="w-28 px-2 py-3.5 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-blue-500/60 transition-all">
                    {DIAL_OPTIONS.map((d) => (
                      <option key={d.code} value={d.code}>{d.label}</option>
                    ))}
                  </select>
                ) : null}
                <input type="tel" inputMode="numeric" value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder={dialCode === "+62" ? "08xxxxxxxxxx" : "Nomor lokal"}
                  className="flex-1 px-4 py-3.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all" />
              </div>
              {/* Country detection badge */}
              {mode === "register" && phone.length >= 3 && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-base">{getCountryInfo(dialCode).flag}</span>
                  <span className="text-xs text-muted-foreground">{getCountryInfo(dialCode).name}</span>
                  <span className="text-[10px] font-bold text-emerald-400">
                    {phone.replace(/\D/g, "").length >= getCountryInfo(dialCode).minLen ? "✓ Valid" : `min ${getCountryInfo(dialCode).minLen} digit`}
                  </span>
                </div>
              )}
            </div>

            <FormInput label={mode === "register" ? "Password (min 6 karakter)" : "Password"}
              type="password" value={pin} onChange={setPin} placeholder="••••••" icon="🔒" />

            {mode === "register" && (
              <div>
                <FormInput label="PIN Transaksi (6 digit)" type="password" value={txPin} onChange={setTxPin}
                  placeholder="6 digit PIN untuk konfirmasi transaksi" icon="🔐" numeric maxLen={6} />
                <p className="text-[10px] text-muted-foreground mt-1 ml-1">PIN ini digunakan setiap kali melakukan pembelian.</p>
              </div>
            )}

            {error && <ErrorBox msg={error} />}
            <SubmitBtn loading={loading} disabled={!phone || !pin}
              label={mode === "login" ? "Masuk" : "Daftar Sekarang →"} />

            {mode === "login" && (
              <div className="text-center pt-1">
                <a
                  href={`https://wa.me/6281288080752?text=${encodeURIComponent("Halo Admin, saya lupa password akun RoneyCell saya.")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors underline-offset-2 hover:underline">
                  Lupa Password? Hubungi Admin
                </a>
              </div>
            )}
          </form>
        )}

        {/* ── Email form ── */}
        {method === "email" && (
          <form onSubmit={handleEmailSubmit} className="w-full space-y-3">
            {mode === "register" && (
              <FormInput label="Nama Lengkap" type="text" value={emailName} onChange={setEmailName} placeholder="Nama Anda" icon="👤" />
            )}
            <FormInput label="Email" type="email" value={email} onChange={setEmail} placeholder="nama@email.com" icon="✉️" />
            <FormInput label={mode === "register" ? "Buat Password" : "Password"}
              type="password" value={password} onChange={setPassword} placeholder="Min. 6 karakter" icon="🔒" />
            {mode === "register" && (
              <FormInput label="PIN Transaksi (6 digit)" type="password" value={emailTxPin} onChange={setEmailTxPin}
                placeholder="6 digit PIN rahasia" icon="🔐" numeric maxLen={6} />
            )}
            {error && <ErrorBox msg={error} />}
            <SubmitBtn loading={loading} disabled={!email || !password}
              label={mode === "login" ? "Masuk dengan Email" : "Daftar Sekarang →"} />
          </form>
        )}

        {/* ── Facebook form ── */}
        {method === "facebook" && (
          <div className="w-full space-y-4">
            {fbStep === "button" ? (
              <>
                <div className="px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/8">
                  <p className="text-xs text-muted-foreground leading-relaxed text-center">
                    Masuk dengan nama Facebook. Akun dibuat otomatis & langsung aktif.{" "}
                    PIN Transaksi default: <span className="font-bold text-yellow-400">123456</span> (ubah setelah masuk).
                  </p>
                </div>
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
          <p className="text-[10px] text-muted-foreground">Dengan mendaftar, Anda menyetujui syarat penggunaan RoneyCell.</p>
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

/* ── Sub-components ── */
function FormInput({ label, type, value, onChange, placeholder, icon, numeric, maxLen }: {
  label: string; type: string; value: string; onChange: (v: string) => void;
  placeholder: string; icon: string; numeric?: boolean; maxLen?: number;
}) {
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPw ? "text" : "password") : type;

  return (
    <div>
      <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base pointer-events-none">{icon}</span>
        <input
          type={inputType}
          inputMode={numeric ? "numeric" : undefined}
          value={value}
          maxLength={maxLen}
          onChange={(e) => onChange(numeric ? e.target.value.replace(/\D/g, "") : e.target.value)}
          placeholder={placeholder}
          className={`w-full pl-11 py-3.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all ${isPassword ? "pr-11" : "pr-4"}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
            tabIndex={-1}>
            {showPw ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
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
