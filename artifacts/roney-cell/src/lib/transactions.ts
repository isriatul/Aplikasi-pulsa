export interface Transaction {
  id: string;
  date: string;
  phone: string;
  product: string;
  category: string;
  sellPrice: number;
  basePrice: number;
  profit: number;
  status: "success" | "failed";
}

const TXN_KEY = "roneycell_transactions";

export function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(TXN_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveTransaction(txn: Transaction): void {
  const list = loadTransactions();
  list.unshift(txn);
  if (list.length > 500) list.splice(500);
  localStorage.setItem(TXN_KEY, JSON.stringify(list));
}

export function getTodayTransactions(): Transaction[] {
  const today = new Date().toISOString().slice(0, 10);
  return loadTransactions().filter((t) => t.date.startsWith(today));
}

export function getTransactionsByDate(date: string): Transaction[] {
  return loadTransactions().filter((t) => t.date.startsWith(date));
}

export function getDailyReport(date: string): {
  totalSell: number;
  totalBase: number;
  totalProfit: number;
  count: number;
  successCount: number;
  transactions: Transaction[];
} {
  const txns = getTransactionsByDate(date);
  const successful = txns.filter((t) => t.status === "success");
  return {
    totalSell: successful.reduce((s, t) => s + t.sellPrice, 0),
    totalBase: successful.reduce((s, t) => s + t.basePrice, 0),
    totalProfit: successful.reduce((s, t) => s + t.profit, 0),
    count: txns.length,
    successCount: successful.length,
    transactions: txns,
  };
}

export function getWeeklyProfit(): { date: string; profit: number }[] {
  const result: { date: string; profit: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const report = getDailyReport(dateStr);
    result.push({ date: dateStr, profit: report.totalProfit });
  }
  return result;
}
