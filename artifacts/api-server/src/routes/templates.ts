import { Router } from "express";
import { db, templatesTable } from "@workspace/db";

const router = Router();

const TEMPLATES = [
  { name: "Node.js Express API", language: "javascript", description: "REST API with Express.js, middleware setup, and route examples", category: "Backend", tags: ["node", "express", "api", "rest"] },
  { name: "React App", language: "javascript", description: "React with hooks, routing, and component examples using Create React App patterns", category: "Frontend", tags: ["react", "spa", "frontend"] },
  { name: "Next.js Full Stack", language: "typescript", description: "Full-stack Next.js with API routes, TypeScript, and Tailwind CSS", category: "Full Stack", tags: ["next.js", "typescript", "tailwind", "fullstack"] },
  { name: "Python Flask API", language: "python", description: "Flask REST API with authentication, database models, and Swagger docs", category: "Backend", tags: ["python", "flask", "api"] },
  { name: "FastAPI Service", language: "python", description: "Modern Python API with automatic validation, async support, and OpenAPI", category: "Backend", tags: ["python", "fastapi", "async", "api"] },
  { name: "Go HTTP Server", language: "go", description: "Lightweight Go HTTP server with routing, middleware, and JSON handling", category: "Backend", tags: ["go", "golang", "http"] },
  { name: "Rust Web Service", language: "rust", description: "High-performance Rust web service using Axum framework", category: "Backend", tags: ["rust", "axum", "performance"] },
  { name: "Static Website", language: "html", description: "Responsive HTML/CSS/JS website with modern layout and animations", category: "Frontend", tags: ["html", "css", "javascript", "static"] },
  { name: "TypeScript CLI Tool", language: "typescript", description: "Command-line tool with argument parsing, config handling, and TypeScript", category: "Tools", tags: ["typescript", "cli", "node"] },
  { name: "Discord Bot", language: "javascript", description: "Discord.js bot with slash commands, event handling, and database integration", category: "Bots", tags: ["discord", "bot", "node"] },
  { name: "Machine Learning Pipeline", language: "python", description: "ML pipeline with data preprocessing, model training, and evaluation", category: "Data Science", tags: ["python", "ml", "scikit-learn", "numpy"] },
  { name: "GraphQL API", language: "typescript", description: "GraphQL server with Apollo, type generation, and resolvers", category: "Backend", tags: ["graphql", "apollo", "typescript"] },
];

async function seedTemplates() {
  const existing = await db.select().from(templatesTable).limit(1);
  if (existing.length === 0) {
    await db.insert(templatesTable).values(
      TEMPLATES.map((t) => ({ ...t, starterFiles: 3 }))
    );
  }
}

seedTemplates().catch(console.error);

router.get("/", async (_req, res) => {
  const templates = await db.select().from(templatesTable);

  const formatted = templates.length > 0
    ? templates.map((t) => ({
        id: t.id,
        name: t.name,
        language: t.language,
        description: t.description,
        category: t.category,
        tags: t.tags ?? [],
        starterFiles: t.starterFiles,
      }))
    : TEMPLATES.map((t, i) => ({ id: i + 1, ...t, starterFiles: 3 }));

  res.json(formatted);
});

export default router;
