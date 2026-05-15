export interface Product {
  id: string;
  name: string;
  nominal: number;
  price: number;
  basePrice: number;
  sku: string;
  description: string;
  category: ProductCategory;
  icon: string;
  badge?: string;
}

export type ProductCategory = "pulsa" | "data" | "pln" | "game";

export const ALL_PRODUCTS: Product[] = [
  // PULSA
  { id: "p5", name: "Pulsa 5.000", nominal: 5000, price: 6000, basePrice: 5200, sku: "XL5", description: "Pulsa Rp 5.000", category: "pulsa", icon: "⚡" },
  { id: "p10", name: "Pulsa 10.000", nominal: 10000, price: 11500, basePrice: 10500, sku: "XL10", description: "Pulsa Rp 10.000", category: "pulsa", icon: "🔥" },
  { id: "p20", name: "Pulsa 20.000", nominal: 20000, price: 21500, basePrice: 20200, sku: "XL20", description: "Pulsa Rp 20.000", category: "pulsa", icon: "💎", badge: "POPULAR" },
  { id: "p50", name: "Pulsa 50.000", nominal: 50000, price: 52000, basePrice: 50500, sku: "XL50", description: "Pulsa Rp 50.000", category: "pulsa", icon: "🚀", badge: "TERLARIS" },
  { id: "p100", name: "Pulsa 100.000", nominal: 100000, price: 103000, basePrice: 101000, sku: "XL100", description: "Pulsa Rp 100.000", category: "pulsa", icon: "👑" },

  // PAKET DATA
  { id: "d1gb", name: "1 GB / 7 Hari", nominal: 1000, price: 12000, basePrice: 10500, sku: "DATA1GB", description: "Paket Data 1 GB", category: "data", icon: "📶" },
  { id: "d2gb", name: "2 GB / 30 Hari", nominal: 2000, price: 21000, basePrice: 19000, sku: "DATA2GB", description: "Paket Data 2 GB", category: "data", icon: "📡", badge: "POPULAR" },
  { id: "d5gb", name: "5 GB / 30 Hari", nominal: 5000, price: 38000, basePrice: 35000, sku: "DATA5GB", description: "Paket Data 5 GB", category: "data", icon: "🌐" },
  { id: "d10gb", name: "10 GB / 30 Hari", nominal: 10000, price: 68000, basePrice: 63000, sku: "DATA10GB", description: "Paket Data 10 GB", category: "data", icon: "⚡", badge: "TERLARIS" },
  { id: "d20gb", name: "20 GB / 30 Hari", nominal: 20000, price: 115000, basePrice: 108000, sku: "DATA20GB", description: "Paket Data 20 GB", category: "data", icon: "🔥" },

  // TOKEN PLN
  { id: "pln20", name: "Token PLN 20.000", nominal: 20000, price: 21500, basePrice: 20500, sku: "PLN20000", description: "Token PLN Rp 20.000", category: "pln", icon: "💡" },
  { id: "pln50", name: "Token PLN 50.000", nominal: 50000, price: 51500, basePrice: 50500, sku: "PLN50000", description: "Token PLN Rp 50.000", category: "pln", icon: "⚡", badge: "POPULAR" },
  { id: "pln100", name: "Token PLN 100.000", nominal: 100000, price: 102000, basePrice: 101000, sku: "PLN100000", description: "Token PLN Rp 100.000", category: "pln", icon: "🔌" },
  { id: "pln200", name: "Token PLN 200.000", nominal: 200000, price: 203000, basePrice: 201500, sku: "PLN200000", description: "Token PLN Rp 200.000", category: "pln", icon: "🏠", badge: "TERLARIS" },
  { id: "pln500", name: "Token PLN 500.000", nominal: 500000, price: 504000, basePrice: 502000, sku: "PLN500000", description: "Token PLN Rp 500.000", category: "pln", icon: "🏭" },

  // TOP UP GAME
  { id: "ml86", name: "Mobile Legends 86 Diamond", nominal: 86, price: 22000, basePrice: 20000, sku: "ML86D", description: "ML 86 Diamond", category: "game", icon: "🎮" },
  { id: "ml172", name: "Mobile Legends 172 Diamond", nominal: 172, price: 43000, basePrice: 40000, sku: "ML172D", description: "ML 172 Diamond", category: "game", icon: "🎮", badge: "POPULAR" },
  { id: "ff70", name: "Free Fire 70 Diamond", nominal: 70, price: 12000, basePrice: 11000, sku: "FF70D", description: "FF 70 Diamond", category: "game", icon: "🔫" },
  { id: "ff140", name: "Free Fire 140 Diamond", nominal: 140, price: 23000, basePrice: 21500, sku: "FF140D", description: "FF 140 Diamond", category: "game", icon: "🔫", badge: "TERLARIS" },
  { id: "pubg60", name: "PUBG 60 UC", nominal: 60, price: 15000, basePrice: 13500, sku: "PUBG60UC", description: "PUBG 60 UC", category: "game", icon: "🎯" },
];

export const PULSA_PRODUCTS = ALL_PRODUCTS.filter((p) => p.category === "pulsa");

const PRICES_KEY = "roneycell_prices";

export function loadCustomPrices(): Record<string, number> {
  try {
    const raw = localStorage.getItem(PRICES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function saveCustomPrices(prices: Record<string, number>): void {
  localStorage.setItem(PRICES_KEY, JSON.stringify(prices));
}

export function getProductsWithPrices(): Product[] {
  const custom = loadCustomPrices();
  return ALL_PRODUCTS.map((p) => ({
    ...p,
    price: custom[p.id] ?? p.price,
  }));
}

export function getProductsByCategory(category: ProductCategory): Product[] {
  return getProductsWithPrices().filter((p) => p.category === category);
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function getOperatorSku(operatorName: string | undefined, baseSku: string): string {
  if (!operatorName) return baseSku;
  const prefix: Record<string, string> = {
    Telkomsel: "TSEL",
    Indosat: "ISAT",
    "XL Axiata": "XL",
    Axis: "AXIS",
    "Tri (3)": "THREE",
    Smartfren: "SF",
    "By.U": "BYU",
  };
  const p = prefix[operatorName] ?? "XL";
  const nominal = baseSku.replace(/[^0-9]/g, "");
  return `${p}${nominal}`;
}

export const CATEGORY_META: Record<ProductCategory, { label: string; icon: string; color: string }> = {
  pulsa: { label: "Pulsa", icon: "📱", color: "#3B82F6" },
  data: { label: "Paket Data", icon: "📶", color: "#06B6D4" },
  pln: { label: "Token PLN", icon: "⚡", color: "#FBBF24" },
  game: { label: "Top Up Game", icon: "🎮", color: "#8B5CF6" },
};
