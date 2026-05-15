import { useState, useRef } from "react";
import { loadConfig, saveConfig, buildDepositMessage, buildWhatsAppUrl } from "@/lib/config";
import { formatRupiah } from "@/lib/products";
import { Member } from "@/lib/members";

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000, 1000000];

const DEFAULT_QRIS_URL = "/qris.jpeg";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
      style={copied
        ? { background: "rgba(16,185,129,0.15)", color: "#34D399" }
        : { background: "rgba(59,130,246,0.1)", color: "#60A5FA" }
      }
    >
      {copied ? (
        <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Disalin</>
      ) : (
        <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Salin</>
      )}
    </button>
  );
}

interface PaymentMethodProps {
  logo: React.ReactNode;
  name: string;
  subtitle: string;
  accountNumber: string;
  accountName: string;
  accentColor: string;
  onWhatsApp: () => void;
}

function PaymentMethod({ logo, name, subtitle, accountNumber, accountName, accentColor, onWhatsApp }: PaymentMethodProps) {
  if (!accountNumber) return null;
  return (
    <div className="glass-card rounded-2xl p-5 mb-4" style={{ borderColor: `${accentColor}25` }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}30` }}>
          {logo}
        </div>
        <div>
          <p className="font-bold text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/6">
          <div>
            <p className="text-xs text-muted-foreground">Nomor / Rekening</p>
            <p className="font-bold text-foreground tracking-wider mt-0.5">{accountNumber}</p>
          </div>
          <CopyButton text={accountNumber} />
        </div>
        <div className="p-3 rounded-xl bg-white/3 border border-white/6">
          <p className="text-xs text-muted-foreground">Atas Nama</p>
          <p className="font-semibold text-foreground mt-0.5">{accountName}</p>
        </div>
      </div>
      <button
        onClick={onWhatsApp}
        className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
        style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)", color: "white", boxShadow: "0 4px 15px rgba(37,211,102,0.25)" }}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        Konfirmasi via WhatsApp
      </button>
    </div>
  );
}

interface DepositPageProps {
  member?: Member | null;
}

export default function DepositPage({ member }: DepositPageProps) {
  const [cfg, setCfg] = useState(() => loadConfig());
  const [amount, setAmount] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const qrisInputRef = useRef<HTMLInputElement>(null);

  const qrisImageSrc = cfg.qrisImage || DEFAULT_QRIS_URL;

  function selectPreset(val: number) {
    setSelectedPreset(val);
    setAmount(String(val));
  }

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAmount(e.target.value.replace(/\D/g, ""));
    setSelectedPreset(null);
  }

  function sendWhatsApp(method: string, accountInfo: string) {
    if (!cfg.whatsappNumber) { alert("Nomor WhatsApp owner belum dikonfigurasi."); return; }
    const num = Number(amount);
    if (!num || num < 10000) { alert("Masukkan jumlah deposit yang sah (minimum Rp 10.000)"); return; }
    const msg = buildDepositMessage(num, method, accountInfo, member?.name);
    window.open(buildWhatsAppUrl(msg, cfg.whatsappNumber), "_blank");
  }

  async function handleQrisUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      saveConfig({ qrisImage: b64 });
      setCfg(loadConfig());
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto px-4 pb-28">
      <div className="py-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)", boxShadow: "0 0 16px rgba(251,191,36,0.3)" }}>
            <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <h1 className="font-black text-lg leading-none text-gold">ISI SALDO</h1>
            <p className="text-[10px] text-muted-foreground tracking-widest">PILIH METODE PEMBAYARAN</p>
          </div>
        </div>
        {member && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <p className="text-xs text-blue-300">Deposit untuk: <span className="font-bold text-blue-200">{member.name}</span></p>
          </div>
        )}
      </div>

      {/* Amount */}
      <div className="glass-card rounded-2xl p-5 mb-4">
        <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-3">Jumlah Deposit</label>
        <div className="relative mb-3">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">Rp</span>
          <input type="number" inputMode="numeric" value={amount} onChange={handleAmountChange} placeholder="0"
            className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/40 transition-all" />
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_AMOUNTS.map((p) => (
            <button key={p} onClick={() => selectPreset(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border"
              style={selectedPreset === p
                ? { borderColor: "#FBBF24", background: "rgba(251,191,36,0.1)", color: "#FBBF24" }
                : { borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }
              }>
              {formatRupiah(p)}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/8">
        <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Transfer tepat jumlah yang dimasukkan. Saldo akan dikreditkan setelah konfirmasi manual oleh owner.
          Tekan tombol WhatsApp untuk konfirmasi setelah transfer.
        </p>
      </div>

      {/* QRIS — shown prominently at the top of payment methods */}
      <div className="glass-card rounded-2xl p-5 mb-4 border border-purple-500/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500/15 border border-purple-500/25">
              <span className="text-lg font-black" style={{ color: "#A855F7" }}>QR</span>
            </div>
            <div>
              <p className="font-bold text-foreground">QRIS — Toko rsy</p>
              <p className="text-xs text-muted-foreground">Scan & Bayar • Semua e-wallet</p>
            </div>
          </div>
          <button onClick={() => qrisInputRef.current?.click()}
            className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-white/10 text-muted-foreground hover:bg-white/5 transition-all">
            Ganti
          </button>
        </div>

        <div className="relative mb-4">
          <img
            src={qrisImageSrc}
            alt="QRIS RoneyCell"
            className="w-full max-w-[300px] mx-auto rounded-2xl border border-white/10 block"
            style={{ boxShadow: "0 8px 32px rgba(168,85,247,0.15)" }}
          />
        </div>

        <input ref={qrisInputRef} type="file" accept="image/*" className="hidden" onChange={handleQrisUpload} />
        <button onClick={() => sendWhatsApp("QRIS DANA", "QRIS (lihat gambar)")}
          className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
          style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)", color: "white", boxShadow: "0 4px 15px rgba(37,211,102,0.25)" }}>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Konfirmasi via WhatsApp
        </button>
      </div>

      {/* GoPay */}
      <PaymentMethod
        logo={<span className="text-lg">💚</span>}
        name="GoPay"
        subtitle="Dompet Digital"
        accountNumber={cfg.gopayNumber}
        accountName={cfg.gopayName}
        accentColor="#00AED6"
        onWhatsApp={() => sendWhatsApp("GoPay", `${cfg.gopayNumber} a/n ${cfg.gopayName}`)}
      />

      {/* DANA */}
      <PaymentMethod
        logo={<span className="font-black text-xs" style={{ color: "#118EEA" }}>DANA</span>}
        name="DANA"
        subtitle="Dompet Digital"
        accountNumber={cfg.danaNumber}
        accountName={cfg.danaName}
        accentColor="#118EEA"
        onWhatsApp={() => sendWhatsApp("DANA", `${cfg.danaNumber} a/n ${cfg.danaName}`)}
      />

      {/* BCA */}
      <PaymentMethod
        logo={<span className="font-black text-xs" style={{ color: "#0062AE" }}>BCA</span>}
        name="Bank BCA"
        subtitle="Transfer Bank"
        accountNumber={cfg.bcaAccountNumber}
        accountName={cfg.bcaAccountName}
        accentColor="#0062AE"
        onWhatsApp={() => sendWhatsApp("BCA", `${cfg.bcaAccountNumber} a/n ${cfg.bcaAccountName}`)}
      />

      {/* BRI — only if configured */}
      {cfg.briAccountNumber ? (
        <PaymentMethod
          logo={<span className="font-black text-xs text-white">BRI</span>}
          name="Bank BRI"
          subtitle="Transfer Bank"
          accountNumber={cfg.briAccountNumber}
          accountName={cfg.briAccountName}
          accentColor="#003399"
          onWhatsApp={() => sendWhatsApp("BRI", `${cfg.briAccountNumber} a/n ${cfg.briAccountName}`)}
        />
      ) : null}
    </div>
  );
}
