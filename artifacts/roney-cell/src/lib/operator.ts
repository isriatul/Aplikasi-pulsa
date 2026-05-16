export interface Operator {
  name: string;
  color: string;
  bgColor: string;
  prefixes: string[];
}

const OPERATORS: Operator[] = [
  {
    name: "Telkomsel",
    color: "#EF4444",
    bgColor: "rgba(239,68,68,0.15)",
    prefixes: [
      "0811","0812","0813","0821","0822","0823","0851","0852","0853",
      "0811","0812","0813","0814","0815","0816",
    ],
  },
  {
    name: "Indosat",
    color: "#FBBF24",
    bgColor: "rgba(251,191,36,0.15)",
    prefixes: [
      "0814","0815","0816","0855","0856","0857","0858",
    ],
  },
  {
    name: "XL Axiata",
    color: "#3B82F6",
    bgColor: "rgba(59,130,246,0.15)",
    prefixes: [
      "0817","0818","0819","0859","0877","0878",
    ],
  },
  {
    name: "Axis",
    color: "#8B5CF6",
    bgColor: "rgba(139,92,246,0.15)",
    prefixes: ["0831","0832","0833","0838"],
  },
  {
    name: "Tri (3)",
    color: "#EC4899",
    bgColor: "rgba(236,72,153,0.15)",
    prefixes: ["0895","0896","0897","0898","0899"],
  },
  {
    name: "Smartfren",
    color: "#10B981",
    bgColor: "rgba(16,185,129,0.15)",
    prefixes: [
      "0881","0882","0883","0884","0885","0886","0887","0888","0889",
    ],
  },
  {
    name: "By.U",
    color: "#06B6D4",
    bgColor: "rgba(6,182,212,0.15)",
    prefixes: ["0851","0852","0853"],
  },
];

export function detectOperator(phone: string): Operator | null {
  const cleaned = phone.replace(/\D/g, "");
  const normalized = cleaned.startsWith("62")
    ? "0" + cleaned.slice(2)
    : cleaned;

  if (normalized.length < 4) return null;

  const prefix4 = normalized.slice(0, 4);
  for (const op of OPERATORS) {
    if (op.prefixes.includes(prefix4)) return op;
  }

  const prefix5 = normalized.slice(0, 5);
  for (const op of OPERATORS) {
    for (const p of op.prefixes) {
      if (prefix5.startsWith(p.slice(0, 4))) return op;
    }
  }

  return null;
}

export function formatPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export interface CountryInfo {
  code: string;        /* ISO-2 */
  dialCode: string;    /* e.g. "+62" */
  name: string;
  flag: string;
  color: string;
  bgColor: string;
  minLen: number;
  maxLen: number;
}

export const COUNTRY_MAP: Record<string, CountryInfo> = {
  "+62":  { code:"ID", dialCode:"+62",  name:"Indonesia",    flag:"🇮🇩", color:"#EF4444", bgColor:"rgba(239,68,68,0.15)",    minLen:9,  maxLen:13 },
  "+60":  { code:"MY", dialCode:"+60",  name:"Malaysia",     flag:"🇲🇾", color:"#3B82F6", bgColor:"rgba(59,130,246,0.15)",   minLen:7,  maxLen:11 },
  "+65":  { code:"SG", dialCode:"+65",  name:"Singapore",    flag:"🇸🇬", color:"#EF4444", bgColor:"rgba(239,68,68,0.12)",    minLen:8,  maxLen:10 },
  "+66":  { code:"TH", dialCode:"+66",  name:"Thailand",     flag:"🇹🇭", color:"#3B82F6", bgColor:"rgba(59,130,246,0.12)",   minLen:8,  maxLen:10 },
  "+63":  { code:"PH", dialCode:"+63",  name:"Philippines",  flag:"🇵🇭", color:"#FBBF24", bgColor:"rgba(251,191,36,0.12)",   minLen:9,  maxLen:11 },
  "+84":  { code:"VN", dialCode:"+84",  name:"Vietnam",      flag:"🇻🇳", color:"#EF4444", bgColor:"rgba(239,68,68,0.12)",    minLen:8,  maxLen:10 },
  "+95":  { code:"MM", dialCode:"+95",  name:"Myanmar",      flag:"🇲🇲", color:"#FBBF24", bgColor:"rgba(251,191,36,0.12)",   minLen:8,  maxLen:10 },
  "+880": { code:"BD", dialCode:"+880", name:"Bangladesh",   flag:"🇧🇩", color:"#10B981", bgColor:"rgba(16,185,129,0.12)",   minLen:9,  maxLen:11 },
  "+966": { code:"SA", dialCode:"+966", name:"Saudi Arabia", flag:"🇸🇦", color:"#10B981", bgColor:"rgba(16,185,129,0.12)",   minLen:8,  maxLen:10 },
  "+971": { code:"AE", dialCode:"+971", name:"UAE",          flag:"🇦🇪", color:"#FBBF24", bgColor:"rgba(251,191,36,0.12)",   minLen:7,  maxLen:9  },
  "+91":  { code:"IN", dialCode:"+91",  name:"India",        flag:"🇮🇳", color:"#F97316", bgColor:"rgba(249,115,22,0.12)",   minLen:9,  maxLen:11 },
  "+92":  { code:"PK", dialCode:"+92",  name:"Pakistan",     flag:"🇵🇰", color:"#10B981", bgColor:"rgba(16,185,129,0.12)",   minLen:9,  maxLen:11 },
  "+1":   { code:"US", dialCode:"+1",   name:"USA/Canada",   flag:"🇺🇸", color:"#3B82F6", bgColor:"rgba(59,130,246,0.12)",   minLen:10, maxLen:11 },
  "+44":  { code:"GB", dialCode:"+44",  name:"UK",           flag:"🇬🇧", color:"#EF4444", bgColor:"rgba(239,68,68,0.12)",    minLen:9,  maxLen:11 },
  "+61":  { code:"AU", dialCode:"+61",  name:"Australia",    flag:"🇦🇺", color:"#FBBF24", bgColor:"rgba(251,191,36,0.12)",   minLen:8,  maxLen:10 },
  "+81":  { code:"JP", dialCode:"+81",  name:"Japan",        flag:"🇯🇵", color:"#EF4444", bgColor:"rgba(239,68,68,0.12)",    minLen:9,  maxLen:11 },
  "+82":  { code:"KR", dialCode:"+82",  name:"Korea",        flag:"🇰🇷", color:"#3B82F6", bgColor:"rgba(59,130,246,0.12)",   minLen:9,  maxLen:11 },
  "+86":  { code:"CN", dialCode:"+86",  name:"China",        flag:"🇨🇳", color:"#EF4444", bgColor:"rgba(239,68,68,0.12)",    minLen:10, maxLen:12 },
  "+49":  { code:"DE", dialCode:"+49",  name:"Germany",      flag:"🇩🇪", color:"#FBBF24", bgColor:"rgba(251,191,36,0.12)",   minLen:9,  maxLen:12 },
};

export function getCountryInfo(dialCode: string): CountryInfo {
  return COUNTRY_MAP[dialCode] ?? COUNTRY_MAP["+62"];
}

/* Map ISO-2 code → product ID prefix */
export const COUNTRY_PRODUCT_PREFIX: Record<string, string> = {
  MY: "my-", SG: "sg-", SA: "sa-", PH: "ph-",
  IN: "in-", BD: "bd-", TH: "th-", VN: "vn-",
  US: "us-", AE: "ae-",
};

export function getProductCountryCode(productId: string): string {
  for (const [iso, prefix] of Object.entries(COUNTRY_PRODUCT_PREFIX)) {
    if (productId.startsWith(prefix)) return iso;
  }
  return "ID";
}
