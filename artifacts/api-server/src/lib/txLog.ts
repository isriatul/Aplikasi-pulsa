/* Transaction audit log — in-memory ring buffer (max 1000 entri) */

export interface TxLogEntry {
  id: string;
  timestamp: string;
  memberId: string;
  phone: string;
  memberPhone: string;
  role: string;
  refId: string;
  productCode: string;
  customerNo: string;
  status: "pending" | "success" | "failed" | "double_attempt";
  message?: string;
  ip: string;
}

const MAX_ENTRIES = 1000;
const log: TxLogEntry[] = [];
let counter = 0;

export function appendTxLog(entry: Omit<TxLogEntry, "id" | "timestamp">): TxLogEntry {
  const full: TxLogEntry = {
    id: `TXL${(++counter).toString().padStart(6, "0")}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  log.push(full);
  if (log.length > MAX_ENTRIES) log.shift();
  return full;
}

export function getRecentLogs(limit = 50): TxLogEntry[] {
  return log.slice(-limit).reverse();
}

export function getLogByRefId(refId: string): TxLogEntry | undefined {
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i]!.refId === refId) return log[i];
  }
  return undefined;
}
