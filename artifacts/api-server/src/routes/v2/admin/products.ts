/**
 * GET    /api/v2/admin/products        — list produk
 * POST   /api/v2/admin/products        — tambah produk
 * PUT    /api/v2/admin/products/:id    — update produk/harga
 * DELETE /api/v2/admin/products/:id    — nonaktifkan produk
 * POST   /api/v2/admin/products/sync   — sync pricelist dari Digiflazz
 * GET    /api/v2/admin/providers       — list provider
 * POST   /api/v2/admin/providers       — tambah provider
 * PUT    /api/v2/admin/providers/:id   — update provider
 */
import { Router, type IRouter, type Request } from "express";
import { createHash } from "crypto";
import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { productsTable, providersTable, settingsTable } from "@workspace/db";
import { requireRole } from "../../../middlewares/requireRole.js";
import { safeZodErrors } from "../../../lib/sanitize.js";
import { audit } from "../../../lib/v2/auditService.js";

/* ─── Digiflazz sync helpers ─── */
const DG_BASE = "https://api.digiflazz.com/v1";
const DG_TIMEOUT_MS = 30_000;

function md5(str: string): string {
  return createHash("md5").update(str).digest("hex");
}

type DgProduct = {
  buyer_sku_code: string;
  product_name: string;
  category: string;
  brand: string;
  type: string;
  price: number;
  buyer_product_status: boolean;
  seller_product_status: boolean;
  unlimited_stock: boolean;
  stock: number;
  desc?: string;
};

function mapCategory(raw: string): "pulsa" | "data" | "pln" | "ewallet" | "pascabayar" | "game" | "tv" | "voucher" | "international" | "other" {
  const c = raw.toLowerCase();
  if (c.includes("pulsa")) return "pulsa";
  if (c.includes("data") || c.includes("paket")) return "data";
  if (c.includes("pln") || c.includes("listrik") || c.includes("token")) return "pln";
  if (c.includes("e-wallet") || c.includes("ewallet") || c.includes("e-money") || c.includes("dompet")) return "ewallet";
  if (c.includes("pasca") || c.includes("tagihan") || c.includes("postpaid")) return "pascabayar";
  if (c.includes("game") || c.includes("gaming") || c.includes("voucher game")) return "game";
  if (c.includes("tv") || c.includes("streaming") || c.includes("internet")) return "tv";
  if (c.includes("voucher")) return "voucher";
  if (c.includes("internasional") || c.includes("international")) return "international";
  return "other";
}

function markupPrice(base: number, pct: number, minMarkup: number): number {
  const markup = Math.max(Math.ceil(base * pct), minMarkup);
  return Math.ceil((base + markup) / 100) * 100;
}

async function fetchDigiflazzPricelist(cmd: "prepaid" | "pasca"): Promise<DgProduct[]> {
  const username = process.env["DIGIFLAZZ_USERNAME"] ?? "";
  const apiKey = process.env["DIGIFLAZZ_KEY"] ?? "";
  if (!username || !apiKey) throw new Error("Kredensial Digiflazz belum dikonfigurasi");
  const sign = md5(username + apiKey + "pricelist");
  const res = await fetch(`${DG_BASE}/price-list`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cmd, username, sign }),
    signal: AbortSignal.timeout(DG_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Digiflazz HTTP error: ${res.status}`);
  const json = await res.json() as { data?: DgProduct[] | { rc?: string; message?: string } };
  if (!Array.isArray(json.data)) {
    const msg = (json.data as { message?: string })?.message ?? "Response tidak valid dari Digiflazz";
    throw new Error(msg);
  }
  return json.data;
}

/* ─── Markup settings helpers ─── */
interface MarkupSettings {
  member: number;
  reseller: number;
  admin: number;
  minMember: number;
  minReseller: number;
  minAdmin: number;
}

const DEFAULT_MARKUP: MarkupSettings = {
  member: 5,
  reseller: 3,
  admin: 1,
  minMember: 500,
  minReseller: 300,
  minAdmin: 200,
};

async function getMarkupSettings(): Promise<MarkupSettings> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "markup")).limit(1);
  if (!row) return DEFAULT_MARKUP;
  try {
    return { ...DEFAULT_MARKUP, ...JSON.parse(row.value) as Partial<MarkupSettings> };
  } catch {
    return DEFAULT_MARKUP;
  }
}

const MarkupSettingsSchema = z.object({
  member: z.number().min(0).max(50),
  reseller: z.number().min(0).max(50),
  admin: z.number().min(0).max(50),
  minMember: z.number().int().min(0),
  minReseller: z.number().int().min(0),
  minAdmin: z.number().int().min(0),
});

function getIp(req: Request) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0]?.trim() ?? "unknown";
  return req.ip ?? "unknown";
}

const router: IRouter = Router();

/* ── GET /api/v2/admin/markup-settings ── */
router.get("/v2/admin/markup-settings", requireRole("admin"), async (_req, res) => {
  const settings = await getMarkupSettings();
  res.json(settings);
});

/* ── PUT /api/v2/admin/markup-settings ── */
router.put("/v2/admin/markup-settings", requireRole("admin"), async (req, res) => {
  const parsed = MarkupSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Input tidak valid", details: safeZodErrors(parsed.error.issues) });
    return;
  }
  await db
    .insert(settingsTable)
    .values({ key: "markup", value: JSON.stringify(parsed.data) })
    .onConflictDoUpdate({
      target: settingsTable.key,
      set: { value: JSON.stringify(parsed.data), updatedAt: new Date() },
    });
  await audit({
    userId: req.member!.userId,
    action: "admin_update_markup_settings",
    entity: "settings",
    ip: getIp(req),
    data: parsed.data,
  });
  res.json({ message: "Pengaturan markup berhasil disimpan", settings: parsed.data });
});

/* ── POST /api/v2/admin/products/sync — Sync pricelist Digiflazz → DB ── */
router.post("/v2/admin/products/sync", requireRole("admin"), async (req, res) => {
  try {
    /* 1. Ambil markup settings dari DB */
    const markup = await getMarkupSettings();

    /* 2. Ambil pricelist prepaid & pasca secara berurutan agar tidak kena rate limit */
    const fetchErrors: string[] = [];

    const prepaid = await fetchDigiflazzPricelist("prepaid").catch((e: Error) => {
      fetchErrors.push(`Prepaid: ${e.message}`);
      return [] as DgProduct[];
    });
    /* Jeda singkat antar request agar tidak trigger rate limit Digiflazz */
    await new Promise((r) => setTimeout(r, 1500));
    const pasca = await fetchDigiflazzPricelist("pasca").catch((e: Error) => {
      fetchErrors.push(`Pasca: ${e.message}`);
      return [] as DgProduct[];
    });

    const allProducts = [...prepaid, ...pasca];

    if (allProducts.length === 0) {
      res.status(502).json({
        error: fetchErrors.length > 0
          ? fetchErrors.join(" | ")
          : "Pricelist Digiflazz kosong / tidak bisa diakses",
      });
      return;
    }

    /* 2. Ambil kode produk yang sudah ada di DB (untuk laporan added vs updated) */
    const existingRows = await db.select({ code: productsTable.code }).from(productsTable);
    const existingCodes = new Set(existingRows.map((r) => r.code));

    /* 3. Normalisasi & upsert per batch */
    const BATCH = 200;
    const errors: string[] = [];
    let processed = 0;

    for (let i = 0; i < allProducts.length; i += BATCH) {
      const batch = allProducts.slice(i, i + BATCH);
      const rows = batch.map((p) => {
        const base = p.price;
        const active = p.buyer_product_status && p.seller_product_status;
        const stockVal = !p.seller_product_status ? "empty" : (p.unlimited_stock || p.stock > 0) ? "available" : "empty";
        return {
          code: p.buyer_sku_code,
          name: p.product_name,
          category: mapCategory(p.category),
          provider: p.brand || null,
          basePrice: base,
          memberPrice: markupPrice(base, markup.member / 100, markup.minMember),
          resellerPrice: markupPrice(base, markup.reseller / 100, markup.minReseller),
          adminPrice: markupPrice(base, markup.admin / 100, markup.minAdmin),
          description: p.desc ?? null,
          isActive: active,
          stock: stockVal,
        };
      });

      try {
        await db
          .insert(productsTable)
          .values(rows)
          .onConflictDoUpdate({
            target: productsTable.code,
            set: {
              name: sql`excluded.name`,
              provider: sql`excluded.provider`,
              basePrice: sql`excluded.base_price`,
              memberPrice: sql`excluded.member_price`,
              resellerPrice: sql`excluded.reseller_price`,
              adminPrice: sql`excluded.admin_price`,
              stock: sql`excluded.stock`,
              updatedAt: sql`now()`,
            },
          });
        processed += rows.length;
      } catch (err) {
        errors.push(`Batch ${Math.floor(i / BATCH) + 1}: ${(err as Error).message}`);
      }
    }

    /* 4. Hitung laporan */
    const added = allProducts.filter((p) => !existingCodes.has(p.buyer_sku_code)).length;
    const updated = allProducts.filter((p) => existingCodes.has(p.buyer_sku_code)).length;

    await audit({
      userId: req.member!.userId,
      action: "admin_sync_products",
      entity: "product",
      ip: getIp(req),
      data: { total: processed, added, updated, errors: errors.length },
    });

    req.log.info({ processed, added, updated }, "Product sync completed");
    res.json({
      added,
      updated,
      skipped: allProducts.length - processed,
      total: processed,
      errors,
    });
  } catch (err) {
    req.log.error({ err }, "Product sync failed");
    res.status(500).json({ error: (err as Error).message });
  }
});

const ProductSchema = z.object({
  code: z.string().min(1).max(60).regex(/^[A-Za-z0-9_\-]+$/),
  name: z.string().min(2).max(150),
  category: z.enum(["pulsa","data","pln","ewallet","pascabayar","game","tv","voucher","international","other"]),
  provider: z.string().max(50).optional(),
  basePrice: z.number().int().min(0),
  memberPrice: z.number().int().min(0),
  resellerPrice: z.number().int().min(0),
  adminPrice: z.number().int().min(0),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
});

const ProviderSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(["digiflazz","iotelkomsel","manual","other"]).default("other"),
  statusUrl: z.string().url().optional(),
  note: z.string().max(300).optional(),
  isActive: z.boolean().default(true),
});

/* ── GET /api/v2/admin/products ── */
router.get("/v2/admin/products", requireRole("admin"), async (req, res) => {
  const q = req.query["q"] as string | undefined;
  const category = req.query["category"] as string | undefined;
  const page = Math.max(1, Number(req.query["page"] ?? 1));
  const limit = 50;

  let rows = await db.select().from(productsTable).orderBy(desc(productsTable.updatedAt)).limit(limit).offset((page - 1) * limit);
  if (q) rows = rows.filter((p) => p.code.includes(q) || p.name.toLowerCase().includes(q.toLowerCase()));
  if (category) rows = rows.filter((p) => p.category === category);

  res.json({ page, limit, data: rows });
});

/* ── POST /api/v2/admin/products ── */
router.post("/v2/admin/products", requireRole("admin"), async (req, res) => {
  const parsed = ProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid", details: safeZodErrors(parsed.error.issues) });
    return;
  }
  const [product] = await db.insert(productsTable).values({
    ...parsed.data,
    provider: parsed.data.provider ?? null,
    description: parsed.data.description ?? null,
  }).returning();
  await audit({ userId: req.member!.userId, action: "admin_add_product", entity: "product", entityId: product!.id, ip: getIp(req), data: { code: parsed.data.code } });
  res.status(201).json(product);
});

/* ── PUT /api/v2/admin/products/:id ── */
router.put("/v2/admin/products/:id", requireRole("admin"), async (req, res) => {
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }
  const parsed = ProductSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid", details: safeZodErrors(parsed.error.issues) });
    return;
  }
  await db.update(productsTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(productsTable.id, id));
  await audit({ userId: req.member!.userId, action: "admin_update_product", entity: "product", entityId: id, ip: getIp(req) });
  const [updated] = await db.select().from(productsTable).where(eq(productsTable.id, id));
  res.json(updated);
});

/* ── DELETE /api/v2/admin/products/:id ── */
router.delete("/v2/admin/products/:id", requireRole("admin"), async (req, res) => {
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }
  await db.update(productsTable).set({ isActive: false, updatedAt: new Date() }).where(eq(productsTable.id, id));
  await audit({ userId: req.member!.userId, action: "admin_disable_product", entity: "product", entityId: id, ip: getIp(req) });
  res.json({ message: "Produk dinonaktifkan" });
});

/* ── GET /api/v2/admin/providers ── */
router.get("/v2/admin/providers", requireRole("admin"), async (_req, res) => {
  const rows = await db.select().from(providersTable).orderBy(desc(providersTable.updatedAt));
  res.json(rows);
});

/* ── POST /api/v2/admin/providers ── */
router.post("/v2/admin/providers", requireRole("admin"), async (req, res) => {
  const parsed = ProviderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid", details: safeZodErrors(parsed.error.issues) });
    return;
  }
  const [provider] = await db.insert(providersTable).values({
    ...parsed.data,
    statusUrl: parsed.data.statusUrl ?? null,
    note: parsed.data.note ?? null,
  }).returning();
  res.status(201).json(provider);
});

/* ── PUT /api/v2/admin/providers/:id ── */
router.put("/v2/admin/providers/:id", requireRole("admin"), async (req, res) => {
  const id = Number(req.params["id"]);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }
  const parsed = ProviderSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid", details: safeZodErrors(parsed.error.issues) });
    return;
  }
  await db.update(providersTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(providersTable.id, id));
  const [updated] = await db.select().from(providersTable).where(eq(providersTable.id, id));
  res.json(updated);
});

export default router;
