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

## Kiosk Deployment

### Product images and customization

In **Admin → Products → Add Product** (or click an existing item), use **Upload image** or select a thumbnail from the saved image library, then save the product. PNG, JPEG and WebP files up to 5 MB are supported; transparency is preserved. **Use default image** restores the existing name-based picture without deleting the uploaded image.

The **Customizable** switch controls the register flow. Turn it off for items such as cookies that should go straight into the cart without sizes, flavors or temperature options. Existing products default to customizable. Prices and option assignments are retained when this switch or the image changes.

Images are optimized to WebP (up to 1024 pixels and 1 MB stored size) and stored in the existing PostgreSQL database. They survive API redeploys and are included in database backups; no Railway volume or separate storage credentials are required. Library listing and upload require the admin PIN. Image URLs are public catalog media and contain no credentials. Identical uploads are reused.

Deploy the API and its additive migrations first, then update the physical kiosk frontend once. Thereafter, new images and product settings arrive with the normal catalog refresh (about 30 seconds online), without rebuilding the kiosk. The current Wyse must keep using the direct Railway API URL documented in `setup.md`. The experimental cash-only sync proxy does not provide the image library endpoints; newly uploaded images need network access, while previously loaded images may remain in the browser cache.

See [infra/product-images.md](infra/product-images.md) for rollout and validation details.

The register runs on a **Dell Wyse 5070** thin client (`rhc-kiosk-01`) running Ubuntu Server 24.04 LTS. On boot it starts nginx, the local sync service, Xorg/Openbox, and Chrome in kiosk mode pointing at `http://127.0.0.1/`. The frontend talks directly to the Railway API for live operation.

**Services on the Wyse:**

| Service | Role |
|---|---|
| `nginx` | Serves the built kiosk frontend |
| `rhc-pos-kiosk.service` | Starts Xorg + Chrome in kiosk mode |
| `rhc-pos-kiosk-sync.service` | Local Node sync/cache service on port 4100 |
| `tailscaled` | Remote access over any network |

**Remote access** — Tailscale keeps the device reachable from anywhere. SSH key is at `~/.ssh/codex_rhc_wyse_ed25519`.

```bash
ssh -i ~/.ssh/codex_rhc_wyse_ed25519 rhc@100.119.238.59
```

**Deploying a frontend change to the Wyse:**

```bash
# SSH in, then:
cd /home/rhc/rhc-pos && git pull
npm run build --workspace @rhc-pos/kiosk
sudo rm -rf /var/www/rhc-pos/* && sudo cp -r apps/kiosk/dist/. /var/www/rhc-pos/
sudo systemctl reload nginx && sudo systemctl restart rhc-pos-kiosk.service
```

For full device details, Wi-Fi state, service file paths, and remaining work see [setup.md](setup.md).
