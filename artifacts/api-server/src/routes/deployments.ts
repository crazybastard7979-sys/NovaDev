import { Router } from "express";
import { db, deploymentsTable, projectsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import type { AuthenticatedRequest } from "../lib/auth.js";
import { CreateDeploymentBody } from "@workspace/api-zod";

const router = Router({ mergeParams: true });

router.use(requireAuth as any);

async function assertProjectOwner(projectId: number, userId: number): Promise<boolean> {
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)))
    .limit(1);
  return !!project;
}

const BUILD_LOGS: Record<string, string[]> = {
  javascript: [
    "[1/4] Analyzing project structure...",
    "[2/4] Installing dependencies with npm install...",
    "[3/4] Building project...",
    "[4/4] Deployment complete. Running on port 3000.",
  ],
  python: [
    "[1/4] Analyzing Python project...",
    "[2/4] Creating virtual environment...",
    "[3/4] Installing dependencies from requirements.txt...",
    "[4/4] Starting application with gunicorn...",
  ],
  typescript: [
    "[1/5] Analyzing TypeScript project...",
    "[2/5] Installing dependencies...",
    "[3/5] Running tsc compilation...",
    "[4/5] Bundling output...",
    "[5/5] Deployment complete.",
  ],
  html: [
    "[1/2] Analyzing static files...",
    "[2/2] Deployment complete. Serving static files via CDN.",
  ],
};

function formatDeployment(d: typeof deploymentsTable.$inferSelect) {
  return {
    id: d.id,
    projectId: d.projectId,
    status: d.status,
    url: d.url,
    buildLog: d.buildLog,
    environment: d.environment,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

router.get("/", async (req: AuthenticatedRequest, res) => {
  const projectId = Number(req.params["id"]);
  if (!(await assertProjectOwner(projectId, req.user!.userId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const deployments = await db
    .select()
    .from(deploymentsTable)
    .where(eq(deploymentsTable.projectId, projectId))
    .orderBy(desc(deploymentsTable.createdAt))
    .limit(20);

  res.json(deployments.map(formatDeployment));
});

router.get("/:deployId", async (req: AuthenticatedRequest, res) => {
  const projectId = Number(req.params["id"]);
  const deployId = Number(req.params["deployId"]);

  if (!(await assertProjectOwner(projectId, req.user!.userId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [deployment] = await db
    .select()
    .from(deploymentsTable)
    .where(and(eq(deploymentsTable.id, deployId), eq(deploymentsTable.projectId, projectId)))
    .limit(1);

  if (!deployment) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }

  res.json(formatDeployment(deployment));
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  const projectId = Number(req.params["id"]);
  if (!(await assertProjectOwner(projectId, req.user!.userId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const parsed = CreateDeploymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { environment, envVars = {} } = parsed.data;

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1);

  const [deployment] = await db
    .insert(deploymentsTable)
    .values({ projectId, environment, envVars, status: "pending" })
    .returning();

  simulateBuild(deployment!.id, project?.language ?? "javascript");

  res.status(201).json(formatDeployment(deployment!));
});

async function simulateBuild(deploymentId: number, language: string) {
  const logs = BUILD_LOGS[language] ?? BUILD_LOGS["javascript"]!;

  await new Promise((r) => setTimeout(r, 1500));
  await db.update(deploymentsTable).set({ status: "building", updatedAt: new Date() }).where(eq(deploymentsTable.id, deploymentId));

  let buildLog = "";
  for (const log of logs) {
    buildLog += log + "\n";
    await new Promise((r) => setTimeout(r, 1000));
  }

  const success = Math.random() > 0.05;
  const url = success ? `https://${Math.random().toString(36).slice(2, 10)}.novadev.app` : null;

  await db
    .update(deploymentsTable)
    .set({
      status: success ? "running" : "failed",
      url,
      buildLog: buildLog.trim(),
      updatedAt: new Date(),
    })
    .where(eq(deploymentsTable.id, deploymentId));
}

export default router;
