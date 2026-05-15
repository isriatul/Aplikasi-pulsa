import { PULSA_PRODUCTS, Product, formatRupiah } from "@/lib/products";

interface ProductGridProps {
  selected: Product | null;
  onSelect: (product: Product) => void;
}

const ICONS = ["⚡", "🔥", "💎", "🚀"];
const BADGE_LABELS = ["", "", "POPULAR", "TERLARIS"];

export default function ProductGrid({ selected, onSelect }: ProductGridProps) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-4">
        Pilih Produk Pulsa
      </label>

      <div className="grid grid-cols-2 gap-3">
        {PULSA_PRODUCTS.map((product, i) => {
          const isSelected = selected?.id === product.id;
          return (
            <button
              key={product.id}
              onClick={() => onSelect(product)}
              className={`relative rounded-xl p-4 text-left transition-all duration-200 border
                ${isSelected
                  ? "product-selected bg-cyan-500/10"
                  : "border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15"
                }`}
            >
              {BADGE_LABELS[i] && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider
                  gradient-gold text-gray-900">
                  {BADGE_LABELS[i]}
                </div>
              )}

              <div className="flex items-start justify-between mb-2">
                <span className="text-xl">{ICONS[i]}</span>
                {isSelected && (
                  <div className="w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              <p className="text-sm font-bold text-foreground leading-tight">
                {formatRupiah(product.nominal)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Pulsa</p>

              <div className="mt-2.5 pt-2 border-t border-white/5">
                <p className="text-xs text-muted-foreground">Harga Jual</p>
                <p
                  className="text-sm font-bold mt-0.5"
                  style={{
                    background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {formatRupiah(product.price)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
