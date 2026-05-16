import { Member } from "@/lib/members";

type Tab = "home" | "deposit" | "member" | "admin";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  member: Member | null;
  pendingMemberCount?: number;
}

export default function BottomNav({ active, onChange, member, pendingMemberCount = 0 }: BottomNavProps) {
  const TABS: {
    id: Tab;
    label: string;
    activeColor: string;
    activeBg: string;
    icon: (active: boolean) => React.ReactElement;
    badge?: number | string;
  }[] = [
    {
      id: "home",
      label: "Transaksi",
      activeColor: "#60A5FA",
      activeBg: "rgba(59,130,246,0.12)",
      icon: (a) => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
          style={{ color: a ? "#60A5FA" : "rgba(255,255,255,0.4)", strokeWidth: a ? 2.5 : 2 }}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: "deposit",
      label: "Isi Saldo",
      activeColor: "#FBBF24",
      activeBg: "rgba(251,191,36,0.12)",
      icon: (a) => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
          style={{ color: a ? "#FBBF24" : "rgba(255,255,255,0.4)", strokeWidth: a ? 2.5 : 2 }}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      id: "member",
      label: member ? member.name.split(" ")[0] : "Member",
      activeColor: "#34D399",
      activeBg: "rgba(52,211,153,0.12)",
      icon: (a) => (
        <div className="relative">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            style={{ color: a ? "#34D399" : "rgba(255,255,255,0.4)", strokeWidth: a ? 2.5 : 2 }}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {member && (
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </div>
      ),
    },
    {
      id: "admin",
      label: "Owner",
      activeColor: "#A78BFA",
      activeBg: "rgba(139,92,246,0.12)",
      badge: pendingMemberCount > 0 ? pendingMemberCount : undefined,
      icon: (a) => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
          style={{ color: a ? "#A78BFA" : "rgba(255,255,255,0.4)", strokeWidth: a ? 2.5 : 2 }}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto"
      style={{
        background: "linear-gradient(to top, hsl(220 45% 5%) 0%, hsl(220 40% 7% / 0.96) 100%)",
        borderTop: "1px solid rgba(100,160,255,0.08)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="flex items-center justify-around px-1 pt-2 pb-3">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-0"
              style={isActive ? { background: tab.activeBg } : {}}
            >
              {tab.icon(isActive)}
              <span
                className="text-[10px] font-semibold tracking-wide transition-colors truncate max-w-[60px]"
                style={{ color: isActive ? tab.activeColor : "rgba(255,255,255,0.4)" }}
              >
                {tab.label}
              </span>
              {tab.badge !== undefined && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-400 text-gray-900 text-[9px] font-black flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
