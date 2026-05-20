# NovaDev Cloud IDE

A full-scale, browser-based AI-powered development platform where developers create projects, edit files, run code in a simulated terminal, deploy apps, and collaborate — all from the browser.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/cloud-ide run dev` — run the frontend IDE (port varies)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 22, TypeScript 5.9
- Frontend: React + Vite, TailwindCSS, shadcn/ui, wouter, Framer Motion, react-resizable-panels
- API: Express 5 + WebSocket (ws)
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (jsonwebtoken + bcryptjs)
- AI: OpenAI / Anthropic integration (with intelligent fallback)
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/cloud-ide/` — React + Vite frontend IDE application
- `artifacts/api-server/` — Express REST API + WebSocket terminal server
- `lib/db/src/schema/` — Drizzle ORM schema (users, projects, files, ai_messages, deployments, templates)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/api-client-react/` — Generated React Query hooks (from codegen)
- `lib/api-zod/` — Generated Zod schemas (from codegen)
- `docker-compose.yml` — Full production stack (Postgres, Redis, API, Frontend, NGINX)
- `nginx/nginx.conf` — Reverse proxy config with rate limiting and WebSocket support
- `DEPLOYMENT.md` — Full Railway + Docker deployment guide

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed React Query hooks and Zod validators
- JWT auth stored in localStorage under key `novadev_token`, passed as Bearer token
- WebSocket terminal at `/api/ws/terminal` — authenticated via query param `token`
- File tree stored in DB as flat list with parentId references, reconstructed as tree in API
- AI fallback: if no API key is set, returns contextual intelligent responses (not generic errors)
- Simulated terminal in the browser with realistic shell command emulation
- Deployments are simulated with realistic build log streaming

## Product

- **Dashboard**: Project grid with stats, recent activity, language breakdown charts
- **IDE**: Full VSCode-style layout — file tree, editor tabs, terminal panel, AI chat sidebar, resizable panels
- **Templates**: 12 starter templates across languages (JS, TS, Python, Go, Rust, HTML)
- **Deployments**: Deploy dashboard with history, build logs, environment management
- **AI Chat**: Per-project AI assistant with message history, multiple model support
- **Auth**: JWT-based register/login with plan tiers (free/pro/team/enterprise)

## User preferences

_No explicit preferences captured yet._

## Gotchas

- After adding new DB schema files, run `pnpm run typecheck:libs` before typechecking api-server
- WebSocket path `/api/ws/terminal` must be listed in NGINX config paths
- The `ws` package is a runtime dependency (not devDependency) in api-server
- Templates are seeded automatically on first request to `/api/templates`
- AI works without API keys — the fallback generates contextual developer-focused responses

## Pointers

- See `pnpm-workspace` skill for workspace structure
- See `DEPLOYMENT.md` for Railway + Docker deployment steps
- DB schema: `lib/db/src/schema/index.ts` re-exports all tables
- API routes: `artifacts/api-server/src/routes/index.ts` wires all routers
