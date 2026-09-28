import { afterEach, beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { MAX_PRODUCT_IMAGE_BYTES } from "@rhc-pos/shared";
import { createApp } from "../app.js";
import { testConfig } from "./config.js";
import { MemoryPosRepository } from "../repositories/memory-repository.js";

let app: Awaited<ReturnType<typeof createApp>>;
const headers = { "x-admin-pin": "2468", "content-type": "image/png" };
let png: Buffer;

beforeEach(async () => {
  app = await createApp({ config: testConfig, repository: new MemoryPosRepository() });
  png = await sharp({ create: { width: 1200, height: 600, channels: 4, background: { r: 100, g: 20, b: 40, alpha: 0.5 } } }).png().toBuffer();
});
afterEach(async () => { await app.close(); });

const upload = () => app.inject({ method: "POST", url: "/v1/admin/product-images?name=Cookie.png", headers, payload: png });

describe("product image library", () => {
  it("requires admin authorization for listing and uploading", async () => {
    expect((await app.inject({ url: "/v1/admin/product-images" })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/v1/admin/product-images?name=a", headers: { "content-type": "image/png" }, payload: png })).statusCode).toBe(401);
    expect((await app.inject({ url: "/v1/admin/product-images", headers: { "x-admin-pin": "9999" } })).statusCode).toBe(401);
  });

  it("optimizes uploads, preserves alpha, deduplicates, and serves cacheable pictures without credentials", async () => {
    const response = await upload();
    expect(response.statusCode).toBe(201);
    const image = response.json();
    expect(image).toMatchObject({ name: "Cookie.png", width: 1024, height: 512, contentType: "image/webp" });
    expect(image.data).toBeUndefined();
    expect((await upload()).json().id).toBe(image.id);
    const list = await app.inject({ url: "/v1/admin/product-images", headers: { "x-admin-pin": "2468" } });
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].data).toBeUndefined();
    const picture = await app.inject({ url: `/v1/product-images/${image.id}` });
    expect(picture.statusCode).toBe(200);
    expect(picture.headers["content-type"]).toBe("image/webp");
    expect(picture.headers["cache-control"]).toContain("immutable");
    expect((await sharp(picture.rawPayload).metadata()).hasAlpha).toBe(true);
    const cached = await app.inject({ url: `/v1/product-images/${image.id}`, headers: { "if-none-match": String(picture.headers.etag) } });
    expect(cached.statusCode).toBe(304);
  });

  it("rejects corrupt files, disguised SVGs, oversized files and missing names", async () => {
    for (const payload of [Buffer.from("not an image"), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"></svg>')]) {
      expect((await app.inject({ method: "POST", url: "/v1/admin/product-images?name=bad.png", headers, payload })).statusCode).toBe(400);
    }
    expect((await app.inject({ method: "POST", url: "/v1/admin/product-images?name=big.png", headers, payload: Buffer.alloc(MAX_PRODUCT_IMAGE_BYTES + 1) })).statusCode).toBe(413);
    expect((await app.inject({ method: "POST", url: "/v1/admin/product-images", headers, payload: png })).statusCode).toBe(400);
    expect((await app.inject({ url: "/v1/product-images/not-an-id" })).statusCode).toBe(404);
  });

  it("persists selections, preserves them for old clients, and allows returning to the default", async () => {
    const image = (await upload()).json();
    const product = (await app.inject({ url: "/v1/bootstrap" })).json().products.find((p: { id: string }) => p.id === "mocha");
    const save = (payload: Record<string, unknown>) => app.inject({ method: "PATCH", url: "/v1/admin/products/mocha", headers: { "x-admin-pin": "2468" }, payload });
    expect((await save({ ...product, imageId: image.id, customizable: false })).json()).toMatchObject({ imageId: image.id, customizable: false, priceCents: product.priceCents });
    expect((await save(product)).json()).toMatchObject({ imageId: image.id, customizable: false });
    expect((await save({ ...product, imageId: "00000000-0000-4000-8000-000000000000" })).statusCode).toBe(400);
    expect((await save({ ...product, imageId: null })).json().imageId).toBeNull();
    expect((await app.inject({ url: `/v1/product-images/${image.id}` })).statusCode).toBe(200);
  });

  it("adds non-customizable items without a default size surcharge and rejects option charges", async () => {
    const product = (await app.inject({ url: "/v1/bootstrap" })).json().products.find((p: { id: string }) => p.id === "mocha");
    const saved = await app.inject({ method: "PATCH", url: "/v1/admin/products/mocha", headers: { "x-admin-pin": "2468" }, payload: { ...product, customizable: false, sizeOptionPrices: [{ sizeOptionId: "regular", priceDeltaCents: 125 }] } });
    expect(saved.statusCode).toBe(200);
    const order = await app.inject({ method: "POST", url: "/v1/orders", payload: { items: [{ productId: "mocha", quantity: 2, modifierIds: [] }] } });
    expect(order.statusCode).toBe(200);
    expect(order.json().totalCents).toBe(product.priceCents * 2);
    expect(order.json().lines[0].sizeOptionId).toBeNull();
    const invalid = await app.inject({ method: "POST", url: "/v1/orders", payload: { items: [{ productId: "mocha", quantity: 1, modifierIds: ["extra-shot"] }] } });
    expect(invalid.statusCode).toBe(400);
  });

  it("creates a new non-customizable product with an uploaded image", async () => {
    const image = (await upload()).json();
    const response = await app.inject({ method: "POST", url: "/v1/admin/products", headers: { "x-admin-pin": "2468" }, payload: {
      name: "Cookie", categoryId: "food", priceCents: 200, imageId: image.id, customizable: false,
    } });
    expect(response.statusCode).toBe(200);
    const bootstrap = (await app.inject({ url: "/v1/bootstrap" })).json();
    expect(bootstrap.products.find((p: { id: string }) => p.id === "cookie")).toMatchObject({ imageId: image.id, customizable: false, priceCents: 200 });
  });
});
