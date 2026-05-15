type Tab = "home" | "deposit" | "admin";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; icon: (active: boolean) => JSX.Element }[] = [
  {
    id: "home",
    label: "Transaksi",
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? "text-blue-400" : "text-muted-foreground"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    id: "deposit",
    label: "Isi Saldo",
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? "text-gold" : "text-muted-foreground"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    ),
  },
  {
    id: "admin",
    label: "Admin",
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? "text-purple-400" : "text-muted-foreground"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto"
      style={{
        background: "linear-gradient(to top, hsl(220 45% 6%) 0%, hsl(220 40% 8% / 0.95) 100%)",
        borderTop: "1px solid rgba(100,160,255,0.1)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="flex items-center justify-around px-2 pb-safe pt-2 pb-3">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          const activeColors: Record<Tab, string> = {
            home: "rgba(59,130,246,0.12)",
            deposit: "rgba(251,191,36,0.12)",
            admin: "rgba(139,92,246,0.12)",
          };
          const activeLabelColors: Record<Tab, string> = {
            home: "#60A5FA",
            deposit: "#FBBF24",
            admin: "#A78BFA",
          };
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all duration-200"
              style={isActive ? { background: activeColors[tab.id] } : {}}
            >
              {tab.icon(isActive)}
              <span
                className="text-[10px] font-semibold tracking-wide transition-colors"
                style={{ color: isActive ? activeLabelColors[tab.id] : undefined }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
