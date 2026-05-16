/**
 * Layanan saldo atomic — semua operasi saldo harus melalui fungsi ini.
 * Menggunakan PostgreSQL advisory lock per-user untuk mencegah race condition.
 */
import { eq, sql, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable, balanceMutationsTable, type BalanceMutation } from "@workspace/db";

export class InsufficientBalanceError extends Error {
  constructor(
    public readonly current: number,
    public readonly required: number,
  ) {
    super(`Saldo tidak cukup. Saldo: Rp${current.toLocaleString()}, Diperlukan: Rp${required.toLocaleString()}`);
    this.name = "InsufficientBalanceError";
  }
}

export type MutationType = BalanceMutation["type"];

interface MutationOpts {
  userId: number;
  type: MutationType;
  amount: number;
  refId?: string;
  note?: string;
  performedBy?: number;
}

/**
 * Debit saldo (transaksi keluar) — anti minus dengan row-level lock.
 * Melempar InsufficientBalanceError jika saldo kurang.
 */
export async function debitBalance(opts: MutationOpts): Promise<BalanceMutation> {
  return db.transaction(async (tx) => {
    /* Lock row user untuk mencegah concurrent debit */
    const [user] = await tx
      .select({ id: usersTable.id, balance: usersTable.balance })
      .from(usersTable)
      .where(eq(usersTable.id, opts.userId))
      .for("update");

    if (!user) throw new Error("User tidak ditemukan");
    if (user.balance < opts.amount) {
      throw new InsufficientBalanceError(user.balance, opts.amount);
    }

    const newBalance = user.balance - opts.amount;

    await tx
      .update(usersTable)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(usersTable.id, opts.userId));

    const [mutation] = await tx
      .insert(balanceMutationsTable)
      .values({
        userId: opts.userId,
        type: opts.type,
        amount: opts.amount,
        balanceBefore: user.balance,
        balanceAfter: newBalance,
        refId: opts.refId,
        note: opts.note,
        performedBy: opts.performedBy,
      })
      .returning();

    return mutation!;
  });
}

/**
 * Credit saldo (deposit masuk, refund, bonus).
 */
export async function creditBalance(opts: MutationOpts): Promise<BalanceMutation> {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select({ id: usersTable.id, balance: usersTable.balance })
      .from(usersTable)
      .where(eq(usersTable.id, opts.userId))
      .for("update");

    if (!user) throw new Error("User tidak ditemukan");

    const newBalance = user.balance + opts.amount;

    await tx
      .update(usersTable)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(usersTable.id, opts.userId));

    const [mutation] = await tx
      .insert(balanceMutationsTable)
      .values({
        userId: opts.userId,
        type: opts.type,
        amount: opts.amount,
        balanceBefore: user.balance,
        balanceAfter: newBalance,
        refId: opts.refId,
        note: opts.note,
        performedBy: opts.performedBy,
      })
      .returning();

    return mutation!;
  });
}

/** Ambil saldo terkini */
export async function getBalance(userId: number): Promise<number> {
  const [row] = await db
    .select({ balance: usersTable.balance })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return row?.balance ?? 0;
}

/** Ambil riwayat mutasi saldo */
export async function getMutations(
  userId: number,
  limit = 50,
  offset = 0,
): Promise<BalanceMutation[]> {
  return db
    .select()
    .from(balanceMutationsTable)
    .where(eq(balanceMutationsTable.userId, userId))
    .orderBy(desc(balanceMutationsTable.createdAt))
    .limit(limit)
    .offset(offset);
}

/** Total kredit + debit */
export async function getBalanceSummary(
  userId: number,
): Promise<{ totalIn: number; totalOut: number }> {
  const rows = await db
    .select({
      type: balanceMutationsTable.type,
      total: sql<number>`sum(${balanceMutationsTable.amount})`,
    })
    .from(balanceMutationsTable)
    .where(eq(balanceMutationsTable.userId, userId))
    .groupBy(balanceMutationsTable.type);

  const credits = new Set(["credit", "refund", "manual_credit", "commission"]);
  let totalIn = 0;
  let totalOut = 0;
  for (const r of rows) {
    if (credits.has(r.type)) totalIn += Number(r.total);
    else totalOut += Number(r.total);
  }
  return { totalIn, totalOut };
}
