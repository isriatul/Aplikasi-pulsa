import { Router, type IRouter } from "express";
import { join } from "path";
import { existsSync } from "fs";
import authRouter from "./auth.js";
import transactionsRouter from "./transactions.js";
import balanceRouter from "./balance.js";
import depositsRouter from "./deposits.js";
import dashboardRouter from "./admin/dashboard.js";
import adminUsersRouter from "./admin/users.js";
import adminProductsRouter from "./admin/products.js";
import adminTxRouter from "./admin/transactions.js";
import auditRouter from "./admin/audit.js";
import monitoringRouter from "./monitoring.js";

const router: IRouter = Router();

/* Auth */
router.use(authRouter);
/* User */
router.use(transactionsRouter);
router.use(balanceRouter);
router.use(depositsRouter);
/* Admin */
router.use(dashboardRouter);
router.use(adminUsersRouter);
router.use(adminProductsRouter);
router.use(adminTxRouter);
router.use(auditRouter);
/* Monitoring */
router.use(monitoringRouter);

/* ── Static: bukti deposit — hanya akses dengan token admin ── */
router.get("/v2/uploads/:filename", async (req, res, next) => {
  const filename = req.params["filename"] ?? "";
  /* Validasi nama file: hanya huruf, angka, dash, underscore, titik */
  if (!/^[a-zA-Z0-9_\-.]+$/.test(filename)) {
    res.status(400).json({ error: "Nama file tidak valid" });
    return;
  }
  const filepath = join(process.cwd(), "uploads", "proofs", filename);
  if (!existsSync(filepath)) {
    res.status(404).json({ error: "File tidak ditemukan" });
    return;
  }
  res.sendFile(filepath);
});

export default router;
