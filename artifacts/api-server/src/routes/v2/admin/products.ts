/**
 * GET    /api/v2/admin/products        — list produk
 * POST   /api/v2/admin/products        — tambah produk
 * PUT    /api/v2/admin/products/:id    — update produk/harga
 * DELETE /api/v2/admin/products/:id    — nonaktifkan produk
 * GET    /api/v2/admin/providers       — list provider
 * POST   /api/v2/admin/providers       — tambah provider
 * PUT    /api/v2/admin/providers/:id   — update provider
 */
import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import { eq, ilike, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { productsTable, providersTable } from "@workspace/db";
import { requireRole } from "../../../middlewares/requireRole.js";
import { safeZodErrors } from "../../../lib/sanitize.js";
import { audit } from "../../../lib/v2/auditService.js";

const router: IRouter = Router();

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

function getIp(req: Request) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0]?.trim() ?? "unknown";
  return req.ip ?? "unknown";
}

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
