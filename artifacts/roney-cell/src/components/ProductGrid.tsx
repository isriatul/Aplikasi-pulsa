import { useState, useEffect } from "react";
import { Product, ProductCategory, CATEGORY_META, getProductsByCategory, formatRupiah, MemberType } from "@/lib/products";
import { getV2Token, v2GetProducts, type V2ProductItem } from "@/lib/apiV2";

interface ProductGridProps {
  selected: Product | null;
  onSelect: (product: Product) => void;
  activeCategory: ProductCategory;
  onCategoryChange: (cat: ProductCategory) => void;
  memberType?: MemberType;
}

const CATEGORIES: ProductCategory[] = ["pulsa", "data", "pln", "game"];

const CATEGORY_ICONS: Record<string, string> = {
  pulsa: "📱", data: "📶", pln: "⚡", game: "🎮",
  ewallet: "💳", pascabayar: "🧾", tv: "📺", voucher: "🌐",
  international: "🌍", other: "📦",
};

function v2ProductToProduct(item: V2ProductItem): Product {
  const cat = item.category as ProductCategory;
  return {
    id: String(item.id),
    name: item.name,
    nominal: item.basePrice,
    price: item.price,
    memberPrice: item.memberPrice,
    resellerPrice: item.resellerPrice,
    basePrice: item.basePrice,
    sku: item.code,
    description: item.description ?? item.name,
    category: cat,
    icon: CATEGORY_ICONS[item.category] ?? "📦",
  };
}

export default function ProductGrid({ selected, onSelect, activeCategory, onCategoryChange, memberType = "retail" }: ProductGridProps) {
  const [dbProducts, setDbProducts] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(false);
  const isV2 = !!getV2Token();

  useEffect(() => {
    if (!isV2) { setDbProducts(null); return; }
    setLoading(true);
    v2GetProducts({ category: activeCategory })
      .then((res) => setDbProducts(res.data.map(v2ProductToProduct)))
      .catch(() => setDbProducts(null))
      .finally(() => setLoading(false));
  }, [activeCategory, isV2]);

  const products = dbProducts ?? getProductsByCategory(activeCategory, memberType);

  return (
    <div className="glass-card rounded-2xl p-5">
      <label className="text-xs text-muted-foreground tracking-widest uppercase font-semibold block mb-3">
        Pilih Produk
      </label>

      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat];
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 border"
              style={isActive
                ? { background: `${meta.color}20`, borderColor: `${meta.color}50`, color: meta.color, boxShadow: `0 0 12px ${meta.color}20` }
                : { borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }
              }
            >
              <span className="text-sm">{meta.icon}</span>
              {meta.label}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 gap-2">
          <div className="w-5 h-5 rounded-full border-2 border-blue-500/20 border-t-blue-400 animate-spin" />
          <span className="text-xs text-muted-foreground">Memuat produk...</span>
        </div>
      )}

      {!loading && (activeCategory === "pulsa" || activeCategory === "pln" ? (
        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} selected={selected?.id === product.id} onSelect={onSelect} compact />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} selected={selected?.id === product.id} onSelect={onSelect} compact={false} />
          ))}
        </div>
      ))}

      {!loading && products.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Belum ada produk. Admin perlu melakukan sinkronisasi produk.
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, selected, onSelect, compact }: {
  product: Product;
  selected: boolean;
  onSelect: (p: Product) => void;
  compact: boolean;
}) {
  const meta = CATEGORY_META[product.category];

  if (compact) {
    return (
      <button
        onClick={() => onSelect(product)}
        className="relative rounded-xl p-4 text-left transition-all duration-200 border"
        style={selected
          ? { borderColor: meta.color, boxShadow: `0 0 0 1px ${meta.color}, 0 0 20px ${meta.color}30`, background: `${meta.color}10` }
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
            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: meta.color }}>
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>
        <p className="text-sm font-bold text-foreground leading-tight">
          {product.name}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {product.category === "pln" ? "Token PLN" : "Pulsa"}
        </p>
        <div className="mt-2.5 pt-2 border-t border-white/5">
          <p className="text-xs text-muted-foreground">Harga Jual</p>
          <p className="text-sm font-bold mt-0.5" style={{
            background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            {formatRupiah(product.price)}
          </p>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => onSelect(product)}
      className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all duration-200 border"
      style={selected
        ? { borderColor: meta.color, boxShadow: `0 0 0 1px ${meta.color}, 0 0 15px ${meta.color}20`, background: `${meta.color}10` }
        : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }
      }
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}25` }}>
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
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          {formatRupiah(product.price)}
        </p>
        {selected && (
          <div className="w-5 h-5 rounded-full flex items-center justify-center mt-1 ml-auto" style={{ background: meta.color }}>
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}
