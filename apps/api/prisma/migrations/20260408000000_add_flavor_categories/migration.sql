-- CreateTable
CREATE TABLE "ModifierCategory" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ModifierCategory_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Modifier" ADD COLUMN "flavorCategoryId" TEXT;

-- AddForeignKey
ALTER TABLE "ModifierCategory" ADD CONSTRAINT "ModifierCategory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modifier" ADD CONSTRAINT "Modifier_flavorCategoryId_fkey" FOREIGN KEY ("flavorCategoryId") REFERENCES "ModifierCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
