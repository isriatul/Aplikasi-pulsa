import { pgTable, serial, varchar, text, bigint, boolean, timestamp, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";

export const productCategoryEnum = pgEnum("product_category", [
  "pulsa", "data", "pln", "ewallet", "pascabayar", "game", "tv", "voucher", "international", "other",
]);

export const productsTable = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 60 }).unique().notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    category: productCategoryEnum("category").default("other").notNull(),
    provider: varchar("provider", { length: 50 }),
    basePrice: bigint("base_price", { mode: "number" }).default(0).notNull(),
    memberPrice: bigint("member_price", { mode: "number" }).default(0).notNull(),
    resellerPrice: bigint("reseller_price", { mode: "number" }).default(0).notNull(),
    adminPrice: bigint("admin_price", { mode: "number" }).default(0).notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    stock: varchar("stock", { length: 20 }).default("available"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("prod_code_idx").on(t.code),
    index("prod_category_idx").on(t.category),
    index("prod_provider_idx").on(t.provider),
    index("prod_active_idx").on(t.isActive),
  ],
);

export const priceOverridesTable = pgTable(
  "price_overrides",
  {
    id: serial("id").primaryKey(),
    productCode: varchar("product_code", { length: 60 }).notNull(),
    userId: serial("user_id").notNull(),
    price: bigint("price", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("po_product_idx").on(t.productCode),
    index("po_user_idx").on(t.userId),
  ],
);

export type Product = typeof productsTable.$inferSelect;
export type PriceOverride = typeof priceOverridesTable.$inferSelect;
