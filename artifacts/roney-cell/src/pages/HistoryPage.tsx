import { useState, useEffect, useCallback, useRef } from "react";
import {
  v2GetTransactions,
  v2GetDeposits,
  v2GetMutations,
  formatRp,
  type V2Transaction,
  type V2Deposit,
  type BalanceMutation,
} from "@/lib/apiV2";

type HistoryTab = "transactions" | "deposits" | "mutations";

/* ─── helpers ─── */
function statusColor(s: string) {
  if (s === "success" || s === "confirmed") return "#10B981";
  if (s === "pending" || s === "paid") return "#F59E0B";
  if (s === "failed" || s === "expired") return "#EF4444";
  return "#6B7280";
}
function statusLabel(s: string) {
  const m: Record<string, string> = {
    success: "Sukses", confirmed: "Dikonfirmasi", paid: "Dibayar",
    pending: "Pending", failed: "Gagal", expired: "Kedaluwarsa",
  };
  return m[s] ?? s;
}
function statusBg(s: string) {
  if (s === "success" || s === "confirmed") return "rgba(16,185,129,0.15)";
  if (s === "pending" || s === "paid") return "rgba(245,158,11,0.15)";
  if (s === "failed" || s === "expired") return "rgba(239,68,68,0.15)";
  return "rgba(107,114,128,0.15)";
}
function mutationType(t: string) {
  const credit = ["deposit", "topup", "cashback", "refund", "bonus"];
  return credit.includes(t) ? "credit" : "debit";
}
function mutationLabel(t: string) {
  const m: Record<string, string> = {
    deposit: "Deposit", topup: "Top Up", cashback: "Cashback",
    refund: "Refund", bonus: "Bonus", purchase: "Pembelian",
    fee: "Biaya", withdrawal: "Penarikan", adjustment: "Penyesuaian",
  };
  return m[t] ?? t;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function fmtDateShort(d: string) {
  return new Date(d).toLocaleString("id-ID", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}
function categoryIcon(cat: string) {
  const m: Record<string, string> = {
    pulsa: "📱", data: "🌐", pln: "⚡", pascabayar: "📋",
    ewallet: "💳", game: "🎮", tv: "📺", voucher: "🎟️",
    international: "🌍", other: "📦",
  };
  return m[cat?.toLowerCase()] ?? "📦";
}

/* ─── Detail Sheet (shared slide-up modal) ─── */
function BottomSheet({
  open, onClose, children, title,
}: { open: boolean; onClose: () => void; children: React.ReactNode; title: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: "fadeIn 0.2s ease" }}
      />
      <div
        ref={ref}
        className="relative rounded-t-3xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #131929 0%, #0B0F1A 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderBottom: "none",
          animation: "slideUp 0.28s cubic-bezier(0.32,0.72,0,1)",
          maxHeight: "88dvh",
          overflowY: "auto",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sticky top-0 z-10"
          style={{ background: "linear-gradient(180deg, #131929 0%, transparent 100%)" }}>
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 sticky top-5 z-10"
          style={{ background: "transparent" }}>
          <h2 className="font-black text-base text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 pb-safe-bottom pb-8">{children}</div>
      </div>
    </div>
  );
}

/* ─── Detail row ─── */
function DetailRow({ label, value, mono = false, accent }: {
  label: string; value: React.ReactNode; mono?: boolean; accent?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span className="text-xs text-white/40 shrink-0">{label}</span>
      <span
        className={`text-xs font-semibold text-right break-all ${mono ? "font-mono" : ""}`}
        style={{ color: accent ?? "rgba(255,255,255,0.9)" }}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Transaction Detail ─── */
function TransactionDetail({ tx }: { tx: V2Transaction }) {
  return (
    <div className="space-y-4">
      {/* Status hero */}
      <div className="rounded-2xl p-5 text-center space-y-2"
        style={{ background: statusBg(tx.status), border: `1px solid ${statusColor(tx.status)}30` }}>
        <div className="text-3xl font-black" style={{ color: statusColor(tx.status) }}>
          {formatRp(tx.sellingPrice)}
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl">{categoryIcon(tx.category)}</span>
          <span className="text-sm font-bold text-white/80">{tx.productCode}</span>
        </div>
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black"
          style={{ background: statusBg(tx.status), color: statusColor(tx.status), border: `1px solid ${statusColor(tx.status)}50` }}
        >
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: statusColor(tx.status) }} />
          {statusLabel(tx.status)}
        </span>
      </div>

      {/* Detail rows */}
      <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <DetailRow label="Ref ID" value={tx.refId} mono />
        <DetailRow label="Nomor Tujuan" value={tx.customerNo} mono />
        <DetailRow label="Kategori" value={tx.category.toUpperCase()} />
        <DetailRow label="Harga Jual" value={formatRp(tx.sellingPrice)} accent="#F59E0B" />
        <DetailRow label="Profit" value={formatRp(tx.profit)} accent="#10B981" />
        {tx.sn && <DetailRow label="SN / Token" value={tx.sn} mono />}
        {tx.message && <DetailRow label="Pesan" value={tx.message} />}
        <DetailRow label="Percobaan" value={`${tx.retryCount}×`} />
        <DetailRow label="Dibuat" value={fmtDate(tx.createdAt)} />
        <DetailRow label="Diperbarui" value={fmtDate(tx.updatedAt)} />
      </div>

      {/* Copy SN if exists */}
      {tx.sn && (
        <button
          onClick={() => void navigator.clipboard.writeText(tx.sn!)}
          className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity active:opacity-70"
          style={{ background: "linear-gradient(135deg,#1A56DB,#3B82F6)", boxShadow: "0 2px 12px rgba(26,86,219,0.4)" }}
        >
          📋 Salin SN / Token
        </button>
      )}
    </div>
  );
}

/* ─── Deposit Detail ─── */
function DepositDetail({ dep }: { dep: V2Deposit }) {
  return (
    <div className="space-y-4">
      {/* Status hero */}
      <div className="rounded-2xl p-5 text-center space-y-2"
        style={{ background: statusBg(dep.status), border: `1px solid ${statusColor(dep.status)}30` }}>
        <div className="text-3xl font-black" style={{ color: statusColor(dep.status) }}>
          {formatRp(dep.totalAmount)}
        </div>
        {dep.uniqueCode > 0 && (
          <div className="text-xs text-amber-400/80 font-mono">
            (Rp{dep.amount.toLocaleString("id-ID")} + {dep.uniqueCode} kode unik)
          </div>
        )}
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black"
          style={{ background: statusBg(dep.status), color: statusColor(dep.status), border: `1px solid ${statusColor(dep.status)}50` }}
        >
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: statusColor(dep.status) }} />
          {statusLabel(dep.status)}
        </span>
      </div>

      {/* Detail rows */}
      <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <DetailRow label="ID Deposit" value={`DEP-${dep.id}`} mono />
        <DetailRow label="Metode" value={dep.method.toUpperCase()} />
        <DetailRow label="Nominal" value={formatRp(dep.amount)} />
        <DetailRow label="Kode Unik" value={dep.uniqueCode > 0 ? `+${dep.uniqueCode}` : "–"} accent={dep.uniqueCode > 0 ? "#F59E0B" : undefined} />
        <DetailRow label="Total Bayar" value={formatRp(dep.totalAmount)} accent="#10B981" />
        {dep.paymentRef && <DetailRow label="Ref Pembayaran" value={dep.paymentRef} mono />}
        {dep.note && <DetailRow label="Catatan" value={dep.note} />}
        <DetailRow label="Dibuat" value={fmtDate(dep.createdAt)} />
        {dep.expiredAt && <DetailRow label="Kedaluwarsa" value={fmtDate(dep.expiredAt)} />}
        {dep.paidAt && <DetailRow label="Dibayar" value={fmtDate(dep.paidAt)} accent="#F59E0B" />}
        {dep.confirmedAt && <DetailRow label="Dikonfirmasi" value={fmtDate(dep.confirmedAt)} accent="#10B981" />}
      </div>

      {/* Proof image */}
      {dep.proofImageUrl && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-white/60">Bukti Pembayaran</p>
          <img
            src={dep.proofImageUrl}
            alt="Bukti"
            className="w-full rounded-xl object-contain max-h-72"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          />
          <a
            href={dep.proofImageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-blue-400"
            style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Buka gambar penuh
          </a>
        </div>
      )}
    </div>
  );
}

/* ─── Transactions List ─── */
function TransactionsList() {
  const [txs, setTxs] = useState<V2Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<V2Transaction | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await v2GetTransactions(page);
      setTxs(res.data);
      setHasMore(res.data.length === (res.limit ?? 20));
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  const STATUS_CHIPS = [
    { val: "", label: "Semua" },
    { val: "success", label: "Sukses" },
    { val: "pending", label: "Pending" },
    { val: "failed", label: "Gagal" },
  ];

  const filtered = txs.filter((t) => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.productCode.toLowerCase().includes(q) || t.customerNo.toLowerCase().includes(q) || t.refId.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBox msg={error} onRetry={() => void load()} />;

  return (
    <>
      {/* Filter chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {STATUS_CHIPS.map((c) => (
          <button
            key={c.val}
            onClick={() => setFilterStatus(c.val)}
            className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all active:scale-95"
            style={filterStatus === c.val
              ? { background: `linear-gradient(135deg,${statusColor(c.val || "success")},${statusColor(c.val || "success")}99)`, color: "#fff", boxShadow: `0 2px 8px ${statusColor(c.val || "success")}40` }
              : { background: "#EEF1F7", border: "1px solid #D8E0ED", color: "#4B5563" }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nomor / produk / ref…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-ruby/50"
        />
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm text-slate-500">Tidak ada transaksi ditemukan</p>
          </div>
        )}
        {filtered.map((tx) => (
          <button
            key={tx.id}
            onClick={() => setSelected(tx)}
            className="w-full text-left rounded-xl p-3 transition-all active:scale-[0.98]"
            style={{ background: "#FFFFFF", border: "1px solid #DDE3EE", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
          >
            <div className="flex items-center gap-3">
              {/* Category icon */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: "#EEF1F7" }}>
                {categoryIcon(tx.category)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-slate-800 truncate">{tx.productCode}</span>
                  <span className="font-black text-sm text-amber-500 shrink-0">{formatRp(tx.sellingPrice)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 font-mono truncate">{tx.customerNo}</span>
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: statusBg(tx.status), color: statusColor(tx.status) }}
                  >
                    {statusLabel(tx.status)}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{fmtDateShort(tx.createdAt)}</div>
              </div>
              <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-3">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-200 disabled:opacity-30"
        >← Prev</button>
        <span className="text-xs text-slate-500">Hal. {page}</span>
        <button
          disabled={!hasMore}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-200 disabled:opacity-30"
        >Next →</button>
      </div>

      {/* Detail Sheet */}
      <BottomSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Detail Transaksi"
      >
        {selected && <TransactionDetail tx={selected} />}
      </BottomSheet>
    </>
  );
}

/* ─── Deposits List ─── */
function DepositsList() {
  const [deps, setDeps] = useState<V2Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState("");
  const [selected, setSelected] = useState<V2Deposit | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await v2GetDeposits(page);
      setDeps(res.data);
      setHasMore(res.data.length === (res.limit ?? 20));
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  const STATUS_CHIPS = [
    { val: "", label: "Semua" },
    { val: "pending", label: "Pending" },
    { val: "paid", label: "Dibayar" },
    { val: "confirmed", label: "Konfirmasi" },
    { val: "failed", label: "Ditolak" },
    { val: "expired", label: "Expired" },
  ];

  const filtered = filterStatus ? deps.filter((d) => d.status === filterStatus) : deps;

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBox msg={error} onRetry={() => void load()} />;

  return (
    <>
      {/* Filter chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {STATUS_CHIPS.map((c) => (
          <button
            key={c.val}
            onClick={() => setFilterStatus(c.val)}
            className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all active:scale-95"
            style={filterStatus === c.val
              ? { background: "linear-gradient(135deg,#C81E3A,#9B1835)", color: "#fff", boxShadow: "0 2px 8px rgba(200,30,58,0.35)" }
              : { background: "#EEF1F7", border: "1px solid #D8E0ED", color: "#4B5563" }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2 mt-1">
        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm text-slate-500">Tidak ada deposit ditemukan</p>
          </div>
        )}
        {filtered.map((dep) => (
          <button
            key={dep.id}
            onClick={() => setSelected(dep)}
            className="w-full text-left rounded-xl p-3 transition-all active:scale-[0.98]"
            style={{
              background: dep.status === "paid" ? "rgba(59,130,246,0.06)" : "#FFFFFF",
              border: `1px solid ${dep.status === "paid" ? "rgba(59,130,246,0.25)" : "#DDE3EE"}`,
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: "#EEF1F7" }}>
                💰
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-sm text-emerald-600">{formatRp(dep.totalAmount)}</span>
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: statusBg(dep.status), color: statusColor(dep.status) }}
                  >
                    {statusLabel(dep.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 uppercase font-semibold">{dep.method}</span>
                  {dep.uniqueCode > 0 && (
                    <span className="text-[10px] text-amber-500 font-mono">+{dep.uniqueCode} unik</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{fmtDateShort(dep.createdAt)}</div>
              </div>
              <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            {dep.status === "paid" && (
              <div className="mt-2 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 text-center"
                style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
                📸 Bukti diterima — menunggu konfirmasi admin
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-3">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-200 disabled:opacity-30"
        >← Prev</button>
        <span className="text-xs text-slate-500">Hal. {page}</span>
        <button
          disabled={!hasMore}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-200 disabled:opacity-30"
        >Next →</button>
      </div>

      {/* Detail Sheet */}
      <BottomSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Detail Deposit"
      >
        {selected && <DepositDetail dep={selected} />}
      </BottomSheet>
    </>
  );
}

/* ─── Mutations List ─── */
function MutationsList() {
  const [mutations, setMutations] = useState<BalanceMutation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await v2GetMutations(page);
      setMutations(res.data);
      setHasMore(res.data.length === (res.limit ?? 20));
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBox msg={error} onRetry={() => void load()} />;

  return (
    <>
      <div className="space-y-2">
        {mutations.length === 0 && (
          <div className="py-12 text-center">
            <div className="text-3xl mb-2">📊</div>
            <p className="text-sm text-slate-500">Belum ada mutasi saldo</p>
          </div>
        )}
        {mutations.map((m) => {
          const isCredit = mutationType(m.type) === "credit";
          return (
            <div
              key={m.id}
              className="rounded-xl p-3"
              style={{
                background: "#FFFFFF",
                border: `1px solid ${isCredit ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base font-black"
                  style={{
                    background: isCredit ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                    color: isCredit ? "#059669" : "#DC2626",
                  }}
                >
                  {isCredit ? "+" : "−"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-800">{mutationLabel(m.type)}</span>
                    <span
                      className="font-black text-sm shrink-0"
                      style={{ color: isCredit ? "#059669" : "#DC2626" }}
                    >
                      {isCredit ? "+" : "−"}{formatRp(Math.abs(m.amount))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500 truncate">
                      {m.note ?? m.refId ?? "—"}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">{formatRp(m.balanceAfter)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{fmtDateShort(m.createdAt)}</div>
                </div>
              </div>
              {/* Balance flow bar */}
              <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                <span className="font-mono">{formatRp(m.balanceBefore)}</span>
                <div className="flex-1 h-px" style={{ background: isCredit ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)" }} />
                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  style={{ color: isCredit ? "#10B981" : "#EF4444" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                <div className="flex-1 h-px" style={{ background: isCredit ? "rgba(16,185,129,0.3)" : "rgba(239,68,69,0.3)" }} />
                <span className="font-mono" style={{ color: isCredit ? "#10B981" : "#EF4444" }}>{formatRp(m.balanceAfter)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-3">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-200 disabled:opacity-30"
        >← Prev</button>
        <span className="text-xs text-slate-500">Hal. {page}</span>
        <button
          disabled={!hasMore}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-200 disabled:opacity-30"
        >Next →</button>
      </div>
    </>
  );
}

/* ─── Shared helpers ─── */
function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-16">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
function ErrorBox({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/20 text-center space-y-2">
      <p className="text-sm text-red-400">{msg}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-xs text-red-300 underline">Coba lagi</button>
      )}
    </div>
  );
}

/* ─── Main HistoryPage ─── */
export default function HistoryPage() {
  const [tab, setTab] = useState<HistoryTab>("transactions");

  const TABS: { id: HistoryTab; label: string; icon: string }[] = [
    { id: "transactions", label: "Transaksi", icon: "📱" },
    { id: "deposits", label: "Top Up", icon: "💰" },
    { id: "mutations", label: "Mutasi", icon: "📊" },
  ];

  return (
    <div className="min-h-dvh pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-20"
        style={{ background: "linear-gradient(160deg, #C81E3A 0%, #9B1835 100%)", boxShadow: "0 4px 20px rgba(155,24,53,0.3)" }}>
        <div className="px-4 pt-safe-top pt-4 pb-2">
          <h1 className="text-xl font-black text-white">Riwayat</h1>
          <p className="text-xs text-white/75 mt-0.5">Transaksi, deposit &amp; mutasi saldo</p>
        </div>
        {/* Tab selector */}
        <div className="flex px-4 pb-3 gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
              style={tab === t.id
                ? { background: "rgba(255,255,255,0.28)", color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }
                : { background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.72)", border: "1px solid rgba(255,255,255,0.18)" }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 space-y-3">
        {tab === "transactions" && <TransactionsList />}
        {tab === "deposits" && <DepositsList />}
        {tab === "mutations" && <MutationsList />}
      </div>
    </div>
  );
}
