import { useEffect, useState } from "react";
import { subscribeBalance } from "@/lib/firebase";
import { formatRupiah } from "@/lib/products";
import { t, getLang } from "@/lib/i18n";

interface BalanceCardProps {
  onBalanceChange?: (balance: number) => void;
}

export default function BalanceCard({ onBalanceChange }: BalanceCardProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const lang = getLang();

  useEffect(() => {
    const unsub = subscribeBalance(
      (val) => {
        setBalance(val);
        setLoading(false);
        setError(false);
        onBalanceChange?.(val);
      },
      () => {
        setError(true);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  return (
    <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top right, hsl(185 100% 55% / 0.3) 0%, transparent 60%)",
        }}
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
            <span className="text-xs text-muted-foreground tracking-widest uppercase font-semibold">
              {t("active_balance", lang)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">{t("synced", lang)}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 mt-1">
            <div className="h-8 w-40 rounded-lg bg-white/5 animate-pulse" />
          </div>
        ) : error ? (
          <p className="text-destructive text-sm mt-1">Gagal memuat saldo</p>
        ) : (
          <p
            className="text-3xl font-bold tracking-tight mt-1"
            style={{
              background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #EAB308 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {formatRupiah(balance ?? 0)}
          </p>
        )}

        <div className="mt-3 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
        <p className="text-xs text-muted-foreground mt-2">
          {t("sync_info", lang)}
        </p>
      </div>
    </div>
  );
}
