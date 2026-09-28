import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import sharp from "sharp";
import { z } from "zod";
import { MAX_PRODUCT_IMAGE_BYTES } from "@rhc-pos/shared";
import { HttpError } from "../lib/http-error.js";
import type { PosRepository } from "../repositories/types.js";
import type { PosService } from "../services/pos-service.js";

const nameSchema = z.object({ name: z.string().trim().min(1).max(120) });
const idSchema = z.object({ id: z.string().uuid() });

export function registerProductImageRoutes(app: FastifyInstance, repository: PosRepository, pos: PosService) {
  const authenticate = async (request: { headers: Record<string, unknown> }) => {
    const pin = request.headers["x-admin-pin"];
    // Authenticate before reading or decoding an upload.
    if (typeof pin !== "string" || !pin) throw new HttpError(401, "Admin PIN is required.");
    await pos.verifyAdminPin({ pin });
  };

  app.addContentTypeParser(["image/png", "image/jpeg", "image/webp"], { parseAs: "buffer" }, (_request, body, done) => done(null, body));

  app.get("/v1/admin/product-images", { onRequest: authenticate }, () => repository.listProductImages());

  app.post("/v1/admin/product-images", { onRequest: authenticate, bodyLimit: MAX_PRODUCT_IMAGE_BYTES }, async (request, reply) => {
    const query = nameSchema.safeParse(request.query);
    if (!query.success) throw new HttpError(400, "Give the image a name of 1–120 characters.");
    if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
      throw new HttpError(400, "Choose a PNG, JPEG or WebP image.");
    }

    let processed;
    try {
      const image = sharp(request.body, { limitInputPixels: 25_000_000 });
      const metadata = await image.metadata();
      if (!["png", "jpeg", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1) {
        throw new Error("Unsupported image");
      }
      processed = await image.rotate().resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85, alphaQuality: 100 }).toBuffer({ resolveWithObject: true });
    } catch {
      throw new HttpError(400, "Use a valid, non-animated PNG, JPEG or WebP image under 25 megapixels.");
    }
    if (processed.data.length > 1024 * 1024) {
      throw new HttpError(400, "This image is too detailed. Try a smaller image.");
    }
    const saved = await repository.saveProductImage({
      name: query.data.name,
      data: processed.data,
      contentHash: createHash("sha256").update(processed.data).digest("hex"),
      contentType: "image/webp",
      byteSize: processed.data.length,
      width: processed.info.width,
      height: processed.info.height,
    });
    return reply.code(201).send(saved);
  });

  // Product pictures are public catalog media; no PIN is put in image URLs.
  app.get("/v1/product-images/:id", async (request, reply) => {
    const params = idSchema.safeParse(request.params);
    if (!params.success) throw new HttpError(404, "Image not found.");
    const image = await repository.getProductImage(params.data.id);
    if (!image) throw new HttpError(404, "Image not found.");
    const etag = `"${image.contentHash}"`;
    reply.header("Cache-Control", "public, max-age=31536000, immutable")
      .header("ETag", etag).header("X-Content-Type-Options", "nosniff");
    if (request.headers["if-none-match"] === etag) return reply.code(304).send();
    return reply.type(image.contentType).send(Buffer.from(image.data));
  });
}
