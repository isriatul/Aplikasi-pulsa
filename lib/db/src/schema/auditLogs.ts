import { pgTable, serial, integer, varchar, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const auditLogsTable = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id),
    action: varchar("action", { length: 100 }).notNull(),
    entity: varchar("entity", { length: 60 }),
    entityId: varchar("entity_id", { length: 80 }),
    ip: varchar("ip", { length: 64 }),
    userAgent: text("user_agent"),
    data: jsonb("data"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("al_user_idx").on(t.userId),
    index("al_action_idx").on(t.action),
    index("al_entity_idx").on(t.entity),
    index("al_created_idx").on(t.createdAt),
  ],
);

export type AuditLog = typeof auditLogsTable.$inferSelect;
