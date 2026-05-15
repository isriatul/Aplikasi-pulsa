import { useState } from "react";
import { Member, loginMember, registerMember, clearSession } from "@/lib/members";
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
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTimeout(() => {
      const result = loginMember(phone, pin);
      if (result.success && result.member) {
        onLogin(result.member);
      } else {
        setError(result.message);
      }
      setLoading(false);
    }, 500);
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 max-w-md mx-auto pb-28">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)", boxShadow: "0 0 30px rgba(59,130,246,0.4)" }}
      >
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>

      <h2 className="font-black text-2xl text-foreground mb-1">Portal Member</h2>
      <p className="text-sm text-muted-foreground mb-8 text-center">Log masuk untuk akses harga member eksklusif</p>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div>
          <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-2">Nomor HP</label>
          <input
            type="tel" inputMode="numeric" value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            placeholder="08xxxxxxxxxx"
            className="w-full px-4 py-3.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 transition-all"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-2">PIN</label>
          <input
            type="password" inputMode="numeric" value={pin} maxLength={6}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="Masukkan PIN"
            className="w-full px-4 py-3.5 rounded-xl text-center text-xl tracking-[0.4em] font-bold bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 transition-all"
          />
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive font-medium">{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading || !phone || !pin}
          className="w-full py-4 rounded-xl font-bold text-white transition-all disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)", boxShadow: "0 4px 15px rgba(59,130,246,0.3)" }}>
          {loading ? "Memproses..." : "Log Masuk"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">Belum ada akun member?</p>
        <button onClick={onRegister} className="mt-2 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors">
          Daftar Sekarang →
        </button>
      </div>
    </div>
  );
}

function RegisterForm({ onSuccess, onBack }: { onSuccess: (m: Member) => void; onBack: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", whatsapp: "", pin: "", confirmPin: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone || !form.pin) { setError("Isi semua kolom yang diperlukan."); return; }
    if (form.pin.length < 4) { setError("PIN minimal 4 digit."); return; }
    if (form.pin !== form.confirmPin) { setError("PIN tidak cocok."); return; }
    setLoading(true);
    setError("");
    setTimeout(() => {
      const result = registerMember({ name: form.name, phone: form.phone, whatsapp: form.whatsapp || form.phone, pin: form.pin });
      if (result.success) {
        alert("Pendaftaran berhasil! Silakan tunggu persetujuan admin sebelum dapat login.");
        onBack();
      } else {
        setError(result.message);
      }
      setLoading(false);
    }, 500);
  }

  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto px-6 pb-28">
      <div className="py-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Kembali
        </button>
        <h2 className="font-black text-2xl text-foreground mb-1">Daftar Member</h2>
        <p className="text-sm text-muted-foreground">Dapatkan harga grosir eksklusif untuk member</p>
      </div>

      <div className="glass-card rounded-2xl p-5 mb-4 border border-blue-500/15">
        <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold mb-3">Keuntungan Member</p>
        <div className="space-y-2">
          {["Harga grosir lebih murah dari retail", "Akses ke harga reseller (hubungi admin)", "Prioritas layanan pelanggan"].map((b) => (
            <div key={b} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-xs text-muted-foreground">{b}</p>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { key: "name", label: "Nama Lengkap", placeholder: "Nama anda", type: "text" },
          { key: "phone", label: "Nomor HP", placeholder: "08xxxxxxxxxx", type: "tel" },
          { key: "whatsapp", label: "Nomor WhatsApp (opsional)", placeholder: "Sama dengan HP jika kosong", type: "tel" },
        ].map((field) => (
          <div key={field.key}>
            <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-2">{field.label}</label>
            <input
              type={field.type} value={(form as Record<string, string>)[field.key]}
              onChange={(e) => handleChange(field.key, field.type === "tel" ? e.target.value.replace(/\D/g, "") : e.target.value)}
              placeholder={field.placeholder}
              className="w-full px-4 py-3.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 transition-all"
            />
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-2">PIN (4-6 digit)</label>
            <input type="password" inputMode="numeric" value={form.pin} maxLength={6}
              onChange={(e) => handleChange("pin", e.target.value.replace(/\D/g, ""))}
              placeholder="• • • •"
              className="w-full px-4 py-3.5 rounded-xl text-center text-xl tracking-[0.4em] font-bold bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/60 transition-all"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-2">Konfirmasi PIN</label>
            <input type="password" inputMode="numeric" value={form.confirmPin} maxLength={6}
              onChange={(e) => handleChange("confirmPin", e.target.value.replace(/\D/g, ""))}
              placeholder="• • • •"
              className="w-full px-4 py-3.5 rounded-xl text-center text-xl tracking-[0.4em] font-bold bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/60 transition-all"
            />
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive font-medium">{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-4 rounded-xl font-bold text-white transition-all disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)", boxShadow: "0 4px 15px rgba(59,130,246,0.3)" }}>
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

  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto px-4 pb-28">
      <div className="py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-black text-xl text-foreground">Halo, {member.name.split(" ")[0]}! 👋</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Portal Member RONEY CELL</p>
          </div>
          <button onClick={onLogout}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/10 text-muted-foreground hover:bg-white/5 transition-all">
            Keluar
          </button>
        </div>
      </div>

      {/* Member card */}
      <div className="glass-card rounded-2xl p-5 mb-4 relative overflow-hidden"
        style={{ border: `1px solid ${TYPE_COLORS[member.type]}30` }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at top right, ${TYPE_COLORS[member.type]} 0%, transparent 60%)` }} />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold">Status Akun</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{ background: `${TYPE_COLORS[member.type]}20`, color: TYPE_COLORS[member.type], border: `1px solid ${TYPE_COLORS[member.type]}40` }}>
                  {TYPE_LABELS[member.type]}
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-emerald-400 font-semibold">Aktif</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">ID Member</p>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">{member.id}</p>
            </div>
          </div>

          <div className="h-px bg-white/5 mb-4" />

          <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold mb-1">Saldo Member</p>
          <p className="text-3xl font-black" style={{
            background: `linear-gradient(135deg, ${TYPE_COLORS[member.type]} 0%, #ffffff 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            {formatRupiah(member.balance)}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="glass-card rounded-2xl p-5 mb-4 space-y-3">
        <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold">Informasi Akun</p>
        {[
          { label: "Nama", value: member.name },
          { label: "Nomor HP", value: member.phone },
          { label: "WhatsApp", value: member.whatsapp },
          { label: "Bergabung", value: new Date(member.createdAt).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" }) },
        ].map((item) => (
          <div key={item.label} className="flex justify-between">
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className="text-sm font-semibold text-foreground">{item.value}</span>
          </div>
        ))}
      </div>

      {/* Harga member */}
      <div className="glass-card rounded-2xl p-5 mb-4 border border-emerald-500/15">
        <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold mb-2">Keuntungan Anda</p>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/8">
          <span className="text-2xl">🎯</span>
          <div>
            <p className="text-sm font-bold text-emerald-300">Harga {TYPE_LABELS[member.type]} Aktif</p>
            <p className="text-xs text-muted-foreground">Anda mendapatkan harga lebih murah dari retail</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button onClick={contactAdmin}
          className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
          style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)", color: "white", boxShadow: "0 4px 15px rgba(37,211,102,0.25)" }}>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Hubungi Admin
        </button>
        <button onClick={onLogout}
          className="w-full py-3 rounded-xl text-sm font-semibold border border-white/10 text-muted-foreground hover:bg-white/5 transition-all">
          Log Keluar
        </button>
      </div>
    </div>
  );
}
