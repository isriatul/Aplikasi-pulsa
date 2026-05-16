import { pgTable, serial, integer, varchar, text, bigint, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users.js";

export const txStatusEnum = pgEnum("tx_status", ["pending", "success", "failed"]);
export const txCategoryEnum = pgEnum("tx_category", [
  "pulsa", "data", "pln", "ewallet", "pascabayar", "game", "tv", "voucher", "international", "other",
]);

export const transactionsTable = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id).notNull(),
    refId: varchar("ref_id", { length: 80 }).unique().notNull(),
    productCode: varchar("product_code", { length: 60 }).notNull(),
    category: txCategoryEnum("category").default("other").notNull(),
    customerNo: varchar("customer_no", { length: 30 }).notNull(),
    amount: bigint("amount", { mode: "number" }).default(0).notNull(),
    sellingPrice: bigint("selling_price", { mode: "number" }).default(0).notNull(),
    profit: bigint("profit", { mode: "number" }).default(0).notNull(),
    status: txStatusEnum("status").default("pending").notNull(),
    message: text("message"),
    sn: text("sn"),
    provider: varchar("provider", { length: 50 }),
    retryCount: integer("retry_count").default(0).notNull(),
    ip: varchar("ip", { length: 64 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("tx_user_idx").on(t.userId),
    index("tx_refid_idx").on(t.refId),
    index("tx_status_idx").on(t.status),
    index("tx_category_idx").on(t.category),
    index("tx_created_idx").on(t.createdAt),
    index("tx_customer_idx").on(t.customerNo),
  ],
);

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Transaction = typeof transactionsTable.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
