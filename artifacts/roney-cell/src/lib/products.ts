export interface Product {
  id: string;
  name: string;
  nominal: number;
  price: number;
  sku: string;
  description: string;
}

export const PULSA_PRODUCTS: Product[] = [
  {
    id: "p5",
    name: "Pulsa 5.000",
    nominal: 5000,
    price: 6000,
    sku: "XL5",
    description: "Pulsa Rp 5.000",
  },
  {
    id: "p10",
    name: "Pulsa 10.000",
    nominal: 10000,
    price: 11500,
    sku: "XL10",
    description: "Pulsa Rp 10.000",
  },
  {
    id: "p20",
    name: "Pulsa 20.000",
    nominal: 20000,
    price: 21500,
    sku: "XL20",
    description: "Pulsa Rp 20.000",
  },
  {
    id: "p50",
    name: "Pulsa 50.000",
    nominal: 50000,
    price: 52000,
    sku: "XL50",
    description: "Pulsa Rp 50.000",
  },
];

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function getOperatorSku(
  operatorName: string | undefined,
  baseSku: string
): string {
  if (!operatorName) return baseSku;
  const prefix: Record<string, string> = {
    Telkomsel: "TSEL",
    "Indosat": "ISAT",
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
