import { useState, useEffect, useCallback } from "react";
import {
  v2Login,
  v2Logout,
  getV2Token,
  v2AdminDashboard,
  v2AdminUsers,
  v2AdminTransactions,
  v2AdminDeposits,
  v2AdminConfirmDeposit,
  v2AdminRejectDeposit,
  v2AdminResetTransaction,
  v2AdminActivateUser,
  v2AdminSuspendUser,
  v2AdminTopupUser,
  v2AdminUpdateUser,
  v2AdminAuditLog,
  v2MonitoringHealth,
  v2AdminProducts,
  v2AdminSyncProducts,
  v2AdminSyncStatus,
  v2AdminToggleProduct,
  v2GetMarkupSettings,
  v2SaveMarkupSettings,
  formatRp,
  type AdminDashboard,
  type V2User,
  type V2Transaction,
  type V2Deposit,
  type AuditLog,
  type MonitoringHealth,
  type SyncReport,
  type SyncStatus,
  type V2Product,
  type MarkupSettings,
} from "@/lib/apiV2";
import StatCard from "./StatCard";

type PanelTab = "dashboard" | "users" | "transactions" | "deposits" | "products" | "audit" | "monitoring";

const TAB_LABELS: Record<PanelTab, string> = {
  dashboard: "Dasbor",
  users: "Users",
  transactions: "Transaksi",
  deposits: "Deposit",
  products: "Produk",
  audit: "Audit Log",
  monitoring: "Monitoring",
};

function statusBadge(s: string) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-400",
    pending: "bg-amber-500/20 text-amber-400",
    suspended: "bg-red-500/20 text-red-400",
    success: "bg-emerald-500/20 text-emerald-400",
    failed: "bg-red-500/20 text-red-400",
    confirmed: "bg-blue-500/20 text-blue-400",
    paid: "bg-teal-500/20 text-teal-400",
    expired: "bg-gray-500/20 text-gray-400",
  };
  return `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[s] ?? "bg-white/10 text-white/60"}`;
}

function roleBadge(r: string) {
  const map: Record<string, string> = {
    superadmin: "bg-purple-500/20 text-purple-400",
    admin: "bg-blue-500/20 text-blue-400",
    reseller: "bg-teal-500/20 text-teal-400",
    member: "bg-white/10 text-white/60",
  };
  return `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[r] ?? "bg-white/10 text-white/60"}`;
}

const DASHBOARD_POLL_MS = 60_000; /* refresh dasbor setiap 60 detik */
const DEPOSITS_POLL_MS = 20_000;  /* refresh deposit setiap 20 detik */

/* ─── Dashboard Panel ─── */
function DashboardPanel() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [health, setHealth] = useState<MonitoringHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const [d, h] = await Promise.all([v2AdminDashboard(), v2MonitoringHealth()]);
      setData(d); setHealth(h); setLastUpdate(new Date());
    } catch (e) {
      if (!silent) setError((e as Error).message);
    } finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  /* Auto-poll setiap 60 detik */
  useEffect(() => {
    const id = setInterval(() => void load(true), DASHBOARD_POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBox msg={error} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Baris header dengan tombol refresh + waktu update */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/40">
          {lastUpdate ? `Update ${lastUpdate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}
        </span>
        <button onClick={() => void load()} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">🔄 Refresh</button>
      </div>

      {/* Health status */}
      {health && (
        <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${health.status === "ok" ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-amber-500/10 border border-amber-500/20"}`}>
          <div className={`w-2.5 h-2.5 rounded-full ${health.status === "ok" ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
          <span className="text-sm font-semibold">{health.status === "ok" ? "Semua sistem normal" : "Sistem degraded"}</span>
          <span className="text-xs text-muted-foreground ml-auto">DB {health.db.latencyMs}ms · Uptime {Math.floor(health.uptime / 60)}m · RAM {health.memory.heapUsedMB}MB</span>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total User" value={data.users.total} sub={`${data.users.active} aktif · ${data.users.pending} pending`} color="#3B82F6"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
        <StatCard label="Transaksi Hari Ini" value={data.transactions.today} sub={`${data.transactions.todaySuccess} sukses · ${data.transactions.pending} pending`} color="#10B981"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
        <StatCard label="Revenue Hari Ini" value={formatRp(data.finance.revenueToday)} color="#F59E0B"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard label="Total Saldo User" value={formatRp(data.finance.totalUserBalance)} sub={`${data.finance.pendingDeposits} deposit pending`} color="#8B5CF6"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>} />
      </div>

      {/* Top products */}
      {data.charts.topProducts.length > 0 && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 className="text-sm font-bold text-white/80">Top Produk (7 Hari)</h3>
          {data.charts.topProducts.slice(0, 5).map((p, i) => (
            <div key={p.productCode} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
              <span className="text-sm font-mono flex-1 text-white/80">{p.productCode}</span>
              <span className="text-xs text-muted-foreground">{Number(p.count)}× </span>
              <span className="text-sm font-bold text-emerald-400">{formatRp(Number(p.revenue))}</span>
            </div>
          ))}
        </div>
      )}

      {/* Chart txByDay */}
      {data.charts.txByDay.length > 0 && (
        <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 className="text-sm font-bold text-white/80">Transaksi 7 Hari Terakhir</h3>
          {data.charts.txByDay.map((d) => {
            const maxCount = Math.max(...data.charts.txByDay.map((r) => Number(r.count)), 1);
            const pct = (Number(d.count) / maxCount) * 100;
            return (
              <div key={d.date} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-16 shrink-0">{d.date.slice(5)}</span>
                <div className="flex-1 h-2 rounded-full bg-white/5">
                  <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-white/70 w-8 text-right">{d.count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Users Panel ─── */
function UsersPanel() {
  const [users, setUsers] = useState<V2User[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<V2User | null>(null);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupNote, setTopupNote] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [actionIsError, setActionIsError] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await v2AdminUsers({ page, q: search || undefined, status: filterStatus || undefined, role: filterRole || undefined });
      setUsers(res.data);
      /* Selalu ambil jumlah pending tanpa filter agar banner selalu akurat */
      const pRes = await v2AdminUsers({ status: "pending" });
      setPendingCount(pRes.data.length);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [page, search, filterStatus, filterRole]);

  useEffect(() => { void load(); }, [load]);

  function setOk(msg: string) { setActionIsError(false); setActionMsg(msg); }
  function setErr(e: unknown) { setActionIsError(true); setActionMsg((e as Error).message); }

  async function doActivate(id: number) {
    setActionLoading(true);
    try { await v2AdminActivateUser(id); setOk("User berhasil diaktifkan"); void load(); }
    catch (e) { setErr(e); }
    finally { setActionLoading(false); }
  }

  async function doSuspend(id: number) {
    if (!suspendReason.trim()) { setActionIsError(true); setActionMsg("Isi alasan suspend terlebih dahulu"); return; }
    setActionLoading(true);
    try { await v2AdminSuspendUser(id, suspendReason); setOk("User disuspend"); setSuspendReason(""); void load(); }
    catch (e) { setErr(e); }
    finally { setActionLoading(false); }
  }

  async function doTopup(id: number) {
    const amt = parseInt(topupAmount.replace(/\D/g, ""));
    if (!amt || amt < 1000) { setActionIsError(true); setActionMsg("Minimal topup Rp1.000"); return; }
    setActionLoading(true);
    try { await v2AdminTopupUser(id, amt, topupNote || undefined); setOk(`Saldo +${formatRp(amt)} berhasil ditambahkan`); setTopupAmount(""); setTopupNote(""); void load(); }
    catch (e) { setErr(e); }
    finally { setActionLoading(false); }
  }

  async function doChangeRole(id: number, role: string) {
    setActionLoading(true);
    try { await v2AdminUpdateUser(id, { role }); setOk("Role berhasil diubah"); void load(); setSelected(null); }
    catch (e) { setErr(e); }
    finally { setActionLoading(false); }
  }

  /* Tombol filter status cepat */
  const STATUS_CHIPS = [
    { val: "", label: "Semua" },
    { val: "active", label: "✅ Aktif" },
    { val: "pending", label: "⏳ Pending" },
    { val: "suspended", label: "🚫 Suspend" },
  ];
  const ROLE_CHIPS = [
    { val: "", label: "Semua Role" },
    { val: "member", label: "Member" },
    { val: "reseller", label: "Reseller" },
    { val: "admin", label: "Admin" },
  ];

  return (
    <div className="space-y-3">
      {/* Banner pending persetujuan */}
      {pendingCount > 0 && (
        <button
          onClick={() => { setFilterStatus("pending"); setSearch(""); setPage(1); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all active:opacity-80"
          style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)" }}>
          <span className="text-xl">⏳</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-400">{pendingCount} pendaftaran menunggu persetujuan</p>
            <p className="text-xs text-amber-300/70">Ketuk untuk lihat &amp; aktifkan user baru</p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shrink-0">{pendingCount}</span>
        </button>
      )}

      {/* Filter status — pill chips horizontal */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_CHIPS.map((c) => (
          <button key={c.val} onClick={() => { setFilterStatus(c.val); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all active:scale-95 ${filterStatus === c.val ? "text-white" : "text-white/50"}`}
            style={filterStatus === c.val
              ? { background: "linear-gradient(135deg,#3B82F6,#6366F1)", boxShadow: "0 2px 8px rgba(59,130,246,0.4)" }
              : { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Filter role — pill chips horizontal */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {ROLE_CHIPS.map((c) => (
          <button key={c.val} onClick={() => { setFilterRole(c.val); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all active:scale-95 ${filterRole === c.val ? "text-white" : "text-white/50"}`}
            style={filterRole === c.val
              ? { background: "linear-gradient(135deg,#7C3AED,#5B21B6)", boxShadow: "0 2px 8px rgba(124,58,237,0.4)" }
              : { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Pencarian */}
      <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="🔍 Cari nama / nomor HP…"
        className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50" />

      {loading ? <LoadingSpinner /> : error ? <ErrorBox msg={error} /> : (
        <div className="space-y-2">
          {users.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Tidak ada user ditemukan</p>
          )}
          {users.map((u) => {
            const isOpen = selected?.id === u.id;
            return (
              <div key={u.id} className="rounded-xl overflow-hidden transition-all"
                style={{ background: isOpen ? "rgba(59,130,246,0.06)" : "rgba(255,255,255,0.04)", border: `1px solid ${isOpen ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.08)"}` }}>

                {/* ── Baris ringkasan — ketuk untuk buka detail ── */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-3 text-left active:bg-white/5 transition-colors"
                  onClick={() => { setSelected(isOpen ? null : u); setActionMsg(""); }}>
                  {/* Avatar inisial */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-sm text-white"
                    style={{ background: u.status === "active" ? "linear-gradient(135deg,#10B981,#059669)" : u.status === "pending" ? "linear-gradient(135deg,#F59E0B,#D97706)" : "linear-gradient(135deg,#6B7280,#4B5563)" }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info utama */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white truncate">{u.name}</span>
                      {u.status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">📱 0{u.phone}</span>
                      <span className={roleBadge(u.role)}>{u.role}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-emerald-400">{formatRp(u.balance)}</span>
                      <span className={statusBadge(u.status)}>{u.status}</span>
                    </div>
                  </div>

                  {/* Chevron buka/tutup */}
                  <div className="shrink-0 flex flex-col items-center gap-1">
                    <svg className="w-4 h-4 text-white/40 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <span className="text-[9px] text-white/30">{isOpen ? "Tutup" : "Kelola"}</span>
                  </div>
                </button>

                {/* ── Panel aksi (expand) ── */}
                {isOpen && (
                  <div className="px-3 pb-4 pt-1 border-t border-white/8 space-y-3">
                    <p className="text-[10px] text-white/30 font-semibold uppercase tracking-widest pt-1">
                      Bergabung: {new Date(u.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                      {u.email && ` · ${u.email}`}
                    </p>

                    {actionMsg && (
                      <p className={`text-xs font-semibold px-3 py-2 rounded-xl ${actionIsError ? "text-red-400 bg-red-500/10 border border-red-500/20" : "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"}`}>
                        {actionIsError ? "⚠ " : "✓ "}{actionMsg}
                      </p>
                    )}

                    {/* Aktifkan — hanya jika bukan aktif */}
                    {u.status !== "active" && (
                      <button onClick={() => doActivate(u.id)} disabled={actionLoading}
                        className="w-full py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-50 active:opacity-80 transition-opacity"
                        style={{ background: "linear-gradient(135deg,#3B82F6,#2563EB)", boxShadow: "0 2px 12px rgba(59,130,246,0.35)" }}>
                        {actionLoading ? "Memproses..." : "✓ Aktifkan User Ini"}
                      </button>
                    )}

                    {/* Topup saldo */}
                    <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                      <p className="text-xs font-black text-emerald-400 uppercase tracking-wider">💰 Topup Saldo Manual</p>
                      <div className="flex gap-2">
                        <input value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} placeholder="Jumlah (contoh: 50000)"
                          type="number" inputMode="numeric"
                          className="flex-1 px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50" />
                        <button onClick={() => doTopup(u.id)} disabled={actionLoading}
                          className="px-4 py-2 rounded-lg text-sm font-black text-white bg-emerald-600 disabled:opacity-50 active:opacity-80 shrink-0">
                          Topup
                        </button>
                      </div>
                      <input value={topupNote} onChange={(e) => setTopupNote(e.target.value)} placeholder="Catatan (opsional)"
                        className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none" />
                    </div>

                    {/* Ubah role */}
                    <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
                      <p className="text-xs font-black text-indigo-400 uppercase tracking-wider">🎖 Ubah Role</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(["member","reseller","admin"] as const).map((r) => (
                          <button key={r} onClick={() => doChangeRole(u.id, r)} disabled={actionLoading || u.role === r}
                            className={`py-2 rounded-lg text-xs font-bold capitalize transition-all disabled:opacity-40 active:opacity-70 ${u.role === r ? "text-white" : "text-white/60"}`}
                            style={u.role === r
                              ? { background: "linear-gradient(135deg,#6366F1,#4F46E5)", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }
                              : { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                            {r === u.role ? "✓ " : ""}{r}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Suspend */}
                    {u.status !== "suspended" && (
                      <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                        <p className="text-xs font-black text-red-400 uppercase tracking-wider">🚫 Suspend User</p>
                        <div className="flex gap-2">
                          <input value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="Alasan suspend (wajib)"
                            className="flex-1 px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-red-500/40" />
                          <button onClick={() => doSuspend(u.id)} disabled={actionLoading}
                            className="px-4 py-2 rounded-lg text-sm font-black text-white bg-red-600 disabled:opacity-50 active:opacity-80 shrink-0">
                            Suspend
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} onChange={setPage} hasMore={users.length === 50} />
    </div>
  );
}

/* ─── Transactions Panel ─── */
function TransactionsPanel() {
  const [txs, setTxs] = useState<V2Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState("");
  const [actionMsg, setActionMsg] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await v2AdminTransactions({ page, status: filterStatus || undefined });
      setTxs(res.data);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [page, filterStatus]);

  useEffect(() => { void load(); }, [load]);

  async function doReset(id: number) {
    try {
      await v2AdminResetTransaction(id);
      setActionMsg((p) => ({ ...p, [id]: "✓ Direset" }));
      void load();
    } catch (e) { setActionMsg((p) => ({ ...p, [id]: (e as Error).message })); }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white focus:outline-none">
          <option value="">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="success">Sukses</option>
          <option value="failed">Gagal</option>
        </select>
        <button onClick={load} className="px-3 py-2 rounded-lg text-sm bg-white/10 text-white hover:bg-white/20">↻ Refresh</button>
      </div>

      {loading ? <LoadingSpinner /> : error ? <ErrorBox msg={error} /> : (
        <div className="space-y-2">
          {txs.map((tx) => (
            <div key={tx.id} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs text-white/60 truncate">{tx.refId}</div>
                  <div className="font-semibold text-sm text-white">{tx.productCode}</div>
                  <div className="text-xs text-muted-foreground">{tx.customerNo}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={statusBadge(tx.status)}>{tx.status}</span>
                  <span className="text-xs font-bold text-amber-400">{formatRp(tx.sellingPrice)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString("id-ID")}</span>
                {tx.status === "pending" && (
                  <div className="flex items-center gap-2">
                    {actionMsg[tx.id] && <span className="text-xs text-emerald-400">{actionMsg[tx.id]}</span>}
                    <button onClick={() => doReset(tx.id)}
                      className="px-2 py-1 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30">Reset</button>
                  </div>
                )}
              </div>
              {tx.message && <div className="text-xs text-white/50 mt-1 truncate">{tx.message}</div>}
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} onChange={setPage} hasMore={txs.length === 50} />
    </div>
  );
}

/* ─── Deposits Panel ─── */
function DepositsPanel({ onPaidCount }: { onPaidCount?: (n: number) => void }) {
  const [deps, setDeps] = useState<V2Deposit[]>([]);
  const [paidCount, setPaidCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState("paid");
  const [actionMsg, setActionMsg] = useState<Record<number, string>>({});
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});
  const [expandedProof, setExpandedProof] = useState<number | null>(null);
  const [confirmLoading, setConfirmLoading] = useState<Record<number, boolean>>({});
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(""); }
    try {
      const [res, paidRes] = await Promise.all([
        v2AdminDeposits({ page, status: filterStatus || undefined }),
        v2AdminDeposits({ status: "paid" }),
      ]);
      setDeps(res.data);
      setLastRefresh(new Date());
      const pc = paidRes.data.length;
      setPaidCount(pc);
      onPaidCount?.(pc);
    } catch (e) { if (!silent) setError((e as Error).message); }
    finally { if (!silent) setLoading(false); }
  }, [page, filterStatus, onPaidCount]);

  useEffect(() => { void load(); }, [load]);

  /* Auto-refresh setiap 20 detik */
  useEffect(() => {
    const id = setInterval(() => void load(true), DEPOSITS_POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  async function doConfirm(id: number) {
    setConfirmLoading((p) => ({ ...p, [id]: true }));
    try {
      await v2AdminConfirmDeposit(id);
      setActionMsg((p) => ({ ...p, [id]: "✓ Saldo berhasil ditambahkan" }));
      void load();
    } catch (e) {
      setActionMsg((p) => ({ ...p, [id]: (e as Error).message }));
    } finally {
      setConfirmLoading((p) => ({ ...p, [id]: false }));
    }
  }

  async function doReject(id: number) {
    const reason = rejectReason[id] ?? "";
    if (!reason.trim()) { setActionMsg((p) => ({ ...p, [id]: "Isi alasan penolakan" })); return; }
    setConfirmLoading((p) => ({ ...p, [id]: true }));
    try {
      await v2AdminRejectDeposit(id, reason);
      setActionMsg((p) => ({ ...p, [id]: "✓ Deposit ditolak" }));
      void load();
    } catch (e) {
      setActionMsg((p) => ({ ...p, [id]: (e as Error).message }));
    } finally {
      setConfirmLoading((p) => ({ ...p, [id]: false }));
    }
  }

  return (
    <div className="space-y-3">
      {/* Banner deposit menunggu konfirmasi */}
      {paidCount > 0 && (
        <button
          onClick={() => { setFilterStatus("paid"); setPage(1); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
          style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.35)" }}>
          <span className="text-xl">📸</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-blue-300">{paidCount} deposit menunggu konfirmasi</p>
            <p className="text-xs text-blue-300/70">Bukti sudah dikirim — klik untuk lihat &amp; konfirmasi</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white animate-pulse">{paidCount}</span>
            <span className="text-blue-400 text-xs font-bold">Lihat →</span>
          </div>
        </button>
      )}

      <div className="flex gap-2 flex-wrap items-center">
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white focus:outline-none">
          <option value="">Semua Status</option>
          <option value="pending">Pending (belum bayar)</option>
          <option value="paid">📸 Bukti Terkirim (perlu konfirmasi)</option>
          <option value="confirmed">✓ Dikonfirmasi</option>
          <option value="failed">Ditolak</option>
          <option value="expired">Kedaluwarsa</option>
        </select>
        <button onClick={() => void load()} className="px-3 py-2 rounded-lg text-sm bg-white/10 text-white hover:bg-white/20 flex items-center gap-1.5">
          ↻ <span className="text-[10px] text-white/50">{lastRefresh ? lastRefresh.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : ""}</span>
        </button>
      </div>

      {loading ? <LoadingSpinner /> : error ? <ErrorBox msg={error} /> : (
        <div className="space-y-3">
          {deps.map((d) => {
            const totalAmount = d.totalAmount ?? d.amount;
            const uniqueCode = d.uniqueCode ?? 0;
            const isActionable = d.status === "paid" || d.status === "pending";
            return (
              <div key={d.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${d.status === "paid" ? "rgba(59,130,246,0.35)" : "rgba(255,255,255,0.08)"}`, background: d.status === "paid" ? "rgba(59,130,246,0.04)" : "rgba(255,255,255,0.04)" }}>
                {/* Header baris */}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground font-mono truncate">{d.paymentRef ?? `DEP-${d.id}`}</div>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="font-black text-emerald-400 text-base">{formatRp(totalAmount)}</span>
                        {uniqueCode > 0 && (
                          <span className="text-[10px] text-amber-400/80 font-mono">(+{uniqueCode} kode unik)</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{d.method.toUpperCase()} · User #{d.userId}</div>
                    </div>
                    <span className={statusBadge(d.status)}>
                      {d.status === "paid" ? "📸 Bukti Ada" : d.status === "confirmed" ? "✓ Confirmed" : d.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1.5">{new Date(d.createdAt).toLocaleString("id-ID")}</div>
                  {d.proofUploadedAt && (
                    <div className="text-xs text-blue-400/80 mt-0.5">Upload: {new Date(d.proofUploadedAt).toLocaleString("id-ID")}</div>
                  )}
                </div>

                {/* Bukti pembayaran */}
                {d.proofImageUrl && (
                  <div className="px-3 pb-2">
                    <button
                      onClick={() => setExpandedProof(expandedProof === d.id ? null : d.id)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold w-full"
                      style={{ background: "rgba(59,130,246,0.1)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.2)" }}
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {expandedProof === d.id ? "Sembunyikan Bukti" : "Lihat Bukti Pembayaran"}
                      <svg className="w-3.5 h-3.5 ml-auto transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        style={{ transform: expandedProof === d.id ? "rotate(180deg)" : "rotate(0)" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {expandedProof === d.id && (
                      <div className="mt-2">
                        <img
                          src={d.proofImageUrl}
                          alt="Bukti pembayaran"
                          className="w-full rounded-xl object-contain max-h-80"
                          style={{ border: "1px solid rgba(59,130,246,0.2)" }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <a
                          href={d.proofImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)" }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Buka di tab baru
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Aksi admin */}
                {isActionable && (
                  <div className="px-3 pb-3 space-y-2">
                    {actionMsg[d.id] && (
                      <p className={`text-xs font-semibold px-2 py-1.5 rounded-lg ${actionMsg[d.id]?.startsWith("✓") ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"}`}>
                        {actionMsg[d.id]}
                      </p>
                    )}
                    <button
                      onClick={() => void doConfirm(d.id)}
                      disabled={confirmLoading[d.id]}
                      className="w-full py-2 rounded-lg text-xs font-black text-white disabled:opacity-50 transition-opacity"
                      style={{ background: "linear-gradient(135deg, #10B981, #059669)", boxShadow: "0 2px 12px rgba(16,185,129,0.3)" }}
                    >
                      {confirmLoading[d.id] ? "Memproses..." : "✓ Konfirmasi & Kredit Saldo"}
                    </button>
                    <div className="flex gap-2">
                      <input
                        value={rejectReason[d.id] ?? ""}
                        onChange={(e) => setRejectReason((p) => ({ ...p, [d.id]: e.target.value }))}
                        placeholder="Alasan tolak…"
                        className="flex-1 px-2 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none"
                      />
                      <button
                        onClick={() => void doReject(d.id)}
                        disabled={confirmLoading[d.id]}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                      >
                        Tolak
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {deps.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Tidak ada deposit</p>}
        </div>
      )}
      <Pagination page={page} onChange={setPage} hasMore={deps.length === 50} />
    </div>
  );
}

/* ─── Audit Log Panel ─── */
function AuditPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    void (async () => {
      setLoading(true); setError("");
      try { setLogs((await v2AdminAuditLog(page)).data); }
      catch (e) { setError((e as Error).message); }
      finally { setLoading(false); }
    })();
  }, [page]);

  return (
    <div className="space-y-3">
      {loading ? <LoadingSpinner /> : error ? <ErrorBox msg={error} /> : (
        <div className="space-y-1">
          {logs.map((l) => (
            <div key={l.id} className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-blue-400">{l.action}</span>
                <span className="text-xs text-muted-foreground shrink-0">{new Date(l.createdAt).toLocaleString("id-ID")}</span>
              </div>
              <div className="text-xs text-white/50 mt-0.5">
                {l.entity && `${l.entity}#${l.entityId} · `}{l.ip && `IP: ${l.ip} · `}User #{l.userId ?? "–"}
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} onChange={setPage} hasMore={logs.length === 100} />
    </div>
  );
}

/* ─── Products Panel ─── */
const CATEGORY_LABELS: Record<string, string> = {
  pulsa: "Pulsa",
  data: "Data",
  pln: "PLN",
  ewallet: "E-Wallet",
  pascabayar: "Pascabayar",
  game: "Game",
  tv: "TV",
  voucher: "Voucher",
  international: "Internasional",
  other: "Lainnya",
};

function ProductsPanel() {
  const [products, setProducts] = useState<V2Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncReport, setSyncReport] = useState<(SyncReport & { syncedAt?: string }) | null>(null);
  const [syncError, setSyncError] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [cooldownSec, setCooldownSec] = useState(0);

  const load = useCallback(async (p = page) => {
    setLoading(true); setError("");
    try {
      const params: Record<string, string> = { page: String(p) };
      if (q) params["q"] = q;
      const res = await v2AdminProducts(params as { page?: number; q?: string });
      setProducts(res.data);
      setHasMore(res.data.length === res.limit);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [page, q]);

  /* Load sync status (cooldown info) saat panel dibuka */
  useEffect(() => {
    v2AdminSyncStatus().then((s) => {
      setSyncStatus(s);
      if (s.lastSyncResult) setSyncReport(s.lastSyncResult);
      setCooldownSec(Math.ceil(s.cooldownRemainingMs / 1000));
    }).catch(() => { /* abaikan */ });
  }, []);

  /* Hitung mundur cooldown setiap detik */
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const id = setInterval(() => setCooldownSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldownSec]);

  useEffect(() => { void load(); }, [load]);

  const filtered = category ? products.filter((p) => p.category === category) : products;

  async function doSync() {
    if (cooldownSec > 0) return;
    setSyncing(true); setSyncReport(null); setSyncError("");
    try {
      const report = await v2AdminSyncProducts();
      setSyncReport(report);
      void load(1);
      setPage(1);
      /* Set cooldown baru setelah sync berhasil */
      setCooldownSec(10 * 60);
    } catch (e) {
      const msg = (e as Error).message;
      /* Jika rate-limited, ambil info cooldown dari server */
      setSyncError(msg);
      v2AdminSyncStatus().then((s) => {
        setSyncStatus(s);
        setCooldownSec(Math.ceil(s.cooldownRemainingMs / 1000));
      }).catch(() => { /* abaikan */ });
    } finally {
      setSyncing(false);
    }
  }

  const syncDisabled = syncing || cooldownSec > 0;
  const cooldownLabel = cooldownSec > 0
    ? `${Math.floor(cooldownSec / 60)}:${String(cooldownSec % 60).padStart(2, "0")}`
    : null;

  async function doToggle(p: V2Product) {
    setTogglingId(p.id);
    try {
      await v2AdminToggleProduct(p.id, !p.isActive);
      setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, isActive: !p.isActive } : x));
    } catch { /* abaikan */ }
    finally { setTogglingId(null); }
  }

  return (
    <div className="space-y-4">
      {/* Sync button */}
      <div className="rounded-xl p-4 border border-white/8 space-y-3" style={{ background: "rgba(255,255,255,0.03)" }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white">Sinkronisasi Produk Digiflazz</div>
            <div className="text-xs text-white/50 mt-0.5">Ambil pricelist terbaru (prepaid + pasca) dan simpan ke database</div>
            {syncStatus?.lastSyncAt && (
              <div className="text-[10px] text-white/30 mt-1">
                Sync terakhir: {new Date(syncStatus.lastSyncAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </div>
          <button
            onClick={() => { void doSync(); }}
            disabled={syncDisabled}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 shrink-0"
            style={syncDisabled
              ? { background: "rgba(255,255,255,0.08)", boxShadow: "none" }
              : { background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", boxShadow: "0 2px 12px rgba(59,130,246,0.3)" }}>
            {syncing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Sinkronisasi...
              </>
            ) : cooldownLabel ? (
              <>
                <span className="text-base">⏳</span>
                <span className="font-mono">{cooldownLabel}</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync Produk
              </>
            )}
          </button>
        </div>

        {/* Penjelasan cooldown */}
        {cooldownSec > 0 && !syncing && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <span className="text-amber-400 text-sm shrink-0">⏳</span>
            <p className="text-xs text-amber-300">
              Digiflazz membatasi frekuensi pengambilan pricelist. Tombol akan aktif kembali dalam <span className="font-bold font-mono">{cooldownLabel}</span> menit.
            </p>
          </div>
        )}

        {/* Laporan hasil sync */}
        {syncReport && (
          <div className="rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/20 space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-emerald-400">✓ Sync selesai</div>
              {syncReport.syncedAt && (
                <div className="text-[10px] text-emerald-400/60">
                  {new Date(syncReport.syncedAt).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mt-2">
              <div className="rounded-lg p-2 bg-white/5">
                <div className="text-lg font-black text-emerald-400">{syncReport.added.toLocaleString("id-ID")}</div>
                <div className="text-[10px] text-white/50">Produk Baru</div>
              </div>
              <div className="rounded-lg p-2 bg-white/5">
                <div className="text-lg font-black text-blue-400">{syncReport.updated.toLocaleString("id-ID")}</div>
                <div className="text-[10px] text-white/50">Diperbarui</div>
              </div>
              <div className="rounded-lg p-2 bg-white/5">
                <div className="text-lg font-black text-white">{syncReport.total.toLocaleString("id-ID")}</div>
                <div className="text-[10px] text-white/50">Total</div>
              </div>
            </div>
            {syncReport.errors.length > 0 && (
              <div className="text-[10px] text-red-400 mt-1">{syncReport.errors.length} batch gagal: {syncReport.errors[0]}</div>
            )}
          </div>
        )}

        {/* Error sync */}
        {syncError && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <span className="text-red-400 text-sm shrink-0">⚠</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-red-400 font-semibold">Sync gagal</p>
              <p className="text-xs text-red-300/80 mt-0.5">{syncError}</p>
              {cooldownSec > 0 && (
                <p className="text-[10px] text-red-300/60 mt-1">Coba lagi dalam {cooldownLabel}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pengaturan Markup Harga */}
      <MarkupSettingsPanel />

      {/* Filter & Search */}
      <div className="flex gap-2 flex-wrap">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Cari kode / nama..."
          className="flex-1 min-w-0 px-3 py-2 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-blue-500/60 placeholder-white/30"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-blue-500/60">
          <option value="">Semua Kategori</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button onClick={() => { void load(); }} className="px-3 py-2 rounded-xl text-sm bg-white/10 text-white hover:bg-white/20">↻</button>
      </div>

      {/* Product list */}
      {loading ? <LoadingSpinner /> : error ? <ErrorBox msg={error} /> : (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-white/40">
              {products.length === 0 ? "Belum ada produk — klik Sync Produk untuk mengisi database" : "Tidak ada produk sesuai filter"}
            </div>
          ) : filtered.map((p) => (
            <div key={p.id} className={`rounded-xl p-3 border transition-all ${p.isActive ? "border-white/8 bg-white/3" : "border-white/4 bg-white/1 opacity-60"}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">{p.code}</span>
                    <span className="text-[10px] text-white/50 bg-white/5 px-1.5 py-0.5 rounded">{CATEGORY_LABELS[p.category] ?? p.category}</span>
                    {p.stock === "empty" && <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">Stok kosong</span>}
                  </div>
                  <div className="text-sm text-white/90 font-medium mt-1 leading-tight">{p.name}</div>
                  {p.provider && <div className="text-[10px] text-white/40 mt-0.5">{p.provider}</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-white">{formatRp(p.memberPrice)}</div>
                  <div className="text-[10px] text-white/40">Modal: {formatRp(p.basePrice)}</div>
                  <button
                    onClick={() => { void doToggle(p); }}
                    disabled={togglingId === p.id}
                    className={`mt-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50 ${p.isActive ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" : "bg-white/8 text-white/40 hover:bg-white/15"}`}>
                    {togglingId === p.id ? "..." : p.isActive ? "Aktif" : "Nonaktif"}
                  </button>
                </div>
              </div>
            </div>
          ))}
          <Pagination page={page} onChange={(p) => { setPage(p); void load(p); }} hasMore={hasMore} />
        </div>
      )}
    </div>
  );
}

function MarkupSettingsPanel() {
  const [settings, setSettings] = useState<MarkupSettings | null>(null);
  const [form, setForm] = useState<MarkupSettings>({ member: 5, reseller: 3, admin: 1, minMember: 500, minReseller: 300, minAdmin: 100 });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true); setMsg(""); setError("");
    v2GetMarkupSettings()
      .then((s) => { setSettings(s); setForm(s); })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [open]);

  async function doSave() {
    setSaving(true); setMsg(""); setError("");
    try {
      const res = await v2SaveMarkupSettings(form);
      setSettings(res.settings);
      setMsg("Markup berhasil disimpan. Produk perlu di-sync ulang agar harga diperbarui.");
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  function Field({ label, field, desc }: { label: string; field: keyof MarkupSettings; desc: string }) {
    return (
      <div>
        <label className="text-xs text-white/60 block mb-1">{label}</label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            max={field.startsWith("min") ? 100000 : 100}
            value={form[field]}
            onChange={(e) => setForm((f) => ({ ...f, [field]: Number(e.target.value) }))}
            className="w-24 px-3 py-2 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-blue-500/60"
          />
          <span className="text-xs text-white/40">{desc}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/8 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <div>
          <div className="text-sm font-bold text-white">⚙️ Pengaturan Markup Harga</div>
          <div className="text-xs text-white/50 mt-0.5">
            {settings
              ? `Member +${settings.member}% · Reseller +${settings.reseller}% · Admin +${settings.admin}%`
              : "Konfigurasi persentase markup per role"}
          </div>
        </div>
        <svg className={`w-4 h-4 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/8 pt-4">
          {loading ? (
            <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Markup Member (%)" field="member" desc="% di atas modal" />
                <Field label="Min. Markup Member (Rp)" field="minMember" desc="Rp minimum" />
                <Field label="Markup Reseller (%)" field="reseller" desc="% di atas modal" />
                <Field label="Min. Markup Reseller (Rp)" field="minReseller" desc="Rp minimum" />
                <Field label="Markup Admin (%)" field="admin" desc="% di atas modal" />
                <Field label="Min. Markup Admin (Rp)" field="minAdmin" desc="Rp minimum" />
              </div>
              <div className="rounded-lg p-3 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                ⚠️ Setelah menyimpan, lakukan <strong>Sync Produk</strong> agar harga semua produk diperbarui sesuai markup baru.
              </div>
              {msg && <div className="text-xs text-emerald-400 rounded-lg p-2 bg-emerald-500/10 border border-emerald-500/20">{msg}</div>}
              {error && <div className="text-xs text-red-400 rounded-lg p-2 bg-red-500/10 border border-red-500/20">{error}</div>}
              <button
                onClick={() => { void doSave(); }}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#10B981,#059669)", boxShadow: "0 2px 12px rgba(16,185,129,0.3)" }}
              >
                {saving ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Menyimpan...</> : "💾 Simpan Markup"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MonitoringPanel() {
  const [health, setHealth] = useState<MonitoringHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setHealth(await v2MonitoringHealth()); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div className="space-y-4">
      <button onClick={load} className="px-3 py-2 rounded-lg text-sm bg-white/10 text-white hover:bg-white/20">↻ Refresh</button>
      {loading ? <LoadingSpinner /> : error ? <ErrorBox msg={error} /> : health && (
        <div className="space-y-3">
          <div className={`rounded-xl p-4 ${health.status === "ok" ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-3 h-3 rounded-full ${health.status === "ok" ? "bg-emerald-400" : "bg-red-400"} animate-pulse`} />
              <span className="font-bold text-sm">{health.status === "ok" ? "Sistem Online" : "Sistem Bermasalah"}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-xs text-muted-foreground">Database</div><div className={`text-sm font-bold ${health.db.ok ? "text-emerald-400" : "text-red-400"}`}>{health.db.ok ? `OK (${health.db.latencyMs}ms)` : "ERROR"}</div></div>
              <div><div className="text-xs text-muted-foreground">Uptime</div><div className="text-sm font-bold text-white">{Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m</div></div>
              <div><div className="text-xs text-muted-foreground">Heap Memory</div><div className="text-sm font-bold text-white">{health.memory.heapUsedMB}/{health.memory.heapTotalMB} MB</div></div>
              <div><div className="text-xs text-muted-foreground">Timestamp</div><div className="text-sm font-bold text-white">{new Date(health.timestamp).toLocaleTimeString("id-ID")}</div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Shared helpers ─── */
function LoadingSpinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/20 text-sm text-red-400">{msg}</div>
  );
}

function Pagination({ page, onChange, hasMore }: { page: number; onChange: (p: number) => void; hasMore: boolean }) {
  return (
    <div className="flex items-center justify-between pt-1">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}
        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 text-white disabled:opacity-30">← Prev</button>
      <span className="text-xs text-muted-foreground">Halaman {page}</span>
      <button disabled={!hasMore} onClick={() => onChange(page + 1)}
        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 text-white disabled:opacity-30">Next →</button>
    </div>
  );
}

/* ─── Login Form V2 ─── */
function V2LoginForm({ onLogin }: { onLogin: () => void }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await v2Login({ phone, password });
      onLogin();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 py-1">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", boxShadow: "0 0 20px rgba(59,130,246,0.3)" }}>
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
        </div>
        <div>
          <h2 className="font-black text-base text-white">Admin Panel V2</h2>
          <p className="text-xs text-muted-foreground">Login dengan akun PostgreSQL</p>
        </div>
      </div>

      <form onSubmit={(e) => { void handleLogin(e); }}
        className="rounded-2xl border border-white/8 p-5 space-y-4"
        style={{ background: "rgba(255,255,255,0.03)" }}>
        <p className="text-sm font-semibold text-white/80">Masuk ke Panel DB</p>

        {error && (
          <div className="px-3 py-2.5 rounded-xl text-sm text-red-400 border border-red-500/20"
            style={{ background: "rgba(239,68,68,0.08)" }}>
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Nomor HP</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="081xxxxxxxxx"
            required
            className="w-full px-4 py-3 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-blue-500/60 placeholder-white/20"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Password</label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              required
              className="w-full px-4 py-3 pr-10 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-blue-500/60 placeholder-white/20"
            />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 text-base">
              {showPass ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", boxShadow: "0 2px 12px rgba(59,130,246,0.3)" }}>
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}

/* ─── Main Component ─── */
export default function AdminDashboardV2() {
  const [tab, setTab] = useState<PanelTab>("dashboard");
  const [loggedIn, setLoggedIn] = useState(() => !!getV2Token());
  const [depositPaidCount, setDepositPaidCount] = useState(0);

  /* Reset ke form login otomatis ketika sesi v2 habis di tengah pemakaian */
  useEffect(() => {
    const handler = () => setLoggedIn(false);
    window.addEventListener("v2-session-expired", handler);
    return () => window.removeEventListener("v2-session-expired", handler);
  }, []);

  function handleLogout() {
    void v2Logout();
    setLoggedIn(false);
  }

  if (!loggedIn) {
    return <V2LoginForm onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3 py-1">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", boxShadow: "0 0 20px rgba(59,130,246,0.3)" }}>
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="font-black text-base text-white">Admin Panel V2</h2>
          <p className="text-xs text-muted-foreground">Database terpusat · PostgreSQL</p>
        </div>
        <button onClick={handleLogout}
          className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors">
          Keluar
        </button>
      </div>

      {/* Banner global jika ada deposit menunggu konfirmasi (saat di tab lain) */}
      {depositPaidCount > 0 && tab !== "deposits" && (
        <button
          onClick={() => setTab("deposits")}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left"
          style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)" }}>
          <span className="text-base">📸</span>
          <p className="text-xs font-bold text-blue-300 flex-1">
            {depositPaidCount} deposit menunggu konfirmasi saldo
          </p>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white animate-pulse shrink-0">{depositPaidCount}</span>
        </button>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {(Object.keys(TAB_LABELS) as PanelTab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${tab === t ? "text-white" : "text-white/50 hover:text-white/70"}`}
            style={tab === t ? { background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", boxShadow: "0 0 12px rgba(59,130,246,0.3)" } : { background: "rgba(255,255,255,0.05)" }}>
            {TAB_LABELS[t]}
            {/* Badge merah untuk tab Deposit jika ada yang perlu dikonfirmasi */}
            {t === "deposits" && depositPaidCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full text-[9px] font-black bg-red-500 text-white flex items-center justify-center px-1">
                {depositPaidCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Panel content */}
      {tab === "dashboard" && <DashboardPanel />}
      {tab === "users" && <UsersPanel />}
      {tab === "transactions" && <TransactionsPanel />}
      {tab === "deposits" && <DepositsPanel onPaidCount={setDepositPaidCount} />}
      {tab === "products" && <ProductsPanel />}
      {tab === "audit" && <AuditPanel />}
      {tab === "monitoring" && <MonitoringPanel />}
    </div>
  );
}
