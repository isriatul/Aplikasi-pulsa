import { Router, type IRouter } from "express";
import { createHash } from "crypto";

const router: IRouter = Router();
const DG_BASE = "https://api.digiflazz.com/v1";

function getCredentials(): { username: string; apiKey: string } {
  const username = process.env["DIGIFLAZZ_USERNAME"];
  const apiKey = process.env["DIGIFLAZZ_KEY"];
  if (!username || !apiKey) {
    throw new Error("DIGIFLAZZ_USERNAME dan DIGIFLAZZ_KEY belum dikonfigurasi di Secrets.");
  }
  return { username, apiKey };
}

function md5(str: string): string {
  return createHash("md5").update(str).digest("hex");
}

async function dgPost(path: string, body: object): Promise<unknown> {
  const res = await fetch(`${DG_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

/* GET /api/digiflazz/ip — Public IP server untuk Whitelist Digiflazz */
router.get("/digiflazz/ip", async (req, res) => {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const data = (await r.json()) as { ip: string };
    res.json({ ip: data.ip });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch public IP");
    res.status(500).json({ error: "Gagal mengambil IP server" });
  }
});

/* GET /api/digiflazz/balance — Cek saldo deposit Digiflazz */
router.get("/digiflazz/balance", async (req, res) => {
  try {
    const { username, apiKey } = getCredentials();
    const sign = md5(username + apiKey + "depo");
    const data = await dgPost("/cek-saldo", { cmd: "deposit", username, sign });
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to check Digiflazz balance");
    const msg = err instanceof Error ? err.message : "Gagal cek saldo";
    res.status(500).json({ error: msg });
  }
});

/* GET /api/digiflazz/pricelist?type=prepaid|pasca — Daftar produk */
router.get("/digiflazz/pricelist", async (req, res) => {
  try {
    const { username, apiKey } = getCredentials();
    const cmd = req.query["type"] === "pasca" ? "pasca" : "prepaid";
    const sign = md5(username + apiKey + "pricelist");
    const data = await dgPost("/price-list", { cmd, username, sign });
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch Digiflazz pricelist");
    const msg = err instanceof Error ? err.message : "Gagal ambil pricelist";
    res.status(500).json({ error: msg });
  }
});

/* POST /api/digiflazz/topup — Kirim transaksi pulsa/PLN */
router.post("/digiflazz/topup", async (req, res) => {
  try {
    const { username, apiKey } = getCredentials();
    const { buyer_sku_code, customer_no, ref_id } = req.body as {
      buyer_sku_code?: string;
      customer_no?: string;
      ref_id?: string;
    };
    if (!buyer_sku_code || !customer_no || !ref_id) {
      res.status(400).json({ error: "buyer_sku_code, customer_no, dan ref_id wajib diisi" });
      return;
    }
    const sign = md5(username + apiKey + ref_id);
    const data = await dgPost("/transaction", {
      username,
      buyer_sku_code,
      customer_no,
      ref_id,
      sign,
    });
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Digiflazz topup failed");
    const msg = err instanceof Error ? err.message : "Transaksi gagal";
    res.status(500).json({ error: msg });
  }
});

/* POST /api/digiflazz/test — Simulasi transaksi (mode testing Digiflazz, tidak memotong saldo nyata) */
router.post("/digiflazz/test", async (req, res) => {
  try {
    const { username, apiKey } = getCredentials();
    const { buyer_sku_code, customer_no } = req.body as {
      buyer_sku_code?: string;
      customer_no?: string;
    };
    if (!buyer_sku_code || !customer_no) {
      res.status(400).json({ error: "buyer_sku_code dan customer_no wajib diisi" });
      return;
    }
    const ref_id = `TEST-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const sign = md5(username + apiKey + ref_id);
    const payload = {
      username,
      buyer_sku_code,
      customer_no,
      ref_id,
      sign,
      testing: true,
    };
    req.log.info({ buyer_sku_code, customer_no, ref_id }, "Digiflazz test transaction");
    const data = await dgPost("/transaction", payload);
    res.json({ ref_id, payload_sent: { buyer_sku_code, customer_no, ref_id, testing: true }, result: data });
  } catch (err) {
    req.log.error({ err }, "Digiflazz test transaction failed");
    const msg = err instanceof Error ? err.message : "Test transaksi gagal";
    res.status(500).json({ error: msg });
  }
});

export default router;
