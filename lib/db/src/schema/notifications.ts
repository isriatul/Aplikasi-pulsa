import { pgTable, serial, integer, varchar, text, jsonb, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const notifTypeEnum = pgEnum("notif_type", [
  "tx_success", "tx_failed", "deposit_confirmed", "deposit_pending",
  "user_registered", "user_suspended", "low_balance", "system_alert",
]);
export const notifStatusEnum = pgEnum("notif_status", ["pending", "sent", "failed"]);
export const notifChannelEnum = pgEnum("notif_channel", ["telegram", "discord", "whatsapp", "system"]);

export const notificationsTable = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id),
    type: notifTypeEnum("type").notNull(),
    channel: notifChannelEnum("channel").default("system").notNull(),
    payload: jsonb("payload").notNull(),
    status: notifStatusEnum("status").default("pending").notNull(),
    error: text("error"),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("notif_user_idx").on(t.userId),
    index("notif_type_idx").on(t.type),
    index("notif_status_idx").on(t.status),
    index("notif_created_idx").on(t.createdAt),
  ],
);

export type Notification = typeof notificationsTable.$inferSelect;
