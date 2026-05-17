import { useState, useEffect } from "react";
import { v2GetMutations, type BalanceMutation } from "@/lib/apiV2";
import { formatRupiah } from "@/lib/products";

const TYPE_META: Record<string, { label: string; color: string; sign: string }> = {
  topup:      { label: "Top Up",     color: "#34D399", sign: "+" },
  debit:      { label: "Pembelian",  color: "#F87171", sign: "-" },
  refund:     { label: "Refund",     color: "#60A5FA", sign: "+" },
  bonus:      { label: "Bonus",      color: "#FBBF24", sign: "+" },
  correction: { label: "Koreksi",    color: "#A78BFA", sign: "±" },
  withdraw:   { label: "Tarik",      color: "#F97316", sign: "-" },
  transfer:   { label: "Transfer",   color: "#38BDF8", sign: "±" },
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })
    + " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export default function MutationHistoryPanel() {
  const [mutations, setMutations] = useState<BalanceMutation[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(p: number) {
    setLoading(true); setError("");
    try {
      const res = await v2GetMutations(p);
      setMutations(res.data);
      setHasMore(res.data.length === res.limit);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(1); }, []);

  if (error) return null;

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">📊</span>
          <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold">
            Riwayat Mutasi Saldo
          </p>
        </div>
        <button
          onClick={() => { setPage(1); void load(1); }}
          className="text-[10px] text-blue-400 px-2 py-1 rounded-lg border border-white/8 hover:bg-white/5"
        >
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : mutations.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-6">Belum ada riwayat mutasi</p>
      ) : (
        <div className="space-y-2">
          {mutations.map((m) => {
            const meta = TYPE_META[m.type] ?? { label: m.type, color: "#9CA3AF", sign: "±" };
            const isNeg = meta.sign === "-";
            return (
              <div key={m.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
                style={{ borderColor: `${meta.color}20`, background: `${meta.color}08` }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}25` }}>
                  <span className="text-xs font-black" style={{ color: meta.color }}>{meta.sign}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${meta.color}20`, color: meta.color }}>
                      {meta.label}
                    </span>
                    {m.refId && (
                      <span className="text-[9px] text-muted-foreground truncate">{m.refId}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {m.note ?? fmtDate(m.createdAt)}
                  </p>
                  {m.note && (
                    <p className="text-[9px] text-muted-foreground/60">{fmtDate(m.createdAt)}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black" style={{ color: isNeg ? "#F87171" : "#34D399" }}>
                    {meta.sign === "±" ? "" : meta.sign}{formatRupiah(m.amount)}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    → {formatRupiah(m.balanceAfter)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && (mutations.length > 0 || page > 1) && (
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/8">
          <button
            disabled={page <= 1}
            onClick={() => { const p = page - 1; setPage(p); void load(p); }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 text-white disabled:opacity-30"
          >
            ← Sebelumnya
          </button>
          <span className="text-[10px] text-muted-foreground">Hal. {page}</span>
          <button
            disabled={!hasMore}
            onClick={() => { const p = page + 1; setPage(p); void load(p); }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 text-white disabled:opacity-30"
          >
            Berikutnya →
          </button>
        </div>
      )}
    </div>
  );
}
