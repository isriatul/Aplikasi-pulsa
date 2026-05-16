import { Router, type IRouter } from "express";
import healthRouter from "./health";
import digiflazzRouter from "./digiflazz";

const router: IRouter = Router();

router.use(healthRouter);
router.use(digiflazzRouter);

export default router;
