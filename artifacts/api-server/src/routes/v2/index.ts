import { Router, type IRouter } from "express";
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

export default router;
