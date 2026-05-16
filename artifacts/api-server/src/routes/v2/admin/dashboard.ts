/**
 * GET /api/v2/admin/dashboard — statistik ringkasan untuk admin
 */
import { Router, type IRouter } from "express";
import { eq, sql, count, sum, gte, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable, transactionsTable, depositsTable, balanceMutationsTable } from "@workspace/db";
import { requireRole } from "../../../middlewares/requireRole.js";

const router: IRouter = Router();

router.get("/v2/admin/dashboard", requireRole("admin"), async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    activeUsers,
    pendingUsers,
    txToday,
    txTodaySuccess,
    revenueToday,
    pendingTx,
    pendingDeposits,
    totalBalance,
  ] = await Promise.all([
    /* Total users */
    db.select({ c: count() }).from(usersTable).then((r) => r[0]?.c ?? 0),
    /* Aktif */
    db.select({ c: count() }).from(usersTable).where(eq(usersTable.status, "active")).then((r) => r[0]?.c ?? 0),
    /* Pending approval */
    db.select({ c: count() }).from(usersTable).where(eq(usersTable.status, "pending")).then((r) => r[0]?.c ?? 0),
    /* Transaksi hari ini */
    db.select({ c: count() }).from(transactionsTable).where(gte(transactionsTable.createdAt, today)).then((r) => r[0]?.c ?? 0),
    /* Sukses hari ini */
    db.select({ c: count() }).from(transactionsTable).where(and(gte(transactionsTable.createdAt, today), eq(transactionsTable.status, "success"))).then((r) => r[0]?.c ?? 0),
    /* Revenue hari ini */
    db.select({ s: sum(transactionsTable.sellingPrice) }).from(transactionsTable).where(and(gte(transactionsTable.createdAt, today), eq(transactionsTable.status, "success"))).then((r) => Number(r[0]?.s ?? 0)),
    /* Pending transactions */
    db.select({ c: count() }).from(transactionsTable).where(eq(transactionsTable.status, "pending")).then((r) => r[0]?.c ?? 0),
    /* Pending deposits */
    db.select({ c: count() }).from(depositsTable).where(eq(depositsTable.status, "pending")).then((r) => r[0]?.c ?? 0),
    /* Total saldo semua user */
    db.select({ s: sum(usersTable.balance) }).from(usersTable).then((r) => Number(r[0]?.s ?? 0)),
  ]);

  /* Transaksi 7 hari terakhir */
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
  const txByDay = await db
    .select({
      date: sql<string>`DATE(${transactionsTable.createdAt})`,
      count: count(),
      revenue: sum(transactionsTable.sellingPrice),
    })
    .from(transactionsTable)
    .where(and(gte(transactionsTable.createdAt, sevenDaysAgo), eq(transactionsTable.status, "success")))
    .groupBy(sql`DATE(${transactionsTable.createdAt})`)
    .orderBy(sql`DATE(${transactionsTable.createdAt})`);

  /* Top produk */
  const topProducts = await db
    .select({
      productCode: transactionsTable.productCode,
      count: count(),
      revenue: sum(transactionsTable.sellingPrice),
    })
    .from(transactionsTable)
    .where(and(gte(transactionsTable.createdAt, sevenDaysAgo), eq(transactionsTable.status, "success")))
    .groupBy(transactionsTable.productCode)
    .orderBy(sql`count(*) DESC`)
    .limit(10);

  res.json({
    users: { total: totalUsers, active: activeUsers, pending: pendingUsers },
    transactions: { today: txToday, todaySuccess: txTodaySuccess, pending: pendingTx },
    finance: { revenueToday, totalUserBalance: totalBalance, pendingDeposits },
    charts: { txByDay, topProducts },
  });
});

export default router;
