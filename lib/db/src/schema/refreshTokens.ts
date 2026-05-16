import { pgTable, serial, integer, text, varchar, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const refreshTokensTable = pgTable(
  "refresh_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    tokenHash: text("token_hash").unique().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    revoked: boolean("revoked").default(false).notNull(),
    userAgent: text("user_agent"),
    ip: varchar("ip", { length: 64 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("rt_user_idx").on(t.userId),
    index("rt_token_idx").on(t.tokenHash),
    index("rt_expires_idx").on(t.expiresAt),
  ],
);

export type RefreshToken = typeof refreshTokensTable.$inferSelect;
