import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import projectsRouter from "./projects";
import filesRouter from "./files";
import aiRouter from "./ai";
import deploymentsRouter from "./deployments";
import templatesRouter from "./templates";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/projects", projectsRouter);
router.use("/projects/:id/files", filesRouter);
router.use("/projects/:id/ai/chat", aiRouter);
router.use("/projects/:id/deployments", deploymentsRouter);
router.use("/templates", templatesRouter);

export default router;
