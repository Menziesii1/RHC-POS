# RHC POS

RHC POS is a kiosk-first, in-store point of sale system for a church coffee shop. The frontend runs locally on an Ubuntu kiosk in Chromium fullscreen mode. The backend runs on Railway and integrates with Stripe Terminal smart readers using Stripe's server-driven flow.

## Workspace Layout

- `apps/kiosk`: React/Vite touchscreen register UI
- `apps/api`: Fastify API, Prisma schema, Stripe Terminal orchestration
- `packages/shared`: Shared contracts and utility schemas
- `infra`: Docker, kiosk, and deployment support files

## Quick Start

1. Copy `apps/api/.env.example` to `apps/api/.env`.
2. Copy `apps/kiosk/.env.example` to `apps/kiosk/.env`.
3. Install dependencies with `npm install`.
4. Generate the Prisma client with `npm run prisma:generate`.
5. Initialize the schema with `npx prisma db push --schema apps/api/prisma/schema.prisma`.
6. If you need to rebuild catalog/bootstrap data after a database loss, run `npm run prisma:restore`.
7. Run the API and kiosk locally, or start the stack with Docker Compose.

## Key Commands

- `npm run build`
- `npm run test`
- `npm run dev:api`
- `npm run dev:kiosk`
- `npm run dev:docker`

## Local Development Notes

- The API defaults to mock Stripe mode until `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_READER_ID` are configured.
- Docker Compose applies the Prisma schema with `prisma db push` and does not load catalog data automatically.
- The manual backup restore lives in [apps/api/prisma/backup-seed.ts](E:/Code/RHC POS/apps/api/prisma/backup-seed.ts) and is additive-only.

## Production Notes

- Card payments are strictly `card_present` via Stripe Terminal. No online checkout is supported.
- The kiosk frontend can run locally on the register machine or be deployed as a separate Railway service, depending on the deployment target.
- Stripe Terminal smart-reader support is wired around the server-driven flow. The API remains the source of truth for payment state.
- Railway deployment for the API and kiosk is checked in via [railway.json](E:/Code/RHC POS/railway.json).
- Production database changes are applied with Prisma migrations from [apps/api/prisma/migrations](E:/Code/RHC POS/apps/api/prisma/migrations). Catalog/bootstrap restore is manual via `npm run prisma:restore`.
