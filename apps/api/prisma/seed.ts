import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const locationId = process.env.LOCATION_ID ?? "main-location";
  const registerId = process.env.REGISTER_ID ?? "kiosk-register-1";
  const catalogSeedSettingKey = "catalog_seed_version";
  const catalogSeedVersion = "v1";

  type SeedProduct = {
    id: string;
    name: string;
    categoryId: string;
    priceCents: number;
    discountCents: number;
    enabled: boolean;
    sortOrder: number;
    productType: string;
    modifierIds: string[];
    sizeOptionIds: string[];
    sizeOptionPrices?: Array<{ sizeOptionId: string; priceDeltaCents: number }>;
    defaultSizeOptionId: string | null;
  };

  await prisma.location.upsert({
    where: { id: locationId },
    update: { name: process.env.LOCATION_NAME ?? "Church Coffee Shop" },
    create: {
      id: locationId,
      name: process.env.LOCATION_NAME ?? "Church Coffee Shop",
      taxRateBasisPoints: 0,
    },
  });

  await prisma.register.upsert({
    where: { id: registerId },
    update: {
      name: process.env.REGISTER_NAME ?? "Front Counter",
      locationId,
    },
    create: {
      id: registerId,
      name: process.env.REGISTER_NAME ?? "Front Counter",
      locationId,
    },
  });

  await prisma.staffProfile.createMany({
    data: [
      { id: "sarah", name: "Sarah", active: true },
      { id: "alex", name: "Alex", active: true },
      { id: "jamie", name: "Jamie", active: true },
    ],
    skipDuplicates: true,
  });

  const products: SeedProduct[] = [
    {
      id: "mocha",
      name: "Mocha",
      categoryId: "drink",
      priceCents: 450,
      discountCents: 0,
      enabled: true,
      sortOrder: 1,
      productType: "drink",
      modifierIds: ["vanilla", "caramel", "hazelnut", "sugar-free-vanilla", "sugar-free-caramel", "extra-shot"],
      sizeOptionIds: ["regular"],
      defaultSizeOptionId: "regular",
    },
    {
      id: "latte",
      name: "Latte",
      categoryId: "drink",
      priceCents: 400,
      discountCents: 0,
      enabled: true,
      sortOrder: 2,
      productType: "drink",
      modifierIds: ["vanilla", "caramel", "hazelnut", "sugar-free-vanilla", "sugar-free-caramel", "extra-shot"],
      sizeOptionIds: ["regular"],
      defaultSizeOptionId: "regular",
    },
    {
      id: "iced-latte",
      name: "Iced Latte",
      categoryId: "drink",
      priceCents: 450,
      discountCents: 0,
      enabled: true,
      sortOrder: 3,
      productType: "drink",
      modifierIds: ["vanilla", "caramel", "hazelnut", "sugar-free-vanilla", "sugar-free-caramel", "extra-shot"],
      sizeOptionIds: ["regular"],
      defaultSizeOptionId: "regular",
    },
    {
      id: "frappuccino",
      name: "Frappuccino",
      categoryId: "drink",
      priceCents: 450,
      discountCents: 0,
      enabled: true,
      sortOrder: 4,
      productType: "drink",
      modifierIds: ["vanilla", "caramel", "hazelnut", "sugar-free-vanilla", "sugar-free-caramel"],
      sizeOptionIds: ["regular"],
      defaultSizeOptionId: "regular",
    },
    {
      id: "dirty-chai",
      name: "Dirty Chai",
      categoryId: "drink",
      priceCents: 450,
      discountCents: 0,
      enabled: true,
      sortOrder: 5,
      productType: "drink",
      modifierIds: ["vanilla", "caramel", "hazelnut", "extra-shot", "sugar-free-vanilla", "sugar-free-caramel"],
      sizeOptionIds: ["regular"],
      defaultSizeOptionId: "regular",
    },
    {
      id: "red-bull",
      name: "Red Bull",
      categoryId: "drink",
      priceCents: 450,
      discountCents: 0,
      enabled: true,
      sortOrder: 6,
      productType: "drink",
      modifierIds: ["vanilla", "caramel", "raspberry", "sugar-free-vanilla", "sugar-free-caramel"],
      sizeOptionIds: ["regular"],
      defaultSizeOptionId: "regular",
    },
    {
      id: "americano",
      name: "Americano",
      categoryId: "drink",
      priceCents: 350,
      discountCents: 0,
      enabled: true,
      sortOrder: 7,
      productType: "drink",
      modifierIds: ["vanilla", "caramel", "hazelnut", "sugar-free-vanilla", "sugar-free-caramel", "extra-shot"],
      sizeOptionIds: ["regular"],
      defaultSizeOptionId: "regular",
    },
    {
      id: "hot-chocolate",
      name: "Hot Chocolate",
      categoryId: "drink",
      priceCents: 350,
      discountCents: 0,
      enabled: true,
      sortOrder: 8,
      productType: "drink",
      modifierIds: ["vanilla", "caramel", "hazelnut", "raspberry", "sugar-free-vanilla", "sugar-free-caramel"],
      sizeOptionIds: ["regular", "kids"],
      sizeOptionPrices: [
        { sizeOptionId: "regular", priceDeltaCents: 0 },
        { sizeOptionId: "kids", priceDeltaCents: -100 },
      ],
      defaultSizeOptionId: "regular",
    },
    {
      id: "chai",
      name: "Chai",
      categoryId: "drink",
      priceCents: 300,
      discountCents: 0,
      enabled: true,
      sortOrder: 9,
      productType: "drink",
      modifierIds: ["vanilla", "caramel", "hazelnut", "sugar-free-vanilla", "sugar-free-caramel"],
      sizeOptionIds: ["regular", "kids"],
      sizeOptionPrices: [
        { sizeOptionId: "regular", priceDeltaCents: 0 },
        { sizeOptionId: "kids", priceDeltaCents: -50 },
      ],
      defaultSizeOptionId: "regular",
    },
    {
      id: "italian-soda",
      name: "Italian Soda",
      categoryId: "drink",
      priceCents: 300,
      discountCents: 0,
      enabled: true,
      sortOrder: 10,
      productType: "drink",
      modifierIds: ["raspberry", "vanilla", "caramel", "sugar-free-vanilla", "sugar-free-caramel"],
      sizeOptionIds: ["regular"],
      defaultSizeOptionId: "regular",
    },
    {
      id: "muffin",
      name: "Muffin",
      categoryId: "food",
      priceCents: 300,
      discountCents: 0,
      enabled: true,
      sortOrder: 1,
      productType: "food",
      modifierIds: [],
      sizeOptionIds: [],
      sizeOptionPrices: [],
      defaultSizeOptionId: null,
    },
    {
      id: "bagel",
      name: "Bagel",
      categoryId: "food",
      priceCents: 325,
      discountCents: 0,
      enabled: true,
      sortOrder: 2,
      productType: "food",
      modifierIds: [],
      sizeOptionIds: [],
      sizeOptionPrices: [],
      defaultSizeOptionId: null,
    },
  ] as const;

  await prisma.appSetting.upsert({
    where: { key: "recovery_ttl_seconds" },
    update: { value: process.env.RECOVERY_TTL_SECONDS ?? "300" },
    create: { key: "recovery_ttl_seconds", value: process.env.RECOVERY_TTL_SECONDS ?? "300" },
  });

  const existingCatalogSeed = await prisma.appSetting.findUnique({
    where: { key: catalogSeedSettingKey },
  });

  if (!existingCatalogSeed) {
    const [categoryCount, sizeCount, modifierCount, productCount] = await Promise.all([
      prisma.category.count({ where: { locationId } }),
      prisma.sizeOption.count({ where: { locationId } }),
      prisma.modifier.count({ where: { locationId } }),
      prisma.product.count({ where: { locationId } }),
    ]);

    const hasExistingCatalog = categoryCount > 0 || sizeCount > 0 || modifierCount > 0 || productCount > 0;

    if (!hasExistingCatalog) {
      await prisma.category.createMany({
        data: [
          { id: "drink", locationId, name: "Drink", sortOrder: 1, enabled: true },
          { id: "food", locationId, name: "Food", sortOrder: 2, enabled: true },
          { id: "discount", locationId, name: "Discount", sortOrder: 3, enabled: true },
          { id: "kids", locationId, name: "Kids", sortOrder: 4, enabled: true },
        ],
        skipDuplicates: true,
      });

      await prisma.sizeOption.createMany({
        data: [
          { id: "regular", locationId, name: "Regular", priceDeltaCents: 0, enabled: true, sortOrder: 1 },
          { id: "kids", locationId, name: "Kids", priceDeltaCents: 0, enabled: true, sortOrder: 2 },
        ],
        skipDuplicates: true,
      });

      await prisma.modifier.createMany({
        data: [
          { id: "vanilla", locationId, name: "Vanilla", priceCents: 0, discountFlavor: false, enabled: true, sortOrder: 1 },
          { id: "caramel", locationId, name: "Caramel", priceCents: 0, discountFlavor: false, enabled: true, sortOrder: 2 },
          { id: "hazelnut", locationId, name: "Hazelnut", priceCents: 0, discountFlavor: false, enabled: true, sortOrder: 3 },
          { id: "raspberry", locationId, name: "Raspberry", priceCents: 0, discountFlavor: false, enabled: true, sortOrder: 4 },
          { id: "extra-shot", locationId, name: "Extra Shot", priceCents: 100, discountFlavor: false, enabled: true, sortOrder: 5 },
          { id: "sugar-free-vanilla", locationId, name: "Sugar Free Vanilla", priceCents: -100, discountFlavor: true, enabled: true, sortOrder: 6 },
          { id: "sugar-free-caramel", locationId, name: "Sugar Free Caramel", priceCents: -100, discountFlavor: true, enabled: true, sortOrder: 7 },
        ],
        skipDuplicates: true,
      });

      await prisma.product.createMany({
        data: products.map((product) => ({
          id: product.id,
          locationId,
          categoryId: product.categoryId,
          name: product.name,
          priceCents: product.priceCents,
          discountCents: product.discountCents,
          enabled: product.enabled,
          sortOrder: product.sortOrder,
          productType: product.productType,
          defaultSizeOptionId: product.defaultSizeOptionId,
        })),
        skipDuplicates: true,
      });

      for (const product of products) {
        const sizeOverrides = product.sizeOptionPrices ?? [];
        for (const sizeOptionId of product.sizeOptionIds) {
          await prisma.productSizeOption.upsert({
            where: {
              productId_sizeOptionId: {
                productId: product.id,
                sizeOptionId,
              },
            },
            update: {
              priceDeltaCents: sizeOverrides.find((entry) => entry.sizeOptionId === sizeOptionId)?.priceDeltaCents ?? 0,
            },
            create: {
              productId: product.id,
              sizeOptionId,
              priceDeltaCents: sizeOverrides.find((entry) => entry.sizeOptionId === sizeOptionId)?.priceDeltaCents ?? 0,
            },
          });
        }

        for (const modifierId of product.modifierIds) {
          await prisma.productModifier.upsert({
            where: {
              productId_modifierId: {
                productId: product.id,
                modifierId,
              },
            },
            update: {},
            create: {
              productId: product.id,
              modifierId,
            },
          });
        }
      }
    }

    await prisma.appSetting.create({
      data: {
        key: catalogSeedSettingKey,
        value: catalogSeedVersion,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
