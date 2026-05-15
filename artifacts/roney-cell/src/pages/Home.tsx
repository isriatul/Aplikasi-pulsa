import { useState, useCallback } from "react";
import BalanceCard from "@/components/BalanceCard";
import PhoneInput from "@/components/PhoneInput";
import ProductGrid from "@/components/ProductGrid";
import TransactionModal from "@/components/TransactionModal";
import ConfigModal from "@/components/ConfigModal";
import { Product, formatRupiah } from "@/lib/products";
import { detectOperator, Operator } from "@/lib/operator";
import { fetchBalance, deductBalance } from "@/lib/firebase";
import { sendTransaction, generateRefId } from "@/lib/digiflazz";
import { getOperatorSku } from "@/lib/products";

type ModalPhase = "confirm" | "loading" | "success" | "failed" | "insufficient" | null;

interface DigiConfig {
  username: string;
  apiKey: string;
}

function loadConfig(): DigiConfig {
  try {
    const raw = localStorage.getItem("roneycell_config");
    if (raw) return JSON.parse(raw);
  } catch {}
  return { username: "", apiKey: "" };
}

function saveConfig(cfg: DigiConfig) {
  localStorage.setItem("roneycell_config", JSON.stringify(cfg));
}

export default function Home() {
  const [phone, setPhone] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [balance, setBalance] = useState(0);
  const [modalPhase, setModalPhase] = useState<ModalPhase>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<DigiConfig>(loadConfig);

  const operator: Operator | null = detectOperator(phone);

  const handleBalanceChange = useCallback((val: number) => {
    setBalance(val);
  }, []);

  function handleSaveConfig(cfg: DigiConfig) {
    setConfig(cfg);
    saveConfig(cfg);
  }

  function handleSubmit() {
    if (!phone || phone.length < 9) {
      return;
    }
    if (!selectedProduct) return;
    if (!config.username || !config.apiKey) {
      setShowConfig(true);
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

    try {
      const sku = getOperatorSku(operator?.name, selectedProduct.sku);
      const refId = generateRefId();

      const result = await sendTransaction(
        config,
        phone,
        sku,
        refId
      );

      if (result.success) {
        await deductBalance(selectedProduct.price);
        setModalPhase("success");
      } else {
        setErrorMessage(result.message);
        setModalPhase("failed");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Ralat tidak diketahui");
      setModalPhase("failed");
    }
  }

  function handleCloseModal() {
    setModalPhase(null);
    setErrorMessage("");
  }

  const isFormValid = phone.length >= 9 && selectedProduct !== null;

  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto px-4 pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 pt-safe">
        <div
          className="flex items-center justify-between py-4"
          style={{
            background: "linear-gradient(to bottom, hsl(220 40% 5%) 80%, transparent)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, hsl(210 90% 55%) 0%, hsl(230 80% 40%) 100%)",
                boxShadow: "0 0 16px rgba(59,130,246,0.4)",
              }}
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z"
                />
              </svg>
            </div>
            <div>
              <h1
                className="font-black text-lg leading-none tracking-tight"
                style={{
                  background: "linear-gradient(135deg, #60A5FA 0%, #A78BFA 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                RONEY CELL
              </h1>
              <p className="text-[10px] text-muted-foreground tracking-widest">SISTEM JUALAN PULSA</p>
            </div>
          </div>

          <button
            onClick={() => setShowConfig(true)}
            className="w-9 h-9 rounded-xl glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Config warning */}
      {(!config.username || !config.apiKey) && (
        <button
          onClick={() => setShowConfig(true)}
          className="mb-4 w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/8 text-left"
        >
          <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <p className="text-sm font-semibold text-yellow-400">Konfigurasi Diperlukan</p>
            <p className="text-xs text-muted-foreground">Ketik di sini untuk masukkan username & API key Digiflazz</p>
          </div>
          <svg className="w-4 h-4 text-muted-foreground ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Balance */}
      <div className="mb-4">
        <BalanceCard onBalanceChange={handleBalanceChange} />
      </div>

      {/* Phone Input */}
      <div className="mb-4">
        <PhoneInput value={phone} onChange={setPhone} />
      </div>

      {/* Product Grid */}
      <div className="mb-6">
        <ProductGrid selected={selectedProduct} onSelect={setSelectedProduct} />
      </div>

      {/* Order Summary */}
      {selectedProduct && phone.length >= 9 && (
        <div className="mb-4 glass-card rounded-2xl p-4 border border-cyan-500/15">
          <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold mb-3">
            Ringkasan Pesanan
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{selectedProduct.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{phone}</p>
            </div>
            <p
              className="text-lg font-black"
              style={{
                background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {formatRupiah(selectedProduct.price)}
            </p>
          </div>
        </div>
      )}

      {/* Submit Button */}
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
        {isFormValid ? "Hantar Transaksi" : "Isi Maklumat Transaksi"}
      </button>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground">
          Dikuasakan oleh{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: 700,
            }}
          >
            Digiflazz
          </span>{" "}
          &amp;{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #34D399 0%, #10B981 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: 700,
            }}
          >
            Firebase
          </span>
        </p>
      </div>

      {/* Transaction Modal */}
      {modalPhase && (
        <TransactionModal
          phase={modalPhase}
          product={selectedProduct}
          phone={phone}
          operator={operator}
          balance={balance}
          errorMessage={errorMessage}
          onConfirm={handleConfirmTransaction}
          onClose={handleCloseModal}
        />
      )}

      {/* Config Modal */}
      {showConfig && (
        <ConfigModal
          config={config}
          onSave={handleSaveConfig}
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  );
}
