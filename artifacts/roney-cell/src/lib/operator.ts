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
