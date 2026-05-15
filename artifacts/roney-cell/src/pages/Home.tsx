import { useState, useCallback } from "react";
import BalanceCard from "@/components/BalanceCard";
import PhoneInput from "@/components/PhoneInput";
import TransactionModal from "@/components/TransactionModal";
import { Product, ProductCategory, CATEGORY_META, getProductsByCategory, formatRupiah, getOperatorSku, MemberType } from "@/lib/products";
import { detectOperator, Operator } from "@/lib/operator";
import { fetchBalance, deductBalance } from "@/lib/firebase";
import { sendTransaction, generateRefId } from "@/lib/digiflazz";
import { loadConfig } from "@/lib/config";
import { saveTransaction } from "@/lib/transactions";
import { Member, TYPE_LABELS, TYPE_COLORS } from "@/lib/members";

type ModalPhase = "confirm" | "loading" | "success" | "failed" | "insufficient" | null;

interface HomeProps {
  member?: Member | null;
}

const CATEGORY_CARDS: { id: ProductCategory; label: string; desc: string; icon: string; color: string; gradient: string }[] = [
  {
    id: "pulsa",
    label: "Pulsa",
    desc: "Isi pulsa semua operator",
    icon: "📱",
    color: "#60A5FA",
    gradient: "linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(37,99,235,0.1) 100%)",
  },
  {
    id: "data",
    label: "Paket Data",
    desc: "Internet semua operator",
    icon: "📶",
    color: "#34D399",
    gradient: "linear-gradient(135deg, rgba(52,211,153,0.2) 0%, rgba(16,185,129,0.1) 100%)",
  },
  {
    id: "pln",
    label: "Token PLN",
    desc: "Token listrik prabayar",
    icon: "⚡",
    color: "#FBBF24",
    gradient: "linear-gradient(135deg, rgba(251,191,36,0.2) 0%, rgba(245,158,11,0.1) 100%)",
  },
  {
    id: "game",
    label: "Top Up Game",
    desc: "Diamond, UC, Voucher",
    icon: "🎮",
    color: "#F472B6",
    gradient: "linear-gradient(135deg, rgba(244,114,182,0.2) 0%, rgba(236,72,153,0.1) 100%)",
  },
];

export default function Home({ member }: HomeProps) {
  const [phone, setPhone] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [balance, setBalance] = useState(0);
  const [modalPhase, setModalPhase] = useState<ModalPhase>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastRefId, setLastRefId] = useState("");

  const memberType: MemberType = member?.type ?? "retail";
  const operator: Operator | null = detectOperator(phone);

  const handleBalanceChange = useCallback((val: number) => setBalance(val), []);

  function handleSelectCategory(cat: ProductCategory) {
    setSelectedCategory(cat);
    setSelectedProduct(null);
  }

  function handleBack() {
    setSelectedCategory(null);
    setSelectedProduct(null);
  }

  function handleSubmit() {
    if (!phone || phone.length < 9) return;
    if (!selectedProduct) return;
    const cfg = loadConfig();
    if (!cfg.username || !cfg.apiKey) {
      alert("Sila pergi ke tab Owner → Tetapan untuk mengisi username & API key Digiflazz terlebih dahulu.");
      return;
    }
    setModalPhase("confirm");
  }

  async function handleConfirmTransaction() {
    if (!selectedProduct) return;

    const current = await fetchBalance().catch(() => balance);
    if (current < selectedProduct.price) {
      setModalPhase("insufficient");
      return;
    }

    setModalPhase("loading");

    const cfg = loadConfig();
    const sku = getOperatorSku(operator?.name, selectedProduct.sku);
    const refId = generateRefId();
    setLastRefId(refId);

    try {
      const result = await sendTransaction(cfg, phone, sku, refId);

      saveTransaction({
        id: refId,
        date: new Date().toISOString(),
        phone,
        product: selectedProduct.name,
        category: selectedProduct.category,
        sellPrice: selectedProduct.price,
        basePrice: selectedProduct.basePrice,
        profit: selectedProduct.price - selectedProduct.basePrice,
        status: result.success ? "success" : "failed",
      });

      if (result.success) {
        await deductBalance(selectedProduct.price);
        setModalPhase("success");
      } else {
        setErrorMessage(result.message);
        setModalPhase("failed");
      }
    } catch (err: unknown) {
      saveTransaction({
        id: refId,
        date: new Date().toISOString(),
        phone,
        product: selectedProduct.name,
        category: selectedProduct.category,
        sellPrice: selectedProduct.price,
        basePrice: selectedProduct.basePrice,
        profit: 0,
        status: "failed",
      });
      setErrorMessage(err instanceof Error ? err.message : "Ralat tidak diketahui");
      setModalPhase("failed");
    }
  }

  function handleCloseModal() {
    setModalPhase(null);
    setErrorMessage("");
  }

  const isFormValid = phone.length >= 9 && selectedProduct !== null;
  const products = selectedCategory ? getProductsByCategory(selectedCategory, memberType) : [];

  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto px-4 pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 pt-safe">
        <div
          className="flex items-center justify-between py-4"
          style={{ background: "linear-gradient(to bottom, hsl(220 40% 5%) 80%, transparent)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(210 90% 55%) 0%, hsl(230 80% 40%) 100%)", boxShadow: "0 0 16px rgba(59,130,246,0.4)" }}
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z"
                />
              </svg>
            </div>
            <div>
              <h1 className="font-black text-lg leading-none tracking-tight"
                style={{ background: "linear-gradient(135deg, #60A5FA 0%, #A78BFA 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                RoneyCell
              </h1>
              <p className="text-[10px] text-muted-foreground tracking-widest">SISTEM JUALAN PULSA</p>
            </div>
          </div>

          {member && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
              style={{ background: `${TYPE_COLORS[member.type]}15`, borderColor: `${TYPE_COLORS[member.type]}30` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: TYPE_COLORS[member.type] }} />
              <span className="text-xs font-bold" style={{ color: TYPE_COLORS[member.type] }}>
                {TYPE_LABELS[member.type]}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Balance */}
      <div className="mb-5">
        <BalanceCard onBalanceChange={handleBalanceChange} />
      </div>

      {/* Member price banner */}
      {member && member.type !== "retail" && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{ background: `${TYPE_COLORS[member.type]}10`, borderColor: `${TYPE_COLORS[member.type]}25` }}>
          <span className="text-lg">🎯</span>
          <div>
            <p className="text-xs font-bold" style={{ color: TYPE_COLORS[member.type] }}>
              Harga {TYPE_LABELS[member.type]} Aktif
            </p>
            <p className="text-[10px] text-muted-foreground">Anda menikmati harga lebih murah dari retail</p>
          </div>
        </div>
      )}

      {/* ── STEP 1: Category Cards ── */}
      {!selectedCategory && (
        <>
          <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold mb-3">
            Pilih Kategori Produk
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {CATEGORY_CARDS.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat.id)}
                className="relative rounded-2xl p-5 text-left transition-all duration-200 border hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: cat.gradient, borderColor: `${cat.color}30`, boxShadow: `0 4px 20px ${cat.color}10` }}
              >
                <div className="text-3xl mb-3">{cat.icon}</div>
                <p className="font-black text-sm text-foreground leading-tight">{cat.label}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{cat.desc}</p>
                <div className="absolute top-3 right-3">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    style={{ color: cat.color, opacity: 0.6 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          <div className="text-center mt-4">
            <p className="text-xs text-muted-foreground">
              Dikuasakan oleh{" "}
              <span style={{ background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700 }}>Digiflazz</span>
              {" "}&amp;{" "}
              <span style={{ background: "linear-gradient(135deg, #34D399 0%, #10B981 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700 }}>Firebase</span>
            </p>
          </div>
        </>
      )}

      {/* ── STEP 2: Product Selection ── */}
      {selectedCategory && (
        <>
          {/* Back button + category label */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-all hover:bg-white/5"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Kembali
            </button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
              style={{
                background: `${CATEGORY_META[selectedCategory].color}15`,
                borderColor: `${CATEGORY_META[selectedCategory].color}35`,
              }}>
              <span>{CATEGORY_META[selectedCategory].icon}</span>
              <span className="text-sm font-bold" style={{ color: CATEGORY_META[selectedCategory].color }}>
                {CATEGORY_META[selectedCategory].label}
              </span>
            </div>
          </div>

          {/* Phone input */}
          <div className="mb-4">
            <PhoneInput
              value={phone}
              onChange={setPhone}
              label={selectedCategory === "game" ? "ID Game / User ID" : undefined}
              placeholder={selectedCategory === "game" ? "Contoh: 12345678 (1234)" : undefined}
            />
          </div>

          {/* Product list */}
          <div className="glass-card rounded-2xl p-4 mb-4">
            <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold mb-3">
              Pilih Produk
            </p>
            {selectedCategory === "pulsa" || selectedCategory === "pln" ? (
              <div className="grid grid-cols-2 gap-2.5">
                {products.map((product) => (
                  <ProductCompactCard
                    key={product.id}
                    product={product}
                    selected={selectedProduct?.id === product.id}
                    onSelect={setSelectedProduct}
                    color={CATEGORY_META[selectedCategory].color}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {products.map((product) => (
                  <ProductRowCard
                    key={product.id}
                    product={product}
                    selected={selectedProduct?.id === product.id}
                    onSelect={setSelectedProduct}
                    color={CATEGORY_META[selectedCategory].color}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Order summary */}
          {selectedProduct && phone.length >= 9 && (
            <div className="mb-4 glass-card rounded-2xl p-4 border border-cyan-500/15">
              <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold mb-3">Ringkasan Pesanan</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedProduct.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{phone}</p>
                  {member && member.type !== "retail" && (
                    <p className="text-[10px] mt-0.5" style={{ color: TYPE_COLORS[member.type] }}>
                      Harga {TYPE_LABELS[member.type]}
                    </p>
                  )}
                </div>
                <p className="text-lg font-black"
                  style={{ background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {formatRupiah(selectedProduct.price)}
                </p>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!isFormValid}
            className="w-full py-4 rounded-2xl text-base font-black tracking-wide transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
            style={isFormValid ? {
              background: "linear-gradient(135deg, hsl(210 90% 55%) 0%, hsl(230 75% 45%) 100%)",
              color: "white",
              boxShadow: "0 6px 24px rgba(59,130,246,0.4), 0 2px 8px rgba(0,0,0,0.3)",
            } : undefined}
          >
            {isFormValid ? "Hantar Transaksi" : phone.length < 9 ? "Masukkan Nombor Dahulu" : "Pilih Produk Dahulu"}
          </button>
        </>
      )}

      {modalPhase && (
        <TransactionModal
          phase={modalPhase}
          product={selectedProduct}
          phone={phone}
          operator={operator}
          balance={balance}
          errorMessage={errorMessage}
          refId={lastRefId}
          memberName={member?.name}
          onConfirm={handleConfirmTransaction}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

function ProductCompactCard({ product, selected, onSelect, color }: {
  product: Product; selected: boolean; onSelect: (p: Product) => void; color: string;
}) {
  return (
    <button
      onClick={() => onSelect(product)}
      className="relative rounded-xl p-4 text-left transition-all duration-200 border"
      style={selected
        ? { borderColor: color, boxShadow: `0 0 0 1px ${color}, 0 0 20px ${color}30`, background: `${color}10` }
        : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }
      }
    >
      {product.badge && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider text-gray-900"
          style={{ background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)" }}>
          {product.badge}
        </div>
      )}
      <div className="flex items-start justify-between mb-2">
        <span className="text-xl">{product.icon}</span>
        {selected && (
          <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: color }}>
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      <p className="text-sm font-bold text-foreground leading-tight">
        {formatRupiah(product.nominal)}
      </p>
      <div className="mt-2.5 pt-2 border-t border-white/5">
        <p className="text-xs text-muted-foreground">Harga Jual</p>
        <p className="text-sm font-bold mt-0.5" style={{
          background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
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
    <button
      onClick={() => onSelect(product)}
      className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all duration-200 border"
      style={selected
        ? { borderColor: color, boxShadow: `0 0 0 1px ${color}, 0 0 15px ${color}20`, background: `${color}10` }
        : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }
      }
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
        {product.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-foreground truncate">{product.name}</p>
          {product.badge && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black text-gray-900 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)" }}>
              {product.badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{product.description}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold" style={{
          background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          {formatRupiah(product.price)}
        </p>
        {selected && (
          <div className="w-5 h-5 rounded-full flex items-center justify-center mt-1 ml-auto" style={{ background: color }}>
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}
