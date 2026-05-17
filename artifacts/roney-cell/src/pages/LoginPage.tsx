/**
 * Halaman Login & Daftar — menggunakan PostgreSQL v2
 */
import { useState } from "react";
import { v2Login, v2Register, type V2User } from "@/lib/apiV2";
import { Member } from "@/lib/members";
import { getCountryInfo, COUNTRY_MAP } from "@/lib/operator";

type Mode = "login" | "register" | "registered";

const ADMIN_WA = "6281288080752";

const DIAL_OPTIONS = Object.values(COUNTRY_MAP).map((c) => ({
  code: c.dialCode,
  flag: c.flag,
  name: c.name,
  label: `${c.flag} ${c.dialCode}`,
}));

function v2UserToMember(u: V2User): Member {
  return {
    id: String(u.id),
    name: u.name,
    phone: u.phone,
    email: u.email,
    whatsapp: u.phone,
    pin: "",
    type: u.role === "superadmin" || u.role === "admin" ? "admin" : u.role === "reseller" ? "reseller" : "member",
    status: u.status === "active" ? "approved" : u.status === "pending" ? "pending" : "rejected",
    balance: u.balance ?? 0,
    loginMethod: "phone",
    createdAt: u.createdAt,
    approvedAt: u.status === "active" ? u.createdAt : undefined,
    notes: u.role === "superadmin" ? "__superadmin__" : undefined,
  };
}

interface LoginPageProps {
  onLogin: (member: Member) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [dialCode, setDialCode] = useState("+62");
  const [phone, setPhone]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [registeredName, setRegisteredName]   = useState("");
  const [registeredPhone, setRegisteredPhone] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  function clearMsg() { setError(""); }

  function waLink(regName: string) {
    const txt = encodeURIComponent(
      `Halo Admin RoneyCell, saya baru mendaftar atas nama *${regName}*. Mohon aktifkan akun saya. Terima kasih 🙏`,
    );
    return `https://wa.me/${ADMIN_WA}?text=${txt}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearMsg();
    if (!phone.trim() || !password.trim()) { setError("Isi nomor HP dan password."); return; }
    const digits = phone.replace(/\D/g, "");

    if (mode === "login") {
      const cleanPhone = dialCode.replace("+", "") + digits.replace(/^0/, "");
      setLoading(true);
      try {
        const res = await v2Login({ phone: cleanPhone, password });
        const m = v2UserToMember(res.user);
        if (m.status === "pending") {
          setError("Akun Anda belum aktif. Silakan hubungi Admin untuk aktivasi.");
        } else if (m.status === "rejected") {
          setError("Akun Anda ditolak. Hubungi Admin untuk informasi lebih lanjut.");
        } else {
          onLogin(m);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Login gagal. Periksa nomor dan password.");
      }
      setLoading(false);
    } else {
      if (!name.trim()) { setError("Nama tidak boleh kosong."); return; }
      if (password.length < 6) { setError("Password minimal 6 karakter."); return; }
      const countryInfo = getCountryInfo(dialCode);
      if (digits.length < countryInfo.minLen) {
        setError(`Nomor HP minimal ${countryInfo.minLen} digit untuk ${countryInfo.name}.`);
        return;
      }
      const intlPhone = dialCode.replace("+", "") + digits.replace(/^0/, "");
      setLoading(true);
      try {
        await v2Register({ phone: intlPhone, name: name.trim(), password });
        setRegisteredName(name.trim());
        setRegisteredPhone(`${dialCode} ${phone}`);
        setMode("registered");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Gagal mendaftar. Coba lagi.");
      }
      setLoading(false);
    }
  }

  /* ── REGISTERED screen ── */
  if (mode === "registered") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center max-w-md mx-auto px-5 py-10"
        style={{ background: "#0B0F1A" }}>
        <div className="w-full anim-scale-in">
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4"
              style={{ background: "linear-gradient(135deg,rgba(16,185,129,0.2) 0%,rgba(5,150,105,0.15) 100%)", border:"1.5px solid rgba(16,185,129,0.35)" }}>
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h2 className="font-black text-2xl text-white mb-1">Pendaftaran Berhasil!</h2>
            <p className="text-sm text-white/50 text-center">Akun Anda sedang dalam peninjauan</p>
          </div>

          <div className="surface p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#F59E0B" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4M12 16h.01"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-amber-300 mb-0.5">Menunggu Aktivasi Admin</p>
                <p className="text-xs text-white/50 leading-relaxed">
                  Halo <strong className="text-white/70">{registeredName}</strong>, akun Anda telah terdaftar. Admin akan mengaktifkan dalam <strong className="text-amber-300">1×24 jam</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="surface p-4 mb-5 space-y-2.5">
            <p className="text-[10px] text-white/35 font-bold uppercase tracking-widest">Data Terdaftar</p>
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center text-xs">👤</span>
              <p className="text-sm font-semibold text-white/85">{registeredName}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center text-xs">📱</span>
              <p className="text-sm text-white/55">{registeredPhone}</p>
            </div>
          </div>

          <a href={waLink(registeredName)} target="_blank" rel="noopener noreferrer"
            className="w-full py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2.5 mb-3 transition-opacity hover:opacity-90 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg,#25D366 0%,#128C7E 100%)", boxShadow:"0 4px 20px rgba(37,211,102,0.3)" }}>
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Hubungi Admin via WhatsApp
          </a>

          <button onClick={() => { setMode("login"); setPhone(""); setPassword(""); setName(""); }}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white/50 hover:text-white/75 bg-white/5 border border-white/8 hover:bg-white/8 transition-all">
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  /* ── Main login/register screen ── */
  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto px-5 pt-safe"
      style={{ background: "#0B0F1A" }}>

      {/* Header dekoratif */}
      <div className="relative overflow-hidden pt-12 pb-8 flex flex-col items-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, #1A56DB 0%, transparent 70%)" }} />
        <div className="relative z-10 flex flex-col items-center">
          {/* Logo */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-xl"
            style={{ background: "linear-gradient(135deg,#1A56DB 0%,#1C3FAA 100%)", boxShadow:"0 0 40px rgba(26,86,219,0.5),0 8px 24px rgba(0,0,0,0.4)" }}>
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z"/>
            </svg>
          </div>
          <h1 className="font-black text-3xl tracking-tight mb-1 gradient-text-brand">RoneyCell</h1>
          <p className="text-[11px] text-white/35 tracking-[0.18em] uppercase font-semibold">Sistem Jualan Pulsa Profesional</p>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="w-full flex gap-1 mb-6 p-1 rounded-2xl bg-white/5 border border-white/6">
        {(["login", "register"] as const).map((m) => (
          <button key={m} onClick={() => { setMode(m); clearMsg(); }}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all"
            style={mode === m
              ? { background: "linear-gradient(135deg,#1A56DB 0%,#1C3FAA 100%)", color: "#fff", boxShadow: "0 2px 12px rgba(26,86,219,0.4)" }
              : { color: "rgba(255,255,255,0.38)" }
            }>
            {m === "login" ? "Masuk" : "Daftar"}
          </button>
        ))}
      </div>

      {/* Notice untuk register */}
      {mode === "register" && (
        <div className="surface-sm flex items-start gap-3 p-3.5 mb-4 anim-slide-down">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background:"rgba(245,158,11,0.15)", border:"1px solid rgba(245,158,11,0.3)" }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#F59E0B" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-amber-300 mb-0.5">Persetujuan Admin Diperlukan</p>
            <p className="text-[11px] text-white/45 leading-relaxed">Akun akan ditinjau Admin dalam 1×24 jam setelah pendaftaran.</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-3.5 flex-1">
        {mode === "register" && (
          <InputField label="Nama Lengkap" type="text" value={name} onChange={setName}
            placeholder="Nama Anda"
            icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
          />
        )}

        {/* Phone field */}
        <div>
          <label className="text-[11px] text-white/40 tracking-widest uppercase font-bold block mb-1.5">Nomor HP</label>
          <div className="flex gap-2">
            {mode === "register" && (
              <select value={dialCode} onChange={(e) => setDialCode(e.target.value)}
                className="w-28 px-3 py-3.5 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/60 transition-all">
                {DIAL_OPTIONS.map((d) => (
                  <option key={d.code} value={d.code} style={{ background: "#111827" }}>{d.label}</option>
                ))}
              </select>
            )}
            <input type="tel" inputMode="numeric" value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder={dialCode === "+62" ? "08xxxxxxxxxx" : "Nomor lokal"}
              className="flex-1 px-4 py-3.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/25 transition-all"
            />
          </div>
          {mode === "register" && phone.length >= 3 && (
            <div className="flex items-center gap-1.5 mt-1.5 pl-1">
              <span className="text-sm">{getCountryInfo(dialCode).flag}</span>
              <span className="text-[11px] text-white/40">{getCountryInfo(dialCode).name}</span>
              <span className={`text-[10px] font-bold ${phone.replace(/\D/g,"").length >= getCountryInfo(dialCode).minLen ? "text-emerald-400" : "text-white/30"}`}>
                {phone.replace(/\D/g,"").length >= getCountryInfo(dialCode).minLen ? "✓ Valid" : `min ${getCountryInfo(dialCode).minLen} digit`}
              </span>
            </div>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="text-[11px] text-white/40 tracking-widest uppercase font-bold block mb-1.5">
            {mode === "register" ? "Password (min 6 karakter)" : "Password"}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </span>
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="w-full pl-11 pr-11 py-3.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/25 transition-all"
            />
            <button type="button" onClick={() => setShowPw(p => !p)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/60 transition-colors p-1">
              {showPw ? (
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                </svg>
              ) : (
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-red-500/25 bg-red-500/8 anim-fade-in">
            <svg width="15" height="15" className="flex-shrink-0 mt-0.5" fill="none" stroke="#F87171" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4M12 16h.01"/>
            </svg>
            <p className="text-xs text-red-300 leading-relaxed">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={loading || !phone || !password}
          className="w-full py-4 rounded-2xl font-black text-sm text-white transition-all disabled:opacity-40 btn-brand mt-1"
          style={{ marginTop: "4px" }}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="spinner w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block" />
              Memproses...
            </span>
          ) : mode === "login" ? "Masuk" : "Daftar Sekarang"}
        </button>

        {mode === "login" && (
          <div className="text-center">
            <a href={`https://wa.me/${ADMIN_WA}?text=${encodeURIComponent("Halo Admin, saya lupa password akun RoneyCell saya.")}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-400/80 hover:text-blue-300 transition-colors">
              Lupa Password? Hubungi Admin
            </a>
          </div>
        )}
      </form>

      {/* Footer */}
      <div className="py-8 text-center space-y-1.5">
        <div className="h-px w-20 mx-auto bg-white/6 mb-3" />
        <p className="text-[10px] gradient-text-brand font-bold tracking-wider">Solusi Pulsa Terpercaya • Lombok</p>
        <p className="text-[10px] text-white/25">© 2025 RoneyCell</p>
      </div>
    </div>
  );
}

function InputField({ label, type, value, onChange, placeholder, icon }: {
  label: string; type: string; value: string; onChange: (v: string) => void;
  placeholder: string; icon: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[11px] text-white/40 tracking-widest uppercase font-bold block mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/25 transition-all"
        />
      </div>
    </div>
  );
}
