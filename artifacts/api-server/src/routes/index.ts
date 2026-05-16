import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import digiflazzRouter from "./digiflazz.js";
import authRouter from "./auth.js";
import txLogRouter from "./txLog.js";
import callbackRouter from "./callback.js";
import v2Router from "./v2/index.js";

const router: IRouter = Router();

/* v1 — Google Sheets based (existing system, jangan diubah) */
router.use(authRouter);
router.use(healthRouter);
router.use(digiflazzRouter);
router.use(txLogRouter);
router.use(callbackRouter);

/* v2 — PostgreSQL based (fitur baru) */
router.use(v2Router);

export default router;
