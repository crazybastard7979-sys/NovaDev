import { Router } from "express";
import { db, aiMessagesTable, projectsTable, filesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import type { AuthenticatedRequest } from "../lib/auth.js";
import { SendAiMessageBody } from "@workspace/api-zod";

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

async function generateAiResponse(
  message: string,
  context: string,
  history: { role: string; content: string }[],
  model: string
): Promise<string> {
  const openaiKey = process.env["OPENAI_API_KEY"];
  const anthropicKey = process.env["ANTHROPIC_API_KEY"];

  const systemPrompt = `You are NovaDev AI, an expert coding assistant embedded in a cloud IDE.
You help developers write, debug, refactor, and improve code.
You have access to the project context and can see file contents.
Be concise, precise, and developer-focused in your responses.
${context ? `\nProject context:\n${context}` : ""}`;

  if (model.startsWith("claude") && anthropicKey) {
    const messages = [
      ...history.slice(-10).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: message },
    ];

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model === "claude-3-5-sonnet" ? "claude-3-5-sonnet-20241022" : "claude-3-5-sonnet-20241022",
        max_tokens: 2048,
        system: systemPrompt,
        messages,
      }),
    });

    if (resp.ok) {
      const data = (await resp.json()) as { content: Array<{ type: string; text: string }> };
      return data.content[0]?.text ?? "I encountered an error processing your request.";
    }
  }

  if (openaiKey) {
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.slice(-10).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: message },
    ];

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: model === "gpt-4o" ? "gpt-4o" : model === "gpt-4o-mini" ? "gpt-4o-mini" : "gpt-4o-mini",
        messages,
        max_tokens: 2048,
      }),
    });

    if (resp.ok) {
      const data = (await resp.json()) as { choices: Array<{ message: { content: string } }> };
      return data.choices[0]?.message.content ?? "I encountered an error processing your request.";
    }
  }

  return generateFallbackResponse(message);
}

function generateFallbackResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("hello") || lower.includes("hi")) {
    return "Hello! I'm NovaDev AI, your coding assistant. I can help you write code, debug issues, explain concepts, and improve your project. What would you like to work on?";
  }

  if (lower.includes("bug") || lower.includes("error") || lower.includes("fix")) {
    return "To help debug this issue, could you share the error message or the specific code that's causing the problem? I'll analyze it and suggest a fix.";
  }

  if (lower.includes("how") || lower.includes("what") || lower.includes("explain")) {
    return "Great question! To give you the most accurate answer, could you provide more context about what you're working on? I can explain concepts, walk through code, or provide examples.";
  }

  if (lower.includes("function") || lower.includes("write") || lower.includes("create") || lower.includes("generate")) {
    return `I'd be happy to help you write that code. To generate the most relevant implementation, could you specify:\n\n1. The programming language\n2. The expected inputs and outputs\n3. Any specific requirements or constraints\n\nOnce I have those details, I'll generate clean, well-documented code for you.`;
  }

  if (lower.includes("refactor") || lower.includes("improve") || lower.includes("optimize")) {
    return "I can help optimize and refactor your code. Share the code you'd like me to improve, and I'll suggest:\n\n- Performance improvements\n- Better readability and structure\n- Best practices for your language\n- Potential bugs or edge cases";
  }

  return `I understand you're asking about: "${message}"\n\nTo give you the best assistance, please provide more details about your code or what you're trying to achieve. I can help with:\n\n- Writing new code\n- Debugging errors\n- Explaining concepts\n- Code review and optimization\n- Architecture decisions`;
}

router.get("/", async (req: AuthenticatedRequest, res) => {
  const projectId = Number(req.params["id"]);
  if (!(await assertProjectOwner(projectId, req.user!.userId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const messages = await db
    .select()
    .from(aiMessagesTable)
    .where(eq(aiMessagesTable.projectId, projectId))
    .orderBy(aiMessagesTable.createdAt)
    .limit(50);

  res.json(
    messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      projectId: m.projectId,
      createdAt: m.createdAt.toISOString(),
    }))
  );
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  const projectId = Number(req.params["id"]);
  if (!(await assertProjectOwner(projectId, req.user!.userId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const parsed = SendAiMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { message, context = "", model = "gpt-4o-mini" } = parsed.data;

  await db.insert(aiMessagesTable).values({
    role: "user",
    content: message,
    projectId,
  });

  const history = await db
    .select()
    .from(aiMessagesTable)
    .where(eq(aiMessagesTable.projectId, projectId))
    .orderBy(desc(aiMessagesTable.createdAt))
    .limit(20);

  const files = await db
    .select({ name: filesTable.name, content: filesTable.content, path: filesTable.path })
    .from(filesTable)
    .where(eq(filesTable.projectId, projectId))
    .limit(5);

  const fileContext = files
    .filter((f) => f.content.length > 0)
    .map((f) => `File: ${f.path}\n\`\`\`\n${f.content.slice(0, 500)}\n\`\`\``)
    .join("\n\n");

  const fullContext = [context, fileContext].filter(Boolean).join("\n\n");

  const aiResponse = await generateAiResponse(
    message,
    fullContext,
    history.reverse().map((m) => ({ role: m.role, content: m.content })),
    model
  );

  const [saved] = await db
    .insert(aiMessagesTable)
    .values({ role: "assistant", content: aiResponse, projectId })
    .returning();

  res.json({
    id: saved!.id,
    role: saved!.role,
    content: saved!.content,
    projectId: saved!.projectId,
    createdAt: saved!.createdAt.toISOString(),
  });
});

export default router;
