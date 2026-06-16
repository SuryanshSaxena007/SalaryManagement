# Deploy Runbook

Deploy order matters: **Railway first, then Vercel**. Vercel needs the public
Railway URL to set `FASTAPI_URL` / `NEXT_PUBLIC_API_URL` before the first
build.

## Railway (FastAPI backend)

1. Install the CLI and authenticate:
   ```bash
   brew install railway
   railway login
   ```
2. From `backend/`, initialise the project and attach a persistent volume
   mounted at `/data` (used by SQLite):
   ```bash
   cd backend
   railway init
   railway volume create salary-data --mount-path /data
   ```
3. Set environment variables on the Railway service (Dashboard → Variables, or
   `railway variables set`):
   - `APP_DATABASE_URL=sqlite+aiosqlite:////data/app.db` (four slashes — absolute path)
   - `APP_CORS_ORIGINS=https://<your-vercel-app>.vercel.app,http://localhost:3000`
   - `APP_ENV=prod`
   - `PORT` is injected by Railway; the Dockerfile honors `${PORT:-8000}`.
4. Deploy:
   ```bash
   railway up
   ```
5. Copy the generated public domain (`https://<service>.up.railway.app`); you'll
   need it for the Vercel env vars below.

`railway.toml` pins the builder to the Dockerfile, sets the `/health`
healthcheck, and restarts on failure up to 3 times.

## Vercel (Next.js frontend)

1. From `frontend/`, link the project:
   ```bash
   cd frontend
   vercel link
   ```
2. **Before the first deploy**, set the two API env vars. They must point at
   the Railway URL captured above:
   - `FASTAPI_URL=https://<service>.up.railway.app` — server-only, used by
     Next.js Route Handlers / Server Components.
   - `NEXT_PUBLIC_API_URL=https://<service>.up.railway.app` — exposed to the
     browser bundle.
   ```bash
   vercel env add FASTAPI_URL production
   vercel env add NEXT_PUBLIC_API_URL production
   ```
3. Deploy:
   ```bash
   vercel --prod
   ```
4. Copy the production Vercel URL, then go back to Railway and update
   `APP_CORS_ORIGINS` to include it. Re-deploy Railway (`railway up`) so the
   new CORS allowlist takes effect.

## Post-deploy smoke

```bash
export RAILWAY_URL=https://<service>.up.railway.app
export VERCEL_URL=https://<app>.vercel.app

# Liveness
curl -sf "$RAILWAY_URL/health"
# → {"status":"ok"}

# Seed completed (10k employees)
curl -sf "$RAILWAY_URL/api/v1/employees/?limit=1" | jq '.total'
# → 10000

# Frontend reachable
curl -sfo /dev/null -w "%{http_code}\n" "$VERCEL_URL/employees"
# → 200
```

If `/health` returns 200 but `total` is not 10000, check Railway logs — the
seed step may still be running for a cold container (allow ~30s on first
boot).

## Idempotency

`seeds/seed.py` is **idempotent by default**: `seed_database()` only deletes
existing rows when `--reset` is passed. The production `CMD` does NOT pass
`--reset`, so:

- A container restart on the persistent `/data` volume re-runs
  `alembic upgrade head` (no-op if already at head) and
  `python -m seeds.seed --count 10000`.
- The seed skips any `ACME-NNNNN` employee_code that already exists, so no
  duplicates and no churn on restart.
- Safe to redeploy or scale the Railway service without losing or corrupting
  data.

Never add `--reset` to the production start command.
