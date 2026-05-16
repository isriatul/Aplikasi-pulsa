import { pgTable, serial, integer, bigint, text, varchar, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const mutationTypeEnum = pgEnum("mutation_type", [
  "debit",        // keluar: transaksi, biaya
  "credit",       // masuk: deposit, bonus, refund
  "refund",       // rollback dari transaksi gagal
  "manual_debit", // admin kurangi saldo
  "manual_credit", // admin tambah saldo
  "commission",   // komisi reseller
]);

export const balanceMutationsTable = pgTable(
  "balance_mutations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id).notNull(),
    type: mutationTypeEnum("type").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    balanceBefore: bigint("balance_before", { mode: "number" }).notNull(),
    balanceAfter: bigint("balance_after", { mode: "number" }).notNull(),
    refId: varchar("ref_id", { length: 80 }),
    note: text("note"),
    performedBy: integer("performed_by").references(() => usersTable.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("bm_user_idx").on(t.userId),
    index("bm_type_idx").on(t.type),
    index("bm_refid_idx").on(t.refId),
    index("bm_created_idx").on(t.createdAt),
  ],
);

export type BalanceMutation = typeof balanceMutationsTable.$inferSelect;
