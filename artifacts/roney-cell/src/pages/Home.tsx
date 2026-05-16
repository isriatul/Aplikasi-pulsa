import { useState, useEffect, useCallback } from "react";
import BalanceCard from "@/components/BalanceCard";
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

  useEffect(() => {
    if (member.id) {
      getMemberBalance(member.id)
        .then((b) => { setMemberBalance(b); onMemberUpdate({ ...member, balance: b }); })
        .catch(() => {});
    }
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
      const result = await sendTransaction(txPhone, sku, refId);
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
    <div className="min-h-dvh flex flex-col max-w-md mx-auto px-4 pb-32">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 pt-safe">
        <div className="flex items-center justify-between py-4"
          style={{ background: "linear-gradient(to bottom,hsl(220 40% 5%) 80%,transparent)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,hsl(210 90% 55%) 0%,hsl(230 80% 40%) 100%)", boxShadow: "0 0 16px rgba(59,130,246,0.4)" }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
              </svg>
            </div>
            <div>
              <h1 className="font-black text-lg leading-none tracking-tight"
                style={{ background: "linear-gradient(135deg,#60A5FA 0%,#A78BFA 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                RoneyCell
              </h1>
              <p className="text-[10px] text-muted-foreground tracking-widest">
                {t("greeting", lang)}, <span className="font-bold text-foreground/70">{member.name.split(" ")[0]}</span> 👋
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={toggleLang}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-bold transition-all hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.7)" }}>
              {lang === "id" ? "🇮🇩" : "🇬🇧"} {lang.toUpperCase()}
            </button>
            <button onClick={() => setShowHelp(true)}
              className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/10 bg-white/5 transition-all hover:bg-white/10"
              title="Bantuan">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "#A78BFA" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border"
                style={{ background: `${TYPE_COLORS[member.type]}15`, borderColor: `${TYPE_COLORS[member.type]}30` }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: TYPE_COLORS[member.type] }} />
                <span className="text-[10px] font-bold" style={{ color: TYPE_COLORS[member.type] }}>
                  {TYPE_LABELS[member.type]}
                </span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 border border-white/8">
                <span className="text-[9px] text-muted-foreground">{t("balance_label", lang)}:</span>
                <span className="text-[11px] font-black"
                  style={{ background: "linear-gradient(135deg,#FBBF24 0%,#F59E0B 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {formatRupiah(memberBalance)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Store Balance Card ── */}
      <div className="mb-5">
        <BalanceCard onBalanceChange={handleStoreBalanceChange} />
      </div>

      {/* ── Icon Menu Grid ── */}
      <div className="glass-card rounded-2xl p-4 mb-5">
        <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold mb-4">
          {t("choose_service", lang)}
        </p>
        <div className="grid grid-cols-5 gap-x-1 gap-y-4">
          {MENU_ITEMS.map((id) => {
            const m = CATEGORY_META[id];
            const isActive = selectedCategory === id;
            return (
              <button key={id} onClick={() => handleSelectCategory(id)} className="relative flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-200"
                  style={isActive
                    ? { background: `${m.color}30`, border: `2px solid ${m.color}`, boxShadow: `0 0 14px ${m.color}40` }
                    : { background: `${m.color}12`, border: `1.5px solid ${m.color}20` }
                  }>
                  {m.icon}
                </div>
                <span className="text-[9px] font-bold text-center leading-tight"
                  style={{ color: isActive ? m.color : "rgba(255,255,255,0.55)" }}>
                  {m.label}
                </span>
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2"
                    style={{ background: m.color, borderColor: "hsl(220 40% 5%)" }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Smart Product Panel ── */}
      {selectedCategory && meta && (
        <div className="mb-4 space-y-3" style={{ animation: "fadeSlideIn 0.25s ease" }}>
          {/* Category header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{meta.icon}</span>
              <p className="text-sm font-black" style={{ color: meta.color }}>{meta.label}</p>
              {selectedCategory === "intl" && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black text-white"
                  style={{ background: "linear-gradient(135deg,#F59E0B 0%,#D97706 100%)" }}>GLOBAL</span>
              )}
              {/* Country pill when intl/intl-pulsa detected */}
              {!isIndonesian && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                  style={{ background: countryInfo.bgColor, borderColor: countryInfo.color + "40", color: countryInfo.color }}>
                  {countryInfo.flag} {countryInfo.name}
                </span>
              )}
            </div>
            <button onClick={() => { setSelectedCategory(null); setSelectedProduct(null); setPhone(""); setCountryCode("+62"); }}
              className="text-xs text-muted-foreground px-2 py-1 rounded-lg border border-white/8 hover:bg-white/5 transition-all">
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

          {/* Country detected badge (for non-ID) */}
          {!isIndonesian && phone.length >= 3 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border"
              style={{ background: countryInfo.bgColor, borderColor: countryInfo.color + "40" }}>
              <span className="text-lg">{countryInfo.flag}</span>
              <div>
                <p className="text-xs font-bold" style={{ color: countryInfo.color }}>
                  {lang === "en" ? "Country Detected" : "Negara Terdeteksi"}: {countryInfo.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {lang === "en" ? "Showing products for this country" : "Menampilkan produk untuk negara ini"}
                </p>
              </div>
            </div>
          )}

          {/* Phone validation warning */}
          {phoneReady === false && phone.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-yellow-500/20 bg-yellow-500/8">
              <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-yellow-300">
                {!isIndonesian
                  ? `${lang === "en" ? "Min" : "Min"} ${countryInfo.minLen} ${lang === "en" ? "digits for" : "digit untuk"} ${countryInfo.name}`
                  : selectedCategory === "pulsa" || selectedCategory === "data"
                  ? (lang === "en" ? "Enter valid number to detect operator" : "Masukkan nomor valid agar operator terdeteksi")
                  : (lang === "en" ? "Enter complete number/ID" : "Masukkan nomor/ID pelanggan lengkap")}
              </p>
            </div>
          )}

          {/* ── Products (always shown, popular first if no phone) ── */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold">
                  {phone.length < 3 && products.length > 6
                    ? (lang === "en" ? "Popular Products" : "Produk Populer")
                    : (isFiltered
                      ? `${lang === "en" ? "Filtered for" : "Filter untuk"} ${countryInfo.flag} ${countryInfo.name}`
                      : t("choose_product", lang))}
                </p>
                {phone.length < 3 && products.length > 6 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {lang === "en" ? "Enter number to see all products" : "Masukkan nomor untuk lihat semua produk"}
                  </p>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{displayProducts.length} {t("products_count", lang)}</span>
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
              <p className="text-center text-xs text-muted-foreground mt-3">
                +{products.length - displayProducts.length} {lang === "en" ? "more products after entering number" : "produk lagi setelah input nomor"}
              </p>
            )}
          </div>

          {/* Order Summary */}
          {selectedProduct && phoneReady && (
            <div className="glass-card rounded-2xl p-4 border border-cyan-500/15" style={{ animation: "fadeSlideIn 0.2s ease" }}>
              <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold mb-3">
                {t("order_summary", lang)}
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedProduct.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {!isIndonesian && <span>{countryInfo.flag}</span>}
                    <p className="text-xs text-muted-foreground">
                      {countryCode !== "+62" ? `${countryCode} ${phone}` : phone}
                    </p>
                  </div>
                  {member.type !== "retail" && (
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: TYPE_COLORS[member.type] }} />
                      <p className="text-[10px] font-semibold" style={{ color: TYPE_COLORS[member.type] }}>
                        Harga {TYPE_LABELS[member.type]}
                      </p>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-black"
                    style={{ background: "linear-gradient(135deg,#FBBF24 0%,#F59E0B 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {formatRupiah(selectedProduct.price)}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: memberBalance >= selectedProduct.price ? "#34D399" : "#F87171" }}>
                    {t("balance_label", lang)}: {formatRupiah(memberBalance)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button onClick={handleSubmit} disabled={!isFormValid}
            className="w-full py-4 rounded-2xl text-base font-black tracking-wide transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
            style={isFormValid ? {
              background: "linear-gradient(135deg,hsl(210 90% 55%) 0%,hsl(230 75% 45%) 100%)",
              color: "white", boxShadow: "0 6px 24px rgba(59,130,246,0.4),0 2px 8px rgba(0,0,0,0.3)",
            } : undefined}>
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
          {/* Trending products */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">🔥</span>
              <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold">
                {lang === "en" ? "Trending Products" : "Produk Terlaris"}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {trendingProducts.map((p) => {
                const m = CATEGORY_META[p.category];
                return (
                  <button key={p.id}
                    onClick={() => {
                      setSelectedCategory(p.category);
                      setSelectedProduct(null);
                      setPhone("");
                    }}
                    className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 transition-all text-center">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                      style={{ background: `${m.color}15`, border: `1px solid ${m.color}25` }}>
                      {p.icon}
                    </div>
                    <p className="text-[9px] font-black text-foreground leading-tight line-clamp-2">{p.name}</p>
                    <p className="text-[9px] font-bold" style={{ color: m.color }}>{formatRupiah(p.price)}</p>
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

          {/* CS Quick Access */}
          <button onClick={() => setShowHelp(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all hover:scale-[1.01]"
            style={{ background: "rgba(167,139,250,0.06)", borderColor: "rgba(167,139,250,0.2)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: "rgba(167,139,250,0.15)", border: "1.5px solid rgba(167,139,250,0.3)" }}>
              🎧
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-black" style={{ color: "#A78BFA" }}>
                {lang === "en" ? "Need Help?" : "Butuh Bantuan?"}
              </p>
              <p className="text-xs text-muted-foreground">
                {lang === "en" ? "WhatsApp & Email support" : "Hubungi CS via WhatsApp atau Email"}
              </p>
            </div>
            <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="mt-8 pb-2 text-center space-y-1">
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent mb-3" />
        <p className="text-[11px] font-bold"
          style={{ background: "linear-gradient(135deg,#60A5FA 0%,#A78BFA 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Solusi Pulsa Terpercaya di Lombok
        </p>
        <p className="text-[10px] text-muted-foreground">
          {t("powered_by", lang)}{" "}
          <span style={{ background: "linear-gradient(135deg,#FBBF24 0%,#F59E0B 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700 }}>
            RoneyCell
          </span>
        </p>
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
      className="relative rounded-2xl p-3.5 text-left transition-all duration-200 border"
      style={{
        opacity: dimmed ? 0.6 : 1,
        borderColor: selected ? color : "rgba(255,255,255,0.08)",
        background: selected ? `${color}10` : "rgba(255,255,255,0.03)",
        boxShadow: selected ? `0 0 0 1px ${color},0 0 20px ${color}30` : undefined,
      }}>
      {badgeStyle && product.badge && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[8px] font-black z-10"
          style={{ background: badgeStyle.bg, color: badgeStyle.text, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
          {product.badge}
        </div>
      )}
      <div className="flex items-start justify-between mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
          style={{ background: `${color}18`, border: `1.5px solid ${color}25` }}>
          {product.icon}
        </div>
        {selected && (
          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: color }}>
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      <p className="text-xs font-black text-foreground leading-snug mb-0.5 line-clamp-2">{product.name}</p>
      <p className="text-[10px] text-muted-foreground leading-tight mb-2 line-clamp-1">{product.description}</p>
      <div className="pt-2 border-t border-white/5">
        <p className="text-[9px] text-muted-foreground">{lang === "en" ? "Price" : "Harga Jual"}</p>
        <p className="text-sm font-black mt-0.5"
          style={{ background: "linear-gradient(135deg,#FBBF24 0%,#F59E0B 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          {formatRupiah(product.price)}
        </p>
      </div>
    </button>
  );
}
