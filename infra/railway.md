# Railway Deployment Baseline

## Services

- `api`: deploy from the repo root with the checked-in [railway.json](E:/Code/RHC POS/railway.json) config
- `postgres`: Railway Postgres service attached to the API via `DATABASE_URL`

The kiosk frontend is not deployed to Railway for production. Build it from `apps/kiosk` and host the generated assets locally on the Ubuntu kiosk machine.

## What The Repo Now Provides

- A production API image at [infra/docker/api.railway.Dockerfile](E:/Code/RHC POS/infra/docker/api.railway.Dockerfile)
- Railway config-as-code at [railway.json](E:/Code/RHC POS/railway.json)
- Health checks on `/health`
- Prisma migrations in [apps/api/prisma/migrations](E:/Code/RHC POS/apps/api/prisma/migrations)
- Pre-deploy additive schema migration without automatic data seeding

## Required API Environment Variables

- `DATABASE_URL`
- `PORT`
- `HOST=0.0.0.0`
- `APP_BASE_URL`
- `CORS_ORIGIN`
- `LOCATION_ID`
- `LOCATION_NAME`
- `REGISTER_ID`
- `REGISTER_NAME`
- `RECOVERY_TTL_SECONDS`
- `ADMIN_PIN_HASH` or `ADMIN_PIN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_LOCATION_ID`
- `STRIPE_READER_ID`

## Railway Setup

1. Create a Railway project.
2. Add a PostgreSQL service.
3. Add a GitHub-backed service pointing at this repository.
4. In the API service, confirm the source repo is this repo root so Railway auto-detects [railway.json](E:/Code/RHC POS/railway.json).
5. Set the required environment variables.
6. Attach a public domain to the API service and use that URL for `APP_BASE_URL`.
7. Set `CORS_ORIGIN` to the kiosk origin you will serve locally on Ubuntu.
8. Keep auto-deploys limited to the `main` branch.

## Deployment Notes

- The pre-deploy command runs `prisma migrate deploy` only. If the database ever needs catalog/bootstrap recovery, run `npm run prisma:restore` manually.
- Configure Stripe webhooks to point at `/v1/stripe/webhooks`.
- The API process now connects to Postgres before listening and handles `SIGTERM`/`SIGINT` cleanly for Railway restarts.
