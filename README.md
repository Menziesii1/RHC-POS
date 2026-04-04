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
6. Seed sample data with `npm run prisma:seed`.
7. Run the API and kiosk locally, or start the stack with Docker Compose.

## Key Commands

- `npm run build`
- `npm run test`
- `npm run dev:api`
- `npm run dev:kiosk`
- `npm run dev:docker`

## Local Development Notes

- The API defaults to mock Stripe mode until `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_READER_ID` are configured.
- Docker Compose bootstraps Postgres with `prisma db push` plus the seed script.
- The default sample catalog and cashier list come from `apps/api/prisma/seed.ts`.

## Production Notes

- Card payments are strictly `card_present` via Stripe Terminal. No online checkout is supported.
- The kiosk frontend is intended to be deployed locally on the register machine while the API and Postgres live in Railway.
- Stripe Terminal smart-reader support is wired around the server-driven flow. The API remains the source of truth for payment state.
