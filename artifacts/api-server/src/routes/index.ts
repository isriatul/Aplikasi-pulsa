import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import digiflazzRouter from "./digiflazz.js";
import authRouter from "./auth.js";
import callbackRouter from "./callback.js";
import v2Router from "./v2/index.js";

const router: IRouter = Router();

/* Legacy stubs — sudah deprecated, mengembalikan 410 */
router.use(authRouter);

/* Utility & webhook — tetap aktif */
router.use(healthRouter);
router.use(digiflazzRouter);
router.use(callbackRouter);

/* v2 — PostgreSQL (database utama) */
router.use(v2Router);

export default router;
