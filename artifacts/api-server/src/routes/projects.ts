import { Router } from "express";
import { db, projectsTable, filesTable, deploymentsTable } from "@workspace/db";
import { eq, and, desc, count, sql, ilike } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import type { AuthenticatedRequest } from "../lib/auth.js";
import { CreateProjectBody, UpdateProjectBody } from "@workspace/api-zod";

const router = Router();

router.use(requireAuth as any);

const STARTER_FILES: Record<string, Array<{ name: string; path: string; content: string }>> = {
  javascript: [
    { name: "index.js", path: "/index.js", content: 'console.log("Hello, World!");\n' },
    { name: "package.json", path: "/package.json", content: JSON.stringify({ name: "my-project", version: "1.0.0", main: "index.js" }, null, 2) + "\n" },
    { name: "README.md", path: "/README.md", content: "# My Project\n\nBuilt with NovaDev.\n" },
  ],
  typescript: [
    { name: "index.ts", path: "/index.ts", content: 'const greeting: string = "Hello, World!";\nconsole.log(greeting);\n' },
    { name: "tsconfig.json", path: "/tsconfig.json", content: JSON.stringify({ compilerOptions: { target: "ES2020", module: "commonjs", strict: true, outDir: "./dist" }, include: ["**/*.ts"] }, null, 2) + "\n" },
    { name: "package.json", path: "/package.json", content: JSON.stringify({ name: "my-project", version: "1.0.0", scripts: { build: "tsc", start: "node dist/index.js" }, devDependencies: { typescript: "^5.0.0" } }, null, 2) + "\n" },
  ],
  python: [
    { name: "main.py", path: "/main.py", content: 'def main():\n    print("Hello, World!")\n\nif __name__ == "__main__":\n    main()\n' },
    { name: "requirements.txt", path: "/requirements.txt", content: "" },
    { name: "README.md", path: "/README.md", content: "# My Python Project\n\nBuilt with NovaDev.\n" },
  ],
  go: [
    { name: "main.go", path: "/main.go", content: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, World!")\n}\n' },
    { name: "go.mod", path: "/go.mod", content: 'module myproject\n\ngo 1.21\n' },
  ],
  rust: [
    { name: "main.rs", path: "/src/main.rs", content: 'fn main() {\n    println!("Hello, World!");\n}\n' },
    { name: "Cargo.toml", path: "/Cargo.toml", content: '[package]\nname = "my-project"\nversion = "0.1.0"\nedition = "2021"\n' },
  ],
  html: [
    { name: "index.html", path: "/index.html", content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>My App</title>\n  <link rel="stylesheet" href="style.css" />\n</head>\n<body>\n  <h1>Hello, World!</h1>\n  <script src="script.js"></script>\n</body>\n</html>\n' },
    { name: "style.css", path: "/style.css", content: "* { box-sizing: border-box; margin: 0; padding: 0; }\nbody { font-family: sans-serif; padding: 2rem; }\nh1 { color: #333; }\n" },
    { name: "script.js", path: "/script.js", content: 'console.log("App loaded");\n' },
  ],
};

function getStarterFiles(language: string) {
  return STARTER_FILES[language.toLowerCase()] ?? STARTER_FILES["javascript"]!;
}

function detectLanguage(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    js: "javascript", ts: "typescript", py: "python",
    go: "go", rs: "rust", html: "html", css: "css",
    json: "json", md: "markdown", txt: "plaintext",
    sh: "bash", yml: "yaml", yaml: "yaml", toml: "toml",
  };
  return ext ? (map[ext] ?? null) : null;
}

router.get("/", async (req: AuthenticatedRequest, res) => {
  const { search, language, limit = "20", offset = "0" } = req.query as Record<string, string>;
  const userId = req.user!.userId;

  let query = db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.userId, userId))
    .$dynamic();

  if (search) {
    query = query.where(ilike(projectsTable.name, `%${search}%`));
  }
  if (language) {
    query = query.where(eq(projectsTable.language, language));
  }

  const projects = await query
    .orderBy(desc(projectsTable.updatedAt))
    .limit(Number(limit))
    .offset(Number(offset));

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(projectsTable)
    .where(eq(projectsTable.userId, userId));

  res.json({ projects: projects.map(formatProject), total: Number(total) });
});

router.get("/stats", async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;

  const [{ value: totalProjects }] = await db
    .select({ value: count() })
    .from(projectsTable)
    .where(eq(projectsTable.userId, userId));

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [{ value: recentlyActive }] = await db
    .select({ value: count() })
    .from(projectsTable)
    .where(
      and(
        eq(projectsTable.userId, userId),
        sql`${projectsTable.updatedAt} > ${sevenDaysAgo.toISOString()}`
      )
    );

  const languageRows = await db
    .select({ language: projectsTable.language, count: count() })
    .from(projectsTable)
    .where(eq(projectsTable.userId, userId))
    .groupBy(projectsTable.language)
    .orderBy(desc(count()));

  const userProjects = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.userId, userId));

  const projectIds = userProjects.map((p) => p.id);

  let totalDeployments = 0;
  if (projectIds.length > 0) {
    const [{ value }] = await db
      .select({ value: count() })
      .from(deploymentsTable)
      .where(sql`${deploymentsTable.projectId} = ANY(${sql.raw(`ARRAY[${projectIds.join(",")}]`)})`);
    totalDeployments = Number(value);
  }

  res.json({
    totalProjects: Number(totalProjects),
    recentlyActive: Number(recentlyActive),
    languageBreakdown: languageRows.map((r) => ({ language: r.language, count: Number(r.count) })),
    totalDeployments,
    storageUsedMb: Math.round(Number(totalProjects) * 2.4 * 10) / 10,
  });
});

router.get("/recent", async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;
  const projects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.userId, userId))
    .orderBy(desc(projectsTable.lastOpenedAt), desc(projectsTable.updatedAt))
    .limit(6);

  res.json(projects.map(formatProject));
});

router.get("/:id", async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const project = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, Number(id)), eq(projectsTable.userId, req.user!.userId)))
    .limit(1);

  if (project.length === 0) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await db
    .update(projectsTable)
    .set({ lastOpenedAt: new Date() })
    .where(eq(projectsTable.id, Number(id)));

  res.json(formatProject(project[0]!));
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { name, description, language = "javascript", isPublic = false } = parsed.data;
  const userId = req.user!.userId;

  const [project] = await db
    .insert(projectsTable)
    .values({ name, description, language, isPublic, userId })
    .returning();

  const starterFiles = getStarterFiles(language);
  if (starterFiles.length > 0) {
    await db.insert(filesTable).values(
      starterFiles.map((f) => ({
        name: f.name,
        path: f.path,
        content: f.content,
        type: "file" as const,
        projectId: project!.id,
        language: detectLanguage(f.name),
      }))
    );
  }

  res.status(201).json(formatProject(project!));
});

router.patch("/:id", async (req: AuthenticatedRequest, res) => {
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { id } = req.params;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) updates["name"] = parsed.data.name;
  if (parsed.data.description !== undefined) updates["description"] = parsed.data.description;
  if (parsed.data.isPublic !== undefined) updates["isPublic"] = parsed.data.isPublic;
  if (parsed.data.status !== undefined) updates["status"] = parsed.data.status;

  const [updated] = await db
    .update(projectsTable)
    .set(updates)
    .where(and(eq(projectsTable.id, Number(id)), eq(projectsTable.userId, req.user!.userId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(formatProject(updated));
});

router.delete("/:id", async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const deleted = await db
    .delete(projectsTable)
    .where(and(eq(projectsTable.id, Number(id)), eq(projectsTable.userId, req.user!.userId)))
    .returning();

  if (deleted.length === 0) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.status(204).send();
});

function formatProject(p: typeof projectsTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    language: p.language,
    userId: p.userId,
    isPublic: p.isPublic,
    status: p.status,
    lastOpenedAt: p.lastOpenedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export default router;
