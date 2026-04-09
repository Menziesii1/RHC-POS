# Railway Deployment Baseline

## Services

- `api`: deploy from the repo root with `DEPLOY_TARGET=api`
- `kiosk`: deploy from the repo root with `DEPLOY_TARGET=kiosk`
- `postgres`: Railway Postgres service attached to the API via `DATABASE_URL`

## What The Repo Now Provides

- A shared Railway config in [railway.json](E:/Code/RHC POS/railway.json)
- Health checks on `/`
- Prisma migrations in [apps/api/prisma/migrations](E:/Code/RHC POS/apps/api/prisma/migrations)
- A kiosk build that can be served externally from Railway
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

## Required Kiosk Environment Variables

- `DEPLOY_TARGET=kiosk`
- `VITE_API_BASE_URL=https://<api-domain>/v1`
- `VITE_REGISTER_ID`

## Railway Setup

1. Create a Railway project.
2. Add a PostgreSQL service.
3. Add two GitHub-backed services pointing at this repository.
4. Set `DEPLOY_TARGET=api` on the API service and `DEPLOY_TARGET=kiosk` on the kiosk service.
5. Set the required environment variables for each service.
6. Attach a public domain to the API service and use that URL for `APP_BASE_URL`.
7. Attach a public domain to the kiosk service and set `VITE_API_BASE_URL` to the API domain with `/v1` appended.
8. Set `CORS_ORIGIN` on the API service to the kiosk origin, or include both local and Railway kiosk origins as a comma-separated list.
9. Keep auto-deploys limited to the `main` branch.

## Deployment Notes

- The pre-deploy command runs `prisma migrate deploy` only for the API service. If the database ever needs catalog/bootstrap recovery, run `npm run prisma:restore` manually.
- Configure Stripe webhooks to point at `/v1/stripe/webhooks`.
- The API process now connects to Postgres before listening and handles `SIGTERM`/`SIGINT` cleanly for Railway restarts.
- The kiosk service is just the compiled Vite app, so it can be opened directly from its Railway domain on tablets or external browsers.
