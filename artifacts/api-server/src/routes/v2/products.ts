/**
 * GET /api/v2/products — daftar produk aktif dengan harga sesuai role user
 */
import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { requireAuthV2 } from "../../middlewares/requireRole.js";
import { readLimiter } from "../../middlewares/rateLimiter.js";

const router: IRouter = Router();

type ProductRow = typeof productsTable.$inferSelect;

function priceForRole(p: ProductRow, role: string): number {
  if (role === "superadmin" || role === "admin") return p.adminPrice;
  if (role === "reseller") return p.resellerPrice;
  return p.memberPrice;
}

/* ── GET /api/v2/products ── */
router.get("/v2/products", requireAuthV2, readLimiter, async (req, res) => {
  const role = req.member!.role;
  const categoryParam = req.query["category"] as string | undefined;

  const validCategories = ["pulsa","data","pln","ewallet","pascabayar","game","tv","voucher","international","other"] as const;
  type ValidCategory = typeof validCategories[number];

  const isValidCategory = (v: string): v is ValidCategory =>
    (validCategories as readonly string[]).includes(v);

  const rows = await db
    .select()
    .from(productsTable)
    .where(
      categoryParam && isValidCategory(categoryParam)
        ? and(eq(productsTable.category, categoryParam), eq(productsTable.isActive, true))
        : eq(productsTable.isActive, true),
    )
    .orderBy(productsTable.basePrice);

  const data = rows.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    category: p.category,
    provider: p.provider,
    description: p.description,
    price: priceForRole(p, role),
    basePrice: p.basePrice,
    memberPrice: p.memberPrice,
    resellerPrice: p.resellerPrice,
    adminPrice: p.adminPrice,
    stock: p.stock,
    isActive: p.isActive,
  }));

  res.json({ data, total: data.length, role });
});

export default router;
