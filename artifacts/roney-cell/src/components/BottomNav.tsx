import { Member } from "@/lib/members";

type Tab = "home" | "deposit" | "member" | "admin";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  member: Member | null;
  pendingMemberCount?: number;
}

const TABS: {
  id: Tab;
  label: string;
  color: string;
  icon: (active: boolean) => React.ReactElement;
}[] = [
  {
    id: "home",
    label: "Beranda",
    color: "#3B82F6",
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? "#3B82F6" : "none"} stroke={a ? "#3B82F6" : "rgba(255,255,255,0.38)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
        <path d="M9 21V12h6v9"/>
      </svg>
    ),
  },
  {
    id: "deposit",
    label: "Top Up",
    color: "#F59E0B",
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? "#F59E0B" : "rgba(255,255,255,0.38)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="14" rx="3"/>
        <path d="M2 10h20"/>
        <circle cx="7" cy="15" r="1" fill={a ? "#F59E0B" : "rgba(255,255,255,0.38)"} stroke="none"/>
        <path d="M11 15h6"/>
      </svg>
    ),
  },
  {
    id: "member",
    label: "Akun",
    color: "#10B981",
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? "#10B981" : "rgba(255,255,255,0.38)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
  },
  {
    id: "admin",
    label: "Owner",
    color: "#8B5CF6",
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? "#8B5CF6" : "rgba(255,255,255,0.38)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
      </svg>
    ),
  },
];

export default function BottomNav({ active, onChange, member, pendingMemberCount = 0 }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bottom-nav-bar pb-safe">
      <div className="flex items-center justify-around px-2 pt-2 pb-3">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          const showBadge = tab.id === "admin" && pendingMemberCount > 0;
          const showOnlineDot = tab.id === "member" && !!member;

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="relative flex flex-col items-center gap-1 px-5 py-1.5 rounded-2xl transition-all duration-200 select-none"
              style={isActive ? { background: `${tab.color}18` } : {}}
            >
              <div className="relative">
                {tab.icon(isActive)}
                {showOnlineDot && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0B0F1A]" />
                )}
                {showBadge && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                    {pendingMemberCount}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-semibold tracking-wide transition-colors leading-none"
                style={{ color: isActive ? tab.color : "rgba(255,255,255,0.38)" }}
              >
                {tab.id === "member" && member ? member.name.split(" ")[0] : tab.label}
              </span>
              {isActive && <span className="tab-active-indicator" style={{ background: tab.color }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
