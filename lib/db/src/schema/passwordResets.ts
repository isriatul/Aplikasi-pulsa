import { pgTable, serial, integer, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const passwordResetsTable = pgTable(
  "password_resets",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    tokenHash: text("token_hash").unique().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    used: boolean("used").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("pr_user_idx").on(t.userId),
    index("pr_token_idx").on(t.tokenHash),
    index("pr_expires_idx").on(t.expiresAt),
  ],
);

export type PasswordReset = typeof passwordResetsTable.$inferSelect;
