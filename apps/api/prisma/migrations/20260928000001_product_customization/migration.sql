-- Existing products keep their current customization behavior.
ALTER TABLE "Product" ADD COLUMN "customizable" BOOLEAN NOT NULL DEFAULT true;
