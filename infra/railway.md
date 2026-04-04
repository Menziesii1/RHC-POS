# Railway Deployment Baseline

## Services

- `api`: deploy from the repo root using `infra/docker/api.Dockerfile`
- `postgres`: Railway Postgres service

The kiosk frontend is not deployed to Railway for production. Build it from `apps/kiosk` and host the generated assets locally on the Ubuntu kiosk machine.

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

## Deployment Notes

- Keep production auto-deploys on `main` only.
- Enable Railway healthchecks against `/health`.
- Run `npx prisma db push --schema apps/api/prisma/schema.prisma` and `npm run prisma:seed` during initial provisioning if the database is empty.
- Configure Stripe webhooks to point at `/v1/stripe/webhooks`.
