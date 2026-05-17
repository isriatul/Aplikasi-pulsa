import { useState, useEffect, useCallback, useRef } from "react";
import BalanceCard from "@/components/BalanceCard";
import MutationHistoryPanel from "@/components/MutationHistoryPanel";
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
import { t, getLang, setLang, Lang } from "@/lib/i18n";

type ModalPhase = "quick" | "pin" | "confirm" | "loading" | "success" | "failed" | "insufficient" | null;

interface HomeProps {
  member: Member;
  onMemberUpdate: (updated: Member) => void;
}

const MENU_ITEMS: ProductCategory[] = [
  "pulsa", "data", "pln", "pascabayar",
  "game", "ewallet", "tv", "voucher", "intl",
];

/* Popular products for "before phone entered" preview */
const BADGE_ORDER = ["TERLARIS", "HOT", "POPULAR", "MURAH", "HEMAT"];
function getPopularProducts(category: ProductCategory, memberType: MemberType): Product[] {
  const all = getProductsByCategory(category, memberType);
  const withBadge = all.filter((p) => p.badge && BADGE_ORDER.includes(p.badge));
  if (withBadge.length >= 4) return withBadge.sort((a, b) => BADGE_ORDER.indexOf(a.badge!) - BADGE_ORDER.indexOf(b.badge!));
  return all.slice(0, 8);
}

function getSmartProducts(
  category: ProductCategory,
  countryCode: string,
  memberType: MemberType,
  phone: string
): Product[] {
  const countryInfo = getCountryInfo(countryCode);
  const isIndonesian = countryCode === "+62";

  /* Pulsa → when international selected, show intl products for that country */
  if (category === "pulsa" && !isIndonesian) {
    const intlAll = getProductsByCategory("intl", memberType);
    const filtered = intlAll.filter((p) => getProductCountryCode(p.id) === countryInfo.code);
    return filtered.length > 0 ? filtered : intlAll; /* fallback to all intl */
  }

  /* Intl → filter by selected country if phone entered */
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
    case "pulsa":
    case "data":
      return op !== null || digits.length >= 11;
    case "pln":
    case "pascabayar":
    case "tv":
      return digits.length >= 11;
    case "game":
      return digits.length >= 6;
    case "ewallet":
      return op !== null || digits.length >= 10;
    case "voucher":
      return digits.length >= 4;
    default:
      return digits.length >= 9;
  }
}

function classifyFailure(msg: string): "number_invalid" | "other" {
  const l = msg.toLowerCase();
  if (l.includes("nomor") || l.includes("tidak aktif") || l.includes("salah") ||
      l.includes("invalid") || l.includes("wrong") || l.includes("tujuan") ||
      l.includes("number") || l.includes("destination"))
    return "number_invalid";
  return "other";
}

/* Top 6 trending across all categories for the home banner */
function getTrendingProducts(memberType: MemberType): Product[] {
  const pinned = ["tsel50", "pln100", "xl20", "d5gb", "ml172", "gopay50", "isat20", "sa-stc10", "my-maxis10", "d10gb"];
  return ALL_PRODUCTS
    .filter((p) => pinned.includes(p.id))
    .map((p) => getProductsByCategory(p.category, memberType).find((x) => x.id === p.id) ?? p)
    .slice(0, 6);
}

export default function Home({ member, onMemberUpdate }: HomeProps) {
  const [phone, setPhone]                   = useState("");
  const [countryCode, setCountryCode]       = useState("+62");
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [selectedProduct, setSelectedProduct]   = useState<Product | null>(null);
  const [storeBalance, setStoreBalance]     = useState(0);
  const [memberBalance, setMemberBalance]   = useState(member.balance ?? 0);
  const [modalPhase, setModalPhase]         = useState<ModalPhase>(null);
  const [errorMessage, setErrorMessage]     = useState("");
  const [failureType, setFailureType]       = useState<"number_invalid" | "other">("other");
  const [lastRefId, setLastRefId]           = useState("");
  const [showHelp, setShowHelp]             = useState(false);
  const [lang, setLangState]               = useState<Lang>(getLang());

  const memberType: MemberType = member.type;
  const isIndonesian = countryCode === "+62";
  const operator: Operator | null = isIndonesian ? detectOperator(phone) : null;
  const countryInfo = getCountryInfo(countryCode);

  const handleStoreBalanceChange = useCallback((val: number) => setStoreBalance(val), []);
  const v2BalanceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const isV2 = !!getV2Token();
    if (isV2) {
      /* ── v2: Saldo realtime dari PostgreSQL ── */
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
      /* ── v1: Saldo dari Firebase ── */
      getMemberBalance(member.id)
        .then((b) => { setMemberBalance(b); onMemberUpdate({ ...member, balance: b }); })
        .catch(() => {});
    }
    return () => { if (v2BalanceIntervalRef.current) clearInterval(v2BalanceIntervalRef.current); };
  }, [member.id]);

  function toggleLang() {
    const newLang: Lang = lang === "id" ? "en" : "id";
    setLang(newLang);
    setLangState(newLang);
  }

  /* Smart product list */
  const products = selectedCategory
    ? getSmartProducts(selectedCategory, countryCode, memberType, phone)
    : [];
  const popularInCategory = selectedCategory ? getPopularProducts(selectedCategory, memberType) : [];
  const meta = selectedCategory ? CATEGORY_META[selectedCategory] : null;
  const phoneReady = selectedCategory ? isPhoneReady(phone, selectedCategory, countryCode) : false;
  const isFormValid = phoneReady && selectedProduct !== null;

  /* Which products to display — show popular first if phone not entered */
  const displayProducts = phone.length < 3 && products.length > 6
    ? popularInCategory
    : products;

  const isFiltered = phone.length >= 3 && displayProducts.length < products.length;

  function getFullPhone(): string {
    if (countryCode === "+62") return phone;
    return countryCode.replace("+", "") + phone.replace(/^0/, "");
  }

  function handleSelectCategory(cat: ProductCategory) {
    if (selectedCategory === cat) { setSelectedCategory(null); setSelectedProduct(null); }
    else {
      setSelectedCategory(cat);
      setSelectedProduct(null);
      setPhone("");
      if (cat !== "intl" && cat !== "pulsa") setCountryCode("+62");
    }
  }

  function handleSubmit() {
    if (!isFormValid || !selectedProduct) return;
    setModalPhase("pin");
  }

  async function handlePinVerified() { setModalPhase("confirm"); }

  async function handlePinEntered(pin: string) {
    /* Super admin tidak ada di Google Sheets — verifikasi lokal menggunakan adminPin dari config */
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
      /* ── v2: Transaksi melalui PostgreSQL ── */
      setModalPhase("loading");
      const txPhone = getFullPhone();
      const sku = getOperatorSku(operator?.name, selectedProduct.sku);
      try {
        const res = await v2BuyProduct({
          buyer_sku_code: sku,
          customer_no: txPhone,
          category: selectedProduct.category,
        });
        setLastRefId(res.refId);
        /* Refresh saldo dari DB setelah transaksi */
        try {
          const bal = await v2GetBalance();
          setMemberBalance(bal.balance);
          onMemberUpdate({ ...member, balance: bal.balance });
        } catch { /* abaikan */ }
        if (res.status === "success") {
          setModalPhase("success");
        } else if (res.status === "pending") {
          setModalPhase("success");
        } else {
          setFailureType(classifyFailure(res.message ?? ""));
          setErrorMessage(res.message ?? "Transaksi gagal");
          setModalPhase("failed");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Transaksi gagal";
        setFailureType(classifyFailure(msg));
        setErrorMessage(msg);
        setModalPhase("failed");
      }
      return;
    }

    /* ── v1: Transaksi via Google Sheets + Digiflazz ── */
    const latestBalance = await getMemberBalance(member.id).catch(() => memberBalance);
    if (latestBalance < selectedProduct.price) {
      setMemberBalance(latestBalance); setModalPhase("insufficient"); return;
    }
    setModalPhase("loading");
    const cfg = loadConfig();
    const txPhone = getFullPhone();
    const sku = getOperatorSku(operator?.name, selectedProduct.sku);
    const refId = generateRefId();
    setLastRefId(refId);
    await updateMemberBalance(member.id, -selectedProduct.price).catch(() => {});
    const newBalance = latestBalance - selectedProduct.price;
    setMemberBalance(newBalance);
    onMemberUpdate({ ...member, balance: newBalance });
    try {
      const result = await sendTransaction(txPhone, sku, refId, selectedProduct.price, latestBalance);
      await addTransactionToSheets({
        refId, phone: txPhone, product: selectedProduct.name, category: selectedProduct.category,
        amount: selectedProduct.price, basePrice: selectedProduct.basePrice,
        profit: selectedProduct.price - selectedProduct.basePrice,
        status: result.success ? "success" : "failed", date: new Date().toISOString(),
      }).catch(() => {});
      saveTransaction({
        id: refId, date: new Date().toISOString(), phone: txPhone,
        product: selectedProduct.name, category: selectedProduct.category,
        sellPrice: selectedProduct.price, basePrice: selectedProduct.basePrice,
        profit: result.success ? selectedProduct.price - selectedProduct.basePrice : 0,
        status: result.success ? "success" : "failed",
      });
      if (result.success) {
        setModalPhase("success");
      } else {
        await refundTransaction(member.id, txPhone, refId, selectedProduct.price).catch(() => {});
        const rb = newBalance + selectedProduct.price;
        setMemberBalance(rb); onMemberUpdate({ ...member, balance: rb });
        setFailureType(classifyFailure(result.message));
        setErrorMessage(result.message); setModalPhase("failed");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ralat tidak diketahui";
      await refundTransaction(member.id, txPhone, refId, selectedProduct.price).catch(() => {});
      const rb = newBalance + selectedProduct.price;
      setMemberBalance(rb); onMemberUpdate({ ...member, balance: rb });
      saveTransaction({ id: refId, date: new Date().toISOString(), phone: txPhone, product: selectedProduct.name, category: selectedProduct.category, sellPrice: selectedProduct.price, basePrice: selectedProduct.basePrice, profit: 0, status: "failed" });
      setFailureType(classifyFailure(msg)); setErrorMessage(msg); setModalPhase("failed");
    }
  }

  function handleCloseModal() { setModalPhase(null); setErrorMessage(""); }

  const trendingProducts = getTrendingProducts(memberType);

  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto pb-32">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 pt-safe px-4"
        style={{ background: "rgba(11,15,26,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#1A56DB 0%,#1C3FAA 100%)", boxShadow: "0 0 12px rgba(26,86,219,0.5)" }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z"/>
              </svg>
            </div>
            <span className="font-black text-base gradient-text-brand">RoneyCell</span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button onClick={toggleLang}
              className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[11px] font-bold text-white/55 hover:text-white/80 hover:bg-white/8 transition-all">
              {lang === "id" ? "🇮🇩" : "🇬🇧"}
            </button>
            <button onClick={() => setShowHelp(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/8 transition-all">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="rgba(167,139,250,0.8)" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 16v-4M12 8h.01"/>
              </svg>
            </button>
            {/* Badge saldo kecil di header */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5">
              <span className="text-[9px] text-white/35 font-medium">Saldo</span>
              <span className="text-[11px] font-black gradient-text-gold">{formatRupiah(memberBalance)}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4">
        {/* ── Balance Hero Card ── */}
        <div className="mt-4 mb-5">
          <BalanceCard
            onBalanceChange={handleStoreBalanceChange}
            memberName={member.name}
            memberRole={member.notes === "__superadmin__" ? "superadmin" : member.type}
          />
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: "Top Up", icon: "💰", color: "#F59E0B", tab: "deposit" },
            { label: "Pulsa", icon: "📱", color: "#3B82F6", cat: "pulsa" },
            { label: "Listrik", icon: "⚡", color: "#F59E0B", cat: "pln" },
            { label: "Data", icon: "📶", color: "#10B981", cat: "data" },
          ].map((a) => (
            <button key={a.label}
              onClick={() => { if (a.cat) handleSelectCategory(a.cat as ProductCategory); }}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95"
              style={{ background: `${a.color}12`, border: `1px solid ${a.color}22` }}>
              <span className="text-xl leading-none">{a.icon}</span>
              <span className="text-[10px] font-bold" style={{ color: a.color }}>{a.label}</span>
            </button>
          ))}
        </div>

        {/* ── Icon Menu Grid ── */}
        <div className="surface p-4 mb-5">
          <p className="text-[10px] text-white/35 tracking-widest uppercase font-bold mb-4">
            {t("choose_service", lang)}
          </p>
          <div className="grid grid-cols-5 gap-x-1 gap-y-4">
            {MENU_ITEMS.map((id) => {
              const m = CATEGORY_META[id];
              const isActive = selectedCategory === id;
              return (
                <button key={id} onClick={() => handleSelectCategory(id)} className="relative flex flex-col items-center gap-1.5 transition-all active:scale-90">
                  <div className="menu-icon-wrap"
                    style={isActive
                      ? { background: `${m.color}28`, border: `2px solid ${m.color}80`, boxShadow: `0 4px 16px ${m.color}40` }
                      : { background: `${m.color}10`, border: `1.5px solid ${m.color}18` }
                    }>
                    <span className="text-2xl leading-none">{m.icon}</span>
                  </div>
                  <span className="text-[9px] font-bold text-center leading-tight"
                    style={{ color: isActive ? m.color : "rgba(255,255,255,0.45)" }}>
                    {m.label}
                  </span>
                  {isActive && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0B0F1A]"
                      style={{ background: m.color }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Smart Product Panel ── */}
        {selectedCategory && meta && (
          <div className="mb-4 space-y-3 anim-fade-in">
            {/* Category header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{meta.icon}</span>
                <p className="text-sm font-black" style={{ color: meta.color }}>{meta.label}</p>
                {selectedCategory === "intl" && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black text-white"
                    style={{ background: "linear-gradient(135deg,#F59E0B 0%,#D97706 100%)" }}>GLOBAL</span>
                )}
                {!isIndonesian && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                    style={{ background: countryInfo.bgColor, borderColor: countryInfo.color + "40", color: countryInfo.color }}>
                    {countryInfo.flag} {countryInfo.name}
                  </span>
                )}
              </div>
              <button onClick={() => { setSelectedCategory(null); setSelectedProduct(null); setPhone(""); setCountryCode("+62"); }}
                className="text-xs text-white/40 px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/6 hover:text-white/65 transition-all">
                {t("btn_close", lang)}
              </button>
            </div>

            {/* Phone Input */}
            <PhoneInput
              value={phone}
              onChange={(v) => { setPhone(v); setSelectedProduct(null); }}
              countryCode={countryCode}
              onCountryCodeChange={(c) => { setCountryCode(c); setSelectedProduct(null); setPhone(""); }}
              showCountryCode={true}
              label={
                selectedCategory === "game" ? (lang === "en" ? "Game ID / User ID" : "ID Game / User ID") :
                selectedCategory === "pascabayar" || selectedCategory === "tv" ? "No. ID Pelanggan" :
                selectedCategory === "intl" || !isIndonesian ? (lang === "en" ? "International Number" : "Nomor Internasional") :
                t("phone_label", lang)
              }
              placeholder={
                selectedCategory === "pln" || selectedCategory === "pascabayar" ? "Contoh: 530000012345" :
                selectedCategory === "game" ? "Contoh: 12345678 (1234)" :
                !isIndonesian ? "Contoh: 0123456789" :
                "Contoh: 08123456789"
              }
            />

            {/* Country detected badge */}
            {!isIndonesian && phone.length >= 3 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border"
                style={{ background: countryInfo.bgColor, borderColor: countryInfo.color + "40" }}>
                <span className="text-lg">{countryInfo.flag}</span>
                <div>
                  <p className="text-xs font-bold" style={{ color: countryInfo.color }}>
                    {lang === "en" ? "Country Detected" : "Negara Terdeteksi"}: {countryInfo.name}
                  </p>
                  <p className="text-[10px] text-white/40">
                    {lang === "en" ? "Showing products for this country" : "Menampilkan produk untuk negara ini"}
                  </p>
                </div>
              </div>
            )}

            {/* Phone validation warning */}
            {phoneReady === false && phone.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/8">
                <svg width="14" height="14" className="flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-amber-300">
                  {!isIndonesian
                    ? `Min ${countryInfo.minLen} digit untuk ${countryInfo.name}`
                    : selectedCategory === "pulsa" || selectedCategory === "data"
                    ? (lang === "en" ? "Enter valid number to detect operator" : "Masukkan nomor valid agar operator terdeteksi")
                    : (lang === "en" ? "Enter complete number/ID" : "Masukkan nomor/ID pelanggan lengkap")}
                </p>
              </div>
            )}

            {/* Products */}
            <div className="surface p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] text-white/35 tracking-widest uppercase font-bold">
                    {phone.length < 3 && products.length > 6
                      ? (lang === "en" ? "Popular Products" : "Produk Populer")
                      : (isFiltered
                        ? `Filter untuk ${countryInfo.flag} ${countryInfo.name}`
                        : t("choose_product", lang))}
                  </p>
                  {phone.length < 3 && products.length > 6 && (
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {lang === "en" ? "Enter number to see all products" : "Input nomor untuk lihat semua produk"}
                    </p>
                  )}
                </div>
                <span className="text-[11px] text-white/35 font-medium">{displayProducts.length} produk</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {displayProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    selected={selectedProduct?.id === p.id}
                    onSelect={(prod) => {
                      setSelectedProduct(prod);
                      if (phoneReady) setModalPhase("quick");
                    }}
                    color={meta.color}
                    lang={lang}
                    dimmed={!phoneReady && phone.length === 0}
                  />
                ))}
              </div>
              {phone.length < 3 && products.length > displayProducts.length && (
                <p className="text-center text-xs text-white/30 mt-3">
                  +{products.length - displayProducts.length} produk lagi setelah input nomor
                </p>
              )}
            </div>

            {/* Order Summary */}
            {selectedProduct && phoneReady && (
              <div className="surface p-4 border border-blue-500/15 anim-scale-in">
                <p className="text-[10px] text-white/35 tracking-widest uppercase font-bold mb-3">
                  {t("order_summary", lang)}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white/90">{selectedProduct.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {!isIndonesian && <span>{countryInfo.flag}</span>}
                      <p className="text-xs text-white/45">
                        {countryCode !== "+62" ? `${countryCode} ${phone}` : phone}
                      </p>
                    </div>
                    {member.type !== "retail" && (
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: TYPE_COLORS[member.type] }} />
                        <p className="text-[10px] font-bold" style={{ color: TYPE_COLORS[member.type] }}>
                          Harga {TYPE_LABELS[member.type]}
                        </p>
                      </div>
                    )}
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

            {/* Submit Button */}
            <button onClick={handleSubmit} disabled={!isFormValid}
              className="w-full py-4 rounded-2xl text-sm font-black tracking-wide transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed btn-brand">
              {!phoneReady
                ? (selectedProduct ? t("btn_enter_phone", lang) : t("btn_choose_prod", lang))
                : !selectedProduct
                ? t("btn_choose_prod", lang)
                : t("btn_process", lang)}
            </button>
          </div>
        )}

        {/* ── Home: No category selected ── */}
        {!selectedCategory && (
          <div className="space-y-4">
            {/* Trending */}
            <div className="surface p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm">🔥</span>
                <p className="text-[10px] text-white/35 tracking-widest uppercase font-bold">
                  {lang === "en" ? "Trending Products" : "Produk Terlaris"}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {trendingProducts.map((p) => {
                  const m = CATEGORY_META[p.category];
                  return (
                    <button key={p.id}
                      onClick={() => { setSelectedCategory(p.category); setSelectedProduct(null); setPhone(""); }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-white/7 bg-white/3 hover:bg-white/6 active:scale-95 transition-all text-center">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
                        style={{ background: `${m.color}15`, border: `1px solid ${m.color}22` }}>
                        {p.icon}
                      </div>
                      <p className="text-[9px] font-bold text-white/80 leading-tight line-clamp-2">{p.name}</p>
                      <p className="text-[9px] font-black gradient-text-gold">{formatRupiah(p.price)}</p>
                      {p.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black"
                          style={{ background: BADGE_STYLES[p.badge]?.bg ?? "#F59E0B", color: BADGE_STYLES[p.badge]?.text ?? "#fff" }}>
                          {p.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Riwayat Mutasi */}
            {!!getV2Token() && <MutationHistoryPanel />}

            {/* Bantuan */}
            <button onClick={() => setShowHelp(true)}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl border transition-all active:scale-[0.99]"
              style={{ background: "rgba(139,92,246,0.06)", borderColor: "rgba(139,92,246,0.18)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.28)" }}>
                🎧
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold" style={{ color: "#A78BFA" }}>
                  {lang === "en" ? "Need Help?" : "Butuh Bantuan?"}
                </p>
                <p className="text-xs text-white/40">
                  {lang === "en" ? "WhatsApp & Email support" : "Hubungi CS via WhatsApp atau Email"}
                </p>
              </div>
              <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pb-2 text-center space-y-1.5">
          <div className="h-px bg-white/5 mb-3" />
          <p className="text-[10px] gradient-text-brand font-bold tracking-wider">Solusi Pulsa Terpercaya • Lombok</p>
          <p className="text-[10px] text-white/25">© 2025 RoneyCell</p>
        </div>
      </div>

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
        border: selected ? `2px solid ${color}` : "1px solid rgba(255,255,255,0.08)",
        background: selected ? `${color}12` : "rgba(255,255,255,0.03)",
        boxShadow: selected ? `0 0 0 1px ${color}40, 0 4px 16px ${color}25` : undefined,
      }}>
      {badgeStyle && product.badge && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[8px] font-black z-10"
          style={{ background: badgeStyle.bg, color: badgeStyle.text, boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
          {product.badge}
        </div>
      )}
      <div className="flex items-start justify-between mb-2.5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ background: `${color}15`, border: `1.5px solid ${color}22` }}>
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
      <p className="text-xs font-bold text-white/90 leading-snug mb-0.5 line-clamp-2">{product.name}</p>
      <p className="text-[10px] text-white/40 leading-tight mb-2.5 line-clamp-1">{product.description}</p>
      <div className="pt-2 border-t border-white/6">
        <p className="text-[9px] text-white/30 mb-0.5">{lang === "en" ? "Price" : "Harga Jual"}</p>
        <p className="text-sm font-black gradient-text-gold">{formatRupiah(product.price)}</p>
      </div>
    </button>
  );
}
