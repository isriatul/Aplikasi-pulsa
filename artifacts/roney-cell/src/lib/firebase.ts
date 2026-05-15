const FIREBASE_URL = "https://roneycell-default-rtdb.firebaseio.com/Data.json";

export async function fetchBalance(): Promise<number> {
  const res = await fetch(FIREBASE_URL);
  if (!res.ok) throw new Error("Gagal membaca saldo Firebase");
  const data = await res.json();
  return Number(data?.Saldo ?? 0);
}

export async function deductBalance(amount: number): Promise<void> {
  const current = await fetchBalance();
  const newBalance = current - amount;
  const res = await fetch(FIREBASE_URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Saldo: newBalance }),
  });
  if (!res.ok) throw new Error("Gagal menolak saldo Firebase");
}

export function subscribeBalance(
  onValue: (saldo: number) => void,
  onError: (err: Error) => void
): () => void {
  const url = FIREBASE_URL.replace(".json", ".json") + "?stream";
  const streamUrl = "https://roneycell-default-rtdb.firebaseio.com/Data/Saldo.json?stream";

  let es: EventSource | null = null;
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  function startPolling() {
    fetchBalance().then(onValue).catch(onError);
    pollInterval = setInterval(() => {
      if (closed) return;
      fetchBalance().then(onValue).catch(onError);
    }, 3000);
  }

  try {
    es = new EventSource(streamUrl);
    es.addEventListener("put", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        const val = payload?.data;
        if (val !== undefined && val !== null) {
          onValue(Number(val));
        }
      } catch {}
    });
    es.addEventListener("patch", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload?.data?.Saldo !== undefined) {
          onValue(Number(payload.data.Saldo));
        }
      } catch {}
    });
    es.onerror = () => {
      es?.close();
      if (!closed) startPolling();
    };
  } catch {
    startPolling();
  }

  return () => {
    closed = true;
    es?.close();
    if (pollInterval) clearInterval(pollInterval);
  };
}
