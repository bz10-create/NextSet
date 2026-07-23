import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import exercisesRouter from "./exercises";
import workoutsRouter from "./workouts";
import setsRouter from "./sets";
import progressRouter from "./progress";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(exercisesRouter);
router.use(workoutsRouter);
router.use(setsRouter);
router.use(progressRouter);

export default router;
