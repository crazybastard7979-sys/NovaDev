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

### Prerequisites
- Railway account (railway.app)
- GitHub repo with this code
- PostgreSQL and Redis add-ons provisioned on Railway

### Step 1: Provision Services
1. Create a new Railway project
2. Add **PostgreSQL** plugin → Railway sets `DATABASE_URL` automatically
3. Add **Redis** plugin → Railway sets `REDIS_URL` automatically

### Step 2: Deploy API Server
1. Add a new **Service** → connect your GitHub repo
2. Set **Root Directory**: `artifacts/api-server`
3. Set **Build Command**: `pnpm install && pnpm run build`
4. Set **Start Command**: `node --enable-source-maps ./dist/index.mjs`
5. Set environment variables:
   ```
   SESSION_SECRET=<generate 64-char random string>
   OPENAI_API_KEY=<optional>
   ANTHROPIC_API_KEY=<optional>
   NODE_ENV=production
   ```
6. Set **Port**: 8080

### Step 3: Deploy Frontend
1. Add another **Service** → same GitHub repo
2. Set **Root Directory**: `artifacts/cloud-ide`
3. Set **Build Command**: `pnpm install && pnpm run build`
4. Set **Start Command**: serve the `dist/public` folder (use `npx serve dist/public`)
5. Set environment variables:
   ```
   BASE_PATH=/
   NODE_ENV=production
   VITE_API_URL=https://<your-api-service>.railway.app
   ```
   > **Important:** `VITE_API_URL` must be set at **build time** (not just runtime) so the
   > frontend knows where to send API requests. Replace the value with your actual Railway
   > API service URL from Step 2.

### Step 4: Configure Domains
1. For the API service → set custom domain: `api.yourdomain.com`
2. For the frontend service → set custom domain: `yourdomain.com`
3. Railway generates SSL certificates automatically

### Step 5: Database Migration
```bash
# Run once after deployment:
DATABASE_URL=<your-railway-postgres-url> pnpm --filter @workspace/db run push
```

### Step 6: Environment Variable Reference

**API Server variables:**
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | JWT signing secret (min 32 chars) |
| `REDIS_URL` | No | Redis for caching/queuing |
| `OPENAI_API_KEY` | No | For GPT-4o AI features |
| `ANTHROPIC_API_KEY` | No | For Claude AI features |
| `PORT` | Yes | Server port (default: 8080) |
| `NODE_ENV` | Yes | Set to `production` |

**Frontend variables (set at build time):**
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Full URL of the API service (e.g. `https://api.railway.app`) |
| `BASE_PATH` | Yes | URL base path, use `/` unless serving from a sub-path |
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
