import { useState } from "react";
import { Member, loginMember, registerMember } from "@/lib/members";
import { formatRupiah } from "@/lib/products";
import { loadConfig, buildWhatsAppUrl } from "@/lib/config";
import { TYPE_LABELS, TYPE_COLORS } from "@/lib/members";

type PortalView = "login" | "register" | "dashboard";

interface MemberPortalProps {
  member: Member | null;
  onLogin: (m: Member) => void;
  onLogout: () => void;
}

export default function MemberPortal({ member, onLogin, onLogout }: MemberPortalProps) {
  const [view, setView] = useState<PortalView>(member ? "dashboard" : "login");
  if (member && view !== "dashboard") setView("dashboard");
  if (view === "register") return <RegisterForm onSuccess={(m) => { onLogin(m); }} onBack={() => setView("login")} />;
  if (view === "login" || !member) return <LoginForm onLogin={onLogin} onRegister={() => setView("register")} />;
  return <Dashboard member={member} onLogout={() => { onLogout(); setView("login"); }} />;
}

function LoginForm({ onLogin, onRegister }: { onLogin: (m: Member) => void; onRegister: () => void }) {
  const [phone, setPhone] = useState("");
  const [pin, setPin]     = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTimeout(() => {
      const result = loginMember(phone, pin);
      if (result.success && result.member) { onLogin(result.member); }
      else { setError(result.message); }
      setLoading(false);
    }, 500);
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center max-w-md mx-auto px-5 pb-28">
      <div className="w-full anim-scale-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-xl"
            style={{ background: "linear-gradient(135deg,#1A56DB 0%,#1C3FAA 100%)", boxShadow: "0 0 36px rgba(26,86,219,0.45)" }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4"/><path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </div>
          <h2 className="font-black text-2xl text-white mb-1">Portal Member</h2>
          <p className="text-sm text-white/45 text-center">Masuk untuk akses harga member eksklusif</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label className="text-[11px] text-white/40 tracking-widest uppercase font-bold block mb-1.5">Nomor HP</label>
            <input type="tel" inputMode="numeric" value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="08xxxxxxxxxx"
              className="w-full px-4 py-3.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/25 transition-all"
            />
          </div>
          <div>
            <label className="text-[11px] text-white/40 tracking-widest uppercase font-bold block mb-1.5">PIN</label>
            <input type="password" inputMode="numeric" value={pin} maxLength={6}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="• • • • • •"
              className="w-full px-4 py-3.5 rounded-xl text-center text-xl tracking-[0.5em] font-bold bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/25 transition-all"
            />
          </div>
          {error && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-red-500/25 bg-red-500/8">
              <svg width="14" height="14" className="flex-shrink-0 mt-0.5" fill="none" stroke="#F87171" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4M12 16h.01"/>
              </svg>
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}
          <button type="submit" disabled={loading || !phone || !pin}
            className="w-full py-4 rounded-2xl font-black text-sm text-white transition-all disabled:opacity-40 btn-brand">
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-white/40">Belum ada akun member?</p>
          <button onClick={onRegister} className="mt-1.5 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors">
            Daftar Sekarang →
          </button>
        </div>
      </div>
    </div>
  );
}

function RegisterForm({ onSuccess, onBack }: { onSuccess: (m: Member) => void; onBack: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", whatsapp: "", pin: "", confirmPin: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(key: string, val: string) { setForm((f) => ({ ...f, [key]: val })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone || !form.pin) { setError("Isi semua kolom yang diperlukan."); return; }
    if (form.pin.length < 4) { setError("PIN minimal 4 digit."); return; }
    if (form.pin !== form.confirmPin) { setError("PIN tidak cocok."); return; }
    setLoading(true);
    setError("");
    setTimeout(() => {
      const result = registerMember({ name: form.name, phone: form.phone, whatsapp: form.whatsapp || form.phone, pin: form.pin });
      if (result.success) { alert("Pendaftaran berhasil! Silakan tunggu persetujuan admin."); onBack(); }
      else { setError(result.message); }
      setLoading(false);
    }, 500);
  }

  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto px-5 pb-28">
      <div className="py-5 pt-safe">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-white/45 mb-5 hover:text-white/70 transition-colors">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          Kembali
        </button>
        <h2 className="font-black text-2xl text-white mb-1">Daftar Member</h2>
        <p className="text-sm text-white/40">Dapatkan harga grosir eksklusif</p>
      </div>

      <div className="surface p-4 mb-5 border border-emerald-500/15">
        <p className="text-[10px] text-white/35 font-bold uppercase tracking-widest mb-3">Keuntungan Member</p>
        <div className="space-y-2">
          {["Harga grosir lebih murah dari retail","Akses ke harga reseller (hubungi admin)","Prioritas layanan pelanggan"].map((b) => (
            <div key={b} className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                <svg width="10" height="10" fill="none" stroke="#10B981" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <p className="text-xs text-white/55">{b}</p>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {[
          { key: "name", label: "Nama Lengkap", placeholder: "Nama anda", type: "text" },
          { key: "phone", label: "Nomor HP", placeholder: "08xxxxxxxxxx", type: "tel" },
          { key: "whatsapp", label: "Nomor WhatsApp (opsional)", placeholder: "Sama dengan HP jika kosong", type: "tel" },
        ].map((field) => (
          <div key={field.key}>
            <label className="text-[11px] text-white/40 tracking-widest uppercase font-bold block mb-1.5">{field.label}</label>
            <input type={field.type} value={(form as Record<string, string>)[field.key]}
              onChange={(e) => handleChange(field.key, field.type === "tel" ? e.target.value.replace(/\D/g, "") : e.target.value)}
              placeholder={field.placeholder}
              className="w-full px-4 py-3.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/25 transition-all"
            />
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3">
          {[{key:"pin",label:"PIN (4-6 digit"},{key:"confirmPin",label:"Konfirmasi PIN"}].map((f) => (
            <div key={f.key}>
              <label className="text-[11px] text-white/40 tracking-widest uppercase font-bold block mb-1.5">{f.label}</label>
              <input type="password" inputMode="numeric" value={(form as Record<string,string>)[f.key]} maxLength={6}
                onChange={(e) => handleChange(f.key, e.target.value.replace(/\D/g, ""))}
                placeholder="• • • •"
                className="w-full px-4 py-3.5 rounded-xl text-center text-xl tracking-[0.4em] font-bold bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/60 transition-all"
              />
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-red-500/25 bg-red-500/8">
            <svg width="14" height="14" className="flex-shrink-0 mt-0.5" fill="none" stroke="#F87171" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4M12 16h.01"/>
            </svg>
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-4 rounded-2xl font-black text-sm text-white transition-all disabled:opacity-40 btn-brand">
          {loading ? "Mendaftarkan..." : "Daftar Sekarang"}
        </button>
      </form>
    </div>
  );
}

function Dashboard({ member, onLogout }: { member: Member; onLogout: () => void }) {
  const cfg = loadConfig();

  function contactAdmin() {
    if (!cfg.whatsappNumber) return;
    const msg = `Halo Admin RONEY CELL, saya ${member.name} (${member.phone}) ingin bertanya mengenai akun member saya.`;
    window.open(buildWhatsAppUrl(msg, cfg.whatsappNumber), "_blank");
  }

  const roleColor = TYPE_COLORS[member.type];
  const joinDate = new Date(member.createdAt).toLocaleDateString("id-ID", { year:"numeric", month:"long", day:"numeric" });

  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto px-4 pb-28 pt-safe">
      {/* Header */}
      <div className="py-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-white/40 font-medium mb-0.5">Portal Member</p>
          <h1 className="font-black text-xl text-white">Halo, {member.name.split(" ")[0]}! 👋</h1>
        </div>
        <button onClick={onLogout}
          className="px-3.5 py-2 rounded-xl text-xs font-bold border border-white/10 text-white/40 hover:bg-white/6 hover:text-white/65 transition-all">
          Keluar
        </button>
      </div>

      {/* Member Card — bergaya kartu e-wallet */}
      <div className="rounded-2xl p-5 mb-4 relative overflow-hidden shadow-xl"
        style={{ background: `linear-gradient(145deg, ${roleColor}22 0%, #0D1525 70%)`, border: `1px solid ${roleColor}30` }}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none opacity-20"
          style={{ background: `radial-gradient(circle, ${roleColor} 0%, transparent 70%)`, transform: "translate(30%,-30%)" }} />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Status Akun</p>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-black"
                  style={{ background: `${roleColor}25`, color: roleColor, border: `1px solid ${roleColor}45` }}>
                  {TYPE_LABELS[member.type]}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
                <span className="text-xs text-emerald-400 font-semibold">Aktif</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/30">ID Member</p>
              <p className="font-mono text-[11px] text-white/40 mt-0.5">#{member.id}</p>
            </div>
          </div>

          <div className="h-px bg-white/8 mb-4" />

          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Saldo Member</p>
          <p className="text-3xl font-black" style={{
            background: `linear-gradient(135deg, ${roleColor} 0%, #fff 120%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            {formatRupiah(member.balance)}
          </p>
        </div>
      </div>

      {/* Info Akun */}
      <div className="surface p-4 mb-4">
        <p className="text-[10px] text-white/35 uppercase tracking-widest font-bold mb-3">Informasi Akun</p>
        <div className="space-y-3">
          {[
            { label: "Nama", value: member.name },
            { label: "Nomor HP", value: member.phone },
            { label: "WhatsApp", value: member.whatsapp },
            { label: "Bergabung", value: joinDate },
          ].map((item) => (
            <div key={item.label} className="flex justify-between items-center">
              <span className="text-sm text-white/40">{item.label}</span>
              <span className="text-sm font-semibold text-white/85">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Keuntungan */}
      <div className="surface p-4 mb-5 border border-emerald-500/12">
        <p className="text-[10px] text-white/35 uppercase tracking-widest font-bold mb-3">Keuntungan Anda</p>
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(16,185,129,0.2)" }}>
            <svg width="18" height="18" fill="none" stroke="#10B981" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-300">Harga {TYPE_LABELS[member.type]} Aktif</p>
            <p className="text-xs text-white/45">Harga lebih murah dari retail untuk semua produk</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button onClick={contactAdmin}
          className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2.5 transition-opacity hover:opacity-90 active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg,#25D366 0%,#128C7E 100%)", color: "white", boxShadow: "0 4px 18px rgba(37,211,102,0.3)" }}>
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Hubungi Admin
        </button>
        <button onClick={onLogout}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold border border-white/10 text-white/40 hover:bg-white/5 hover:text-white/65 transition-all">
          Log Keluar
        </button>
      </div>
    </div>
  );
}
