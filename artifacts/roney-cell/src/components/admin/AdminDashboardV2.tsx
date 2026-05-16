import { useState, useEffect, useCallback } from "react";
import {
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
  formatRp,
  type AdminDashboard,
  type V2User,
  type V2Transaction,
  type V2Deposit,
  type AuditLog,
  type MonitoringHealth,
} from "@/lib/apiV2";
import StatCard from "./StatCard";

type PanelTab = "dashboard" | "users" | "transactions" | "deposits" | "audit" | "monitoring";

const TAB_LABELS: Record<PanelTab, string> = {
  dashboard: "Dasbor",
  users: "Users",
  transactions: "Transaksi",
  deposits: "Deposit",
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

/* ─── Dashboard Panel ─── */
function DashboardPanel() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [health, setHealth] = useState<MonitoringHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const [d, h] = await Promise.all([v2AdminDashboard(), v2MonitoringHealth()]);
        setData(d); setHealth(h);
      } catch (e) {
        setError((e as Error).message);
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBox msg={error} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
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
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await v2AdminUsers({ page, q: search || undefined, status: filterStatus || undefined, role: filterRole || undefined });
      setUsers(res.data);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [page, search, filterStatus, filterRole]);

  useEffect(() => { void load(); }, [load]);

  async function doActivate(id: number) {
    setActionLoading(true);
    try { await v2AdminActivateUser(id); setActionMsg("User diaktifkan"); void load(); }
    catch (e) { setActionMsg((e as Error).message); }
    finally { setActionLoading(false); }
  }

  async function doSuspend(id: number) {
    if (!suspendReason.trim()) { setActionMsg("Isi alasan suspend"); return; }
    setActionLoading(true);
    try { await v2AdminSuspendUser(id, suspendReason); setActionMsg("User disuspend"); setSuspendReason(""); void load(); }
    catch (e) { setActionMsg((e as Error).message); }
    finally { setActionLoading(false); }
  }

  async function doTopup(id: number) {
    const amt = parseInt(topupAmount.replace(/\D/g, ""));
    if (!amt || amt < 1000) { setActionMsg("Minimal topup Rp1.000"); return; }
    setActionLoading(true);
    try { await v2AdminTopupUser(id, amt, topupNote || undefined); setActionMsg(`Saldo +${formatRp(amt)} berhasil`); setTopupAmount(""); setTopupNote(""); void load(); }
    catch (e) { setActionMsg((e as Error).message); }
    finally { setActionLoading(false); }
  }

  async function doChangeRole(id: number, role: string) {
    setActionLoading(true);
    try { await v2AdminUpdateUser(id, { role }); setActionMsg("Role diubah"); void load(); setSelected(null); }
    catch (e) { setActionMsg((e as Error).message); }
    finally { setActionLoading(false); }
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari nama/HP…"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50" />
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white focus:outline-none">
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
        <select value={filterRole} onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white focus:outline-none">
          <option value="">Semua Role</option>
          <option value="member">Member</option>
          <option value="reseller">Reseller</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </select>
      </div>

      {loading ? <LoadingSpinner /> : error ? <ErrorBox msg={error} /> : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="rounded-xl p-3 cursor-pointer transition-all" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${selected?.id === u.id ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.08)"}` }}
              onClick={() => { setSelected(selected?.id === u.id ? null : u); setActionMsg(""); }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white truncate">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.phone} {u.email && `· ${u.email}`}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={statusBadge(u.status)}>{u.status}</span>
                  <span className={roleBadge(u.role)}>{u.role}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs font-bold text-emerald-400">{formatRp(u.balance)}</span>
                <span className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString("id-ID")}</span>
              </div>

              {/* Action panel */}
              {selected?.id === u.id && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-3" onClick={(e) => e.stopPropagation()}>
                  {actionMsg && <p className="text-xs text-emerald-400 font-semibold">{actionMsg}</p>}

                  {/* Topup saldo */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-white/60 font-semibold">Manual Topup Saldo</p>
                    <div className="flex gap-2">
                      <input value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} placeholder="Jumlah (Rp)"
                        className="flex-1 px-2 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none" />
                      <button onClick={() => doTopup(u.id)} disabled={actionLoading}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50">Topup</button>
                    </div>
                    <input value={topupNote} onChange={(e) => setTopupNote(e.target.value)} placeholder="Catatan (opsional)"
                      className="w-full px-2 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none" />
                  </div>

                  {/* Suspend */}
                  {u.status !== "suspended" && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-white/60 font-semibold">Suspend User</p>
                      <div className="flex gap-2">
                        <input value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="Alasan suspend"
                          className="flex-1 px-2 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none" />
                        <button onClick={() => doSuspend(u.id)} disabled={actionLoading}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50">Suspend</button>
                      </div>
                    </div>
                  )}

                  {/* Activate */}
                  {u.status !== "active" && (
                    <button onClick={() => doActivate(u.id)} disabled={actionLoading}
                      className="w-full py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50">Aktifkan User</button>
                  )}

                  {/* Role */}
                  <div className="flex gap-2 flex-wrap">
                    <p className="text-xs text-white/60 font-semibold w-full">Ubah Role:</p>
                    {(["member","reseller","admin"] as const).map((r) => (
                      <button key={r} onClick={() => doChangeRole(u.id, r)} disabled={actionLoading || u.role === r}
                        className={`px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-40 ${u.role === r ? "bg-blue-600 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}>{r}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
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
function DepositsPanel() {
  const [deps, setDeps] = useState<V2Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [actionMsg, setActionMsg] = useState<Record<number, string>>({});
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await v2AdminDeposits({ page, status: filterStatus || undefined });
      setDeps(res.data);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [page, filterStatus]);

  useEffect(() => { void load(); }, [load]);

  async function doConfirm(id: number) {
    try {
      await v2AdminConfirmDeposit(id);
      setActionMsg((p) => ({ ...p, [id]: "✓ Dikonfirmasi" }));
      void load();
    } catch (e) { setActionMsg((p) => ({ ...p, [id]: (e as Error).message })); }
  }

  async function doReject(id: number) {
    const reason = rejectReason[id] ?? "";
    if (!reason.trim()) { setActionMsg((p) => ({ ...p, [id]: "Isi alasan penolakan" })); return; }
    try {
      await v2AdminRejectDeposit(id, reason);
      setActionMsg((p) => ({ ...p, [id]: "✓ Ditolak" }));
      void load();
    } catch (e) { setActionMsg((p) => ({ ...p, [id]: (e as Error).message })); }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white focus:outline-none">
          <option value="">Semua</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Dikonfirmasi</option>
          <option value="failed">Ditolak</option>
        </select>
        <button onClick={load} className="px-3 py-2 rounded-lg text-sm bg-white/10 text-white hover:bg-white/20">↻ Refresh</button>
      </div>

      {loading ? <LoadingSpinner /> : error ? <ErrorBox msg={error} /> : (
        <div className="space-y-2">
          {deps.map((d) => (
            <div key={d.id} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-muted-foreground font-mono">{d.paymentRef ?? `DEP-${d.id}`}</div>
                  <div className="font-bold text-emerald-400">{formatRp(d.amount)}</div>
                  <div className="text-xs text-muted-foreground">{d.method} · User #{d.userId}</div>
                </div>
                <span className={statusBadge(d.status)}>{d.status}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{new Date(d.createdAt).toLocaleString("id-ID")}</div>
              {actionMsg[d.id] && <p className="text-xs text-emerald-400 mt-1">{actionMsg[d.id]}</p>}

              {d.status === "pending" && (
                <div className="mt-2 space-y-2">
                  <button onClick={() => doConfirm(d.id)}
                    className="w-full py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white">Konfirmasi Deposit</button>
                  <div className="flex gap-2">
                    <input value={rejectReason[d.id] ?? ""} onChange={(e) => setRejectReason((p) => ({ ...p, [d.id]: e.target.value }))}
                      placeholder="Alasan tolak…"
                      className="flex-1 px-2 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none" />
                    <button onClick={() => doReject(d.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30">Tolak</button>
                  </div>
                </div>
              )}
            </div>
          ))}
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

/* ─── Monitoring Panel ─── */
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

/* ─── Main Component ─── */
export default function AdminDashboardV2() {
  const [tab, setTab] = useState<PanelTab>("dashboard");

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
        <div>
          <h2 className="font-black text-base text-white">Admin Panel V2</h2>
          <p className="text-xs text-muted-foreground">Database terpusat · PostgreSQL</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {(Object.keys(TAB_LABELS) as PanelTab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${tab === t ? "text-white" : "text-white/50 hover:text-white/70"}`}
            style={tab === t ? { background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", boxShadow: "0 0 12px rgba(59,130,246,0.3)" } : { background: "rgba(255,255,255,0.05)" }}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Panel content */}
      {tab === "dashboard" && <DashboardPanel />}
      {tab === "users" && <UsersPanel />}
      {tab === "transactions" && <TransactionsPanel />}
      {tab === "deposits" && <DepositsPanel />}
      {tab === "audit" && <AuditPanel />}
      {tab === "monitoring" && <MonitoringPanel />}
    </div>
  );
}
