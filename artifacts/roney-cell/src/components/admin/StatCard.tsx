interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export default function StatCard({ label, value, sub, color = "#3B82F6", icon, onClick }: StatCardProps) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-1.5">
          {icon && <span style={{ color }}>{icon}</span>}
          {onClick && (
            <svg className="w-3 h-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
      </div>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="rounded-xl p-4 flex flex-col gap-2 text-left transition-all active:scale-[0.97] hover:brightness-110"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      {inner}
    </div>
  );
}
