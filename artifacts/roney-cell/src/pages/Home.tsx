import { useState, useEffect, useCallback } from "react";
import BalanceCard from "@/components/BalanceCard";
import PhoneInput from "@/components/PhoneInput";
import TransactionModal from "@/components/TransactionModal";
import TransactionPinModal from "@/components/TransactionPinModal";
import {
  Product, ProductCategory, CATEGORY_META,
  getProductsByCategory, formatRupiah,
  getOperatorSku, MemberType,
} from "@/lib/products";
import { detectOperator, Operator } from "@/lib/operator";
import { sendTransaction, generateRefId } from "@/lib/digiflazz";
import { loadConfig } from "@/lib/config";
import { saveTransaction } from "@/lib/transactions";
import {
  getMemberBalance, updateMemberBalance,
  addTransactionToSheets, refundTransaction, verifyTxPin,
} from "@/lib/sheetsApi";
import { Member, TYPE_LABELS, TYPE_COLORS } from "@/lib/members";

type ModalPhase = "pin" | "confirm" | "loading" | "success" | "failed" | "insufficient" | null;

interface HomeProps {
  member: Member;
  onMemberUpdate: (updated: Member) => void;
}

const MENU_ITEMS: ProductCategory[] = [
  "pulsa", "data", "pln", "pascabayar",
  "game", "ewallet", "tv", "voucher",
];

function isPhoneReady(phone: string, category: ProductCategory): boolean {
  const digits = phone.replace(/\D/g, "");
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

export default function Home({ member, onMemberUpdate }: HomeProps) {
  const [phone, setPhone] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [storeBalance, setStoreBalance] = useState(0);
  const [memberBalance, setMemberBalance] = useState(member.balance ?? 0);
  const [modalPhase, setModalPhase] = useState<ModalPhase>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [failureType, setFailureType] = useState<"number_invalid" | "other">("other");
  const [lastRefId, setLastRefId] = useState("");

  const memberType: MemberType = member.type;
  const operator: Operator | null = detectOperator(phone);

  const handleStoreBalanceChange = useCallback((val: number) => setStoreBalance(val), []);

  /* Refresh member balance from Sheets */
  useEffect(() => {
    if (member.id) {
      getMemberBalance(member.id)
        .then((b) => {
          setMemberBalance(b);
          onMemberUpdate({ ...member, balance: b });
        })
        .catch(() => {});
    }
  }, [member.id]);

  const products = selectedCategory ? getProductsByCategory(selectedCategory, memberType) : [];
  const meta = selectedCategory ? CATEGORY_META[selectedCategory] : null;
  const phoneReady = selectedCategory ? isPhoneReady(phone, selectedCategory) : false;
  const isFormValid = phoneReady && selectedProduct !== null;

  function handleSelectCategory(cat: ProductCategory) {
    if (selectedCategory === cat) { setSelectedCategory(null); setSelectedProduct(null); }
    else { setSelectedCategory(cat); setSelectedProduct(null); setPhone(""); }
  }

  function handleSubmit() {
    if (!isFormValid || !selectedProduct) return;
    const cfg = loadConfig();
    if (!cfg.username || !cfg.apiKey) {
      alert("Sila pergi ke tab Owner → Tetapan untuk mengisi username & API key Digiflazz.");
      return;
    }
    setModalPhase("pin");
  }

  async function handlePinVerified() {
    setModalPhase("confirm");
  }

  async function handlePinEntered(pin: string) {
    try {
      const res = await verifyTxPin(member.id, pin);
      return { ok: res.ok, message: res.message };
    } catch (err: unknown) {
      return { ok: false, message: err instanceof Error ? err.message : "Gagal verifikasi PIN." };
    }
  }

  async function handleConfirmTransaction() {
    if (!selectedProduct) return;

    /* Check member's Sheets balance */
    const latestBalance = await getMemberBalance(member.id).catch(() => memberBalance);
    if (latestBalance < selectedProduct.price) {
      setMemberBalance(latestBalance);
      setModalPhase("insufficient");
      return;
    }

    setModalPhase("loading");
    const cfg = loadConfig();
    const sku = getOperatorSku(operator?.name, selectedProduct.sku);
    const refId = generateRefId();
    setLastRefId(refId);

    /* Deduct member balance BEFORE sending to Digiflazz */
    await updateMemberBalance(member.id, -selectedProduct.price).catch(() => {});
    const newBalance = latestBalance - selectedProduct.price;
    setMemberBalance(newBalance);
    onMemberUpdate({ ...member, balance: newBalance });

    try {
      const result = await sendTransaction(cfg, phone, sku, refId);

      await addTransactionToSheets({
        refId, phone, product: selectedProduct.name, category: selectedProduct.category,
        amount: selectedProduct.price, basePrice: selectedProduct.basePrice,
        profit: selectedProduct.price - selectedProduct.basePrice,
        status: result.success ? "success" : "failed",
        date: new Date().toISOString(),
      }).catch(() => {});

      saveTransaction({
        id: refId, date: new Date().toISOString(), phone,
        product: selectedProduct.name, category: selectedProduct.category,
        sellPrice: selectedProduct.price, basePrice: selectedProduct.basePrice,
        profit: result.success ? selectedProduct.price - selectedProduct.basePrice : 0,
        status: result.success ? "success" : "failed",
      });

      if (result.success) {
        setModalPhase("success");
      } else {
        /* Auto-refund: add balance back */
        await refundTransaction(member.id, phone, refId, selectedProduct.price).catch(() => {});
        const refundedBal = newBalance + selectedProduct.price;
        setMemberBalance(refundedBal);
        onMemberUpdate({ ...member, balance: refundedBal });
        setFailureType(classifyFailure(result.message));
        setErrorMessage(result.message);
        setModalPhase("failed");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ralat tidak diketahui";
      /* Auto-refund on exception */
      await refundTransaction(member.id, phone, refId, selectedProduct.price).catch(() => {});
      const refundedBal = newBalance + selectedProduct.price;
      setMemberBalance(refundedBal);
      onMemberUpdate({ ...member, balance: refundedBal });
      saveTransaction({
        id: refId, date: new Date().toISOString(), phone,
        product: selectedProduct.name, category: selectedProduct.category,
        sellPrice: selectedProduct.price, basePrice: selectedProduct.basePrice,
        profit: 0, status: "failed",
      });
      setFailureType(classifyFailure(msg));
      setErrorMessage(msg);
      setModalPhase("failed");
    }
  }

  function handleCloseModal() { setModalPhase(null); setErrorMessage(""); }

  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto px-4 pb-28">
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
                Halo, <span className="font-bold text-foreground/70">{member.name.split(" ")[0]}</span> 👋
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
              style={{ background: `${TYPE_COLORS[member.type]}15`, borderColor: `${TYPE_COLORS[member.type]}30` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: TYPE_COLORS[member.type] }} />
              <span className="text-xs font-bold" style={{ color: TYPE_COLORS[member.type] }}>
                {TYPE_LABELS[member.type]}
              </span>
            </div>
            {/* Member personal balance */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 border border-white/8">
              <span className="text-[9px] text-muted-foreground">Saldo:</span>
              <span className="text-[11px] font-black"
                style={{ background: "linear-gradient(135deg,#FBBF24 0%,#F59E0B 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {formatRupiah(memberBalance)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Store Balance (Firebase) ── */}
      <div className="mb-5">
        <BalanceCard onBalanceChange={handleStoreBalanceChange} />
      </div>

      {/* ── Icon Menu Grid 4×2 ── */}
      <div className="glass-card rounded-2xl p-4 mb-5">
        <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold mb-4">Pilih Layanan</p>
        <div className="grid grid-cols-4 gap-x-2 gap-y-5">
          {MENU_ITEMS.map((id) => {
            const m = CATEGORY_META[id];
            const isActive = selectedCategory === id;
            return (
              <button key={id} onClick={() => handleSelectCategory(id)} className="relative flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-200"
                  style={isActive
                    ? { background: `${m.color}30`, border: `2px solid ${m.color}`, boxShadow: `0 0 16px ${m.color}40` }
                    : { background: `${m.color}12`, border: `1.5px solid ${m.color}20` }
                  }>
                  {m.icon}
                </div>
                <span className="text-[10px] font-bold text-center leading-tight transition-colors"
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
        <div className="mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{meta.icon}</span>
              <p className="text-sm font-black" style={{ color: meta.color }}>{meta.label}</p>
            </div>
            <button onClick={() => { setSelectedCategory(null); setSelectedProduct(null); setPhone(""); }}
              className="text-xs text-muted-foreground px-2 py-1 rounded-lg border border-white/8 hover:bg-white/5 transition-all">
              Tutup ✕
            </button>
          </div>

          {/* STEP 1: Phone Input */}
          <PhoneInput
            value={phone}
            onChange={(v) => { setPhone(v); setSelectedProduct(null); }}
            label={
              selectedCategory === "game" ? "ID Game / User ID" :
              selectedCategory === "pascabayar" || selectedCategory === "tv" ? "No. ID Pelanggan" :
              "Nomor Tujuan"
            }
            placeholder={
              selectedCategory === "pln" || selectedCategory === "pascabayar" ? "Contoh: 530000012345" :
              selectedCategory === "game" ? "Contoh: 12345678 (1234)" :
              "Contoh: 08123456789"
            }
          />

          {!phoneReady && phone.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-yellow-500/20 bg-yellow-500/8">
              <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-yellow-300">
                {selectedCategory === "pulsa" || selectedCategory === "data" || selectedCategory === "ewallet"
                  ? "Masukkan nomor yang valid agar operator terdeteksi"
                  : "Masukkan nomor/ID pelanggan lengkap"}
              </p>
            </div>
          )}

          {/* STEP 2: Products (after phone ready) */}
          {phoneReady && (
            <div className="glass-card rounded-2xl p-4" style={{ animation: "fadeSlideIn 0.3s ease" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold">Pilih Nominal / Paket</p>
                <span className="text-xs text-muted-foreground">{products.length} produk</span>
              </div>
              {selectedCategory === "pulsa" || selectedCategory === "pln" ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {products.map((p) => (
                    <ProductCompactCard key={p.id} product={p} selected={selectedProduct?.id === p.id} onSelect={setSelectedProduct} color={meta.color} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {products.map((p) => (
                    <ProductRowCard key={p.id} product={p} selected={selectedProduct?.id === p.id} onSelect={setSelectedProduct} color={meta.color} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Order summary */}
          {selectedProduct && phoneReady && (
            <div className="glass-card rounded-2xl p-4 border border-cyan-500/15" style={{ animation: "fadeSlideIn 0.2s ease" }}>
              <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold mb-3">Ringkasan Pesanan</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedProduct.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{phone}</p>
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
                  <p className="text-[10px] mt-0.5"
                    style={{ color: memberBalance >= selectedProduct.price ? "#34D399" : "#F87171" }}>
                    Saldo: {formatRupiah(memberBalance)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <button onClick={handleSubmit} disabled={!isFormValid}
            className="w-full py-4 rounded-2xl text-base font-black tracking-wide transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
            style={isFormValid ? {
              background: "linear-gradient(135deg,hsl(210 90% 55%) 0%,hsl(230 75% 45%) 100%)",
              color: "white",
              boxShadow: "0 6px 24px rgba(59,130,246,0.4),0 2px 8px rgba(0,0,0,0.3)",
            } : undefined}>
            {!phoneReady ? `Masukkan ${selectedCategory === "game" ? "ID Game" : "Nomor Tujuan"} Dahulu`
              : !selectedProduct ? "Pilih Produk Dahulu"
              : "🔐 Masukkan PIN & Proses →"}
          </button>
        </div>
      )}

      {!selectedCategory && (
        <div className="text-center mt-2">
          <p className="text-xs text-muted-foreground">
            Dikuasakan oleh{" "}
            <span style={{ background: "linear-gradient(135deg,#FBBF24 0%,#F59E0B 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700 }}>Digiflazz</span>
            {" "}&amp;{" "}
            <span style={{ background: "linear-gradient(135deg,#34D399 0%,#10B981 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700 }}>Google Sheets</span>
          </p>
        </div>
      )}

      {/* Modals */}
      {modalPhase === "pin" && (
        <TransactionPinModal
          onPinEntered={handlePinEntered}
          onVerified={handlePinVerified}
          onCancel={handleCloseModal}
        />
      )}

      {modalPhase && modalPhase !== "pin" && (
        <TransactionModal
          phase={modalPhase}
          product={selectedProduct}
          phone={phone}
          operator={operator}
          balance={memberBalance}
          errorMessage={errorMessage}
          failureType={failureType}
          refId={lastRefId}
          memberName={member.name}
          onConfirm={handleConfirmTransaction}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

/* ── Product card components ── */

function ProductCompactCard({ product, selected, onSelect, color }: {
  product: Product; selected: boolean; onSelect: (p: Product) => void; color: string;
}) {
  return (
    <button onClick={() => onSelect(product)}
      className="relative rounded-2xl p-4 text-left transition-all duration-200 border"
      style={selected
        ? { borderColor: color, boxShadow: `0 0 0 1px ${color},0 0 20px ${color}30`, background: `${color}10` }
        : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }
      }>
      {product.badge && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[9px] font-black text-gray-900"
          style={{ background: "linear-gradient(135deg,#FBBF24 0%,#F59E0B 100%)" }}>
          {product.badge}
        </div>
      )}
      <div className="flex items-start justify-between mb-2">
        <span className="text-xl">{product.icon}</span>
        {selected && (
          <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: color }}>
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      <p className="text-sm font-black text-foreground leading-tight">{formatRupiah(product.nominal)}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 mb-2">{product.description}</p>
      <div className="pt-2 border-t border-white/5">
        <p className="text-[10px] text-muted-foreground">Harga Jual</p>
        <p className="text-sm font-black mt-0.5"
          style={{ background: "linear-gradient(135deg,#FBBF24 0%,#F59E0B 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          {formatRupiah(product.price)}
        </p>
      </div>
    </button>
  );
}

function ProductRowCard({ product, selected, onSelect, color }: {
  product: Product; selected: boolean; onSelect: (p: Product) => void; color: string;
}) {
  return (
    <button onClick={() => onSelect(product)}
      className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all duration-200 border"
      style={selected
        ? { borderColor: color, boxShadow: `0 0 0 1px ${color},0 0 15px ${color}20`, background: `${color}10` }
        : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }
      }>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: `${color}18`, border: `1.5px solid ${color}30` }}>
        {product.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-black text-foreground truncate">{product.name}</p>
          {product.badge && (
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black text-gray-900 flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#FBBF24 0%,#F59E0B 100%)" }}>
              {product.badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-tight">{product.description}</p>
      </div>
      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
        <p className="text-base font-black"
          style={{ background: "linear-gradient(135deg,#FBBF24 0%,#F59E0B 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          {formatRupiah(product.price)}
        </p>
        {selected ? (
          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: color }}>
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-white/20" />
        )}
      </div>
    </button>
  );
}
