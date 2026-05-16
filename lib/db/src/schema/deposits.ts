import { pgTable, serial, integer, bigint, varchar, text, timestamp, pgEnum, jsonb, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const depositMethodEnum = pgEnum("deposit_method", ["qris", "va_bca", "va_mandiri", "va_bni", "transfer", "manual"]);
export const depositStatusEnum = pgEnum("deposit_status", ["pending", "paid", "confirmed", "failed", "expired"]);

export const depositsTable = pgTable(
  "deposits",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id).notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    method: depositMethodEnum("method").notNull(),
    status: depositStatusEnum("status").default("pending").notNull(),
    paymentRef: varchar("payment_ref", { length: 120 }),
    gatewayRef: varchar("gateway_ref", { length: 120 }),
    callbackData: jsonb("callback_data"),
    approvedBy: integer("approved_by").references(() => usersTable.id),
    note: text("note"),
    expiredAt: timestamp("expired_at"),
    paidAt: timestamp("paid_at"),
    confirmedAt: timestamp("confirmed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("dep_user_idx").on(t.userId),
    index("dep_status_idx").on(t.status),
    index("dep_ref_idx").on(t.paymentRef),
    index("dep_created_idx").on(t.createdAt),
  ],
);

export type Deposit = typeof depositsTable.$inferSelect;
