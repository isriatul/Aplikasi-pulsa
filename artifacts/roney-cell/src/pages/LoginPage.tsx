/**
 * Halaman Login & Daftar — desain light theme Deep Crimson
 */
import { useState } from "react";
import { v2Login, v2Register, type V2User } from "@/lib/apiV2";
import { Member } from "@/lib/members";
import { getCountryInfo, COUNTRY_MAP } from "@/lib/operator";

type Mode = "login" | "register" | "registered";

const ADMIN_WA = "6281288080752";
const CRIMSON   = "#B91C1C";
const CRIMSON_D = "#991B1B";
const CHARCOAL  = "#1F2937";
const GREY      = "#6B7280";
const BORDER    = "#D1D5DB";
const BG        = "#F8F9FA";

const DIAL_OPTIONS = Object.values(COUNTRY_MAP).map((c) => ({
  code: c.dialCode, flag: c.flag, name: c.name, label: `${c.flag} ${c.dialCode}`,
}));

function v2UserToMember(u: V2User): Member {
  return {
    id: String(u.id), name: u.name, phone: u.phone, email: u.email,
    whatsapp: u.phone, pin: "",
    type: u.role === "superadmin" || u.role === "admin" ? "admin" : u.role === "reseller" ? "reseller" : "member",
    status: u.status === "active" ? "approved" : u.status === "pending" ? "pending" : "rejected",
    balance: u.balance ?? 0, loginMethod: "phone", createdAt: u.createdAt,
    approvedAt: u.status === "active" ? u.createdAt : undefined,
    notes: u.role === "superadmin" ? "__superadmin__" : undefined,
  };
}

interface LoginPageProps { onLogin: (member: Member) => void; }

/* ─── Icon helpers ─── */
const IconPerson = () => (
  <svg width="18" height="18" fill="none" stroke={GREY} strokeWidth="1.8" viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4"/><path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);
const IconPhone = () => (
  <svg width="18" height="18" fill="none" stroke={GREY} strokeWidth="1.8" viewBox="0 0 24 24">
    <rect x="5" y="2" width="14" height="20" rx="2"/>
    <circle cx="12" cy="17" r="1" fill={GREY} stroke="none"/>
  </svg>
);
const IconLock = () => (
  <svg width="18" height="18" fill="none" stroke={GREY} strokeWidth="1.8" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);
const IconEye = ({ show }: { show: boolean }) => show ? (
  <svg width="17" height="17" fill="none" stroke={GREY} strokeWidth="1.8" viewBox="0 0 24 24">
    <path strokeLinecap="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
  </svg>
) : (
  <svg width="17" height="17" fill="none" stroke={GREY} strokeWidth="1.8" viewBox="0 0 24 24">
    <path strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
  </svg>
);
const IconWA = () => (
  <svg width="22" height="22" fill="#25D366" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

/* ─── Light input field ─── */
function LightInput({
  icon, placeholder, value, onChange, type = "text",
  rightEl, onRightClick,
}: {
  icon: React.ReactNode; placeholder: string; value: string;
  onChange: (v: string) => void; type?: string;
  rightEl?: React.ReactNode; onRightClick?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
      style={{ background: "#fff", border: `1.5px solid ${BORDER}` }}>
      <span className="shrink-0">{icon}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 text-sm outline-none bg-transparent"
        style={{ color: CHARCOAL }}
      />
      {rightEl && (
        <button type="button" onClick={onRightClick} className="shrink-0">
          {rightEl}
        </button>
      )}
    </div>
  );
}

/* ─── Logo component ─── */
function RoneyCellLogo() {
  return (
    <div className="flex flex-col items-center select-none">
      <div className="leading-none text-center">
        <span className="block font-black tracking-tight" style={{ color: CRIMSON, fontSize: "3rem", lineHeight: 1.05 }}>Roney</span>
        <div className="relative">
          <span className="block font-black tracking-tight" style={{ color: CRIMSON, fontSize: "3rem", lineHeight: 1.05 }}>Cell</span>
          {/* decorative swoosh underline — mirip referensi */}
          <svg viewBox="0 0 100 12" className="w-24 mt-1 mx-auto" fill="none">
            <path d="M8 9 Q50 2 92 9" stroke={CRIMSON} strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ─── REGISTERED screen ─── */
function RegisteredScreen({
  name, phoneDisplay, onBack,
}: { name: string; phoneDisplay: string; onBack: () => void }) {
  const txt = encodeURIComponent(
    `Halo Admin RoneyCell, saya baru mendaftar atas nama *${name}*. Mohon aktifkan akun saya. Terima kasih 🙏`,
  );
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center max-w-md mx-auto px-5 py-10"
      style={{ background: BG }}>
      <div className="w-full bg-white rounded-3xl p-6 shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
        {/* Check icon */}
        <div className="flex flex-col items-center mb-5">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ background: "#DCFCE7" }}>
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 className="font-black text-2xl text-center" style={{ color: CHARCOAL }}>Pendaftaran Berhasil!</h2>
          <p className="text-sm text-center mt-1" style={{ color: GREY }}>Akun Anda sedang dalam peninjauan</p>
        </div>

        {/* Info box */}
        <div className="rounded-xl p-4 mb-4" style={{ background: "#FEF3C7", border: "1px solid #FDE68A" }}>
          <p className="text-sm font-bold mb-1" style={{ color: "#92400E" }}>Menunggu Aktivasi Admin</p>
          <p className="text-xs leading-relaxed" style={{ color: "#78350F" }}>
            Halo <strong>{name}</strong>, akun Anda telah terdaftar. Admin akan mengaktifkan dalam <strong>1×24 jam</strong>.
          </p>
        </div>

        {/* Data */}
        <div className="rounded-xl p-4 mb-5 space-y-2" style={{ background: BG, border: `1px solid ${BORDER}` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: GREY }}>Data Terdaftar</p>
          <div className="flex items-center gap-2">
            <span style={{ color: CHARCOAL }}>👤</span>
            <span className="text-sm font-semibold" style={{ color: CHARCOAL }}>{name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: CHARCOAL }}>📱</span>
            <span className="text-sm" style={{ color: GREY }}>{phoneDisplay}</span>
          </div>
        </div>

        <a href={`https://wa.me/${ADMIN_WA}?text=${txt}`} target="_blank" rel="noopener noreferrer"
          className="w-full py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2.5 mb-3 transition-opacity hover:opacity-90"
          style={{ background: "#25D366" }}>
          <IconWA />
          Hubungi Admin via WhatsApp
        </a>

        <button onClick={onBack}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
          style={{ background: BG, border: `1.5px solid ${BORDER}`, color: GREY }}>
          Kembali ke Login
        </button>
      </div>

      <p className="mt-6 text-sm font-black" style={{ color: CRIMSON }}>RoneyCell</p>
    </div>
  );
}

/* ─── Main component ─── */
export default function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode]           = useState<Mode>("login");
  const [dialCode, setDialCode]   = useState("+62");
  const [phone, setPhone]         = useState("");
  const [password, setPassword]   = useState("");
  const [name, setName]           = useState("");
  const [registeredName, setRegisteredName]   = useState("");
  const [registeredPhone, setRegisteredPhone] = useState("");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [agreed, setAgreed]   = useState(false);

  function clearMsg() { setError(""); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearMsg();
    if (!phone.trim() || !password.trim()) { setError("Isi nomor HP dan password."); return; }
    if (mode === "login" && !agreed) { setError("Centang persetujuan syarat & ketentuan terlebih dahulu."); return; }
    const digits = phone.replace(/\D/g, "");

    if (mode === "login") {
      const cleanPhone = dialCode.replace("+", "") + digits.replace(/^0/, "");
      setLoading(true);
      try {
        const res = await v2Login({ phone: cleanPhone, password });
        const m = v2UserToMember(res.user);
        if (m.status === "pending") setError("Akun Anda belum aktif. Hubungi Admin untuk aktivasi.");
        else if (m.status === "rejected") setError("Akun Anda ditolak. Hubungi Admin.");
        else onLogin(m);
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

  if (mode === "registered") {
    return (
      <RegisteredScreen
        name={registeredName}
        phoneDisplay={registeredPhone}
        onBack={() => { setMode("login"); setPhone(""); setPassword(""); setName(""); }}
      />
    );
  }

  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto pt-safe" style={{ background: BG }}>
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">

        {/* Title */}
        <div className="pt-10 pb-6 text-center">
          <h1 className="font-black text-3xl tracking-widest uppercase" style={{ color: CHARCOAL }}>
            {mode === "login" ? "LOGIN" : "DAFTAR"}
          </h1>
        </div>

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <RoneyCellLogo />
        </div>

        {/* Register notice */}
        {mode === "register" && (
          <div className="rounded-xl p-3.5 mb-4 flex items-start gap-3"
            style={{ background: "#FEF9C3", border: "1px solid #FDE68A" }}>
            <svg width="16" height="16" className="shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="#D97706" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <p className="text-xs leading-relaxed" style={{ color: "#92400E" }}>
              <strong>Persetujuan Admin Diperlukan.</strong> Akun akan ditinjau dalam 1×24 jam.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-3">

          {/* Nama — register only */}
          {mode === "register" && (
            <LightInput
              icon={<IconPerson />}
              placeholder="Nama Lengkap"
              value={name}
              onChange={setName}
            />
          )}

          {/* Phone */}
          <div>
            {mode === "register" ? (
              <div className="flex gap-2">
                <select
                  value={dialCode}
                  onChange={(e) => setDialCode(e.target.value)}
                  className="w-28 px-3 py-3.5 rounded-xl text-sm font-bold outline-none"
                  style={{ background: "#fff", border: `1.5px solid ${BORDER}`, color: CHARCOAL }}
                >
                  {DIAL_OPTIONS.map((d) => (
                    <option key={d.code} value={d.code}>{d.label}</option>
                  ))}
                </select>
                <div className="flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl"
                  style={{ background: "#fff", border: `1.5px solid ${BORDER}` }}>
                  <IconPhone />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="Nomor HP"
                    className="flex-1 text-sm outline-none bg-transparent"
                    style={{ color: CHARCOAL }}
                  />
                </div>
              </div>
            ) : (
              <LightInput
                icon={<IconPhone />}
                placeholder="No HP (contoh: 08xxxxxxxxxx)"
                value={phone}
                onChange={(v) => setPhone(v.replace(/\D/g, ""))}
                type="tel"
              />
            )}
            {/* Lupa password link — login only */}
            {mode === "login" && (
              <div className="flex justify-end mt-1.5">
                <a
                  href={`https://wa.me/${ADMIN_WA}?text=${encodeURIComponent("Halo Admin, saya lupa password RoneyCell saya.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold"
                  style={{ color: CRIMSON }}
                >
                  Lupa Password?
                </a>
              </div>
            )}
          </div>

          {/* Password */}
          <LightInput
            icon={<IconLock />}
            placeholder={mode === "register" ? "Password (min 6 karakter)" : "Password"}
            value={password}
            onChange={setPassword}
            type={showPw ? "text" : "password"}
            rightEl={<IconEye show={showPw} />}
            onRightClick={() => setShowPw((p) => !p)}
          />

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
              style={{ background: "#FEE2E2", border: "1px solid #FECACA" }}>
              <svg width="15" height="15" className="shrink-0 mt-0.5" fill="none" stroke={CRIMSON} strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4M12 16h.01"/>
              </svg>
              <p className="text-xs leading-relaxed" style={{ color: CRIMSON_D }}>{error}</p>
            </div>
          )}

          {/* Terms checkbox — login */}
          {mode === "login" && (
            <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
              <div
                className="w-5 h-5 rounded shrink-0 mt-0.5 flex items-center justify-center transition-colors"
                style={{
                  border: `2px solid ${agreed ? CRIMSON : BORDER}`,
                  background: agreed ? CRIMSON : "#fff",
                }}
                onClick={() => setAgreed((a) => !a)}
              >
                {agreed && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="text-sm leading-relaxed" style={{ color: GREY }}>
                Dengan login, Anda telah setuju dengan{" "}
                <a
                  href={`https://wa.me/${ADMIN_WA}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold"
                  style={{ color: CRIMSON }}
                  onClick={(e) => e.stopPropagation()}
                >
                  syarat dan ketentuan
                </a>{" "}
                yang berlaku.
              </span>
            </label>
          )}

          {/* Terms checkbox — register */}
          {mode === "register" && (
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <div
                className="w-5 h-5 rounded shrink-0 mt-0.5 flex items-center justify-center transition-colors"
                style={{
                  border: `2px solid ${agreed ? CRIMSON : BORDER}`,
                  background: agreed ? CRIMSON : "#fff",
                }}
                onClick={() => setAgreed((a) => !a)}
              >
                {agreed && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="text-sm leading-relaxed" style={{ color: GREY }}>
                Saya setuju dengan{" "}
                <a
                  href={`https://wa.me/${ADMIN_WA}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold"
                  style={{ color: CRIMSON }}
                  onClick={(e) => e.stopPropagation()}
                >
                  syarat dan ketentuan
                </a>{" "}
                yang berlaku.
              </span>
            </label>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || !phone || !password || !agreed}
            className="w-full py-4 rounded-xl font-black text-base text-white uppercase tracking-widest transition-all disabled:opacity-50 active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${CRIMSON} 0%, ${CRIMSON_D} 100%)`,
              boxShadow: `0 4px 20px rgba(185,28,28,0.35)`,
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                Memproses...
              </span>
            ) : mode === "login" ? "LOGIN" : "DAFTAR"}
          </button>

          {/* Switch mode */}
          <p className="text-center text-sm" style={{ color: GREY }}>
            {mode === "login" ? (
              <>
                Belum punya akun?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("register"); clearMsg(); setAgreed(false); }}
                  className="font-bold"
                  style={{ color: CRIMSON }}
                >
                  Daftar sekarang!
                </button>
              </>
            ) : (
              <>
                Sudah punya akun?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("login"); clearMsg(); setAgreed(false); }}
                  className="font-bold"
                  style={{ color: CRIMSON }}
                >
                  Login di sini!
                </button>
              </>
            )}
          </p>
        </form>

        {/* Divider & help */}
        <div className="mt-6 mb-1">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: BORDER }} />
            <span className="text-xs font-semibold px-1" style={{ color: GREY }}>Perlu Bantuan?</span>
            <div className="flex-1 h-px" style={{ background: BORDER }} />
          </div>
        </div>

        <div className="flex justify-center mt-3">
          <a
            href={`https://wa.me/${ADMIN_WA}?text=${encodeURIComponent("Halo Admin RoneyCell, saya butuh bantuan.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
            style={{ background: "#DCFCE7", color: "#166534" }}
          >
            <IconWA />
            Hubungi Kami (Chat Only)
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="py-5 text-center" style={{ borderTop: `1px solid ${BORDER}`, background: "#fff" }}>
        <p className="font-black text-base" style={{ color: CHARCOAL }}>RoneyCell</p>
        <p className="text-xs mt-0.5" style={{ color: GREY }}>Solusi Pulsa Terpercaya • Lombok</p>
      </div>
    </div>
  );
}
