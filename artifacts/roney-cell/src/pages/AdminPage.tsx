import { useState, useEffect, useCallback, lazy, Suspense } from "react";
const AdminDashboardV2 = lazy(() => import("@/components/admin/AdminDashboardV2"));
import { loadConfig, saveConfig } from "@/lib/config";
import {
  ALL_PRODUCTS,
  loadCustomPrices,
  saveCustomPrices,
  formatRupiah,
  CATEGORY_META,
  ProductCategory,
} from "@/lib/products";
import { getDailyReport, getWeeklyProfit, Transaction } from "@/lib/transactions";
import {
  loadMembers,
  addMember,
  updateMember,
  deleteMember,
  approveMember,
  rejectMember,
  transferBalance,
  Member,
  MemberStatus,
  MemberType,
  TYPE_LABELS,
  TYPE_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/members";
import {
  getSheetUsers,
  updateSheetUserStatus,
  SheetUser,
} from "@/lib/sheetsApi";
import { v2AdminUsers, v2AdminActivateUser, getV2Token, type V2User } from "@/lib/apiV2";
import { getServerIp, checkDigiflazzBalance, sendTestTransaction, TestTransactionResult } from "@/lib/digiflazz";

type AdminTab = "report" | "prices" | "members" | "settings" | "uji" | "v2";

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin === loadConfig().adminPin) {
      onUnlock();
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 2000);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-8 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", boxShadow: "0 0 30px rgba(124,58,237,0.4)" }}>
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 className="font-black text-xl text-foreground mb-1">Panel Owner</h2>
      <p className="text-sm text-muted-foreground mb-8 text-center">Masukkan PIN untuk akses panel owner</p>
      <form onSubmit={handleSubmit} className="w-full">
        <input type="password" inputMode="numeric" maxLength={8} value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="Masukkan PIN"
          className={`w-full px-4 py-4 rounded-xl text-center text-2xl tracking-[0.5em] font-bold
            bg-white/5 border transition-all duration-200 text-foreground mb-4 focus:outline-none focus:ring-1
            ${error ? "border-destructive/60 ring-destructive/40 bg-destructive/5" : "border-white/10 focus:border-purple-500/60 focus:ring-purple-500/40"}`}
        />
        {error && <p className="text-destructive text-sm text-center mb-4 font-semibold">PIN salah. Cuba lagi.</p>}
        <button type="submit" className="w-full py-4 rounded-xl font-bold text-white transition-all"
          style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }}>
          Masuk
        </button>
      </form>
      <p className="text-xs text-muted-foreground mt-4">PIN lalai: 1234 (ubah di Tetapan)</p>
    </div>
  );
}

/* ─── REPORT ─── */
function ReportSection() {
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);
  const report = getDailyReport(selectedDate);
  const weekly = getWeeklyProfit();
  const maxProfit = Math.max(...weekly.map((w) => w.profit), 1);

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-4">
        <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-2">Pilih Tarikh</label>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} max={today}
          className="w-full px-4 py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-purple-500/60 transition-all" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Jumlah Transaksi", value: report.count, sub: `${report.successCount} berjaya`, color: "#60A5FA" },
          { label: "Total Jualan", value: formatRupiah(report.totalSell), sub: "Harga jual", color: "#FBBF24" },
          { label: "Modal Keluar", value: formatRupiah(report.totalBase), sub: "Harga kos", color: "#F87171" },
          { label: "Keuntungan Bersih", value: formatRupiah(report.totalProfit), sub: "Profit hari ini", color: "#34D399" },
        ].map((item) => (
          <div key={item.label} className="glass-card rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
            <p className="font-black text-lg leading-tight" style={{ color: item.color }}>{item.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{item.sub}</p>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-5">
        <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold mb-4">Grafik Keuntungan 7 Hari</p>
        <div className="flex items-end gap-2 h-28">
          {weekly.map((day) => {
            const height = maxProfit > 0 ? (day.profit / maxProfit) * 100 : 0;
            const isToday = day.date === today;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-md transition-all duration-500 relative group"
                  style={{ height: `${Math.max(height, 4)}%`, background: isToday ? "linear-gradient(to top, #7C3AED, #A78BFA)" : "linear-gradient(to top, #1E3A5F, #2D5A8E)", minHeight: "4px", boxShadow: isToday ? "0 0 10px rgba(124,58,237,0.4)" : undefined }}>
                  {day.profit > 0 && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] text-muted-foreground hidden group-hover:block">{formatRupiah(day.profit)}</div>
                  )}
                </div>
                <p className="text-[9px] text-muted-foreground">{new Date(day.date).toLocaleDateString("id-ID", { weekday: "short" })}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold mb-3">Riwayat Transaksi ({report.transactions.length})</p>
        {report.transactions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">Tiada transaksi pada tarikh ini</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {report.transactions.map((txn: Transaction) => (
              <div key={txn.id} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-sm font-semibold text-foreground truncate">{txn.phone}</p>
                  <p className="text-xs text-muted-foreground truncate">{txn.product}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(txn.date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold" style={{ color: txn.status === "success" ? "#34D399" : "#F87171" }}>
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

/* ─── PRICES ─── */
function PriceSection() {
  const [prices, setPrices] = useState<Record<string, { retail?: number; member?: number; reseller?: number }>>(() => loadCustomPrices());
  const [saved, setSaved] = useState(false);

  function handleChange(id: string, tier: "retail" | "member" | "reseller", val: string) {
    const num = Number(val.replace(/\D/g, ""));
    setPrices((prev) => ({ ...prev, [id]: { ...prev[id], [tier]: num } }));
  }

  function handleSave() {
    saveCustomPrices(prices);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/8">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Atur harga untuk 3 tier: <span className="text-foreground font-semibold">Retail</span> (umum),{" "}
          <span className="text-blue-300 font-semibold">Member</span> (grosir), dan{" "}
          <span className="text-yellow-300 font-semibold">Reseller</span> (harga terendah).
        </p>
      </div>

      {(["pulsa", "data", "pln", "game"] as ProductCategory[]).map((cat) => {
        const meta = CATEGORY_META[cat];
        const products = ALL_PRODUCTS.filter((p) => p.category === cat);
        return (
          <div key={cat} className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">{meta.icon}</span>
              <p className="font-bold text-foreground">{meta.label}</p>
            </div>
            <div className="space-y-4">
              {products.map((product) => {
                const c = prices[product.id] ?? {};
                return (
                  <div key={product.id} className="p-3 rounded-xl bg-white/3 border border-white/6">
                    <p className="text-sm font-semibold text-foreground mb-3">{product.name}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {([["retail", "#94A3B8", product.price], ["member", "#60A5FA", product.memberPrice], ["reseller", "#FBBF24", product.resellerPrice]] as [string, string, number][]).map(([tier, color, def]) => (
                        <div key={tier}>
                          <p className="text-[10px] font-bold mb-1 tracking-wide" style={{ color }}>{tier.toUpperCase()}</p>
                          <div className="relative">
                            <input
                              type="number"
                              value={(c as Record<string, number>)[tier] ?? def}
                              onChange={(e) => handleChange(product.id, tier as "retail" | "member" | "reseller", e.target.value)}
                              className="w-full px-2 py-2 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-purple-500/60 transition-all text-center"
                            />
                          </div>
                          <p className="text-[9px] text-muted-foreground text-center mt-1">
                            +{formatRupiah(Math.max(0, ((c as Record<string, number>)[tier] ?? def) - product.basePrice))}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <button onClick={handleSave} className="w-full py-4 rounded-2xl font-bold text-white transition-all"
        style={saved
          ? { background: "linear-gradient(135deg, #10B981 0%, #059669 100%)", boxShadow: "0 4px 15px rgba(16,185,129,0.3)" }
          : { background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }
        }>
        {saved ? "✓ Harga Disimpan!" : "Simpan Semua Harga"}
      </button>
    </div>
  );
}

/* ─── MEMBERS ─── */
type MemberView = "list" | "add" | "transfer";

/* Pending members from Google Sheets */
function SheetsPendingSection({ onRefreshed }: { onRefreshed?: (count: number) => void }) {
  const [sheetPending, setSheetPending]     = useState<SheetUser[]>([]);
  const [loadingSheets, setLoadingSheets]   = useState(true);
  const [actionIds, setActionIds]           = useState<Record<string, "approving" | "rejecting">>({});
  const [resultMsgs, setResultMsgs]         = useState<Record<string, string>>({});
  const [sheetsError, setSheetsError]       = useState("");

  const fetchPending = useCallback(async () => {
    setLoadingSheets(true);
    setSheetsError("");
    try {
      const users = await getSheetUsers();
      const pending = users.filter((u) => u.status === "pending");
      setSheetPending(pending);
      onRefreshed?.(pending.length);
    } catch (e: unknown) {
      setSheetsError(e instanceof Error ? e.message : "Gagal memuat data.");
    }
    setLoadingSheets(false);
  }, [onRefreshed]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  async function handleAction(userId: string, action: "active" | "rejected") {
    setActionIds((p) => ({ ...p, [userId]: action === "active" ? "approving" : "rejecting" }));
    try {
      const res = await updateSheetUserStatus(userId, action);
      const msg = action === "active"
        ? (res.ok ? "✅ Disetujui! User bisa login." : `Gagal: ${res.message ?? "error"}`)
        : (res.ok ? "❌ Ditolak." : `Gagal: ${res.message ?? "error"}`);
      setResultMsgs((p) => ({ ...p, [userId]: msg }));
      if (res.ok) {
        setSheetPending((prev) => prev.filter((u) => u.id !== userId));
        onRefreshed?.(sheetPending.length - 1);
      }
    } catch (e: unknown) {
      setResultMsgs((p) => ({ ...p, [userId]: e instanceof Error ? e.message : "Error." }));
    }
    setActionIds((p) => { const n = { ...p }; delete n[userId]; return n; });
  }

  if (loadingSheets) {
    return (
      <div className="glass-card rounded-2xl p-5 border border-yellow-500/20">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Memuat pendaftar dari Google Sheets...</p>
        </div>
      </div>
    );
  }

  if (sheetsError) {
    return (
      <div className="glass-card rounded-2xl p-4 border border-red-500/25 bg-red-500/5">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-xl">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-red-300 mb-1">Gagal memuat data Sheets</p>
            <p className="text-xs text-muted-foreground">{sheetsError}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Pastikan Apps Script Anda mendukung <code className="bg-white/10 px-1 rounded">action=getUsers</code>.
            </p>
          </div>
        </div>
        <button onClick={fetchPending}
          className="w-full py-2 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground transition-all">
          🔄 Coba Lagi
        </button>
      </div>
    );
  }

  if (sheetPending.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-5 border border-white/6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pendaftar Baru (via App)</p>
          <button onClick={fetchPending} className="text-xs text-muted-foreground hover:text-foreground transition-colors">🔄 Refresh</button>
        </div>
        <div className="text-center py-4">
          <p className="text-2xl mb-2">🎉</p>
          <p className="text-sm text-muted-foreground">Tidak ada pendaftar yang menunggu persetujuan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <p className="text-sm font-black text-yellow-300">Pendaftar Baru Menunggu Persetujuan</p>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-yellow-500/20 text-yellow-400">
            {sheetPending.length}
          </span>
        </div>
        <button onClick={fetchPending} className="text-xs text-muted-foreground hover:text-foreground transition-colors">🔄</button>
      </div>

      {sheetPending.map((u) => {
        const busy = !!actionIds[u.id];
        const result = resultMsgs[u.id];
        return (
          <div key={u.id} className="glass-card rounded-2xl p-4 border border-yellow-500/30"
            style={{ background: "rgba(251,191,36,0.03)" }}>
            {/* User info */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-black text-foreground truncate">{u.name}</p>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-500/20 text-yellow-400 flex-shrink-0">
                    PENDING
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">📱 {u.phone || "-"}</p>
                {u.email && <p className="text-xs text-muted-foreground">✉️ {u.email}</p>}
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Daftar: {u.createdAt ? new Date(u.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : "-"}
                </p>
              </div>
              <div className="ml-3 flex-shrink-0">
                <span className="text-xs font-semibold text-muted-foreground bg-white/5 border border-white/8 px-2 py-1 rounded-lg">
                  {u.loginMethod === "phone" ? "📱 HP" : u.loginMethod === "email" ? "✉️ Email" : "👤 FB"}
                </span>
              </div>
            </div>

            {/* Result message */}
            {result && (
              <div className={`px-3 py-2 rounded-lg text-xs font-semibold mb-2 ${result.startsWith("✅") ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20" : "bg-red-500/15 text-red-300 border border-red-500/20"}`}>
                {result}
              </div>
            )}

            {/* Actions */}
            {!result && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(u.id, "active")}
                  disabled={busy}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  style={{ background: "linear-gradient(135deg,rgba(16,185,129,0.2) 0%,rgba(5,150,105,0.15) 100%)", border: "1px solid rgba(16,185,129,0.35)", color: "#34D399" }}>
                  {actionIds[u.id] === "approving"
                    ? <><span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Memproses...</>
                    : <>✓ Setujui (Aktifkan)</>}
                </button>
                <button
                  onClick={() => handleAction(u.id, "rejected")}
                  disabled={busy}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#F87171" }}>
                  {actionIds[u.id] === "rejecting"
                    ? <><span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Memproses...</>
                    : <>✕ Tolak</>}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── V2 Pending Section ─── */
const POLL_INTERVAL_MS = 30_000; /* auto-refresh setiap 30 detik */

function V2PendingSection({ onCountChange }: { onCountChange?: (n: number) => void }) {
  /* hasToken sebagai state reaktif agar re-render saat token tersedia setelah auto-refresh */
  const [hasToken, setHasToken] = useState(false);
  const [users, setUsers] = useState<V2User[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [actionState, setActionState] = useState<Record<number, "loading" | "ok" | "err">>({});
  const [msgs, setMsgs] = useState<Record<number, string>>({});

  /* Cek ketersediaan token setiap 1 detik sampai tersedia, lalu hentikan */
  useEffect(() => {
    const id = setInterval(() => {
      const ok = !!getV2Token();
      setHasToken(ok);
      if (ok) clearInterval(id);
    }, 1000);
    setHasToken(!!getV2Token()); /* cek langsung saat mount */
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!getV2Token()) { setLoading(false); return; }
    if (!silent) setLoading(true);
    try {
      const res = await v2AdminUsers({ status: "pending" });
      setUsers(res.data);
      setLastRefresh(new Date());
      onCountChange?.(res.data.length);
    } catch { /* abaikan error polling */ }
    finally { setLoading(false); }
  }, [onCountChange]);

  /* Load pertama kali saat token tersedia */
  useEffect(() => {
    if (hasToken) void load();
  }, [hasToken, load]);

  /* Auto-poll setiap 30 detik — silent (tanpa spinner) */
  useEffect(() => {
    if (!hasToken) return;
    const id = setInterval(() => void load(true), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [hasToken, load]);

  async function doActivate(u: V2User) {
    setActionState((p) => ({ ...p, [u.id]: "loading" }));
    try {
      await v2AdminActivateUser(u.id);
      setActionState((p) => ({ ...p, [u.id]: "ok" }));
      setMsgs((p) => ({ ...p, [u.id]: "Berhasil diaktifkan" }));
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      onCountChange?.(Math.max(0, users.length - 1));
    } catch (e) {
      setActionState((p) => ({ ...p, [u.id]: "err" }));
      setMsgs((p) => ({ ...p, [u.id]: (e as Error).message }));
    }
  }

  /* Belum ada token sama sekali — sembunyikan, bukan error */
  if (!hasToken) return (
    <div className="glass-card rounded-2xl p-4 border border-white/6 text-center py-3">
      <p className="text-xs text-muted-foreground">Login sebagai admin untuk melihat pendaftar database.</p>
    </div>
  );

  if (loading) return (
    <div className="glass-card rounded-2xl p-4 border border-blue-500/20">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Memuat pendaftar database...</p>
      </div>
    </div>
  );

  const refreshLabel = lastRefresh
    ? `Update ${lastRefresh.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
    : "Refresh";

  if (users.length === 0) return (
    <div className="glass-card rounded-2xl p-4 border border-white/6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pendaftar Baru (Database)</p>
        <button onClick={() => void load()} className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
          🔄 <span>{refreshLabel}</span>
        </button>
      </div>
      <div className="text-center py-3">
        <p className="text-2xl mb-1">🎉</p>
        <p className="text-sm text-muted-foreground">Tidak ada pendaftar yang menunggu.</p>
        <p className="text-[10px] text-muted-foreground mt-1">Auto-refresh setiap 30 detik</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        <p className="text-sm font-black text-blue-300">Menunggu Persetujuan</p>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-400">{users.length}</span>
        <button onClick={() => void load()} className="ml-auto text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
          🔄 <span>{refreshLabel}</span>
        </button>
      </div>
      {users.map((u) => (
        <div key={u.id} className="glass-card rounded-2xl p-4 border border-blue-500/25"
          style={{ background: "rgba(59,130,246,0.04)" }}>
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-sm text-white"
              style={{ background: "linear-gradient(135deg,#3B82F6,#6366F1)" }}>
              {u.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-black text-foreground truncate">{u.name}</p>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 shrink-0">PENDING</span>
              </div>
              <p className="text-xs text-muted-foreground">📱 0{u.phone}</p>
              {u.email && <p className="text-xs text-muted-foreground">✉️ {u.email}</p>}
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Daftar: {new Date(u.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
              </p>
            </div>
          </div>
          {msgs[u.id] && (
            <p className={`text-xs font-semibold mb-2 px-3 py-1.5 rounded-lg ${actionState[u.id] === "ok" ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"}`}>
              {actionState[u.id] === "ok" ? "✓ " : "⚠ "}{msgs[u.id]}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => doActivate(u)}
              disabled={actionState[u.id] === "loading" || actionState[u.id] === "ok"}
              className="flex-1 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}>
              {actionState[u.id] === "loading" ? "Memproses..." : actionState[u.id] === "ok" ? "✓ Aktif" : "✅ Setujui & Aktifkan"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MembersSection({ onMemberChange }: { onMemberChange?: () => void }) {
  const [view, setView] = useState<MemberView>("list");
  const [members, setMembers] = useState<Member[]>(() => loadMembers());
  const [transferTarget, setTransferTarget] = useState<Member | null>(null);
  const [filterStatus, setFilterStatus] = useState<MemberStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [sheetsPendingCount, setSheetsPendingCount] = useState(0);
  const [v2PendingCount, setV2PendingCount] = useState(0);

  function refresh() { setMembers(loadMembers()); }

  function handleApprove(id: string) { approveMember(id); refresh(); onMemberChange?.(); }
  function handleReject(id: string) { rejectMember(id); refresh(); onMemberChange?.(); }
  function handleDelete(id: string) {
    if (confirm("Hapus member ini?")) { deleteMember(id); refresh(); }
  }
  function handleTypeChange(id: string, type: MemberType) {
    updateMember(id, { type });
    refresh();
  }

  const filtered = members.filter((m) => {
    if (filterStatus !== "all" && m.status !== filterStatus) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.phone.includes(search)) return false;
    return true;
  });

  const localPending = members.filter((m) => m.status === "pending").length;
  const totalPending = localPending + sheetsPendingCount + v2PendingCount;

  if (view === "add") return <AddMemberForm onDone={() => { refresh(); setView("list"); }} onBack={() => setView("list")} />;
  if (view === "transfer" && transferTarget) return (
    <TransferBalanceForm member={transferTarget} onDone={() => { refresh(); setView("list"); }} onBack={() => setView("list")} />
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-foreground">Manajemen Member</p>
          <p className="text-xs text-muted-foreground">
            {members.length} member lokal
            {totalPending > 0 && <span className="text-yellow-400 font-bold"> · {totalPending} menunggu</span>}
          </p>
        </div>
        <button onClick={() => setView("add")}
          className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
          style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", color: "white" }}>
          + Tambah
        </button>
      </div>

      {/* ─── V2 PENDING SECTION (PostgreSQL) ─── */}
      <div className="rounded-2xl border border-blue-500/20 overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-blue-500/10"
          style={{ background: "rgba(59,130,246,0.07)" }}>
          <span className="text-base">🗄️</span>
          <p className="text-xs font-black text-blue-200 uppercase tracking-widest">Pendaftar Baru (Database)</p>
          {v2PendingCount > 0 && (
            <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/30 text-blue-300">{v2PendingCount}</span>
          )}
        </div>
        <div className="p-4">
          <V2PendingSection onCountChange={setV2PendingCount} />
        </div>
      </div>

      {/* ─── SHEETS PENDING SECTION (Google Sheets) ─── */}
      <div className="rounded-2xl border border-yellow-500/15 overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-yellow-500/10"
          style={{ background: "rgba(251,191,36,0.06)" }}>
          <span className="text-base">🕐</span>
          <p className="text-xs font-black text-yellow-200 uppercase tracking-widest">Pendaftar (Google Sheets)</p>
        </div>
        <div className="p-4">
          <SheetsPendingSection onRefreshed={setSheetsPendingCount} />
        </div>
      </div>

      {/* ─── LOCAL MEMBERS LIST ─── */}
      <div className="space-y-3">
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Member Lokal</p>

        {/* Pending alert for local */}
        {localPending > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/8">
            <div className="w-2 h-2 rounded-full bg-yellow-400 pulse-dot" />
            <p className="text-sm text-yellow-300 font-semibold">{localPending} member lokal menunggu</p>
            <button onClick={() => setFilterStatus("pending")} className="ml-auto text-xs text-yellow-400 underline">Lihat</button>
          </div>
        )}

        {/* Search + filter */}
        <div className="flex gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama / nomor..."
            className="flex-1 px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/60 transition-all" />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as MemberStatus | "all")}
            className="px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-foreground focus:outline-none transition-all">
            <option value="all">Semua</option>
            <option value="pending">Menunggu</option>
            <option value="approved">Diluluskan</option>
            <option value="rejected">Ditolak</option>
          </select>
        </div>

        {/* Member list */}
        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-sm text-muted-foreground">Tiada member ditemukan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((m) => (
              <div key={m.id} className="glass-card rounded-2xl p-4 border"
                style={{ borderColor: m.status === "pending" ? "#FBBF2440" : "rgba(255,255,255,0.06)" }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-foreground">{m.name}</p>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                        style={{ background: `${STATUS_COLORS[m.status]}20`, color: STATUS_COLORS[m.status] }}>
                        {STATUS_LABELS[m.status]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: TYPE_COLORS[m.type] }}>{TYPE_LABELS[m.type]}</p>
                    <p className="text-xs text-muted-foreground">{formatRupiah(m.balance)}</p>
                  </div>
                </div>

                {m.status === "approved" && (
                  <div className="flex gap-1.5 mb-3">
                    {(["retail", "member", "reseller"] as MemberType[]).map((t) => (
                      <button key={t} onClick={() => handleTypeChange(m.id, t)}
                        className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border"
                        style={m.type === t
                          ? { background: `${TYPE_COLORS[t]}20`, borderColor: `${TYPE_COLORS[t]}50`, color: TYPE_COLORS[t] }
                          : { borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }
                        }>
                        {TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  {m.status === "pending" && (
                    <>
                      <button onClick={() => handleApprove(m.id)} className="flex-1 py-2 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 transition-all hover:bg-emerald-500/25">✓ Setujui</button>
                      <button onClick={() => handleReject(m.id)} className="flex-1 py-2 rounded-lg text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/25 transition-all hover:bg-red-500/25">✕ Tolak</button>
                    </>
                  )}
                  {m.status === "approved" && (
                    <button onClick={() => { setTransferTarget(m); setView("transfer"); }}
                      className="flex-1 py-2 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/25 transition-all hover:bg-blue-500/25">
                      💸 Transfer Saldo
                    </button>
                  )}
                  <button onClick={() => handleDelete(m.id)} className="w-9 h-9 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center text-xs transition-all hover:bg-red-500/20">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AddMemberForm({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", whatsapp: "", pin: "1234", type: "member" as MemberType, balance: "0", notes: "" });
  const [error, setError] = useState("");

  function handleChange(key: string, val: string) { setForm((f) => ({ ...f, [key]: val })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone) { setError("Nama dan nomor HP diperlukan."); return; }
    const existing = loadMembers().find((m) => m.phone.replace(/\D/g, "") === form.phone.replace(/\D/g, ""));
    if (existing) { setError("Nomor HP sudah terdaftar."); return; }
    addMember({
      name: form.name,
      phone: form.phone,
      whatsapp: form.whatsapp || form.phone,
      pin: form.pin,
      type: form.type,
      status: "approved",
      balance: Number(form.balance),
      notes: form.notes,
      loginMethod: "phone",
      approvedAt: new Date().toISOString(),
    });
    onDone();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <p className="font-bold text-foreground">Tambah Member Manual</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { key: "name", label: "Nama Lengkap", placeholder: "Nama member", type: "text" },
          { key: "phone", label: "Nomor HP", placeholder: "08xxxxxxxxxx", type: "tel" },
          { key: "whatsapp", label: "WhatsApp (opsional)", placeholder: "Sama dengan HP", type: "tel" },
          { key: "pin", label: "PIN Awal", placeholder: "1234", type: "text" },
          { key: "balance", label: "Saldo Awal (Rp)", placeholder: "0", type: "number" },
          { key: "notes", label: "Catatan (opsional)", placeholder: "...", type: "text" },
        ].map((f) => (
          <div key={f.key} className="glass-card rounded-xl p-4">
            <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-2">{f.label}</label>
            <input type={f.type} value={(form as Record<string, string>)[f.key]}
              onChange={(e) => handleChange(f.key, f.type === "tel" ? e.target.value.replace(/\D/g, "") : e.target.value)}
              placeholder={f.placeholder}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/60 transition-all" />
          </div>
        ))}

        <div className="glass-card rounded-xl p-4">
          <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-2">Tipe Member</label>
          <div className="flex gap-2">
            {(["retail", "member", "reseller"] as MemberType[]).map((t) => (
              <button type="button" key={t} onClick={() => handleChange("type", t)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border"
                style={form.type === t
                  ? { background: `${TYPE_COLORS[t]}20`, borderColor: `${TYPE_COLORS[t]}50`, color: TYPE_COLORS[t] }
                  : { borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }
                }>
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20"><p className="text-sm text-destructive font-medium">{error}</p></div>}

        <button type="submit" className="w-full py-4 rounded-2xl font-bold text-white transition-all"
          style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }}>
          Tambah Member
        </button>
      </form>
    </div>
  );
}

function TransferBalanceForm({ member, onDone, onBack }: { member: Member; onDone: () => void; onBack: () => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const PRESETS = [10000, 25000, 50000, 100000, 200000, 500000];

  function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) return;
    transferBalance(member.id, num);
    setDone(true);
    setTimeout(onDone, 1500);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <p className="font-bold text-foreground">Transfer Saldo</p>
      </div>

      {done ? (
        <div className="text-center py-10">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4" style={{ boxShadow: "0 0 20px rgba(16,185,129,0.3)" }}>
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-bold text-lg text-emerald-400">Transfer Berjaya!</p>
          <p className="text-sm text-muted-foreground mt-1">{formatRupiah(Number(amount))} dikirim ke {member.name}</p>
        </div>
      ) : (
        <>
          <div className="glass-card rounded-2xl p-4 border border-blue-500/20">
            <p className="text-xs text-muted-foreground mb-2">Transfer ke:</p>
            <p className="font-bold text-foreground">{member.name}</p>
            <p className="text-xs text-muted-foreground">{member.phone} · Saldo: {formatRupiah(member.balance)}</p>
          </div>

          <form onSubmit={handleTransfer} className="space-y-4">
            <div className="glass-card rounded-2xl p-4">
              <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-3">Jumlah Transfer</label>
              <div className="relative mb-3">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">Rp</span>
                <input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="0"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/60 transition-all" />
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button type="button" key={p} onClick={() => setAmount(String(p))}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border"
                    style={Number(amount) === p
                      ? { borderColor: "#60A5FA", background: "rgba(59,130,246,0.1)", color: "#60A5FA" }
                      : { borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }
                    }>
                    {formatRupiah(p)}
                  </button>
                ))}
              </div>
            </div>

            {Number(amount) > 0 && (
              <div className="px-4 py-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                <p className="text-sm text-muted-foreground">Saldo setelah transfer:</p>
                <p className="text-lg font-black text-emerald-400">{formatRupiah(member.balance + Number(amount))}</p>
              </div>
            )}

            <button type="submit" disabled={!amount || Number(amount) <= 0}
              className="w-full py-4 rounded-2xl font-bold text-white transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)", boxShadow: "0 4px 15px rgba(59,130,246,0.3)" }}>
              Kirim {amount ? formatRupiah(Number(amount)) : "Saldo"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

/* ─── DIGIFLAZZ STATUS CARD ─── */
function DigiflazzStatusCard() {
  const [ip, setIp]           = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [ipResult, balResult] = await Promise.all([
        getServerIp(),
        checkDigiflazzBalance(),
      ]);
      setIp(ipResult);
      if (balResult.error) setError(balResult.error);
      else setBalance(balResult.balance);
    } catch {
      setError("Tidak dapat menghubungi server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  function copyIp() {
    if (!ip) return;
    navigator.clipboard.writeText(ip).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const connected = !error && balance !== null;

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-foreground">Koneksi Digiflazz</span>
          <span className={`w-2 h-2 rounded-full ${loading ? "bg-yellow-400 animate-pulse" : connected ? "bg-emerald-400" : "bg-red-400"}`} />
        </div>
        <button onClick={fetchStatus} disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10 transition-all disabled:opacity-50">
          {loading ? "Memeriksa…" : "Refresh"}
        </button>
      </div>

      {/* IP Server */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1.5">
          IP Server (untuk Whitelist Digiflazz)
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 font-mono text-sm text-foreground">
            {ip ?? (loading ? "Memuat…" : "—")}
          </div>
          {ip && (
            <button onClick={copyIp}
              className="px-3 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-sm"
              title="Salin IP">
              {copied ? "✓" : "📋"}
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Masukkan IP ini ke kolom <span className="text-purple-400 font-semibold">Development IP</span> dan{" "}
          <span className="text-purple-400 font-semibold">Production IP</span> di Pengaturan Koneksi Digiflazz.
        </p>
      </div>

      {/* Saldo Deposit */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1.5">
          Saldo Deposit Digiflazz
        </p>
        {error ? (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            ⚠ {error}
          </div>
        ) : (
          <div className="px-4 py-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
            <p className="text-lg font-black text-emerald-400">
              {balance === null ? "Memuat…" : `Rp ${balance.toLocaleString("id-ID")}`}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-blue-500/8 border border-blue-500/20">
        <span className="text-blue-400 text-xs mt-0.5">ℹ</span>
        <p className="text-xs text-blue-300">
          Kredensial Digiflazz disimpan aman di Secrets server, bukan di perangkat.
        </p>
      </div>
    </div>
  );
}

/* ─── SETTINGS ─── */
function SettingsSection({ onLogout }: { onLogout: () => void }) {
  const [cfg, setCfg] = useState(loadConfig());
  const [saved, setSaved] = useState(false);

  const fields: { key: keyof typeof cfg; label: string; placeholder: string; type?: string }[] = [
    { key: "whatsappNumber", label: "WhatsApp Owner", placeholder: "081288080752" },
    { key: "gopayNumber", label: "Nomor GoPay", placeholder: "08xxxxxxxxxx" },
    { key: "gopayName", label: "Nama GoPay", placeholder: "Nama Anda" },
    { key: "danaNumber", label: "Nomor DANA", placeholder: "08xxxxxxxxxx" },
    { key: "danaName", label: "Nama DANA", placeholder: "Nama Anda" },
    { key: "bcaAccountNumber", label: "Rekening BCA", placeholder: "7255211277" },
    { key: "bcaAccountName", label: "Nama BCA", placeholder: "Isriatul Bahroni" },
    { key: "briAccountNumber", label: "Rekening BRI (opsional)", placeholder: "-" },
    { key: "briAccountName", label: "Nama BRI", placeholder: "Nama Anda" },
    { key: "adminPin", label: "PIN Admin", placeholder: "1234" },
  ];

  return (
    <div className="space-y-4">
      <DigiflazzStatusCard />

      <div className="glass-card rounded-2xl p-5 space-y-4">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-2">{field.label}</label>
            <input
              type="text"
              value={cfg[field.key] as string}
              onChange={(e) => setCfg({ ...cfg, [field.key]: e.target.value })}
              placeholder={field.placeholder}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/40 transition-all"
            />
          </div>
        ))}
      </div>

      <button onClick={() => { saveConfig(cfg); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
        className="w-full py-4 rounded-2xl font-bold text-white transition-all"
        style={saved
          ? { background: "linear-gradient(135deg, #10B981 0%, #059669 100%)", boxShadow: "0 4px 15px rgba(16,185,129,0.3)" }
          : { background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }
        }>
        {saved ? "✓ Tetapan Disimpan!" : "Simpan Tetapan"}
      </button>
      <button onClick={onLogout} className="w-full py-3 rounded-2xl font-semibold text-sm text-muted-foreground border border-white/10 hover:bg-white/5 transition-all">
        Log Keluar dari Panel Owner
      </button>
    </div>
  );
}

/* ─── UJI TRANSAKSI (Simulation) ─── */
function UjiSection() {
  const [customerNo, setCustomerNo] = useState("08123456789");
  const [skuCode, setSkuCode] = useState("XL5");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestTransactionResult | null>(null);

  const commonSkus = [
    { label: "XL 5rb", sku: "XL5" },
    { label: "Telkomsel 5rb", sku: "TSEL5" },
    { label: "Indosat 5rb", sku: "IST5" },
    { label: "Tri 5rb", sku: "3P5" },
    { label: "PLN 20rb", sku: "PLN20000" },
  ];

  async function runTest() {
    if (!customerNo.trim() || !skuCode.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await sendTestTransaction(customerNo.trim(), skuCode.trim());
      setResult(r);
    } catch (err) {
      setResult({
        ref_id: "-",
        payload_sent: { buyer_sku_code: skuCode, customer_no: customerNo, ref_id: "-", testing: true },
        result: {},
        error: err instanceof Error ? err.message : "Gagal terhubung ke server",
      });
    } finally {
      setLoading(false);
    }
  }

  const dgData = result?.result?.data;
  const isSuccess = dgData?.status?.toLowerCase() === "sukses" || dgData?.status?.toLowerCase() === "success";
  const isPending = dgData?.status?.toLowerCase() === "pending";
  const isError = !!result?.error || (!!dgData && !isSuccess && !isPending);

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="glass-card rounded-2xl p-4 border border-blue-500/20 bg-blue-500/5">
        <div className="flex items-start gap-3">
          <span className="text-xl">🧪</span>
          <div>
            <p className="text-sm font-black text-blue-300 mb-1">Mode Simulasi (testing: true)</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Transaksi ini menggunakan flag <span className="font-mono text-blue-300">testing: true</span> dari Digiflazz.
              Permintaan dikirim ke server Digiflazz nyata tetapi <span className="font-bold text-blue-200">tidak memotong saldo</span> akun Digiflazz Anda.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div>
          <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-2">Nomor Tujuan</label>
          <input
            type="text"
            value={customerNo}
            onChange={(e) => setCustomerNo(e.target.value)}
            placeholder="08123456789"
            className="w-full px-4 py-3 rounded-xl text-sm font-mono bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-blue-500/60 transition-all"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-2">Kode SKU Produk</label>
          <input
            type="text"
            value={skuCode}
            onChange={(e) => setSkuCode(e.target.value)}
            placeholder="XL5"
            className="w-full px-4 py-3 rounded-xl text-sm font-mono bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-blue-500/60 transition-all"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {commonSkus.map((s) => (
              <button key={s.sku} onClick={() => setSkuCode(s.sku)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all"
                style={skuCode === s.sku
                  ? { background: "rgba(59,130,246,0.2)", borderColor: "rgba(59,130,246,0.5)", color: "#93C5FD" }
                  : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }
                }>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={runTest}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)", boxShadow: "0 4px 15px rgba(59,130,246,0.3)" }}>
          {loading ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white spinner" />
              Mengirim ke Digiflazz...
            </>
          ) : "🚀 Jalankan Simulasi"}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={`glass-card rounded-2xl p-5 border ${isSuccess ? "border-emerald-500/25" : isPending ? "border-yellow-500/25" : "border-red-500/25"}`}>
          <h3 className={`font-black text-base mb-4 ${isSuccess ? "text-emerald-400" : isPending ? "text-yellow-400" : "text-red-400"}`}>
            {isSuccess ? "✅ Simulasi Berhasil" : isPending ? "⏳ Status Pending" : isError && !dgData ? "❌ Koneksi Gagal" : "❌ Simulasi Gagal"}
          </h3>

          {/* Payload sent */}
          <div className="mb-3">
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase font-semibold mb-2">Data Dikirim ke Digiflazz</p>
            <div className="rounded-xl bg-white/3 border border-white/8 p-3 space-y-1.5">
              <Row2 label="Nomor Tujuan" value={result.payload_sent.customer_no} ok />
              <Row2 label="Kode SKU" value={result.payload_sent.buyer_sku_code} ok />
              <Row2 label="Ref ID" value={result.payload_sent.ref_id} />
              <Row2 label="Mode Testing" value="true ✓" ok />
            </div>
          </div>

          {/* Digiflazz response */}
          {dgData && (
            <div className="mb-3">
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase font-semibold mb-2">Respon dari Digiflazz</p>
              <div className="rounded-xl bg-white/3 border border-white/8 p-3 space-y-1.5">
                <Row2 label="Status" value={dgData.status ?? "-"} ok={isSuccess} warn={isPending} />
                <Row2 label="Pesan" value={dgData.message ?? "-"} />
                {dgData.sn && <Row2 label="Serial Number" value={dgData.sn} ok />}
                {dgData.price !== undefined && <Row2 label="Harga Digiflazz" value={`Rp ${dgData.price?.toLocaleString("id-ID")}`} />}
              </div>
            </div>
          )}

          {result.error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400 font-mono">{result.error}</p>
            </div>
          )}

          {isSuccess && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
              <p className="text-xs text-emerald-300 font-semibold">✅ Sistem berjalan normal! Data nomor tujuan terkirim dengan benar dan respon dari Digiflazz berhasil dibaca.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row2({ label, value, ok, warn }: { label: string; value: string; ok?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground flex-shrink-0">{label}</span>
      <span className={`text-xs font-mono font-semibold text-right truncate max-w-[55%] ${ok ? "text-emerald-400" : warn ? "text-yellow-400" : "text-foreground/80"}`}>{value}</span>
    </div>
  );
}

/* ─── MAIN ─── */
export default function AdminPage({ onMemberChange }: { onMemberChange?: () => void }) {
  const [unlocked, setUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("report");

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />;

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: "report", label: "Laporan", icon: "📊" },
    { id: "prices", label: "Harga", icon: "💲" },
    { id: "members", label: "Member", icon: "👥" },
    { id: "v2", label: "Panel DB", icon: "🗄️" },
    { id: "uji", label: "Uji", icon: "🧪" },
    { id: "settings", label: "Tetapan", icon: "⚙️" },
  ];

  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto px-4 pb-28">
      <div className="py-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", boxShadow: "0 0 16px rgba(124,58,237,0.3)" }}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="font-black text-lg leading-none" style={{ color: "#A78BFA" }}>PANEL ADMIN</h1>
            <p className="text-[10px] text-muted-foreground tracking-widest">AKSES OWNER SAHAJA</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-5 p-1 rounded-2xl bg-white/3 border border-white/6 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const pendingCount = tab.id === "members" ? loadMembers().filter(m => m.status === "pending").length : 0;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="relative py-2 px-2 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-1 flex-shrink-0 min-w-[52px]"
              style={activeTab === tab.id
                ? { background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", color: "white", boxShadow: "0 2px 8px rgba(124,58,237,0.3)" }
                : { color: "rgba(255,255,255,0.4)" }
              }>
              <span>{tab.icon}</span>
              {tab.label}
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-400 text-gray-900 text-[9px] font-black flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === "report" && <ReportSection />}
      {activeTab === "prices" && <PriceSection />}
      {activeTab === "members" && <MembersSection onMemberChange={onMemberChange} />}
      {activeTab === "uji" && <UjiSection />}
      {activeTab === "settings" && <SettingsSection onLogout={() => setUnlocked(false)} />}
      {activeTab === "v2" && (
        <Suspense fallback={
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <AdminDashboardV2 />
        </Suspense>
      )}
    </div>
  );
}
