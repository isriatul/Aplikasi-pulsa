import { useEffect, useState, useRef } from "react";
import { subscribeBalance } from "@/lib/firebase";
import { formatRupiah } from "@/lib/products";
import { getV2Token, v2GetBalance } from "@/lib/apiV2";

interface BalanceCardProps {
  onBalanceChange?: (balance: number) => void;
  memberName?: string;
  memberRole?: string;
}

export default function BalanceCard({ onBalanceChange, memberName, memberRole }: BalanceCardProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hidden, setHidden] = useState(false);
  const isV2 = !!getV2Token();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isV2) {
      async function fetchV2() {
        try {
          const res = await v2GetBalance();
          setBalance(res.balance);
          setLoading(false);
          setError(false);
          onBalanceChange?.(res.balance);
        } catch {
          setError(true);
          setLoading(false);
        }
      }
      void fetchV2();
      intervalRef.current = setInterval(() => { void fetchV2(); }, 30_000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    } else {
      const unsub = subscribeBalance(
        (val) => { setBalance(val); setLoading(false); setError(false); onBalanceChange?.(val); },
        () => { setError(true); setLoading(false); }
      );
      return unsub;
    }
  }, [isV2]);

  const roleLabel = memberRole === "superadmin" || memberRole === "admin" ? "Admin"
    : memberRole === "reseller" ? "Reseller" : "Member";
  const roleColor = memberRole === "superadmin" || memberRole === "admin"
    ? "#8B5CF6" : memberRole === "reseller" ? "#F59E0B" : "#10B981";

  return (
    <div className="balance-hero rounded-2xl p-5 relative overflow-hidden border border-white/8 shadow-xl">
      <div className="relative z-10">
        {/* Top row */}
        <div className="flex items-start justify-between mb-4">
          <div>
            {memberName && (
              <p className="text-white/60 text-xs font-medium mb-0.5">
                Halo, <span className="text-white/90 font-semibold">{memberName.split(" ")[0]}</span> 👋
              </p>
            )}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Saldo Aktif</span>
              <span
                className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                style={{ background: `${roleColor}22`, color: roleColor, border: `1px solid ${roleColor}44` }}
              >
                {roleLabel}
              </span>
            </div>
          </div>

          <button
            onClick={() => setHidden(h => !h)}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/8 hover:bg-white/14 transition-colors"
            title={hidden ? "Tampilkan saldo" : "Sembunyikan saldo"}
          >
            {hidden ? (
              <svg width="15" height="15" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            ) : (
              <svg width="15" height="15" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
              </svg>
            )}
          </button>
        </div>

        {/* Balance */}
        {loading ? (
          <div className="skeleton h-10 w-44 mb-1" />
        ) : error ? (
          <p className="text-red-400 text-sm font-medium">Gagal memuat saldo</p>
        ) : hidden ? (
          <p className="text-4xl font-black tracking-tight text-white/80 mb-1">••••••</p>
        ) : (
          <p className="text-4xl font-black tracking-tight mb-1" style={{
            background: "linear-gradient(135deg,#FBBF24 0%,#F59E0B 60%,#EAB308 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            {formatRupiah(balance ?? 0)}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
            <span className="text-[10px] text-white/40 font-medium">Realtime • Update otomatis</span>
          </div>
          <span className="text-[10px] text-white/30">{isV2 ? "PostgreSQL" : "Firebase"}</span>
        </div>
      </div>
    </div>
  );
}
