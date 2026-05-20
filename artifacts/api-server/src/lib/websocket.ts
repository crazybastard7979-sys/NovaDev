import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { verifyToken } from "./auth.js";
import { logger } from "./logger.js";

interface TerminalSession {
  projectId: number;
  userId: number;
  history: string[];
  cwd: string;
  env: Record<string, string>;
}

const sessions = new Map<string, TerminalSession>();

const SHELL_RESPONSES: Record<string, (args: string[], session: TerminalSession) => string> = {
  ls: (args, session) => {
    const path = args[0] ?? session.cwd;
    return [
      "\x1b[34mnode_modules/\x1b[0m  \x1b[34msrc/\x1b[0m  \x1b[34mdist/\x1b[0m",
      "index.js  package.json  README.md  tsconfig.json  .env.example",
    ].join("\n");
  },
  pwd: (_, session) => session.cwd,
  echo: (args) => args.join(" "),
  cat: (args) => {
    const file = args[0];
    if (!file) return "cat: missing operand";
    if (file === "package.json") {
      return JSON.stringify({ name: "my-project", version: "1.0.0", scripts: { start: "node index.js", test: "jest" } }, null, 2);
    }
    if (file === "README.md") return "# My Project\n\nBuilt with NovaDev.\n";
    return `cat: ${file}: No such file or directory`;
  },
  node: (args) => {
    if (args[0] === "-v" || args[0] === "--version") return "v22.0.0";
    if (args[0] === "-e") {
      const code = args.slice(1).join(" ");
      try {
        const result = Function('"use strict"; return (' + code + ')')();
        return String(result);
      } catch {
        return "SyntaxError: Invalid or unexpected token";
      }
    }
    return "Welcome to Node.js v22.0.0.\nType '.help' for more information.";
  },
  npm: (args) => {
    const sub = args[0];
    if (sub === "install" || sub === "i") {
      const pkg = args.slice(1).join(" ") || "all dependencies";
      return [
        `\nadded 42 packages in 3.2s`,
        `\n\x1b[32mfound 0 vulnerabilities\x1b[0m`,
      ].join("\n");
    }
    if (sub === "start") return "Starting application...\nServer listening on port 3000";
    if (sub === "test") return "\x1b[32m✓\x1b[0m All tests passed (3 suites, 12 tests)";
    if (sub === "run") return `> ${args[1]}\nCompleted.`;
    return `npm ${args.join(" ")}`;
  },
  python: (args) => {
    if (args[0] === "--version" || args[0] === "-V") return "Python 3.11.0";
    if (args[0] === "-c") {
      const code = args.slice(1).join(" ");
      if (code.includes("print")) {
        const match = code.match(/print\(["'](.+?)["']\)/);
        if (match) return match[1];
      }
      return "";
    }
    return "Python 3.11.0 (default)\nType 'help', 'copyright' or 'quit' to quit.";
  },
  python3: (args) => SHELL_RESPONSES["python"]!(args, {} as TerminalSession),
  pip: (args) => {
    if (args[0] === "install") {
      return `Collecting ${args.slice(1).join(", ")}\nSuccessfully installed ${args.slice(1).join(", ")}`;
    }
    return "pip 23.0 from /usr/lib/python3/dist-packages/pip (python 3.11)";
  },
  go: (args) => {
    if (args[0] === "version") return "go version go1.21 linux/amd64";
    if (args[0] === "run") return "Running...";
    if (args[0] === "build") return "Build successful";
    return `go ${args.join(" ")}`;
  },
  git: (args) => {
    const sub = args[0];
    if (sub === "status") return "On branch main\nnothing to commit, working tree clean";
    if (sub === "log") return "commit a1b2c3d (HEAD -> main)\nAuthor: Developer <dev@novadev.app>\nDate: Today\n\n    Initial commit";
    if (sub === "init") return "Initialized empty Git repository in /workspace/.git/";
    if (sub === "add") return "";
    if (sub === "commit") return "[main (root-commit) a1b2c3d] Initial commit\n 3 files changed, 42 insertions(+)";
    if (sub === "push") return "Everything up-to-date";
    if (sub === "clone") return `Cloning into '${args[1]?.split("/").pop() ?? "repo"}'...\nDone.`;
    return `git ${args.join(" ")}`;
  },
  clear: () => "\x1b[2J\x1b[H",
  help: () => [
    "Available commands: ls, pwd, echo, cat, node, npm, python, pip, git, clear, whoami, date, env",
    "This is a simulated terminal running in the NovaDev cloud environment.",
    "Full terminal support is available in the Pro tier.",
  ].join("\n"),
  whoami: () => "developer",
  date: () => new Date().toString(),
  env: (_, session) =>
    Object.entries({ ...session.env, HOME: "/home/developer", USER: "developer", SHELL: "/bin/bash" })
      .map(([k, v]) => `${k}=${v}`)
      .join("\n"),
  mkdir: (args) => (args[0] ? "" : "mkdir: missing operand"),
  touch: (args) => (args[0] ? "" : "touch: missing operand"),
  rm: (args) => (args.includes("-rf") ? "" : args[0] ? "" : "rm: missing operand"),
  cp: () => "",
  mv: () => "",
  curl: (args) => {
    const url = args.find((a) => !a.startsWith("-")) ?? "";
    return `  % Total    % Received % Xferd  Average Speed\n  0     0    0     0    0     0      0      0\nConnected to ${url}`;
  },
  which: (args) => `/usr/bin/${args[0] ?? ""}`,
  uname: (args) => {
    if (args.includes("-a")) return "Linux novadev-container 6.1.0 #1 SMP x86_64 GNU/Linux";
    return "Linux";
  },
};

function processCommand(input: string, session: TerminalSession): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  session.history.push(trimmed);

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0]!.toLowerCase();
  const args = parts.slice(1);

  if (cmd === "cd") {
    const dir = args[0] ?? "~";
    if (dir === "~" || dir === "/home/developer") {
      session.cwd = "/workspace";
      return "";
    }
    if (dir === "..") {
      const parts = session.cwd.split("/").filter(Boolean);
      parts.pop();
      session.cwd = "/" + parts.join("/") || "/workspace";
      return "";
    }
    session.cwd = `${session.cwd}/${dir}`.replace(/\/+/g, "/");
    return "";
  }

  const handler = SHELL_RESPONSES[cmd];
  if (handler) {
    return handler(args, session);
  }

  return `${cmd}: command not found`;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/api/ws/terminal" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const token = url.searchParams.get("token");
    const projectId = Number(url.searchParams.get("projectId") ?? "0");

    let userId: number;
    try {
      if (!token) throw new Error("No token");
      const payload = verifyToken(token);
      userId = payload.userId;
    } catch {
      ws.send(JSON.stringify({ type: "error", data: "\r\nAuthentication failed. Please reconnect.\r\n" }));
      ws.close();
      return;
    }

    const sessionId = `${userId}-${projectId}-${Date.now()}`;
    const session: TerminalSession = {
      projectId,
      userId,
      history: [],
      cwd: "/workspace",
      env: { PATH: "/usr/local/bin:/usr/bin:/bin", NODE_ENV: "development" },
    };
    sessions.set(sessionId, session);

    logger.info({ userId, projectId }, "Terminal session connected");

    ws.send(JSON.stringify({
      type: "output",
      data: [
        "\x1b[36m╔══════════════════════════════════════════════╗\x1b[0m",
        "\x1b[36m║\x1b[0m   \x1b[1m\x1b[35mNovaDev\x1b[0m Cloud Terminal  \x1b[32m● Connected\x1b[0m       \x1b[36m║\x1b[0m",
        "\x1b[36m╚══════════════════════════════════════════════╝\x1b[0m",
        "",
        `\x1b[32mWelcome!\x1b[0m Running in isolated container (Project #${projectId})`,
        "Type \x1b[33mhelp\x1b[0m for available commands.\r\n",
      ].join("\r\n"),
    }));

    ws.send(JSON.stringify({ type: "prompt", data: `\x1b[32mdev\x1b[0m@\x1b[34mnovadev\x1b[0m:\x1b[33m${session.cwd}\x1b[0m$ ` }));

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString()) as { type: string; data: string };
        if (msg.type === "input") {
          const output = processCommand(msg.data, session);
          if (output) {
            ws.send(JSON.stringify({ type: "output", data: output + "\r\n" }));
          }
          ws.send(JSON.stringify({ type: "prompt", data: `\x1b[32mdev\x1b[0m@\x1b[34mnovadev\x1b[0m:\x1b[33m${session.cwd}\x1b[0m$ ` }));
        }
      } catch {
        logger.warn("Failed to parse terminal message");
      }
    });

    ws.on("close", () => {
      sessions.delete(sessionId);
      logger.info({ sessionId }, "Terminal session closed");
    });

    ws.on("error", (err) => {
      logger.error({ err }, "WebSocket error");
    });
  });

  return wss;
}
