import { Router } from "express";
import { db, filesTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import type { AuthenticatedRequest } from "../lib/auth.js";
import { CreateFileBody, UpdateFileBody } from "@workspace/api-zod";

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

function buildTree(files: typeof filesTable.$inferSelect[]): object[] {
  const map = new Map<number, object & { children?: object[] }>();
  const roots: (object & { children?: object[] })[] = [];

  for (const f of files) {
    const node = {
      id: f.id,
      name: f.name,
      path: f.path,
      type: f.type,
      projectId: f.projectId,
      parentId: f.parentId,
      language: f.language,
      size: f.size,
      children: f.type === "directory" ? [] : undefined,
    };
    map.set(f.id, node);
  }

  for (const f of files) {
    const node = map.get(f.id)!;
    if (f.parentId && map.has(f.parentId)) {
      const parent = map.get(f.parentId)!;
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function detectLanguage(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    py: "python", go: "go", rs: "rust", html: "html", css: "css",
    json: "json", md: "markdown", txt: "plaintext", sh: "bash",
    yml: "yaml", yaml: "yaml", toml: "toml", java: "java", cpp: "cpp",
    c: "c", rb: "ruby", php: "php", swift: "swift", kt: "kotlin",
  };
  return ext ? (map[ext] ?? null) : null;
}

router.get("/", async (req: AuthenticatedRequest, res) => {
  const projectId = Number(req.params["id"]);
  if (!(await assertProjectOwner(projectId, req.user!.userId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const files = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.projectId, projectId))
    .orderBy(filesTable.path);

  res.json(buildTree(files));
});

router.get("/:fileId", async (req: AuthenticatedRequest, res) => {
  const projectId = Number(req.params["id"]);
  const fileId = Number(req.params["fileId"]);

  if (!(await assertProjectOwner(projectId, req.user!.userId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [file] = await db
    .select()
    .from(filesTable)
    .where(and(eq(filesTable.id, fileId), eq(filesTable.projectId, projectId)))
    .limit(1);

  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.json({
    id: file.id,
    name: file.name,
    path: file.path,
    type: file.type,
    content: file.content,
    projectId: file.projectId,
    language: file.language,
  });
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  const projectId = Number(req.params["id"]);
  if (!(await assertProjectOwner(projectId, req.user!.userId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const parsed = CreateFileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { name, path, type, content = "", parentId = null } = parsed.data;
  const language = type === "file" ? detectLanguage(name) : null;

  const [file] = await db
    .insert(filesTable)
    .values({ name, path, type, content, projectId, parentId, language, size: content.length })
    .returning();

  res.status(201).json({
    id: file!.id,
    name: file!.name,
    path: file!.path,
    type: file!.type,
    projectId: file!.projectId,
    parentId: file!.parentId,
    language: file!.language,
    size: file!.size,
    children: file!.type === "directory" ? [] : undefined,
  });
});

router.patch("/:fileId", async (req: AuthenticatedRequest, res) => {
  const projectId = Number(req.params["id"]);
  const fileId = Number(req.params["fileId"]);

  if (!(await assertProjectOwner(projectId, req.user!.userId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const parsed = UpdateFileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.content !== undefined) {
    updates["content"] = parsed.data.content;
    updates["size"] = parsed.data.content.length;
  }
  if (parsed.data.name !== undefined) {
    updates["name"] = parsed.data.name;
    updates["language"] = detectLanguage(parsed.data.name);
  }

  const [file] = await db
    .update(filesTable)
    .set(updates)
    .where(and(eq(filesTable.id, fileId), eq(filesTable.projectId, projectId)))
    .returning();

  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.json({
    id: file.id,
    name: file.name,
    path: file.path,
    type: file.type,
    content: file.content,
    projectId: file.projectId,
    language: file.language,
  });
});

router.delete("/:fileId", async (req: AuthenticatedRequest, res) => {
  const projectId = Number(req.params["id"]);
  const fileId = Number(req.params["fileId"]);

  if (!(await assertProjectOwner(projectId, req.user!.userId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const deleted = await db
    .delete(filesTable)
    .where(and(eq(filesTable.id, fileId), eq(filesTable.projectId, projectId)))
    .returning();

  if (deleted.length === 0) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.status(204).send();
});

export default router;
