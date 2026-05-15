import { useState } from "react";
import { loadConfig, buildDepositMessage, buildWhatsAppUrl } from "@/lib/config";
import { formatRupiah } from "@/lib/products";

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000, 1000000];

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
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
      style={copied
        ? { background: "rgba(16,185,129,0.15)", color: "#34D399" }
        : { background: "rgba(59,130,246,0.1)", color: "#60A5FA" }
      }
    >
      {copied ? (
        <>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Disalin
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Salin
        </>
      )}
    </button>
  );
}

export default function DepositPage() {
  const cfg = loadConfig();
  const [amount, setAmount] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  function selectPreset(val: number) {
    setSelectedPreset(val);
    setAmount(String(val));
  }

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    setAmount(raw);
    setSelectedPreset(null);
  }

  function sendWhatsApp(method: string, accountInfo: string) {
    if (!cfg.whatsappNumber) {
      alert("Nombor WhatsApp owner belum dikonfigurasi. Sila pergi ke tetapan.");
      return;
    }
    const num = Number(amount);
    if (!num || num < 10000) {
      alert("Sila masukkan jumlah deposit yang sah (minimum Rp 10.000)");
      return;
    }
    const msg = buildDepositMessage(num, method, accountInfo);
    window.open(buildWhatsAppUrl(msg, cfg.whatsappNumber), "_blank");
  }

  const hasBRI = cfg.briAccountNumber;
  const hasDana = cfg.danaNumber;
  const hasAny = hasBRI || hasDana;

  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto px-4 pb-28">
      {/* Header */}
      <div className="py-6">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
              boxShadow: "0 0 16px rgba(251,191,36,0.3)",
            }}
          >
            <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </div>
          <div>
            <h1 className="font-black text-lg leading-none text-gold">ISI SALDO</h1>
            <p className="text-[10px] text-muted-foreground tracking-widest">PILIH METODE PEMBAYARAN</p>
          </div>
        </div>
      </div>

      {/* Amount input */}
      <div className="glass-card rounded-2xl p-5 mb-4">
        <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-3">
          Jumlah Deposit
        </label>
        <div className="relative mb-3">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">Rp</span>
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={handleAmountChange}
            placeholder="0"
            className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm font-bold
              bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/40
              transition-all duration-200"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_AMOUNTS.map((p) => (
            <button
              key={p}
              onClick={() => selectPreset(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border"
              style={selectedPreset === p
                ? { borderColor: "#FBBF24", background: "rgba(251,191,36,0.1)", color: "#FBBF24" }
                : { borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }
              }
            >
              {formatRupiah(p)}
            </button>
          ))}
        </div>
      </div>

      {/* Info notice */}
      <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/8">
        <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Transfer tepat jumlah yang anda masukkan. Saldo akan dikreditkan selepas konfirmasi manual oleh owner.
          Tekan butang WhatsApp selepas transfer untuk konfirmasi.
        </p>
      </div>

      {!hasAny && (
        <div className="mb-4 px-4 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/8 text-center">
          <p className="text-sm text-yellow-400 font-semibold">Maklumat rekening belum diisi</p>
          <p className="text-xs text-muted-foreground mt-1">
            Sila pergi ke tab Admin → Tetapan untuk mengisi nombor rekening dan WhatsApp.
          </p>
        </div>
      )}

      {/* BRI */}
      {hasBRI && (
        <div className="glass-card rounded-2xl p-5 mb-4 border border-blue-600/20">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm"
              style={{ background: "linear-gradient(135deg, #003399 0%, #0050AA 100%)" }}
            >
              BRI
            </div>
            <div>
              <p className="font-bold text-foreground">Bank BRI</p>
              <p className="text-xs text-muted-foreground">Transfer Bank</p>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/6">
              <div>
                <p className="text-xs text-muted-foreground">Nombor Rekening</p>
                <p className="font-bold text-foreground tracking-wider mt-0.5">{cfg.briAccountNumber}</p>
              </div>
              <CopyButton text={cfg.briAccountNumber} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/6">
              <div>
                <p className="text-xs text-muted-foreground">Atas Nama</p>
                <p className="font-semibold text-foreground mt-0.5">{cfg.briAccountName}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => sendWhatsApp("BRI", `${cfg.briAccountNumber} a/n ${cfg.briAccountName}`)}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            style={{
              background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
              color: "white",
              boxShadow: "0 4px 15px rgba(37,211,102,0.3)",
            }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Hantar Bukti Transfer via WhatsApp
          </button>
        </div>
      )}

      {/* Dana */}
      {hasDana && (
        <div className="glass-card rounded-2xl p-5 mb-4 border border-blue-400/20">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-xs"
              style={{ background: "linear-gradient(135deg, #118EEA 0%, #0D72BF 100%)" }}
            >
              DANA
            </div>
            <div>
              <p className="font-bold text-foreground">DANA</p>
              <p className="text-xs text-muted-foreground">E-Wallet</p>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/6">
              <div>
                <p className="text-xs text-muted-foreground">Nombor DANA</p>
                <p className="font-bold text-foreground tracking-wider mt-0.5">{cfg.danaNumber}</p>
              </div>
              <CopyButton text={cfg.danaNumber} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/6">
              <div>
                <p className="text-xs text-muted-foreground">Atas Nama</p>
                <p className="font-semibold text-foreground mt-0.5">{cfg.danaName}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => sendWhatsApp("DANA", `${cfg.danaNumber} a/n ${cfg.danaName}`)}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            style={{
              background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
              color: "white",
              boxShadow: "0 4px 15px rgba(37,211,102,0.3)",
            }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Hantar Bukti Transfer via WhatsApp
          </button>
        </div>
      )}
    </div>
  );
}
