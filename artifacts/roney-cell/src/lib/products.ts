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
  | "voucher"
  | "intl";

export type MemberType = "retail" | "member" | "reseller" | "admin";

/* Helper to build a pulsa product quickly */
function pulsa(
  id: string, nominal: number, price: number,
  memberPrice: number, resellerPrice: number, basePrice: number,
  sku: string, provider: string, badge?: string
): Product {
  return {
    id, name: `${provider} ${nominal >= 1000 ? (nominal / 1000) + "K" : nominal}`,
    nominal, price, memberPrice, resellerPrice, basePrice,
    sku, description: `Pulsa ${provider} Rp ${nominal.toLocaleString("id-ID")}`,
    category: "pulsa", icon: "📱", badge,
  };
}

function pln(
  id: string, nominal: number, price: number,
  memberPrice: number, resellerPrice: number, basePrice: number, badge?: string
): Product {
  return {
    id, name: `Token PLN ${nominal >= 1000 ? (nominal / 1000) + "K" : nominal}`,
    nominal, price, memberPrice, resellerPrice, basePrice,
    sku: `PLN${nominal}`,
    description: `Token PLN Rp ${nominal.toLocaleString("id-ID")}`,
    category: "pln", icon: "⚡", badge,
  };
}

function intlProduct(
  id: string, name: string, nominal: number, price: number,
  memberPrice: number, resellerPrice: number, basePrice: number,
  sku: string, description: string, icon: string, badge?: string
): Product {
  return { id, name, nominal, price, memberPrice, resellerPrice, basePrice, sku, description, category: "intl", icon, badge };
}

export const ALL_PRODUCTS: Product[] = [

  // ── PULSA TELKOMSEL ─────────────────────────────────────────────
  pulsa("tsel5",    5000,    6200,    5800,    5600,    5400,    "TSEL5",    "Telkomsel"),
  pulsa("tsel10",   10000,   11500,   11000,   10700,   10500,   "TSEL10",   "Telkomsel"),
  pulsa("tsel15",   15000,   16500,   16000,   15700,   15500,   "TSEL15",   "Telkomsel"),
  pulsa("tsel20",   20000,   21500,   21000,   20700,   20300,   "TSEL20",   "Telkomsel", "HOT"),
  pulsa("tsel25",   25000,   26500,   26000,   25700,   25300,   "TSEL25",   "Telkomsel"),
  pulsa("tsel30",   30000,   31500,   31000,   30700,   30300,   "TSEL30",   "Telkomsel"),
  pulsa("tsel50",   50000,   52000,   51500,   51000,   50500,   "TSEL50",   "Telkomsel", "TERLARIS"),
  pulsa("tsel75",   75000,   77000,   76500,   76000,   75500,   "TSEL75",   "Telkomsel"),
  pulsa("tsel100",  100000,  102500,  102000,  101500,  101000,  "TSEL100",  "Telkomsel", "POPULAR"),
  pulsa("tsel150",  150000,  152500,  152000,  151500,  151000,  "TSEL150",  "Telkomsel"),
  pulsa("tsel200",  200000,  203000,  202000,  201500,  201000,  "TSEL200",  "Telkomsel"),

  // ── PULSA XL AXIATA ─────────────────────────────────────────────
  pulsa("xl5",      5000,    6000,    5600,    5400,    5200,    "XL5",      "XL Axiata"),
  pulsa("xl10",     10000,   11200,   10800,   10500,   10300,   "XL10",     "XL Axiata"),
  pulsa("xl15",     15000,   16200,   15800,   15500,   15300,   "XL15",     "XL Axiata"),
  pulsa("xl20",     20000,   21200,   20800,   20500,   20200,   "XL20",     "XL Axiata", "MURAH"),
  pulsa("xl25",     25000,   26200,   25800,   25500,   25200,   "XL25",     "XL Axiata"),
  pulsa("xl50",     50000,   51800,   51300,   51000,   50500,   "XL50",     "XL Axiata", "HOT"),
  pulsa("xl100",    100000,  102000,  101500,  101000,  100500,  "XL100",    "XL Axiata"),
  pulsa("xl200",    200000,  202500,  202000,  201500,  201000,  "XL200",    "XL Axiata"),

  // ── PULSA INDOSAT (IM3 OOREDOO) ─────────────────────────────────
  pulsa("isat5",    5000,    5900,    5500,    5300,    5100,    "ISAT5",    "Indosat"),
  pulsa("isat10",   10000,   11000,   10600,   10300,   10100,   "ISAT10",   "Indosat"),
  pulsa("isat20",   20000,   21000,   20600,   20300,   20100,   "ISAT20",   "Indosat", "MURAH"),
  pulsa("isat25",   25000,   26000,   25600,   25300,   25100,   "ISAT25",   "Indosat"),
  pulsa("isat50",   50000,   51500,   51000,   50700,   50400,   "ISAT50",   "Indosat", "HOT"),
  pulsa("isat100",  100000,  101800,  101300,  101000,  100700,  "ISAT100",  "Indosat"),
  pulsa("isat150",  150000,  152000,  151500,  151000,  150500,  "ISAT150",  "Indosat"),

  // ── PULSA AXIS ──────────────────────────────────────────────────
  pulsa("axis5",    5000,    5800,    5400,    5200,    5000,    "AXIS5",    "Axis", "MURAH"),
  pulsa("axis10",   10000,   10900,   10500,   10200,   10000,   "AXIS10",   "Axis"),
  pulsa("axis20",   20000,   20900,   20500,   20200,   20000,   "AXIS20",   "Axis", "MURAH"),
  pulsa("axis50",   50000,   51200,   50800,   50500,   50200,   "AXIS50",   "Axis"),
  pulsa("axis100",  100000,  101500,  101000,  100700,  100400,  "AXIS100",  "Axis"),

  // ── PULSA TRI (3) ───────────────────────────────────────────────
  pulsa("three5",   5000,    5800,    5400,    5200,    5000,    "THREE5",   "Tri (3)", "MURAH"),
  pulsa("three10",  10000,   10900,   10500,   10200,   10000,   "THREE10",  "Tri (3)"),
  pulsa("three20",  20000,   20900,   20500,   20200,   20000,   "THREE20",  "Tri (3)"),
  pulsa("three50",  50000,   51200,   50800,   50500,   50200,   "THREE50",  "Tri (3)"),
  pulsa("three100", 100000,  101500,  101000,  100700,  100400,  "THREE100", "Tri (3)"),

  // ── PULSA SMARTFREN ─────────────────────────────────────────────
  pulsa("sf5",      5000,    6000,    5600,    5400,    5200,    "SF5",      "Smartfren"),
  pulsa("sf10",     10000,   11000,   10600,   10300,   10100,   "SF10",     "Smartfren"),
  pulsa("sf20",     20000,   21000,   20600,   20300,   20100,   "SF20",     "Smartfren"),
  pulsa("sf50",     50000,   51500,   51000,   50700,   50400,   "SF50",     "Smartfren"),
  pulsa("sf100",    100000,  102000,  101500,  101000,  100500,  "SF100",    "Smartfren"),

  // ── PAKET DATA ─────────────────────────────────────────────────
  { id: "d500mb",  name: "500 MB / 7 Hari",   nominal: 0,  price: 7500,   memberPrice: 7000,   resellerPrice: 6700,   basePrice: 6500,   sku: "DATA500MB",  description: "Kuota 500 MB",       category: "data", icon: "📶" },
  { id: "d1gb",    name: "1 GB / 7 Hari",     nominal: 1,  price: 12000,  memberPrice: 11000,  resellerPrice: 10700,  basePrice: 10500,  sku: "DATA1GB",   description: "Kuota 1 GB",         category: "data", icon: "📶", badge: "MURAH" },
  { id: "d2gb",    name: "2 GB / 30 Hari",    nominal: 2,  price: 21000,  memberPrice: 20000,  resellerPrice: 19500,  basePrice: 19000,  sku: "DATA2GB",   description: "Kuota 2 GB",         category: "data", icon: "📡", badge: "POPULAR" },
  { id: "d3gb",    name: "3 GB / 30 Hari",    nominal: 3,  price: 28000,  memberPrice: 27000,  resellerPrice: 26500,  basePrice: 26000,  sku: "DATA3GB",   description: "Kuota 3 GB",         category: "data", icon: "📡" },
  { id: "d5gb",    name: "5 GB / 30 Hari",    nominal: 5,  price: 38000,  memberPrice: 36500,  resellerPrice: 35500,  basePrice: 35000,  sku: "DATA5GB",   description: "Kuota 5 GB",         category: "data", icon: "🌐", badge: "HOT" },
  { id: "d8gb",    name: "8 GB / 30 Hari",    nominal: 8,  price: 55000,  memberPrice: 53000,  resellerPrice: 52000,  basePrice: 51500,  sku: "DATA8GB",   description: "Kuota 8 GB",         category: "data", icon: "🌐" },
  { id: "d10gb",   name: "10 GB / 30 Hari",   nominal: 10, price: 68000,  memberPrice: 65000,  resellerPrice: 64000,  basePrice: 63000,  sku: "DATA10GB",  description: "Kuota 10 GB",        category: "data", icon: "⚡", badge: "TERLARIS" },
  { id: "d15gb",   name: "15 GB / 30 Hari",   nominal: 15, price: 90000,  memberPrice: 87000,  resellerPrice: 86000,  basePrice: 85000,  sku: "DATA15GB",  description: "Kuota 15 GB",        category: "data", icon: "⚡" },
  { id: "d20gb",   name: "20 GB / 30 Hari",   nominal: 20, price: 115000, memberPrice: 110000, resellerPrice: 108500, basePrice: 108000, sku: "DATA20GB",  description: "Kuota 20 GB",        category: "data", icon: "🔥" },
  { id: "d30gb",   name: "30 GB / 30 Hari",   nominal: 30, price: 150000, memberPrice: 145000, resellerPrice: 143000, basePrice: 142000, sku: "DATA30GB",  description: "Kuota 30 GB",        category: "data", icon: "🔥", badge: "HEMAT" },
  { id: "d50gb",   name: "50 GB / 30 Hari",   nominal: 50, price: 210000, memberPrice: 205000, resellerPrice: 203000, basePrice: 202000, sku: "DATA50GB",  description: "Kuota 50 GB",        category: "data", icon: "👑" },

  // ── TOKEN PLN ──────────────────────────────────────────────────
  pln("pln20",     20000,   21500,   21000,   20700,   20500),
  pln("pln50",     50000,   51500,   51000,   50700,   50500,   "POPULAR"),
  pln("pln100",    100000,  102000,  101500,  101200,  101000,  "HOT"),
  pln("pln150",    150000,  152000,  151500,  151200,  151000),
  pln("pln200",    200000,  203000,  202000,  201700,  201500,  "TERLARIS"),
  pln("pln300",    300000,  303500,  302500,  302000,  301500),
  pln("pln500",    500000,  504000,  503000,  502500,  502000,  "HEMAT"),
  pln("pln1000",   1000000, 1005000, 1004000, 1003500, 1003000, "HEMAT"),

  // ── TOP UP GAME ────────────────────────────────────────────────
  { id: "ml86",    name: "ML 86 Diamond",      nominal: 86,   price: 22000,  memberPrice: 21000,  resellerPrice: 20500,  basePrice: 20000,  sku: "ML86D",     description: "Mobile Legends 86 Diamond",  category: "game", icon: "🎮" },
  { id: "ml172",   name: "ML 172 Diamond",     nominal: 172,  price: 43000,  memberPrice: 41500,  resellerPrice: 40500,  basePrice: 40000,  sku: "ML172D",    description: "ML 172 Diamond",            category: "game", icon: "🎮", badge: "POPULAR" },
  { id: "ml257",   name: "ML 257 Diamond",     nominal: 257,  price: 62000,  memberPrice: 60000,  resellerPrice: 59000,  basePrice: 58000,  sku: "ML257D",    description: "ML 257 Diamond",            category: "game", icon: "🎮" },
  { id: "ml514",   name: "ML 514 Diamond",     nominal: 514,  price: 120000, memberPrice: 117000, resellerPrice: 116000, basePrice: 115000, sku: "ML514D",    description: "ML 514 Diamond",            category: "game", icon: "🎮", badge: "HOT" },
  { id: "ff70",    name: "FF 70 Diamond",      nominal: 70,   price: 12000,  memberPrice: 11500,  resellerPrice: 11200,  basePrice: 11000,  sku: "FF70D",     description: "Free Fire 70 Diamond",      category: "game", icon: "🔫" },
  { id: "ff140",   name: "FF 140 Diamond",     nominal: 140,  price: 23000,  memberPrice: 22000,  resellerPrice: 21700,  basePrice: 21500,  sku: "FF140D",    description: "FF 140 Diamond",            category: "game", icon: "🔫", badge: "TERLARIS" },
  { id: "ff355",   name: "FF 355 Diamond",     nominal: 355,  price: 56000,  memberPrice: 54000,  resellerPrice: 53000,  basePrice: 52000,  sku: "FF355D",    description: "FF 355 Diamond",            category: "game", icon: "🔫" },
  { id: "ff720",   name: "FF 720 Diamond",     nominal: 720,  price: 110000, memberPrice: 107000, resellerPrice: 106000, basePrice: 105000, sku: "FF720D",    description: "FF 720 Diamond",            category: "game", icon: "🔫", badge: "HEMAT" },
  { id: "pubg60",  name: "PUBG 60 UC",         nominal: 60,   price: 15000,  memberPrice: 14000,  resellerPrice: 13700,  basePrice: 13500,  sku: "PUBG60UC",  description: "PUBG Mobile 60 UC",         category: "game", icon: "🎯" },
  { id: "pubg325", name: "PUBG 325 UC",        nominal: 325,  price: 74000,  memberPrice: 72000,  resellerPrice: 71000,  basePrice: 70000,  sku: "PUBG325UC", description: "PUBG Mobile 325 UC",        category: "game", icon: "🎯", badge: "POPULAR" },
  { id: "pubg660", name: "PUBG 660 UC",        nominal: 660,  price: 148000, memberPrice: 145000, resellerPrice: 143000, basePrice: 142000, sku: "PUBG660UC", description: "PUBG Mobile 660 UC",        category: "game", icon: "🎯", badge: "HEMAT" },
  { id: "genshin60",name:"Genshin 60 Genesis",nominal:60,    price: 20000,  memberPrice: 19000,  resellerPrice: 18700,  basePrice: 18500,  sku: "GENSH60",   description: "Genshin Impact 60 Genesis", category: "game", icon: "✨" },
  { id: "genshin330",name:"Genshin 330 Genesis",nominal:330, price: 95000,  memberPrice: 92000,  resellerPrice: 91000,  basePrice: 90000,  sku: "GENSH330",  description: "Genshin 330 Genesis",       category: "game", icon: "✨", badge: "HOT" },

  // ── E-WALLET ───────────────────────────────────────────────────
  { id: "gopay20",    name: "GoPay 20.000",      nominal: 20000,  price: 21000,  memberPrice: 20500,  resellerPrice: 20200,  basePrice: 20000,  sku: "GOPAY20K",    description: "Top Up GoPay",       category: "ewallet", icon: "💚" },
  { id: "gopay50",    name: "GoPay 50.000",       nominal: 50000,  price: 51500,  memberPrice: 51000,  resellerPrice: 50700,  basePrice: 50500,  sku: "GOPAY50K",    description: "Top Up GoPay",       category: "ewallet", icon: "💚", badge: "POPULAR" },
  { id: "gopay100",   name: "GoPay 100.000",      nominal: 100000, price: 102000, memberPrice: 101500, resellerPrice: 101000, basePrice: 100800, sku: "GOPAY100K",   description: "Top Up GoPay",       category: "ewallet", icon: "💚" },
  { id: "gopay200",   name: "GoPay 200.000",      nominal: 200000, price: 202000, memberPrice: 201500, resellerPrice: 201000, basePrice: 200700, sku: "GOPAY200K",   description: "Top Up GoPay",       category: "ewallet", icon: "💚", badge: "HEMAT" },
  { id: "ovo20",      name: "OVO 20.000",          nominal: 20000,  price: 21000,  memberPrice: 20500,  resellerPrice: 20200,  basePrice: 20000,  sku: "OVO20K",      description: "Top Up OVO",         category: "ewallet", icon: "💜" },
  { id: "ovo50",      name: "OVO 50.000",          nominal: 50000,  price: 51500,  memberPrice: 51000,  resellerPrice: 50700,  basePrice: 50500,  sku: "OVO50K",      description: "Top Up OVO",         category: "ewallet", icon: "💜", badge: "TERLARIS" },
  { id: "ovo100",     name: "OVO 100.000",         nominal: 100000, price: 102000, memberPrice: 101500, resellerPrice: 101000, basePrice: 100800, sku: "OVO100K",     description: "Top Up OVO",         category: "ewallet", icon: "💜" },
  { id: "dana20",     name: "DANA 20.000",         nominal: 20000,  price: 21000,  memberPrice: 20500,  resellerPrice: 20200,  basePrice: 20000,  sku: "DANA20K",     description: "Top Up DANA",        category: "ewallet", icon: "💙" },
  { id: "dana50",     name: "DANA 50.000",         nominal: 50000,  price: 51500,  memberPrice: 51000,  resellerPrice: 50700,  basePrice: 50500,  sku: "DANA50K",     description: "Top Up DANA",        category: "ewallet", icon: "💙", badge: "POPULAR" },
  { id: "dana100",    name: "DANA 100.000",        nominal: 100000, price: 102000, memberPrice: 101500, resellerPrice: 101000, basePrice: 100800, sku: "DANA100K",    description: "Top Up DANA",        category: "ewallet", icon: "💙" },
  { id: "spay20",     name: "ShopeePay 20.000",    nominal: 20000,  price: 21000,  memberPrice: 20500,  resellerPrice: 20200,  basePrice: 20000,  sku: "SPAY20K",     description: "Top Up ShopeePay",   category: "ewallet", icon: "🧡" },
  { id: "spay50",     name: "ShopeePay 50.000",    nominal: 50000,  price: 51500,  memberPrice: 51000,  resellerPrice: 50700,  basePrice: 50500,  sku: "SPAY50K",     description: "Top Up ShopeePay",   category: "ewallet", icon: "🧡", badge: "HOT" },
  { id: "spay100",    name: "ShopeePay 100.000",   nominal: 100000, price: 102000, memberPrice: 101500, resellerPrice: 101000, basePrice: 100800, sku: "SPAY100K",    description: "Top Up ShopeePay",   category: "ewallet", icon: "🧡" },
  { id: "linkaja20",  name: "LinkAja 20.000",      nominal: 20000,  price: 21000,  memberPrice: 20500,  resellerPrice: 20200,  basePrice: 20000,  sku: "LINKAJA20K",  description: "Top Up LinkAja",     category: "ewallet", icon: "❤️" },
  { id: "linkaja50",  name: "LinkAja 50.000",      nominal: 50000,  price: 51500,  memberPrice: 51000,  resellerPrice: 50700,  basePrice: 50500,  sku: "LINKAJA50K",  description: "Top Up LinkAja",     category: "ewallet", icon: "❤️" },

  // ── PASCABAYAR ─────────────────────────────────────────────────
  { id: "pln-pasca",    name: "PLN Pascabayar",       nominal: 0, price: 3000,  memberPrice: 2500,  resellerPrice: 2200,  basePrice: 2000,  sku: "PLNPASCA",    description: "Bayar tagihan listrik pascabayar",     category: "pascabayar", icon: "⚡" },
  { id: "bpjs-kes",     name: "BPJS Kesehatan",        nominal: 0, price: 2500,  memberPrice: 2000,  resellerPrice: 1800,  basePrice: 1500,  sku: "BPJSKES",     description: "Bayar iuran BPJS Kesehatan",           category: "pascabayar", icon: "🏥" },
  { id: "bpjs-tk",      name: "BPJS Ketenagakerjaan",  nominal: 0, price: 2500,  memberPrice: 2000,  resellerPrice: 1800,  basePrice: 1500,  sku: "BPJSTK",      description: "Bayar iuran BPJS TK",                 category: "pascabayar", icon: "🛡️" },
  { id: "telkom",       name: "Telkom / IndiHome",      nominal: 0, price: 3000,  memberPrice: 2500,  resellerPrice: 2200,  basePrice: 2000,  sku: "TELKOM",       description: "Bayar tagihan Telkom",                category: "pascabayar", icon: "📞" },
  { id: "pdam",         name: "PDAM Air",               nominal: 0, price: 3000,  memberPrice: 2500,  resellerPrice: 2200,  basePrice: 2000,  sku: "PDAM",         description: "Bayar tagihan PDAM",                  category: "pascabayar", icon: "💧" },
  { id: "multifinance", name: "Cicilan Multifinance",   nominal: 0, price: 3000,  memberPrice: 2500,  resellerPrice: 2200,  basePrice: 2000,  sku: "MFINANCE",     description: "Bayar cicilan kendaraan",             category: "pascabayar", icon: "🚗" },
  { id: "gas-pgn",      name: "Gas PGN",                nominal: 0, price: 3500,  memberPrice: 3000,  resellerPrice: 2700,  basePrice: 2500,  sku: "GASPGN",       description: "Bayar tagihan gas PGN",               category: "pascabayar", icon: "🔥" },

  // ── TV KABEL ───────────────────────────────────────────────────
  { id: "usetv1",     name: "UseeTV 1 Bulan",       nominal: 1, price: 145000, memberPrice: 142000, resellerPrice: 141000, basePrice: 140000, sku: "USEETV1",    description: "Paket UseeTV 1 bulan",    category: "tv", icon: "📺" },
  { id: "usetv3",     name: "UseeTV 3 Bulan",       nominal: 3, price: 415000, memberPrice: 410000, resellerPrice: 408000, basePrice: 407000, sku: "USEETV3",    description: "Paket UseeTV 3 bulan",    category: "tv", icon: "📺", badge: "HEMAT" },
  { id: "firstmedia", name: "First Media 1 Bulan",  nominal: 1, price: 275000, memberPrice: 272000, resellerPrice: 271000, basePrice: 270000, sku: "FMEDIA1",    description: "Paket First Media",       category: "tv", icon: "🎬" },
  { id: "transvision",name: "Transvision 1 Bulan",  nominal: 1, price: 165000, memberPrice: 162000, resellerPrice: 161000, basePrice: 160000, sku: "TRANSVISION",description: "Paket Transvision",       category: "tv", icon: "🎬" },
  { id: "mnctv",      name: "MNC Vision 1 Bulan",   nominal: 1, price: 155000, memberPrice: 152000, resellerPrice: 151000, basePrice: 150000, sku: "MNCVISION",  description: "Paket MNC Vision",        category: "tv", icon: "📡" },
  { id: "biznet",     name: "Biznet Home 1 Bulan",  nominal: 1, price: 210000, memberPrice: 207000, resellerPrice: 206000, basePrice: 205000, sku: "BIZNET1",    description: "Paket Biznet Home",       category: "tv", icon: "🌐" },

  // ── VOUCHER INTERNET ───────────────────────────────────────────
  { id: "wifi5",   name: "Voucher WiFi 5K",    nominal: 5000,   price: 6000,   memberPrice: 5500,   resellerPrice: 5300,   basePrice: 5000,   sku: "WIFI5K",   description: "Voucher Internet 5K",    category: "voucher", icon: "📶" },
  { id: "wifi10",  name: "Voucher WiFi 10K",   nominal: 10000,  price: 11500,  memberPrice: 11000,  resellerPrice: 10700,  basePrice: 10500,  sku: "WIFI10K",  description: "Voucher Internet 10K",   category: "voucher", icon: "🌐" },
  { id: "wifi20",  name: "Voucher WiFi 20K",   nominal: 20000,  price: 22000,  memberPrice: 21500,  resellerPrice: 21000,  basePrice: 20500,  sku: "WIFI20K",  description: "Voucher Internet 20K",   category: "voucher", icon: "🌐", badge: "POPULAR" },
  { id: "wifi50",  name: "Voucher WiFi 50K",   nominal: 50000,  price: 53000,  memberPrice: 52000,  resellerPrice: 51500,  basePrice: 51000,  sku: "WIFI50K",  description: "Voucher Internet 50K",   category: "voucher", icon: "⚡", badge: "TERLARIS" },
  { id: "wifi100", name: "Voucher WiFi 100K",  nominal: 100000, price: 105000, memberPrice: 103000, resellerPrice: 102000, basePrice: 101500, sku: "WIFI100K", description: "Voucher Internet 100K",  category: "voucher", icon: "🚀" },

  // ── PULSA INTERNASIONAL ─────────────────────────────────────────
  /* Malaysia */
  intlProduct("my-maxis5",   "Malaysia Maxis 5 RM",     5,   19500,  18800,  18500,  18000,  "MYMAXIS5RM",   "Pulsa Maxis Malaysia 5 RM",      "🇲🇾", "HOT"),
  intlProduct("my-maxis10",  "Malaysia Maxis 10 RM",    10,  36500,  35500,  35000,  34500,  "MYMAXIS10RM",  "Pulsa Maxis Malaysia 10 RM",     "🇲🇾", "POPULAR"),
  intlProduct("my-maxis20",  "Malaysia Maxis 20 RM",    20,  72000,  70500,  70000,  69500,  "MYMAXIS20RM",  "Pulsa Maxis Malaysia 20 RM",     "🇲🇾"),
  intlProduct("my-celcom10", "Malaysia Celcom 10 RM",   10,  36500,  35500,  35000,  34500,  "MYCELCOM10RM", "Pulsa Celcom Malaysia 10 RM",    "🇲🇾"),
  intlProduct("my-celcom30", "Malaysia Celcom 30 RM",   30,  107000, 105000, 104000, 103000, "MYCELCOM30RM", "Pulsa Celcom Malaysia 30 RM",    "🇲🇾", "HEMAT"),
  intlProduct("my-digi10",   "Malaysia Digi 10 RM",     10,  36500,  35500,  35000,  34500,  "MYDIGI10RM",   "Pulsa Digi Malaysia 10 RM",      "🇲🇾", "MURAH"),
  intlProduct("my-digi30",   "Malaysia Digi 30 RM",     30,  107000, 105000, 104000, 103000, "MYDIGI30RM",   "Pulsa Digi Malaysia 30 RM",      "🇲🇾"),
  /* Singapore */
  intlProduct("sg-singtel10","Singapore Singtel S$10",  10,  120000, 117000, 116000, 115000, "SGSINGTEL10",  "Pulsa Singtel Singapore S$10",   "🇸🇬", "HOT"),
  intlProduct("sg-starhub10","Singapore StarHub S$10",  10,  120000, 117000, 116000, 115000, "SGSTARHUB10",  "Pulsa StarHub Singapore S$10",   "🇸🇬"),
  intlProduct("sg-m1-10",    "Singapore M1 S$10",       10,  120000, 117000, 116000, 115000, "SGM110",       "Pulsa M1 Singapore S$10",        "🇸🇬", "MURAH"),
  intlProduct("sg-singtel20","Singapore Singtel S$20",  20,  238000, 234000, 232000, 230000, "SGSINGTEL20",  "Pulsa Singtel Singapore S$20",   "🇸🇬", "POPULAR"),
  /* Saudi Arabia */
  intlProduct("sa-stc10",    "Saudi STC SAR 10",        10,  43000,  42000,  41500,  41000,  "SASTC10",      "Pulsa STC Saudi Arabia SAR 10",  "🇸🇦", "HOT"),
  intlProduct("sa-stc20",    "Saudi STC SAR 20",        20,  85000,  83000,  82500,  82000,  "SASTC20",      "Pulsa STC Saudi SAR 20",         "🇸🇦", "POPULAR"),
  intlProduct("sa-stc50",    "Saudi STC SAR 50",        50,  210000, 207000, 206000, 205000, "SASTC50",      "Pulsa STC Saudi SAR 50",         "🇸🇦"),
  intlProduct("sa-mobily10", "Saudi Mobily SAR 10",     10,  43000,  42000,  41500,  41000,  "SAMOBILY10",   "Pulsa Mobily Saudi SAR 10",      "🇸🇦"),
  intlProduct("sa-zain10",   "Saudi Zain SAR 10",       10,  43000,  42000,  41500,  41000,  "SAZAIN10",     "Pulsa Zain Saudi SAR 10",        "🇸🇦"),
  /* Philippines */
  intlProduct("ph-globe50",  "Philippines Globe PHP50", 50,  14500,  14000,  13700,  13500,  "PHGLOBE50",    "Pulsa Globe Philippines PHP 50", "🇵🇭"),
  intlProduct("ph-globe100", "Philippines Globe PHP100",100, 28000,  27000,  26700,  26500,  "PHGLOBE100",   "Pulsa Globe Philippines PHP100", "🇵🇭", "POPULAR"),
  intlProduct("ph-smart100", "Philippines Smart PHP100",100, 28000,  27000,  26700,  26500,  "PHSMART100",   "Pulsa Smart Philippines PHP100", "🇵🇭"),
  /* India */
  intlProduct("in-jio100",   "India Jio INR 100",       100, 19000,  18500,  18200,  18000,  "INJIO100",     "Pulsa Jio India INR 100",        "🇮🇳"),
  intlProduct("in-airtel100","India Airtel INR 100",    100, 19000,  18500,  18200,  18000,  "INAIRTEL100",  "Pulsa Airtel India INR 100",     "🇮🇳", "HOT"),
  /* Bangladesh */
  intlProduct("bd-gp100",    "Bangladesh Grameenphone 100 BDT",100,13500,13000,12700,12500, "BDGP100",      "Pulsa Grameenphone BDT 100",     "🇧🇩"),
  /* Thailand */
  intlProduct("th-ais100",   "Thailand AIS THB 100",    100, 45000,  44000,  43500,  43000,  "THAIS100",     "Pulsa AIS Thailand THB 100",     "🇹🇭"),
  /* Vietnam */
  intlProduct("vn-viettel50","Vietnam Viettel 50K VND", 50,  31000,  30500,  30200,  30000,  "VNVT50K",      "Pulsa Viettel Vietnam 50K VND",  "🇻🇳"),
  /* USA */
  intlProduct("us-tmobile10","USA T-Mobile $10",        10,  165000, 162000, 161000, 160000, "USTMOBILE10",  "Pulsa T-Mobile USA $10",         "🇺🇸", "HOT"),
  /* UAE */
  intlProduct("ae-etisalat20","UAE Etisalat AED 20",    20,  87000,  85500,  85000,  84500,  "AEETISALAT20", "Pulsa Etisalat UAE AED 20",      "🇦🇪"),
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
    const retailPrice   = c.retail   ?? p.price;
    const memberPrice   = c.member   ?? p.memberPrice;
    const resellerPrice = c.reseller ?? p.resellerPrice;
    const effectivePrice =
      memberType === "admin"    ? resellerPrice :
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
    Telkomsel:   "TSEL",
    Indosat:     "ISAT",
    "XL Axiata": "XL",
    Axis:        "AXIS",
    "Tri (3)":   "THREE",
    Smartfren:   "SF",
    "By.U":      "BYU",
  };
  const p = prefix[operatorName] ?? "XL";
  const nominal = baseSku.replace(/[^0-9]/g, "");
  return `${p}${nominal}`;
}

export const BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  HOT:      { bg: "linear-gradient(135deg,#FF6B35 0%,#FF4500 100%)", text: "#fff" },
  POPULAR:  { bg: "linear-gradient(135deg,#FBBF24 0%,#F59E0B 100%)", text: "#1a1a1a" },
  TERLARIS: { bg: "linear-gradient(135deg,#34D399 0%,#10B981 100%)", text: "#fff" },
  MURAH:    { bg: "linear-gradient(135deg,#60A5FA 0%,#3B82F6 100%)", text: "#fff" },
  HEMAT:    { bg: "linear-gradient(135deg,#A78BFA 0%,#8B5CF6 100%)", text: "#fff" },
  BARU:     { bg: "linear-gradient(135deg,#F472B6 0%,#EC4899 100%)", text: "#fff" },
};

export const CATEGORY_META: Record<ProductCategory, { label: string; icon: string; color: string }> = {
  pulsa:      { label: "Pulsa",           icon: "📱", color: "#3B82F6" },
  data:       { label: "Paket Data",      icon: "📶", color: "#06B6D4" },
  pln:        { label: "Token PLN",       icon: "⚡", color: "#FBBF24" },
  game:       { label: "Top Up Game",     icon: "🎮", color: "#8B5CF6" },
  ewallet:    { label: "E-Wallet",        icon: "💳", color: "#10B981" },
  pascabayar: { label: "Pascabayar",      icon: "🧾", color: "#F97316" },
  tv:         { label: "TV Kabel",        icon: "📺", color: "#EC4899" },
  voucher:    { label: "Voucher Net",     icon: "🌐", color: "#14B8A6" },
  intl:       { label: "Pulsa Intl",      icon: "🌍", color: "#F59E0B" },
};
