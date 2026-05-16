import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import digiflazzRouter from "./digiflazz.js";
import authRouter from "./auth.js";
import txLogRouter from "./txLog.js";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(digiflazzRouter);
router.use(txLogRouter);

export default router;
