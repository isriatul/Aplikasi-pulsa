import { pgTable, serial, varchar, text, boolean, timestamp, pgEnum, index } from "drizzle-orm/pg-core";

export const providerTypeEnum = pgEnum("provider_type", ["digiflazz", "iotelkomsel", "manual", "other"]);
export const providerStatusEnum = pgEnum("provider_status", ["online", "offline", "degraded", "unknown"]);

export const providersTable = pgTable(
  "providers",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).unique().notNull(),
    type: providerTypeEnum("type").default("other").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    status: providerStatusEnum("status").default("unknown").notNull(),
    statusUrl: text("status_url"),
    lastCheckAt: timestamp("last_check_at"),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("prov_type_idx").on(t.type), index("prov_active_idx").on(t.isActive)],
);

export type Provider = typeof providersTable.$inferSelect;
