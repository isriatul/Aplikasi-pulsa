import { useState, useEffect } from "react";
import { loadConfig, saveConfig } from "@/lib/config";
import {
  ALL_PRODUCTS,
  loadCustomPrices,
  saveCustomPrices,
  formatRupiah,
  CATEGORY_META,
  ProductCategory,
} from "@/lib/products";
import {
  getDailyReport,
  getWeeklyProfit,
  loadTransactions,
  Transaction,
} from "@/lib/transactions";

type AdminTab = "report" | "prices" | "settings";

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cfg = loadConfig();
    if (pin === cfg.adminPin) {
      onUnlock();
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 2000);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-8 max-w-md mx-auto">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{
          background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
          boxShadow: "0 0 30px rgba(124,58,237,0.4)",
        }}
      >
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <h2 className="font-black text-xl text-foreground mb-1">Panel Admin</h2>
      <p className="text-sm text-muted-foreground mb-8 text-center">Masukkan PIN untuk akses panel owner</p>

      <form onSubmit={handleSubmit} className="w-full">
        <input
          type="password"
          inputMode="numeric"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="Masukkan PIN"
          className={`w-full px-4 py-4 rounded-xl text-center text-2xl tracking-[0.5em] font-bold
            bg-white/5 border transition-all duration-200 text-foreground mb-4
            focus:outline-none focus:ring-1
            ${error
              ? "border-destructive/60 ring-destructive/40 bg-destructive/5"
              : "border-white/10 focus:border-purple-500/60 focus:ring-purple-500/40"
            }`}
        />
        {error && (
          <p className="text-destructive text-sm text-center mb-4 font-semibold">PIN salah. Cuba lagi.</p>
        )}
        <button
          type="submit"
          className="w-full py-4 rounded-xl font-bold text-white transition-all"
          style={{
            background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
            boxShadow: "0 4px 15px rgba(124,58,237,0.3)",
          }}
        >
          Masuk
        </button>
      </form>
      <p className="text-xs text-muted-foreground mt-4">PIN lalai: 1234 (tukar di Tetapan)</p>
    </div>
  );
}

function ReportSection() {
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);
  const report = getDailyReport(selectedDate);
  const weekly = getWeeklyProfit();
  const maxProfit = Math.max(...weekly.map((w) => w.profit), 1);

  return (
    <div className="space-y-4">
      {/* Date picker */}
      <div className="glass-card rounded-2xl p-4">
        <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-2">
          Pilih Tarikh
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          max={today}
          className="w-full px-4 py-3 rounded-xl text-sm font-medium
            bg-white/5 border border-white/10 text-foreground
            focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/40
            transition-all duration-200"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Jumlah Transaksi", value: report.count, sub: `${report.successCount} berjaya`, color: "#60A5FA" },
          { label: "Total Jualan", value: formatRupiah(report.totalSell), sub: "Harga jual", color: "#FBBF24" },
          { label: "Modal Keluar", value: formatRupiah(report.totalBase), sub: "Harga kos", color: "#F87171" },
          { label: "Keuntungan Bersih", value: formatRupiah(report.totalProfit), sub: "Profit hari ini", color: "#34D399" },
        ].map((item) => (
          <div key={item.label} className="glass-card rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
            <p className="font-black text-lg leading-tight" style={{ color: item.color }}>
              {item.value}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Weekly chart */}
      <div className="glass-card rounded-2xl p-5">
        <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold mb-4">
          Grafik Keuntungan 7 Hari
        </p>
        <div className="flex items-end gap-2 h-28">
          {weekly.map((day) => {
            const height = maxProfit > 0 ? (day.profit / maxProfit) * 100 : 0;
            const isToday = day.date === today;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-md transition-all duration-500 relative group"
                  style={{
                    height: `${Math.max(height, 4)}%`,
                    background: isToday
                      ? "linear-gradient(to top, #7C3AED, #A78BFA)"
                      : "linear-gradient(to top, #1E3A5F, #2D5A8E)",
                    minHeight: "4px",
                    boxShadow: isToday ? "0 0 10px rgba(124,58,237,0.4)" : undefined,
                  }}
                >
                  {day.profit > 0 && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] text-muted-foreground hidden group-hover:block">
                      {formatRupiah(day.profit)}
                    </div>
                  )}
                </div>
                <p className="text-[9px] text-muted-foreground">
                  {new Date(day.date).toLocaleDateString("id-ID", { weekday: "short" })}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction list */}
      <div className="glass-card rounded-2xl p-5">
        <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold mb-3">
          Riwayat Transaksi ({report.transactions.length})
        </p>
        {report.transactions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">Tiada transaksi pada tarikh ini</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {report.transactions.map((txn: Transaction) => (
              <div key={txn.id} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-sm font-semibold text-foreground truncate">{txn.phone}</p>
                  <p className="text-xs text-muted-foreground truncate">{txn.product}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(txn.date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p
                    className="text-xs font-bold"
                    style={{ color: txn.status === "success" ? "#34D399" : "#F87171" }}
                  >
                    {txn.status === "success" ? `+${formatRupiah(txn.profit)}` : "GAGAL"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{formatRupiah(txn.sellPrice)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PriceSection() {
  const [prices, setPrices] = useState<Record<string, number>>(() => loadCustomPrices());
  const [saved, setSaved] = useState(false);

  function handleChange(id: string, val: string) {
    const num = Number(val.replace(/\D/g, ""));
    setPrices((prev) => ({ ...prev, [id]: num }));
  }

  function handleSave() {
    saveCustomPrices(prices);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const categories = (["pulsa", "data", "pln", "game"] as ProductCategory[]);

  return (
    <div className="space-y-4">
      <div className="px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/8">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Ubah harga jual produk. Harga kos (modal) ditunjukkan sebagai rujukan.
          Simpan selepas membuat perubahan.
        </p>
      </div>

      {categories.map((cat) => {
        const meta = CATEGORY_META[cat];
        const products = ALL_PRODUCTS.filter((p) => p.category === cat);
        return (
          <div key={cat} className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">{meta.icon}</span>
              <p className="font-bold text-foreground">{meta.label}</p>
            </div>
            <div className="space-y-3">
              {products.map((product) => (
                <div key={product.id} className="p-3 rounded-xl bg-white/3 border border-white/6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-foreground">{product.name}</p>
                    <p className="text-xs text-muted-foreground">Modal: {formatRupiah(product.basePrice)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Harga Jual:</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
                      <input
                        type="number"
                        value={prices[product.id] ?? product.price}
                        onChange={(e) => handleChange(product.id, e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-lg text-sm font-bold
                          bg-white/5 border border-white/10 text-foreground
                          focus:outline-none focus:border-purple-500/60 transition-all"
                      />
                    </div>
                    <p className="text-xs font-semibold"
                      style={{ color: (prices[product.id] ?? product.price) > product.basePrice ? "#34D399" : "#F87171" }}>
                      +{formatRupiah(Math.max(0, (prices[product.id] ?? product.price) - product.basePrice))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <button
        onClick={handleSave}
        className="w-full py-4 rounded-2xl font-bold text-white transition-all"
        style={saved
          ? { background: "linear-gradient(135deg, #10B981 0%, #059669 100%)", boxShadow: "0 4px 15px rgba(16,185,129,0.3)" }
          : { background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }
        }
      >
        {saved ? "✓ Harga Disimpan!" : "Simpan Semua Harga"}
      </button>
    </div>
  );
}

function SettingsSection({ onLogout }: { onLogout: () => void }) {
  const [cfg, setCfg] = useState(loadConfig());
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const fields: { key: keyof typeof cfg; label: string; placeholder: string; type?: string }[] = [
    { key: "username", label: "Username Digiflazz", placeholder: "username digiflazz" },
    { key: "apiKey", label: "API Key Digiflazz", placeholder: "api key digiflazz", type: "password" },
    { key: "whatsappNumber", label: "Nombor WhatsApp Owner", placeholder: "08xxxxxxxxxx" },
    { key: "briAccountNumber", label: "Nombor Rekening BRI", placeholder: "1234567890" },
    { key: "briAccountName", label: "Nama Pemilik BRI", placeholder: "NAMA ANDA" },
    { key: "danaNumber", label: "Nombor DANA", placeholder: "08xxxxxxxxxx" },
    { key: "danaName", label: "Nama Pemilik DANA", placeholder: "NAMA ANDA" },
    { key: "adminPin", label: "PIN Admin (tukar di sini)", placeholder: "1234" },
  ];

  function handleSave() {
    saveConfig(cfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-5 space-y-4">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-2">
              {field.label}
            </label>
            <div className="relative">
              <input
                type={field.type === "password" && !showApiKey ? "password" : "text"}
                value={cfg[field.key] as string}
                onChange={(e) => setCfg({ ...cfg, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium
                  bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground
                  focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/40
                  transition-all duration-200"
              />
              {field.type === "password" && (
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d={showApiKey
                        ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      }
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        className="w-full py-4 rounded-2xl font-bold text-white transition-all"
        style={saved
          ? { background: "linear-gradient(135deg, #10B981 0%, #059669 100%)", boxShadow: "0 4px 15px rgba(16,185,129,0.3)" }
          : { background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }
        }
      >
        {saved ? "✓ Tetapan Disimpan!" : "Simpan Tetapan"}
      </button>

      <button
        onClick={onLogout}
        className="w-full py-3 rounded-2xl font-semibold text-sm text-muted-foreground border border-white/10 hover:bg-white/5 transition-all"
      >
        Log Keluar dari Panel Admin
      </button>
    </div>
  );
}

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("report");

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />;

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: "report", label: "Laporan", icon: "📊" },
    { id: "prices", label: "Harga", icon: "💲" },
    { id: "settings", label: "Tetapan", icon: "⚙️" },
  ];

  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto px-4 pb-28">
      {/* Header */}
      <div className="py-6">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
              boxShadow: "0 0 16px rgba(124,58,237,0.3)",
            }}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div>
            <h1 className="font-black text-lg leading-none" style={{ color: "#A78BFA" }}>PANEL ADMIN</h1>
            <p className="text-[10px] text-muted-foreground tracking-widest">AKSES OWNER SAHAJA</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-5 p-1 rounded-2xl bg-white/3 border border-white/6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            style={activeTab === tab.id
              ? { background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", color: "white", boxShadow: "0 2px 8px rgba(124,58,237,0.3)" }
              : { color: "rgba(255,255,255,0.4)" }
            }
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "report" && <ReportSection />}
      {activeTab === "prices" && <PriceSection />}
      {activeTab === "settings" && <SettingsSection onLogout={() => setUnlocked(false)} />}
    </div>
  );
}
