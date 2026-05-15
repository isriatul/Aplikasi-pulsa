import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import Home from "@/pages/Home";
import DepositPage from "@/pages/DepositPage";
import AdminPage from "@/pages/AdminPage";
import MemberPortal from "@/pages/MemberPortal";
import { Member, loadSession, clearSession, loadMembers } from "@/lib/members";

type Tab = "home" | "deposit" | "member" | "admin";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [member, setMember] = useState<Member | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const session = loadSession();
    if (session) setMember(session);
    refreshPendingCount();
  }, []);

  function refreshPendingCount() {
    const count = loadMembers().filter((m) => m.status === "pending").length;
    setPendingCount(count);
  }

  function handleLogin(m: Member) {
    setMember(m);
    setActiveTab("home");
  }

  function handleLogout() {
    clearSession();
    setMember(null);
  }

  return (
    <div className="min-h-dvh">
      <div style={{ display: activeTab === "home" ? "block" : "none" }}>
        <Home member={member} />
      </div>
      <div style={{ display: activeTab === "deposit" ? "block" : "none" }}>
        <DepositPage member={member} />
      </div>
      <div style={{ display: activeTab === "member" ? "block" : "none" }}>
        <MemberPortal member={member} onLogin={handleLogin} onLogout={handleLogout} />
      </div>
      <div style={{ display: activeTab === "admin" ? "block" : "none" }}>
        <AdminPage onMemberChange={refreshPendingCount} />
      </div>
      <BottomNav
        active={activeTab}
        onChange={(tab) => { setActiveTab(tab); refreshPendingCount(); }}
        member={member}
        pendingMemberCount={pendingCount}
      />
    </div>
  );
}
