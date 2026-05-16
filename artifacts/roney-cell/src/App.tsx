import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import Home from "@/pages/Home";
import DepositPage from "@/pages/DepositPage";
import AdminPage from "@/pages/AdminPage";
import MemberPortal from "@/pages/MemberPortal";
import LoginPage from "@/pages/LoginPage";
import SetupPage from "@/pages/SetupPage";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import { Member, clearSession } from "@/lib/members";
import { loadConfig } from "@/lib/config";

type Tab = "home" | "deposit" | "member" | "admin";
type AppState = "checking" | "setup" | "login" | "app";

function isSuperAdmin(m: Member): boolean {
  return (
    m.notes === "__superadmin__" ||
    m.phone.replace(/\D/g, "").replace(/^0/, "") === "81288080752"
  );
}

const SESSION_KEY = "roneycell_member_session_v2";

function saveAppSession(member: Member) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(member));
}

function loadAppSession(): Member | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw) as Member;
  } catch {}
  return null;
}

function clearAppSession() {
  localStorage.removeItem(SESSION_KEY);
  clearSession();
}

export default function App() {
  const [appState, setAppState] = useState<AppState>("checking");
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [member, setMember] = useState<Member | null>(null);

  useEffect(() => {
    // Allow accessing setup page via ?setup=1 or #setup in URL
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    if (params.get("setup") === "1" || hash === "#setup") {
      setAppState("setup");
      return;
    }
    const cfg = loadConfig();
    if (!cfg.scriptsUrl?.trim()) {
      setAppState("setup");
      return;
    }
    const session = loadAppSession();
    if (session) {
      setMember(session);
      setAppState("app");
      if (isSuperAdmin(session)) setActiveTab("admin");
    } else {
      setAppState("login");
    }
  }, []);

  function handleSetupDone() {
    setAppState("login");
  }

  function handleLogin(m: Member) {
    if (m.status === "pending" || m.status === "rejected") return;
    saveAppSession(m);
    setMember(m);
    setAppState("app");
    setActiveTab(isSuperAdmin(m) ? "admin" : "home");
  }

  function handleLogout() {
    clearAppSession();
    setMember(null);
    setAppState("login");
  }

  function handleMemberUpdate(updated: Member) {
    saveAppSession(updated);
    setMember(updated);
  }

  if (appState === "checking") return null;
  if (appState === "setup")   return <SetupPage onDone={handleSetupDone} />;
  if (appState === "login")   return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="min-h-dvh">
      <div style={{ display: activeTab === "home" ? "block" : "none" }}>
        <Home member={member!} onMemberUpdate={handleMemberUpdate} />
      </div>
      <div style={{ display: activeTab === "deposit" ? "block" : "none" }}>
        <DepositPage member={member} />
      </div>
      <div style={{ display: activeTab === "member" ? "block" : "none" }}>
        <MemberPortal member={member} onLogin={handleLogin} onLogout={handleLogout} />
      </div>
      <div style={{ display: activeTab === "admin" ? "block" : "none" }}>
        <AdminPage onMemberChange={() => {}} />
      </div>
      <BottomNav
        active={activeTab}
        onChange={setActiveTab}
        member={member}
        pendingMemberCount={0}
      />
      <PWAInstallBanner />
    </div>
  );
}
