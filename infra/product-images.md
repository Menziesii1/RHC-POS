# Product image library and customization rollout

The image bytes live in Railway Postgres, alongside the catalog. The API accepts authenticated raw PNG/JPEG/WebP uploads at `POST /v1/admin/product-images?name=...` using `x-admin-pin`, lists metadata at `GET /v1/admin/product-images`, and serves immutable optimized pictures at `GET /v1/product-images/:id`. Images are location-scoped. No image deletion is included in this release; clearing a product's selection leaves the library intact.

Uploads are decoded and re-encoded with sharp, with a 5 MB input limit, a 25 megapixel decode limit, a 1024-pixel bounding box and a 1 MB stored-image limit. Animation and non-raster formats are rejected. Re-encoding strips file metadata while retaining transparency. Resize and format behavior follow the [sharp documentation](https://sharp.pixelplumbing.com/api-resize/) and [WebP output documentation](https://sharp.pixelplumbing.com/api-output/#webp).

## Data preservation

- `20260928000000_product_images` creates `ProductImage` and adds nullable `Product.imageId`.
- `20260928000001_product_customization` adds `Product.customizable` with a default of `true`.
- Neither migration drops, resets, seeds or deletes catalog, order, payment or settings data.
- Older kiosk clients omit both fields when saving products; the API preserves existing values when they are omitted. An explicit `imageId: null` restores the bundled fallback.
- Turning customization off retains size/flavor assignments for use if turned on again. New orders for non-customizable products use base pricing without a default size and reject option selections.

## Deployment sequence

1. Deploy the API on Railway using the existing project. Its configured pre-deploy step is `prisma migrate deploy`; do not run a reset or seed. Confirm `/health` succeeds and `/v1/bootstrap` returns `imageId` and `customizable` on products.
2. On `rhc-kiosk-01`, ensure no sale is in progress. Inspect the checkout for local changes and preserve them before pulling. Install dependencies and rebuild shared contracts and the kiosk with Node 24. Keep the kiosk's existing `.env` pointing directly to Railway.
3. Back up the served frontend, copy the new assets first, then replace `index.html` last. Restart the kiosk browser. The following commands affect web files only; they do not touch `/var/lib/rhc-pos/kiosk-sync.sqlite`, Chrome's profile, kiosk `.env` files, or service definitions.

```bash
cd /home/rhc/rhc-pos
git status --short
# Continue only once any local changes have been preserved.
git pull --ff-only
npm ci
npm run build:kiosk
backup_dir="/var/www/rhc-pos-backup-$(date +%Y%m%d-%H%M%S)"
sudo cp -a /var/www/rhc-pos "$backup_dir"
sudo cp -a apps/kiosk/dist/assets/. /var/www/rhc-pos/assets/
# Retain old hashed assets so already-open pages continue to work.
for web_file in apps/kiosk/dist/*; do
  if [ -f "$web_file" ] && [ "$(basename "$web_file")" != index.html ]; then
    sudo cp "$web_file" /var/www/rhc-pos/
  fi
done
sudo install -m 644 apps/kiosk/dist/index.html /var/www/rhc-pos/index.html
sudo systemctl reload nginx
sudo systemctl restart rhc-pos-kiosk.service
```

4. In Admin → Products, upload/select images for Cookie and T Shirt. Set Cookie's Customizable switch off, save, then confirm a cookie tap adds one $2 item directly while a drink still opens its options.
5. Confirm product counts, prices and existing transactions remain intact. No sales need to be created for this check.

Deploy the new frontend before turning customization off in production: an older kiosk can still offer options that the new API correctly rejects for a non-customizable item. To roll the web UI back, restore the saved frontend files; leave the additive database fields and uploaded images in place. Re-enable customization before running an older frontend for affected products.

## Local verification

Use Node 24. Run `npm ci`, `npm run prisma:generate`, `npm run prisma:deploy`, `npm run build`, `npm test`, plus the kiosk-sync workspace build and tests. Use an isolated local database and mock payments. For a new local API environment, supply a valid `REFUND_PIN` along with the `.env.example` values.

API tests cover authorization, invalid/oversized uploads, alpha preservation, deduplication, cache headers, assignment, legacy-client preservation, creation and non-customizable order pricing. Frontend tests cover selection, upload failure, fallback rendering, native file input behavior and preservation of product options during editing. Browser checks cover real upload/save and direct cart entry.
