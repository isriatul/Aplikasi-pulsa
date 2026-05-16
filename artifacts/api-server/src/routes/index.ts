import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import digiflazzRouter from "./digiflazz.js";
import authRouter from "./auth.js";
import txLogRouter from "./txLog.js";
import callbackRouter from "./callback.js";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(digiflazzRouter);
router.use(txLogRouter);
router.use(callbackRouter);

export default router;
