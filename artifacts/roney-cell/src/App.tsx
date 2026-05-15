import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import Home from "@/pages/Home";
import DepositPage from "@/pages/DepositPage";
import AdminPage from "@/pages/AdminPage";

type Tab = "home" | "deposit" | "admin";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  return (
    <div className="min-h-dvh">
      {activeTab === "home" && <Home />}
      {activeTab === "deposit" && <DepositPage />}
      {activeTab === "admin" && <AdminPage />}
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  );
}
