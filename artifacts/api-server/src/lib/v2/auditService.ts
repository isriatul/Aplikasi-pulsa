import { desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";

export async function audit(opts: {
  userId?: number;
  action: string;
  entity?: string;
  entityId?: string | number;
  ip?: string;
  userAgent?: string;
  data?: unknown;
}): Promise<void> {
  await db.insert(auditLogsTable).values({
    userId: opts.userId,
    action: opts.action,
    entity: opts.entity,
    entityId: opts.entityId !== undefined ? String(opts.entityId) : undefined,
    ip: opts.ip?.slice(0, 64),
    userAgent: opts.userAgent?.slice(0, 500),
    data: opts.data ?? null,
  });
}

export async function getAuditLogs(limit = 100, offset = 0) {
  return db
    .select()
    .from(auditLogsTable)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getUserAuditLogs(userId: number, limit = 50) {
  return db
    .select()
    .from(auditLogsTable)
    .where(eq(auditLogsTable.userId, userId))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit);
}
