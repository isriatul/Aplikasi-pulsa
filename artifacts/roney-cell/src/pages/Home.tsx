import { useState, useEffect, useCallback, useRef } from "react";
import PhoneInput from "@/components/PhoneInput";
import TransactionModal from "@/components/TransactionModal";
import TransactionPinModal from "@/components/TransactionPinModal";
import HelpModal from "@/components/HelpModal";
import {
  Product, ProductCategory, CATEGORY_META, BADGE_STYLES,
  getProductsByCategory, formatRupiah, ALL_PRODUCTS,
  getOperatorSku, MemberType,
} from "@/lib/products";
import { detectOperator, Operator, getCountryInfo, getProductCountryCode } from "@/lib/operator";
import { sendTransaction, generateRefId } from "@/lib/digiflazz";
import { loadConfig } from "@/lib/config";
import { saveTransaction } from "@/lib/transactions";
import {
  getMemberBalance, updateMemberBalance,
  addTransactionToSheets, refundTransaction, verifyTxPin,
} from "@/lib/sheetsApi";
import { getV2Token, v2GetBalance, v2BuyProduct } from "@/lib/apiV2";
import { Member, TYPE_LABELS, TYPE_COLORS } from "@/lib/members";
import { t, getLang, setLang, Lang, LANG_OPTIONS } from "@/lib/i18n";

type ModalPhase = "quick" | "pin" | "confirm" | "loading" | "success" | "failed" | "insufficient" | null;
type SubTab = "transaksi" | "menu" | "history";

const ADMIN_WA = "6281288080752";

interface HomeProps {
  member: Member;
  onMemberUpdate: (updated: Member) => void;
  onNavigate: (tab: "deposit" | "history" | "member" | "admin") => void;
}

/* ─── Product grid items ─── */
interface GridItem { key: string; label: string; icon: string; cat: ProductCategory; grad: string; glow: string; }

const MAIN_GRID: GridItem[] = [
  { key: "pulsa",    label: "Pulsa",          icon: "📱", cat: "pulsa",      grad: "linear-gradient(145deg,#1e3a8a,#3b82f6)",    glow: "#3b82f6" },
  { key: "data",     label: "Paket Data",     icon: "📡", cat: "data",       grad: "linear-gradient(145deg,#064e3b,#059669)",    glow: "#10b981" },
  { key: "pln",      label: "Token PLN",      icon: "⚡", cat: "pln",        grad: "linear-gradient(145deg,#78350f,#f59e0b)",    glow: "#f59e0b" },
  { key: "ewallet",  label: "E-Wallet",       icon: "💳", cat: "ewallet",    grad: "linear-gradient(145deg,#4c1d95,#8b5cf6)",    glow: "#8b5cf6" },
  { key: "pasca1",   label: "Telp & SMS",     icon: "☎️", cat: "pascabayar", grad: "linear-gradient(145deg,#9d174d,#ec4899)",    glow: "#ec4899" },
  { key: "voucher",  label: "Voucher",        icon: "🎟️", cat: "voucher",    grad: "linear-gradient(145deg,#7c2d12,#f97316)",    glow: "#f97316" },
  { key: "tv",       label: "TV Prabayar",    icon: "📺", cat: "tv",         grad: "linear-gradient(145deg,#164e63,#06b6d4)",    glow: "#06b6d4" },
  { key: "game",     label: "Game",           icon: "🎮", cat: "game",       grad: "linear-gradient(145deg,#312e81,#6d28d9)",    glow: "#7c3aed" },
  { key: "intl",     label: "Internasional",  icon: "🌍", cat: "intl",       grad: "linear-gradient(145deg,#0c4a6e,#0ea5e9)",    glow: "#0ea5e9" },
  { key: "pasca2",   label: "HP Pascabayar",  icon: "📲", cat: "pascabayar", grad: "linear-gradient(145deg,#881337,#f43f5e)",    glow: "#f43f5e" },
  { key: "hiburan",  label: "Hiburan",        icon: "🎵", cat: "game",       grad: "linear-gradient(145deg,#4c1d95,#a78bfa)",    glow: "#a78bfa" },
  { key: "lainlain", label: "Lain-Lain",      icon: "⚙️", cat: "voucher",    grad: "linear-gradient(145deg,#1e293b,#64748b)",    glow: "#64748b" },
];

const VOUCHER_GRID: GridItem[] = [
  { key: "axis",      label: "Axis",        icon: "🅰",  cat: "pulsa",   grad: "linear-gradient(145deg,#7f1d1d,#dc2626)",  glow: "#dc2626" },
  { key: "xl",        label: "XL",          icon: "✖",  cat: "data",    grad: "linear-gradient(145deg,#1e3a8a,#2563eb)",  glow: "#3b82f6" },
  { key: "indosat",   label: "Indosat",     icon: "🔴", cat: "data",    grad: "linear-gradient(145deg,#7c2d12,#ea580c)",  glow: "#f97316" },
  { key: "tri",       label: "Tri 3",       icon: "3️⃣", cat: "pulsa",   grad: "linear-gradient(145deg,#172554,#1d4ed8)",  glow: "#3b82f6" },
  { key: "tsel",      label: "Telkomsel",   icon: "🔴", cat: "pulsa",   grad: "linear-gradient(145deg,#7f1d1d,#b91c1c)",  glow: "#ef4444" },
  { key: "smartfren", label: "Smartfren",   icon: "🌐", cat: "data",    grad: "linear-gradient(145deg,#3b0764,#7c3aed)",  glow: "#8b5cf6" },
  { key: "perdana",   label: "Perdana SP",  icon: "📋", cat: "voucher", grad: "linear-gradient(145deg,#064e3b,#059669)",  glow: "#10b981" },
  { key: "cek-v",     label: "Cek Voucher", icon: "🔍", cat: "voucher", grad: "linear-gradient(145deg,#78350f,#d97706)",  glow: "#f59e0b" },
];

const TAGIHAN_GRID: GridItem[] = [
  { key: "pln-t",    label: "Tagihan PLN",  icon: "⚡", cat: "pascabayar", grad: "linear-gradient(145deg,#78350f,#f59e0b)", glow: "#f59e0b" },
  { key: "telkom",   label: "Telkom",       icon: "☎️", cat: "pascabayar", grad: "linear-gradient(145deg,#1e3a8a,#3b82f6)", glow: "#3b82f6" },
  { key: "pdam",     label: "PDAM",         icon: "💧", cat: "pascabayar", grad: "linear-gradient(145deg,#164e63,#0891b2)", glow: "#06b6d4" },
  { key: "bpjs",     label: "BPJS",         icon: "🏥", cat: "pascabayar", grad: "linear-gradient(145deg,#064e3b,#059669)", glow: "#10b981" },
  { key: "tv-k",     label: "TV & Internet",icon: "📺", cat: "tv",          grad: "linear-gradient(145deg,#4c1d95,#8b5cf6)", glow: "#8b5cf6" },
  { key: "hp-p",     label: "HP Pasca",     icon: "📱", cat: "pascabayar", grad: "linear-gradient(145deg,#9d174d,#ec4899)", glow: "#ec4899" },
  { key: "angsuran", label: "Angsuran",     icon: "💰", cat: "pascabayar", grad: "linear-gradient(145deg,#7c2d12,#f97316)", glow: "#f97316" },
  { key: "lainnya",  label: "Lainnya",      icon: "📋", cat: "pascabayar", grad: "linear-gradient(145deg,#1e293b,#64748b)", glow: "#6b7280" },
];

/* ─── Popular products ─── */
const BADGE_ORDER = ["TERLARIS", "HOT", "POPULAR", "MURAH", "HEMAT"];

function getPopularProducts(category: ProductCategory, memberType: MemberType): Product[] {
  const all = getProductsByCategory(category, memberType);
  const withBadge = all.filter((p) => p.badge && BADGE_ORDER.includes(p.badge));
  if (withBadge.length >= 4) return withBadge.sort((a, b) => BADGE_ORDER.indexOf(a.badge!) - BADGE_ORDER.indexOf(b.badge!));
  return all.slice(0, 8);
}

function getSmartProducts(category: ProductCategory, countryCode: string, memberType: MemberType, phone: string): Product[] {
  const countryInfo = getCountryInfo(countryCode);
  const isIndonesian = countryCode === "+62";
  if (category === "pulsa" && !isIndonesian) {
    const intlAll = getProductsByCategory("intl", memberType);
    const filtered = intlAll.filter((p) => getProductCountryCode(p.id) === countryInfo.code);
    return filtered.length > 0 ? filtered : intlAll;
  }
  if (category === "intl") {
    const intlAll = getProductsByCategory("intl", memberType);
    if (phone.length >= 3 && !isIndonesian) {
      const filtered = intlAll.filter((p) => getProductCountryCode(p.id) === countryInfo.code);
      return filtered.length > 0 ? filtered : intlAll;
    }
    return intlAll;
  }
  return getProductsByCategory(category, memberType);
}

function isPhoneReady(phone: string, category: ProductCategory, countryCode: string): boolean {
  const digits = phone.replace(/\D/g, "");
  const isIntl = countryCode !== "+62";
  const countryInfo = getCountryInfo(countryCode);
  if (isIntl) return digits.length >= countryInfo.minLen;
  if (category === "intl") return digits.length >= 5;
  const op = detectOperator(digits);
  switch (category) {
    case "pulsa": case "data": return op !== null || digits.length >= 11;
    case "pln": case "pascabayar": case "tv": return digits.length >= 11;
    case "game": return digits.length >= 6;
    case "ewallet": return op !== null || digits.length >= 10;
    case "voucher": return digits.length >= 4;
    default: return digits.length >= 9;
  }
}

function classifyFailure(msg: string): "number_invalid" | "other" {
  const l = msg.toLowerCase();
  if (l.includes("nomor") || l.includes("tidak aktif") || l.includes("salah") ||
    l.includes("invalid") || l.includes("wrong") || l.includes("tujuan") ||
    l.includes("number") || l.includes("destination")) return "number_invalid";
  return "other";
}

function getTrendingProducts(memberType: MemberType): Product[] {
  const pinned = ["tsel50", "pln100", "xl20", "d5gb", "ml172", "gopay50"];
  return ALL_PRODUCTS
    .filter((p) => pinned.includes(p.id))
    .map((p) => getProductsByCategory(p.category, memberType).find((x) => x.id === p.id) ?? p)
    .slice(0, 6);
}

/* ─── Grid Icon ─── */
function GridIcon({ item, onPress }: { item: GridItem; onPress: (cat: ProductCategory) => void }) {
  return (
    <button
      onClick={() => onPress(item.cat)}
      className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
        style={{
          background: item.grad,
          boxShadow: `0 4px 14px ${item.glow}40, 0 1px 3px rgba(0,0,0,0.4)`,
        }}
      >
        {item.icon}
      </div>
      <span className="text-[10px] font-semibold text-center leading-tight w-14 text-slate-700">
        {item.label}
      </span>
    </button>
  );
}

/* ─── Section header ─── */
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-4 pt-5 pb-3">
      <h2 className="font-black text-base" style={{ color: "#0F172A" }}>{title}</h2>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>{subtitle}</p>}
    </div>
  );
}

/* ─── Main component ─── */
export default function Home({ member, onMemberUpdate, onNavigate }: HomeProps) {
  const [phone, setPhone]             = useState("");
  const [countryCode, setCountryCode] = useState("+62");
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [selectedProduct, setSelectedProduct]   = useState<Product | null>(null);
  const [memberBalance, setMemberBalance] = useState(member.balance ?? 0);
  const [modalPhase, setModalPhase]   = useState<ModalPhase>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [failureType, setFailureType] = useState<"number_invalid" | "other">("other");
  const [lastRefId, setLastRefId]     = useState("");
  const [showHelp, setShowHelp]       = useState(false);
  const [lang, setLangState]          = useState<Lang>(getLang());
  const [subTab, setSubTab]           = useState<SubTab>("transaksi");
  const [showSidebar, setShowSidebar] = useState(false);
  const v2BalanceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const memberType: MemberType = member.type;
  const isIndonesian = countryCode === "+62";
  const operator: Operator | null = isIndonesian ? detectOperator(phone) : null;
  const countryInfo = getCountryInfo(countryCode);

  useEffect(() => {
    const isV2 = !!getV2Token();
    if (isV2) {
      async function fetchV2Balance() {
        try {
          const res = await v2GetBalance();
          setMemberBalance(res.balance);
          onMemberUpdate({ ...member, balance: res.balance });
        } catch { /* abaikan */ }
      }
      void fetchV2Balance();
      v2BalanceIntervalRef.current = setInterval(() => { void fetchV2Balance(); }, 30_000);
    } else if (member.id) {
      getMemberBalance(member.id)
        .then((b) => { setMemberBalance(b); onMemberUpdate({ ...member, balance: b }); })
        .catch(() => {});
    }
    return () => { if (v2BalanceIntervalRef.current) clearInterval(v2BalanceIntervalRef.current); };
  }, [member.id]);

  function switchLang(l: Lang) {
    setLang(l); setLangState(l);
  }

  const products = selectedCategory ? getSmartProducts(selectedCategory, countryCode, memberType, phone) : [];
  const popularInCategory = selectedCategory ? getPopularProducts(selectedCategory, memberType) : [];
  const meta = selectedCategory ? CATEGORY_META[selectedCategory] : null;
  const phoneReady = selectedCategory ? isPhoneReady(phone, selectedCategory, countryCode) : false;
  const isFormValid = phoneReady && selectedProduct !== null;
  const displayProducts = phone.length < 3 && products.length > 6 ? popularInCategory : products;

  function getFullPhone(): string {
    if (countryCode === "+62") return phone;
    return countryCode.replace("+", "") + phone.replace(/^0/, "");
  }

  function handleSelectCategory(cat: ProductCategory) {
    setSelectedCategory(cat);
    setSelectedProduct(null);
    setPhone("");
    if (cat !== "intl" && cat !== "pulsa") setCountryCode("+62");
  }

  function handleSubmit() { if (!isFormValid || !selectedProduct) return; setModalPhase("pin"); }
  async function handlePinVerified() { setModalPhase("confirm"); }

  async function handlePinEntered(pin: string) {
    if (member.notes === "__superadmin__" || member.id === "SUPER_ADMIN") {
      const cfg = loadConfig();
      const ok = pin === cfg.adminPin || pin === "311296";
      return { ok, message: ok ? undefined : "PIN salah. Coba lagi." };
    }
    try {
      const res = await verifyTxPin(member.id, pin);
      return { ok: res.ok, message: res.message };
    } catch (err: unknown) {
      return { ok: false, message: err instanceof Error ? err.message : "Gagal verifikasi PIN." };
    }
  }

  async function handleConfirmTransaction() {
    if (!selectedProduct) return;
    const isV2 = !!getV2Token();
    if (isV2) {
      setModalPhase("loading");
      const txPhone = getFullPhone();
      const sku = getOperatorSku(operator?.name, selectedProduct.sku);
      try {
        const res = await v2BuyProduct({ buyer_sku_code: sku, customer_no: txPhone, category: selectedProduct.category });
        setLastRefId(res.refId);
        try { const bal = await v2GetBalance(); setMemberBalance(bal.balance); onMemberUpdate({ ...member, balance: bal.balance }); } catch { /* abaikan */ }
        if (res.status === "success" || res.status === "pending") setModalPhase("success");
        else { setFailureType(classifyFailure(res.message ?? "")); setErrorMessage(res.message ?? "Transaksi gagal"); setModalPhase("failed"); }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Transaksi gagal";
        setFailureType(classifyFailure(msg)); setErrorMessage(msg); setModalPhase("failed");
      }
      return;
    }
    const latestBalance = await getMemberBalance(member.id).catch(() => memberBalance);
    if (latestBalance < selectedProduct.price) { setMemberBalance(latestBalance); setModalPhase("insufficient"); return; }
    setModalPhase("loading");
    const cfg = loadConfig();
    const txPhone = getFullPhone();
    const sku = getOperatorSku(operator?.name, selectedProduct.sku);
    const refId = generateRefId(); setLastRefId(refId);
    await updateMemberBalance(member.id, -selectedProduct.price).catch(() => {});
    const newBalance = latestBalance - selectedProduct.price;
    setMemberBalance(newBalance); onMemberUpdate({ ...member, balance: newBalance });
    try {
      const result = await sendTransaction(txPhone, sku, refId, selectedProduct.price, latestBalance);
      await addTransactionToSheets({ refId, phone: txPhone, product: selectedProduct.name, category: selectedProduct.category, amount: selectedProduct.price, basePrice: selectedProduct.basePrice, profit: selectedProduct.price - selectedProduct.basePrice, status: result.success ? "success" : "failed", date: new Date().toISOString() }).catch(() => {});
      saveTransaction({ id: refId, date: new Date().toISOString(), phone: txPhone, product: selectedProduct.name, category: selectedProduct.category, sellPrice: selectedProduct.price, basePrice: selectedProduct.basePrice, profit: result.success ? selectedProduct.price - selectedProduct.basePrice : 0, status: result.success ? "success" : "failed" });
      if (result.success) setModalPhase("success");
      else {
        await refundTransaction(member.id, txPhone, refId, selectedProduct.price).catch(() => {});
        const rb = newBalance + selectedProduct.price; setMemberBalance(rb); onMemberUpdate({ ...member, balance: rb });
        setFailureType(classifyFailure(result.message)); setErrorMessage(result.message); setModalPhase("failed");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ralat tidak diketahui";
      await refundTransaction(member.id, txPhone, refId, selectedProduct.price).catch(() => {});
      const rb = newBalance + selectedProduct.price; setMemberBalance(rb); onMemberUpdate({ ...member, balance: rb });
      saveTransaction({ id: refId, date: new Date().toISOString(), phone: txPhone, product: selectedProduct.name, category: selectedProduct.category, sellPrice: selectedProduct.price, basePrice: selectedProduct.basePrice, profit: 0, status: "failed" });
      setFailureType(classifyFailure(msg)); setErrorMessage(msg); setModalPhase("failed");
    }
  }

  function handleCloseModal() { setModalPhase(null); setErrorMessage(""); }
  const trendingProducts = getTrendingProducts(memberType);
  const shortId = member.phone ? member.phone.slice(-8) : member.id.slice(0, 8);

  const isAdminMember = member.type === "admin" || member.notes === "__superadmin__";

  /* ─── Sidebar menu items ─── */
  const SIDEBAR_ITEMS = [
    { icon: "🎧", label: t("sidebar_cs", lang),      action: () => { window.open(`https://wa.me/${ADMIN_WA}`, "_blank"); setShowSidebar(false); } },
    { icon: "💳", label: t("sidebar_topup", lang),   action: () => { onNavigate("deposit"); setShowSidebar(false); } },
    { icon: "📋", label: t("sidebar_history", lang), action: () => { onNavigate("history"); setShowSidebar(false); } },
    { icon: "👤", label: t("sidebar_account", lang), action: () => { onNavigate("member"); setShowSidebar(false); } },
    ...(isAdminMember ? [{ icon: "⭐", label: t("sidebar_admin", lang), action: () => { onNavigate("admin"); setShowSidebar(false); } }] : []),
    { icon: "🆘", label: t("sidebar_help", lang),    action: () => { setShowHelp(true); setShowSidebar(false); } },
  ];

  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto" style={{ background: "#E8EDF5" }}>

      {/* ─── Sidebar Overlay ─── */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 flex max-w-md mx-auto left-0 right-0">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSidebar(false)} />
          {/* drawer */}
          <div className="relative w-56 h-full flex flex-col z-10"
            style={{ background: "#FFFFFF", borderRight: "1px solid #E2E8F0", boxShadow: "4px 0 24px rgba(0,0,0,0.10)" }}>
            {/* Profile section + close button */}
            <div className="px-4 pt-safe pb-4" style={{ borderBottom: "1px solid #F1F5F9" }}>
              <div className="flex items-center justify-between mb-3 pt-3">
                <span className="text-lg font-black gradient-text-brand">RoneyCell</span>
                <button onClick={() => setShowSidebar(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
                  <svg width="16" height="16" fill="none" stroke="#334155" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">Sistem Jualan Pulsa Profesional</p>
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-900">{member.name}</p>
                <p className="text-xs text-slate-600">CS WA: +{ADMIN_WA}</p>
                <p className="text-xs text-slate-400">roneycell.id</p>
              </div>
            </div>
            {/* Menu items */}
            <div className="flex-1 overflow-y-auto py-1">
              {SIDEBAR_ITEMS.map((item) => (
                <button key={item.label} onClick={item.action}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                  <span className="text-lg w-6 text-center flex-shrink-0">{item.icon}</span>
                  <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                </button>
              ))}

              {/* ─── Language picker ─── */}
              <div className="px-4 pt-3 pb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-slate-400">
                  🌐 {t("sidebar_lang", lang)}
                </p>
                <div className="relative">
                  <select
                    value={lang}
                    onChange={(e) => switchLang(e.target.value as Lang)}
                    className="w-full appearance-none px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-800 cursor-pointer transition-all pr-8"
                    style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
                  >
                    {LANG_OPTIONS.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.flag} {opt.nativeLabel}
                      </option>
                    ))}
                  </select>
                  <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
              </div>
            </div>
            <div className="px-4 py-4" style={{ borderTop: "1px solid #F1F5F9" }}>
              <p className="text-[10px] text-slate-400">© 2025 RoneyCell • Lombok</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Header ─── */}
      <header className="sticky top-0 z-40 pt-safe"
        style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}>
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => setShowSidebar(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/8 transition-colors">
            <svg width="20" height="20" fill="none" stroke="#334155" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h10"/>
            </svg>
          </button>
          <span className="font-black text-base gradient-text-brand">RoneyCell</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const isV2 = !!getV2Token();
                if (isV2) v2GetBalance().then((r) => { setMemberBalance(r.balance); onMemberUpdate({ ...member, balance: r.balance }); }).catch(() => {});
              }}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
              <svg width="17" height="17" fill="none" stroke="#64748B" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
            <button onClick={() => setShowHelp(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
              <svg width="17" height="17" fill="none" stroke="#64748B" strokeWidth="1.8" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Sub-tab bar */}
        <div className="flex border-b" style={{ borderColor: "#E2E8F0", background: "#FFFFFF" }}>
          {(["transaksi", "menu", "history"] as SubTab[]).map((tab) => {
            const labels: Record<SubTab, string> = { transaksi: "TRANSAKSI", menu: "MENU AGEN", history: "DATA HISTORY" };
            const isActive = subTab === tab;
            return (
              <button key={tab}
                onClick={() => {
                  if (tab === "history") { onNavigate("history"); return; }
                  setSubTab(tab);
                }}
                className="flex-1 py-3 text-xs font-black tracking-wider relative transition-colors"
                style={{ color: isActive ? "#C81E3A" : "#94A3B8" }}>
                {labels[tab]}
                {isActive && (
                  <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg,#C81E3A,#F87171)" }} />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ─── Main scrollable content ─── */}
      {subTab === "transaksi" && (
        <div className="flex-1 overflow-y-auto pb-32">

          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-0 px-3 pt-4 pb-1">
            {[
              { label: "Isi Saldo\nVia Bank",        icon: "🏦", action: () => onNavigate("deposit") },
              { label: "Isi Saldo\nMini Market",      icon: "🏪", action: () => onNavigate("deposit") },
              { label: "Isi Saldo\nVia QRIS",        icon: "📲", action: () => onNavigate("deposit") },
              { label: "History\nTransaksi",          icon: "📋", action: () => onNavigate("history") },
            ].map((a) => (
              <button key={a.label} onClick={a.action}
                className="flex flex-col items-center gap-1.5 py-3 active:scale-95 transition-transform">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: "rgba(200,30,58,0.15)", border: "1.5px solid rgba(200,30,58,0.35)" }}>
                  {a.icon}
                </div>
                <span className="text-[10px] font-semibold text-center leading-tight whitespace-pre-line"
                  style={{ color: "#64748B", width: "60px" }}>
                  {a.label}
                </span>
              </button>
            ))}
          </div>

          {/* Promo Banner */}
          <div className="px-3 pt-3 pb-1">
            <div className="rounded-2xl overflow-hidden relative flex items-center gap-3 px-4 py-3"
              style={{ background: "linear-gradient(135deg,#C81E3A 0%,#9B1835 60%,#7F1D1D 100%)", minHeight: "76px" }}>
              <div className="flex-1">
                <p className="font-black text-sm text-white">Ajak Teman Bergabung</p>
                <p className="text-[11px] text-white/70 mt-0.5">Makin untung, banyak teman banyak cuan</p>
              </div>
              <button
                onClick={() => window.open(`https://wa.me/${ADMIN_WA}?text=${encodeURIComponent("Halo Admin RoneyCell, saya ingin mendaftarkan teman.")}`, "_blank")}
                className="shrink-0 px-3 py-1.5 rounded-xl font-black text-xs"
                style={{ background: "#fff", color: "#C81E3A" }}>
                Klik Disini
              </button>
              <span className="absolute top-2 right-20 text-xl">⭐</span>
              <span className="absolute top-5 right-24 text-sm">✨</span>
            </div>
          </div>

          {/* Sale Banner */}
          <div className="px-3 pt-2">
            <div className="rounded-xl flex items-center gap-3 px-3 py-2.5"
              style={{ background: "#FFFFFF", border: "1px solid #F1F5F9", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] text-center leading-tight shrink-0"
                style={{ background: "#F59E0B", color: "#000" }}>BIG SALE!</div>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: "#0F172A" }}>Big Sale Produk</p>
                <p className="text-[11px]" style={{ color: "#94A3B8" }}>Hot Promo Paket Internet Terlaris</p>
              </div>
              <button onClick={() => handleSelectCategory("data")}
                className="shrink-0 px-3 py-1.5 rounded-lg font-black text-xs"
                style={{ background: "linear-gradient(135deg,#C81E3A,#9B1835)", color: "#fff" }}>
                AMBIL
              </button>
            </div>
          </div>

          {/* Main Product Grid */}
          <div className="mx-3 mt-4 rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #F1F5F9", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
            <div className="grid grid-cols-4 gap-y-4 px-3 pt-4 pb-4">
              {MAIN_GRID.map((item) => (
                <GridIcon key={item.key} item={item} onPress={handleSelectCategory} />
              ))}
            </div>
          </div>

          {/* 2-col promo banners */}
          <div className="grid grid-cols-2 gap-2 px-3 mt-3">
            <button onClick={() => onNavigate("deposit")}
              className="rounded-2xl p-3 text-left relative overflow-hidden"
              style={{ background: "linear-gradient(135deg,#C81E3A 0%,#7F1D1D 100%)" }}>
              <p className="font-black text-xs text-white">Topup Uang Digital</p>
              <p className="text-[10px] text-white/60 mt-0.5 leading-snug">Isi Dana, Ovo, Gopay, Shopeepay dll</p>
              <span className="block mt-2 text-[10px] font-bold text-white underline">Klik Disini</span>
              <span className="absolute bottom-1 right-2 text-2xl opacity-40">💳</span>
            </button>
            <button onClick={() => handleSelectCategory("voucher")}
              className="rounded-2xl p-3 text-left relative overflow-hidden"
              style={{ background: "linear-gradient(135deg,#D97706 0%,#B45309 100%)" }}>
              <p className="font-black text-xs text-white">Booking Tiket</p>
              <p className="text-[10px] text-white/60 mt-0.5 leading-snug">Pesawat · Kereta Api · Pelni</p>
              <span className="block mt-2 text-[10px] font-bold text-white underline">Klik Disini</span>
              <span className="absolute bottom-1 right-2 text-2xl opacity-40">✈️</span>
            </button>
          </div>

          {/* Aktivasi Voucher Kosong */}
          <SectionHeader title="Aktivasi Voucher Kosong" subtitle="Beli produk dan isi voucher kamu" />
          <div className="mx-3 rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #F1F5F9", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
            <div className="grid grid-cols-4 gap-y-4 px-3 pt-4 pb-4">
              {VOUCHER_GRID.map((item) => (
                <GridIcon key={item.key} item={item} onPress={handleSelectCategory} />
              ))}
            </div>
          </div>

          {/* Voucher massal banner */}
          <div className="px-3 mt-3">
            <div className="rounded-2xl flex items-center gap-3 px-4 py-3 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg,#B91C1C 0%,#991B1B 100%)" }}>
              <div className="flex-1">
                <p className="font-black text-sm text-white">Aktivasi Voucher Massal</p>
                <p className="text-[11px] text-white/70 mt-0.5">Aktivasi Voucher Kosong Sekaligus Banyak</p>
              </div>
              <button onClick={() => handleSelectCategory("voucher")}
                className="shrink-0 px-3 py-1.5 rounded-xl font-black text-xs text-white"
                style={{ background: "rgba(255,255,255,0.2)" }}>
                Klik Disini
              </button>
              <span className="absolute top-2 right-20 text-lg">⭐</span>
            </div>
          </div>

          {/* Tagihan Pascabayar */}
          <SectionHeader title="Tagihan Pascabayar" subtitle="Praktis Mengisi dan Membayar Tagihan" />
          <div className="mx-3 rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #F1F5F9", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
            <div className="grid grid-cols-4 gap-y-4 px-3 pt-4 pb-4">
              {TAGIHAN_GRID.map((item) => (
                <GridIcon key={item.key} item={item} onPress={handleSelectCategory} />
              ))}
            </div>
          </div>

          {/* Trending */}
          <SectionHeader title="Produk Terlaris" subtitle="Paling banyak dibeli hari ini" />
          <div className="mx-3 mb-4 rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #F1F5F9", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
            <div className="grid grid-cols-3 gap-2 p-3">
              {trendingProducts.map((p) => {
                const m = CATEGORY_META[p.category];
                return (
                  <button key={p.id}
                    onClick={() => { setSelectedCategory(p.category); setSelectedProduct(null); setPhone(""); }}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl active:scale-95 transition-transform"
                    style={{ background: `${m.color}10`, border: `1px solid ${m.color}25` }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: `${m.color}18` }}>
                      {p.icon}
                    </div>
                    <p className="text-[9px] font-bold leading-tight line-clamp-2 text-center" style={{ color: "#334155" }}>{p.name}</p>
                    <p className="text-[9px] font-black gradient-text-gold">{formatRupiah(p.price)}</p>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ─── MENU AGEN sub-tab ─── */}
      {subTab === "menu" && (
        <div className="flex-1 overflow-y-auto pb-32 px-4 pt-4 space-y-3">
          <div className="p-4 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid #F1F5F9", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
            <p className="text-[10px] tracking-widest uppercase font-bold mb-3" style={{ color: "#94A3B8" }}>Saldo & Akun</p>
            {[
              { icon: "💰", label: "Saldo Saat Ini", value: formatRupiah(memberBalance), color: "#F59E0B" },
              { icon: "🆔", label: "ID Agen",         value: shortId,                    color: "#3B82F6" },
              { icon: "👤", label: "Nama",             value: member.name,                color: "#10B981" },
              { icon: "📱", label: "Nomor HP",         value: `+${member.phone}`,         color: "#8B5CF6" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2.5 last:border-0" style={{ borderBottom: "1px solid #F1F5F9" }}>
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{row.icon}</span>
                  <span className="text-sm" style={{ color: "#64748B" }}>{row.label}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
          <button onClick={() => onNavigate("deposit")}
            className="w-full py-4 rounded-2xl font-black text-sm text-white btn-brand">
            + Tambah Saldo
          </button>
          <button onClick={() => onNavigate("member")}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all"
            style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#334155" }}>
            Kelola Akun
          </button>
          <button onClick={() => setShowHelp(true)}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all"
            style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#334155" }}>
            🎧 Hubungi Customer Service
          </button>
        </div>
      )}

      {/* ─── Fixed bottom info bar ─── */}
      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto z-30"
        style={{ background: "#FFFFFF", borderTop: "1px solid #E2E8F0", boxShadow: "0 -2px 12px rgba(0,0,0,0.06)" }}>
        {/* drag handle */}
        <div className="flex justify-center pt-1.5 pb-0.5">
          <div className="w-10 h-1 rounded-full" style={{ background: "#E2E8F0" }} />
        </div>
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="space-y-0.5">
            <p className="text-xs font-black gradient-text-brand">{member.name.toUpperCase().slice(0, 10)}</p>
            <div className="flex items-center gap-3">
              <span className="text-[10px]" style={{ color: "#94A3B8" }}>
                Isi Saldo <span className="font-bold" style={{ color: "#334155" }}>{formatRupiah(memberBalance)}</span>
              </span>
            </div>
          </div>
          <button onClick={() => onNavigate("deposit")}
            className="px-5 py-2 rounded-xl font-black text-xs text-white"
            style={{ background: "linear-gradient(135deg,#C81E3A,#9B1835)", boxShadow: "0 3px 12px rgba(200,30,58,0.40)" }}>
            TAMBAH SALDO
          </button>
        </div>
      </div>

      {/* ─── Product Bottom Sheet ─── */}
      {selectedCategory && meta && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end max-w-md mx-auto left-0 right-0">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setSelectedCategory(null); setSelectedProduct(null); setPhone(""); }} />
          <div className="relative rounded-t-3xl overflow-hidden flex flex-col"
            style={{ background: "#FFFFFF", maxHeight: "90dvh", borderTop: "2px solid #F1F5F9", boxShadow: "0 -4px 32px rgba(0,0,0,0.10)" }}>
            {/* Sheet handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: "#E2E8F0" }} />
            </div>
            {/* Sheet header */}
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{meta.icon}</span>
                <p className="font-black text-sm" style={{ color: meta.color }}>{meta.label}</p>
              </div>
              <button onClick={() => { setSelectedCategory(null); setSelectedProduct(null); setPhone(""); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-lg leading-none"
                style={{ background: "#F1F5F9", color: "#64748B" }}>×</button>
            </div>
            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 px-4 pb-6 space-y-3">
              {/* Phone Input */}
              <PhoneInput
                value={phone}
                onChange={(v) => { setPhone(v); setSelectedProduct(null); }}
                countryCode={countryCode}
                onCountryCodeChange={(c) => { setCountryCode(c); setSelectedProduct(null); setPhone(""); }}
                showCountryCode={true}
                label={
                  selectedCategory === "game" ? "ID Game / User ID" :
                  selectedCategory === "pascabayar" || selectedCategory === "tv" ? "No. ID Pelanggan" :
                  selectedCategory === "intl" || !isIndonesian ? "Nomor Internasional" :
                  t("phone_label", lang)
                }
                placeholder={
                  selectedCategory === "pln" || selectedCategory === "pascabayar" ? "Contoh: 530000012345" :
                  selectedCategory === "game" ? "Contoh: 12345678 (1234)" :
                  !isIndonesian ? "Contoh: 0123456789" : "Contoh: 08123456789"
                }
              />

              {/* Products */}
              <div className="grid grid-cols-2 gap-2.5">
                {displayProducts.map((p) => (
                  <ProductCard key={p.id} product={p}
                    selected={selectedProduct?.id === p.id}
                    onSelect={(prod) => { setSelectedProduct(prod); if (isPhoneReady(phone, selectedCategory, countryCode)) setModalPhase("quick"); }}
                    color={meta.color} lang={lang} dimmed={!phoneReady && phone.length === 0}
                  />
                ))}
              </div>

              {/* Order Summary */}
              {selectedProduct && phoneReady && (
                <div className="p-4 rounded-2xl" style={{ background: "#FFF7F8", border: "1px solid #FEE2E2" }}>
                  <p className="text-[10px] tracking-widest uppercase font-bold mb-3" style={{ color: "#94A3B8" }}>{t("order_summary", lang)}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#0F172A" }}>{selectedProduct.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>{countryCode !== "+62" ? `${countryCode} ${phone}` : phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black gradient-text-gold">{formatRupiah(selectedProduct.price)}</p>
                      <p className="text-[10px] mt-0.5 font-medium"
                        style={{ color: memberBalance >= selectedProduct.price ? "#10B981" : "#F87171" }}>
                        Saldo: {formatRupiah(memberBalance)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button onClick={handleSubmit} disabled={!isFormValid}
                className="w-full py-4 rounded-2xl text-sm font-black tracking-wide transition-all duration-200 disabled:opacity-30 btn-brand">
                {!phoneReady ? (selectedProduct ? t("btn_enter_phone", lang) : t("btn_choose_prod", lang))
                  : !selectedProduct ? t("btn_choose_prod", lang) : t("btn_process", lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {modalPhase === "pin" && (
        <TransactionPinModal onPinEntered={handlePinEntered} onVerified={handlePinVerified} onCancel={handleCloseModal} />
      )}
      {modalPhase && modalPhase !== "pin" && (
        <TransactionModal
          phase={modalPhase} product={selectedProduct} phone={getFullPhone()}
          operator={operator} balance={memberBalance} errorMessage={errorMessage}
          failureType={failureType} refId={lastRefId} memberName={member.name}
          onBuyNow={() => setModalPhase("pin")}
          onConfirm={handleConfirmTransaction} onClose={handleCloseModal}
        />
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}

/* ── Product Card ── */
function ProductCard({ product, selected, onSelect, color, lang, dimmed }: {
  product: Product; selected: boolean; onSelect: (p: Product) => void;
  color: string; lang: Lang; dimmed?: boolean;
}) {
  const badgeStyle = product.badge ? BADGE_STYLES[product.badge] : null;
  return (
    <button onClick={() => onSelect(product)}
      className="relative rounded-2xl p-3.5 text-left transition-all duration-200 active:scale-[0.97]"
      style={{
        opacity: dimmed ? 0.55 : 1,
        border: selected ? `2px solid ${color}` : "1px solid #E2E8F0",
        background: selected ? `${color}08` : "#FFFFFF",
        boxShadow: selected ? `0 0 0 1px ${color}30, 0 4px 16px ${color}15` : "0 1px 4px rgba(0,0,0,0.05)",
      }}>
      {badgeStyle && product.badge && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[8px] font-black z-10"
          style={{ background: badgeStyle.bg, color: badgeStyle.text, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
          {product.badge}
        </div>
      )}
      <div className="flex items-start justify-between mb-2.5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ background: `${color}12`, border: `1.5px solid ${color}22` }}>
          {product.icon}
        </div>
        {selected && (
          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: color }}>
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
        )}
      </div>
      <p className="text-xs font-bold leading-snug mb-0.5 line-clamp-2" style={{ color: "#0F172A" }}>{product.name}</p>
      <p className="text-[10px] leading-tight mb-2.5 line-clamp-1" style={{ color: "#94A3B8" }}>{product.description}</p>
      <div className="pt-2" style={{ borderTop: "1px solid #F1F5F9" }}>
        <p className="text-[9px] mb-0.5" style={{ color: "#CBD5E1" }}>{lang === "en" ? "Price" : "Harga Jual"}</p>
        <p className="text-sm font-black gradient-text-gold">{formatRupiah(product.price)}</p>
      </div>
    </button>
  );
}
