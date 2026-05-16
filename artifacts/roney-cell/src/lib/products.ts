export interface Product {
  id: string;
  name: string;
  nominal: number;
  price: number;
  memberPrice: number;
  resellerPrice: number;
  basePrice: number;
  sku: string;
  description: string;
  category: ProductCategory;
  icon: string;
  badge?: string;
}

export type ProductCategory =
  | "pulsa"
  | "data"
  | "pln"
  | "game"
  | "ewallet"
  | "pascabayar"
  | "tv"
  | "voucher";

export type MemberType = "retail" | "member" | "reseller";

export const ALL_PRODUCTS: Product[] = [
  // ── PULSA ──────────────────────────────────────────────────────
  { id: "p5",   name: "Pulsa 5.000",   nominal: 5000,   price: 6000,   memberPrice: 5500,   resellerPrice: 5300,   basePrice: 5200,   sku: "XL5",   description: "Pulsa Rp 5.000",   category: "pulsa", icon: "⚡" },
  { id: "p10",  name: "Pulsa 10.000",  nominal: 10000,  price: 11500,  memberPrice: 11000,  resellerPrice: 10700,  basePrice: 10500,  sku: "XL10",  description: "Pulsa Rp 10.000",  category: "pulsa", icon: "🔥" },
  { id: "p20",  name: "Pulsa 20.000",  nominal: 20000,  price: 21500,  memberPrice: 21000,  resellerPrice: 20700,  basePrice: 20200,  sku: "XL20",  description: "Pulsa Rp 20.000",  category: "pulsa", icon: "💎", badge: "POPULAR" },
  { id: "p50",  name: "Pulsa 50.000",  nominal: 50000,  price: 52000,  memberPrice: 51500,  resellerPrice: 51000,  basePrice: 50500,  sku: "XL50",  description: "Pulsa Rp 50.000",  category: "pulsa", icon: "🚀", badge: "TERLARIS" },
  { id: "p100", name: "Pulsa 100.000", nominal: 100000, price: 103000, memberPrice: 102000, resellerPrice: 101500, basePrice: 101000, sku: "XL100", description: "Pulsa Rp 100.000", category: "pulsa", icon: "👑" },

  // ── PAKET DATA ─────────────────────────────────────────────────
  { id: "d1gb",  name: "1 GB / 7 Hari",   nominal: 1,  price: 12000,  memberPrice: 11000,  resellerPrice: 10700,  basePrice: 10500,  sku: "DATA1GB",  description: "Paket Data 1 GB",  category: "data", icon: "📶" },
  { id: "d2gb",  name: "2 GB / 30 Hari",  nominal: 2,  price: 21000,  memberPrice: 20000,  resellerPrice: 19500,  basePrice: 19000,  sku: "DATA2GB",  description: "Paket Data 2 GB",  category: "data", icon: "📡", badge: "POPULAR" },
  { id: "d5gb",  name: "5 GB / 30 Hari",  nominal: 5,  price: 38000,  memberPrice: 36500,  resellerPrice: 35500,  basePrice: 35000,  sku: "DATA5GB",  description: "Paket Data 5 GB",  category: "data", icon: "🌐" },
  { id: "d10gb", name: "10 GB / 30 Hari", nominal: 10, price: 68000,  memberPrice: 65000,  resellerPrice: 64000,  basePrice: 63000,  sku: "DATA10GB", description: "Paket Data 10 GB", category: "data", icon: "⚡", badge: "TERLARIS" },
  { id: "d20gb", name: "20 GB / 30 Hari", nominal: 20, price: 115000, memberPrice: 110000, resellerPrice: 108500, basePrice: 108000, sku: "DATA20GB", description: "Paket Data 20 GB", category: "data", icon: "🔥" },

  // ── TOKEN PLN ──────────────────────────────────────────────────
  { id: "pln20",  name: "Token PLN 20.000",  nominal: 20000,  price: 21500,  memberPrice: 21000,  resellerPrice: 20700,  basePrice: 20500,  sku: "PLN20000",  description: "Token PLN Rp 20.000",  category: "pln", icon: "💡" },
  { id: "pln50",  name: "Token PLN 50.000",  nominal: 50000,  price: 51500,  memberPrice: 51000,  resellerPrice: 50700,  basePrice: 50500,  sku: "PLN50000",  description: "Token PLN Rp 50.000",  category: "pln", icon: "⚡", badge: "POPULAR" },
  { id: "pln100", name: "Token PLN 100.000", nominal: 100000, price: 102000, memberPrice: 101500, resellerPrice: 101200, basePrice: 101000, sku: "PLN100000", description: "Token PLN Rp 100.000", category: "pln", icon: "🔌" },
  { id: "pln200", name: "Token PLN 200.000", nominal: 200000, price: 203000, memberPrice: 202000, resellerPrice: 201700, basePrice: 201500, sku: "PLN200000", description: "Token PLN Rp 200.000", category: "pln", icon: "🏠", badge: "TERLARIS" },
  { id: "pln500", name: "Token PLN 500.000", nominal: 500000, price: 504000, memberPrice: 503000, resellerPrice: 502500, basePrice: 502000, sku: "PLN500000", description: "Token PLN Rp 500.000", category: "pln", icon: "🏭" },

  // ── TOP UP GAME ────────────────────────────────────────────────
  { id: "ml86",   name: "Mobile Legends 86 Diamond",  nominal: 86,  price: 22000,  memberPrice: 21000,  resellerPrice: 20500,  basePrice: 20000,  sku: "ML86D",   description: "ML 86 Diamond",  category: "game", icon: "🎮" },
  { id: "ml172",  name: "Mobile Legends 172 Diamond", nominal: 172, price: 43000,  memberPrice: 41500,  resellerPrice: 40500,  basePrice: 40000,  sku: "ML172D",  description: "ML 172 Diamond", category: "game", icon: "🎮", badge: "POPULAR" },
  { id: "ml257",  name: "Mobile Legends 257 Diamond", nominal: 257, price: 62000,  memberPrice: 60000,  resellerPrice: 59000,  basePrice: 58000,  sku: "ML257D",  description: "ML 257 Diamond", category: "game", icon: "🎮" },
  { id: "ff70",   name: "Free Fire 70 Diamond",       nominal: 70,  price: 12000,  memberPrice: 11500,  resellerPrice: 11200,  basePrice: 11000,  sku: "FF70D",   description: "FF 70 Diamond",  category: "game", icon: "🔫" },
  { id: "ff140",  name: "Free Fire 140 Diamond",      nominal: 140, price: 23000,  memberPrice: 22000,  resellerPrice: 21700,  basePrice: 21500,  sku: "FF140D",  description: "FF 140 Diamond", category: "game", icon: "🔫", badge: "TERLARIS" },
  { id: "pubg60", name: "PUBG 60 UC",                 nominal: 60,  price: 15000,  memberPrice: 14000,  resellerPrice: 13700,  basePrice: 13500,  sku: "PUBG60UC", description: "PUBG 60 UC",    category: "game", icon: "🎯" },
  { id: "pubg325",name: "PUBG 325 UC",                nominal: 325, price: 74000,  memberPrice: 72000,  resellerPrice: 71000,  basePrice: 70000,  sku: "PUBG325UC",description: "PUBG 325 UC",   category: "game", icon: "🎯", badge: "POPULAR" },

  // ── E-WALLET ───────────────────────────────────────────────────
  { id: "gopay20",   name: "GoPay 20.000",    nominal: 20000,  price: 21000,  memberPrice: 20500,  resellerPrice: 20200,  basePrice: 20000,  sku: "GOPAY20000",  description: "Top Up GoPay",   category: "ewallet", icon: "💚" },
  { id: "gopay50",   name: "GoPay 50.000",    nominal: 50000,  price: 51500,  memberPrice: 51000,  resellerPrice: 50700,  basePrice: 50500,  sku: "GOPAY50000",  description: "Top Up GoPay",   category: "ewallet", icon: "💚", badge: "POPULAR" },
  { id: "gopay100",  name: "GoPay 100.000",   nominal: 100000, price: 102000, memberPrice: 101500, resellerPrice: 101000, basePrice: 100800, sku: "GOPAY100000", description: "Top Up GoPay",   category: "ewallet", icon: "💚" },
  { id: "ovo20",     name: "OVO 20.000",       nominal: 20000,  price: 21000,  memberPrice: 20500,  resellerPrice: 20200,  basePrice: 20000,  sku: "OVO20000",    description: "Top Up OVO",     category: "ewallet", icon: "💜" },
  { id: "ovo50",     name: "OVO 50.000",       nominal: 50000,  price: 51500,  memberPrice: 51000,  resellerPrice: 50700,  basePrice: 50500,  sku: "OVO50000",    description: "Top Up OVO",     category: "ewallet", icon: "💜", badge: "TERLARIS" },
  { id: "shopeepay50",name: "ShopeePay 50.000",nominal: 50000, price: 51500,  memberPrice: 51000,  resellerPrice: 50700,  basePrice: 50500,  sku: "SHOPEEPAY50", description: "Top Up ShopeePay",category: "ewallet",icon: "🧡" },
  { id: "dana20",    name: "DANA 20.000",      nominal: 20000,  price: 21000,  memberPrice: 20500,  resellerPrice: 20200,  basePrice: 20000,  sku: "DANA20000",   description: "Top Up DANA",    category: "ewallet", icon: "💙" },
  { id: "dana50",    name: "DANA 50.000",      nominal: 50000,  price: 51500,  memberPrice: 51000,  resellerPrice: 50700,  basePrice: 50500,  sku: "DANA50000",   description: "Top Up DANA",    category: "ewallet", icon: "💙", badge: "POPULAR" },

  // ── PASCABAYAR ─────────────────────────────────────────────────
  { id: "pln-pasca", name: "PLN Pascabayar",       nominal: 0, price: 3000,  memberPrice: 2500,  resellerPrice: 2200,  basePrice: 2000,  sku: "PLNPASCA",  description: "Bayar tagihan listrik pascabayar", category: "pascabayar", icon: "⚡" },
  { id: "bpjs-kes",  name: "BPJS Kesehatan",        nominal: 0, price: 2500,  memberPrice: 2000,  resellerPrice: 1800,  basePrice: 1500,  sku: "BPJSKES",   description: "Bayar iuran BPJS Kesehatan",       category: "pascabayar", icon: "🏥" },
  { id: "bpjs-tk",   name: "BPJS Ketenagakerjaan",  nominal: 0, price: 2500,  memberPrice: 2000,  resellerPrice: 1800,  basePrice: 1500,  sku: "BPJSTK",    description: "Bayar iuran BPJS TK",              category: "pascabayar", icon: "🛡️" },
  { id: "telkom",    name: "Telkom / IndiHome",      nominal: 0, price: 3000,  memberPrice: 2500,  resellerPrice: 2200,  basePrice: 2000,  sku: "TELKOM",    description: "Bayar tagihan Telkom",             category: "pascabayar", icon: "📞" },
  { id: "pdam",      name: "PDAM Air",               nominal: 0, price: 3000,  memberPrice: 2500,  resellerPrice: 2200,  basePrice: 2000,  sku: "PDAM",      description: "Bayar tagihan PDAM",               category: "pascabayar", icon: "💧" },
  { id: "multifinance", name: "Cicilan Multifinance",nominal: 0, price: 3000,  memberPrice: 2500,  resellerPrice: 2200,  basePrice: 2000,  sku: "MFINANCE",  description: "Bayar cicilan kendaraan",          category: "pascabayar", icon: "🚗" },

  // ── TV KABEL ───────────────────────────────────────────────────
  { id: "usetv1",    name: "UseeTV 1 Bulan",         nominal: 1,  price: 145000, memberPrice: 142000, resellerPrice: 141000, basePrice: 140000, sku: "USEETV1",   description: "Paket UseeTV 1 bulan",   category: "tv", icon: "📺" },
  { id: "usetv3",    name: "UseeTV 3 Bulan",         nominal: 3,  price: 415000, memberPrice: 410000, resellerPrice: 408000, basePrice: 407000, sku: "USEETV3",   description: "Paket UseeTV 3 bulan",   category: "tv", icon: "📺", badge: "HEMAT" },
  { id: "firstmedia",name: "First Media 1 Bulan",    nominal: 1,  price: 275000, memberPrice: 272000, resellerPrice: 271000, basePrice: 270000, sku: "FMEDIA1",   description: "Paket First Media",       category: "tv", icon: "🎬" },
  { id: "transvision",name: "Transvision 1 Bulan",   nominal: 1,  price: 165000, memberPrice: 162000, resellerPrice: 161000, basePrice: 160000, sku: "TRANSVISION",description: "Paket Transvision",      category: "tv", icon: "🎬" },
  { id: "mnctv",     name: "MNC Vision 1 Bulan",     nominal: 1,  price: 155000, memberPrice: 152000, resellerPrice: 151000, basePrice: 150000, sku: "MNCVISION", description: "Paket MNC Vision",        category: "tv", icon: "📡" },

  // ── VOUCHER INTERNET ───────────────────────────────────────────
  { id: "wifi5",  name: "Voucher WiFi 5.000",   nominal: 5000,  price: 6000,   memberPrice: 5500,   resellerPrice: 5300,   basePrice: 5000,   sku: "WIFI5K",   description: "Voucher Internet 5K",   category: "voucher", icon: "📶" },
  { id: "wifi10", name: "Voucher WiFi 10.000",  nominal: 10000, price: 11500,  memberPrice: 11000,  resellerPrice: 10700,  basePrice: 10500,  sku: "WIFI10K",  description: "Voucher Internet 10K",  category: "voucher", icon: "🌐" },
  { id: "wifi20", name: "Voucher WiFi 20.000",  nominal: 20000, price: 22000,  memberPrice: 21500,  resellerPrice: 21000,  basePrice: 20500,  sku: "WIFI20K",  description: "Voucher Internet 20K",  category: "voucher", icon: "🌐", badge: "POPULAR" },
  { id: "wifi50", name: "Voucher WiFi 50.000",  nominal: 50000, price: 53000,  memberPrice: 52000,  resellerPrice: 51500,  basePrice: 51000,  sku: "WIFI50K",  description: "Voucher Internet 50K",  category: "voucher", icon: "⚡", badge: "TERLARIS" },
  { id: "wifi100",name: "Voucher WiFi 100.000", nominal: 100000,price: 105000, memberPrice: 103000, resellerPrice: 102000, basePrice: 101500, sku: "WIFI100K", description: "Voucher Internet 100K", category: "voucher", icon: "🚀" },
];

export const PULSA_PRODUCTS = ALL_PRODUCTS.filter((p) => p.category === "pulsa");

const PRICES_KEY = "roneycell_prices";

interface CustomPrices {
  retail?: number;
  member?: number;
  reseller?: number;
}

export function loadCustomPrices(): Record<string, CustomPrices> {
  try {
    const raw = localStorage.getItem(PRICES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function saveCustomPrices(prices: Record<string, CustomPrices>): void {
  localStorage.setItem(PRICES_KEY, JSON.stringify(prices));
}

export function getProductsWithPrices(memberType: MemberType = "retail"): Product[] {
  const custom = loadCustomPrices();
  return ALL_PRODUCTS.map((p) => {
    const c = custom[p.id] ?? {};
    const retailPrice    = c.retail    ?? p.price;
    const memberPrice    = c.member    ?? p.memberPrice;
    const resellerPrice  = c.reseller  ?? p.resellerPrice;
    const effectivePrice =
      memberType === "reseller" ? resellerPrice :
      memberType === "member"   ? memberPrice :
      retailPrice;
    return { ...p, price: effectivePrice, memberPrice, resellerPrice };
  });
}

export function getProductsByCategory(category: ProductCategory, memberType: MemberType = "retail"): Product[] {
  return getProductsWithPrices(memberType).filter((p) => p.category === category);
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
    Telkomsel:    "TSEL",
    Indosat:      "ISAT",
    "XL Axiata":  "XL",
    Axis:         "AXIS",
    "Tri (3)":    "THREE",
    Smartfren:    "SF",
    "By.U":       "BYU",
  };
  const p = prefix[operatorName] ?? "XL";
  const nominal = baseSku.replace(/[^0-9]/g, "");
  return `${p}${nominal}`;
}

export const CATEGORY_META: Record<ProductCategory, { label: string; icon: string; color: string }> = {
  pulsa:      { label: "Pulsa",           icon: "📱", color: "#3B82F6" },
  data:       { label: "Paket Data",      icon: "📶", color: "#06B6D4" },
  pln:        { label: "Token PLN",       icon: "⚡", color: "#FBBF24" },
  game:       { label: "Top Up Game",     icon: "🎮", color: "#8B5CF6" },
  ewallet:    { label: "E-Wallet",        icon: "💳", color: "#10B981" },
  pascabayar: { label: "Pascabayar",      icon: "🧾", color: "#F97316" },
  tv:         { label: "TV Kabel",        icon: "📺", color: "#EC4899" },
  voucher:    { label: "Voucher Net",     icon: "🌐", color: "#14B8A6" },
};
