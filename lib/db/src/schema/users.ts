import { pgTable, serial, varchar, text, bigint, timestamp, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roleEnum = pgEnum("role", ["superadmin", "admin", "reseller", "member"]);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended", "pending"]);

export const usersTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    phone: varchar("phone", { length: 20 }).unique().notNull(),
    email: varchar("email", { length: 255 }).unique(),
    name: varchar("name", { length: 100 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").default("member").notNull(),
    balance: bigint("balance", { mode: "number" }).default(0).notNull(),
    status: userStatusEnum("status").default("pending").notNull(),
    transactionPin: text("transaction_pin"),
    suspendReason: text("suspend_reason"),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("users_phone_idx").on(t.phone),
    uniqueIndex("users_email_idx").on(t.email),
    index("users_role_idx").on(t.role),
    index("users_status_idx").on(t.status),
  ],
);

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const selectUserSchema = createSelectSchema(usersTable);

export type User = typeof usersTable.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserRole = "superadmin" | "admin" | "reseller" | "member";
export type UserStatus = "active" | "suspended" | "pending";

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  superadmin: 4,
  admin: 3,
  reseller: 2,
  member: 1,
};
