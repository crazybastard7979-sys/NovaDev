# NovaDev — Deployment Guide

## Quick Start (Local)

```bash
# 1. Clone and install
git clone <your-repo>
cd novadev
pnpm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your values

# 3. Start infrastructure
docker-compose up -d postgres redis

# 4. Push database schema
pnpm --filter @workspace/db run push

# 5. Start API server
pnpm --filter @workspace/api-server run dev

# 6. Start frontend (separate terminal)
pnpm --filter @workspace/cloud-ide run dev
```

---

## Railway Deployment

The entire app — frontend + API + database — deploys as **one Railway service**. No separate frontend service needed.

### Step 1: Create a Railway Project
1. Go to [railway.app](https://railway.app) and create a new project
2. Add a **PostgreSQL** database → Railway sets `DATABASE_URL` automatically
3. (Optional) Add a **Redis** database → Railway sets `REDIS_URL` automatically

### Step 2: Deploy the App
1. Add a new **Service** → connect your GitHub repo
2. Set **Root Directory**: *(leave blank — use repo root)*
3. Set **Build Command**:
   ```
   pnpm install && pnpm --filter @workspace/api-server run build
   ```
4. Set **Start Command**:
   ```
   node --enable-source-maps ./artifacts/api-server/dist/index.mjs
   ```
5. Set environment variables:
   ```
   SESSION_SECRET=<generate a 64-char random string>
   NODE_ENV=production
   OPENAI_API_KEY=<optional>
   ANTHROPIC_API_KEY=<optional>
   ```
6. Railway auto-assigns `PORT` — no need to set it manually

### Step 3: Run Database Migration
After the first deploy, open the Railway shell for your service and run:
```bash
DATABASE_URL=<your-railway-postgres-url> pnpm --filter @workspace/db run push
```

### Step 4: Done
Your app is live at the Railway-provided URL. The same URL serves both the React UI and the API.

### Environment Variable Reference
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Set automatically by Railway PostgreSQL plugin |
| `SESSION_SECRET` | Yes | JWT signing secret (min 32 chars) |
| `REDIS_URL` | No | Set automatically by Railway Redis plugin |
| `OPENAI_API_KEY` | No | For GPT-4o AI features |
| `ANTHROPIC_API_KEY` | No | For Claude AI features |
| `PORT` | Auto | Set automatically by Railway |
| `NODE_ENV` | Yes | Set to `production` |

---

## Docker Compose (Self-Hosted)

```bash
# Production deployment
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f api

# Restart a service
docker-compose restart api
```

---

## Architecture Overview

```
                     Internet
                        │
                    [NGINX / Proxy]
                   /              \
           /api/*                  /*
              │                    │
         [API Server]        [Frontend]
         Express + WS         React + Vite
              │
    ┌─────────┴─────────┐
    │                   │
[PostgreSQL]         [Redis]
  (primary DB)     (cache/queue)
```

### Services
| Service | Port | Purpose |
|---------|------|---------|
| API Server | 8080 | REST API + WebSocket terminal |
| Frontend | 3000 | React SPA |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Cache, sessions, queue |
| NGINX | 80/443 | Reverse proxy, SSL termination |

---

## Production Checklist

- [ ] Change `SESSION_SECRET` to a strong random value
- [ ] Set strong `POSTGRES_PASSWORD` and `REDIS_PASSWORD`
- [ ] Configure SSL certificates for your domain
- [ ] Set `NODE_ENV=production`
- [ ] Configure NGINX with your domain name
- [ ] Run database migrations (`pnpm --filter @workspace/db run push`)
- [ ] Set up monitoring (optional: Grafana + Prometheus)
- [ ] Configure backups for PostgreSQL data volume
- [ ] Add AI API keys (OpenAI / Anthropic) for AI features

---

## Troubleshooting

### API server won't start
```bash
# Check logs
docker-compose logs api

# Verify database connection
docker-compose exec postgres psql -U novadev -c "SELECT 1"
```

### WebSocket terminal not connecting
- Ensure `/api/ws/` is listed in NGINX upstream proxy config
- Check `SESSION_SECRET` matches between frontend token and API

### AI features not responding
- Verify `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` is set
- App falls back to intelligent responses without API keys

### Database schema out of sync
```bash
pnpm --filter @workspace/db run push
```

---

## Scaling Recommendations

For production at scale:
1. **Horizontal API scaling**: Run multiple API instances behind NGINX `upstream`
2. **Database read replicas**: Add PostgreSQL read replicas for heavy queries
3. **Redis clustering**: Use Redis Cluster for high-availability caching
4. **CDN**: Put static frontend assets behind Cloudflare or CloudFront
5. **Container orchestration**: Migrate `docker-compose.yml` to Kubernetes for auto-scaling
