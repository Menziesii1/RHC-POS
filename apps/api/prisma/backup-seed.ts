import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Manual additive restore for the active main-location catalog. This backup excludes extra-shot.
const locations = [
  {
    id: "main-location",
    name: "RHC Coffee",
    taxRateBasisPoints: 0,
  },
] as const;

const registers = [
  {
    id: "kiosk-register-1",
    name: "Front Counter",
    locationId: "main-location",
  },
] as const;

const staffProfiles = [
  { id: "jamie", name: "Jamie", active: true },
  { id: "sarah", name: "Sarah", active: true },
] as const;

const categories = [
  { id: "drink", locationId: "main-location", name: "Drink", sortOrder: 1, enabled: true },
  { id: "food", locationId: "main-location", name: "Food", sortOrder: 2, enabled: true },
  { id: "discount", locationId: "main-location", name: "Discount", sortOrder: 3, enabled: true },
  { id: "kids", locationId: "main-location", name: "Kids", sortOrder: 4, enabled: true },
] as const;

const sizeOptions = [
  { id: "regular", locationId: "main-location", name: "Regular", priceDeltaCents: 0, enabled: true, sortOrder: 1 },
  { id: "kids", locationId: "main-location", name: "Kids", priceDeltaCents: 0, enabled: true, sortOrder: 2 },
] as const;

const modifiers = [
  { id: "vanilla", locationId: "main-location", name: "Vanilla", priceCents: 0, discountFlavor: false, enabled: true, sortOrder: 1 },
  { id: "caramel", locationId: "main-location", name: "Caramel", priceCents: 0, discountFlavor: false, enabled: true, sortOrder: 2 },
  { id: "hazelnut", locationId: "main-location", name: "Hazelnut", priceCents: 0, discountFlavor: false, enabled: true, sortOrder: 3 },
  { id: "raspberry", locationId: "main-location", name: "Raspberry", priceCents: 0, discountFlavor: false, enabled: true, sortOrder: 4 },
  {
    id: "sugar-free-vanilla",
    locationId: "main-location",
    name: "Sugar Free Vanilla",
    priceCents: -100,
    discountFlavor: true,
    enabled: true,
    sortOrder: 6,
  },
  {
    id: "sugar-free-caramel",
    locationId: "main-location",
    name: "Sugar Free Caramel",
    priceCents: -100,
    discountFlavor: true,
    enabled: true,
    sortOrder: 7,
  },
] as const;

const products = [
  {
    id: "mocha",
    locationId: "main-location",
    categoryId: "drink",
    name: "Mocha",
    priceCents: 450,
    discountCents: 0,
    enabled: true,
    sortOrder: 1,
    productType: "drink",
    defaultSizeOptionId: "regular",
  },
  {
    id: "latte",
    locationId: "main-location",
    categoryId: "drink",
    name: "Latte",
    priceCents: 400,
    discountCents: 0,
    enabled: true,
    sortOrder: 2,
    productType: "drink",
    defaultSizeOptionId: "regular",
  },
  {
    id: "iced-latte",
    locationId: "main-location",
    categoryId: "drink",
    name: "Iced Latte",
    priceCents: 450,
    discountCents: 0,
    enabled: true,
    sortOrder: 3,
    productType: "drink",
    defaultSizeOptionId: "regular",
  },
  {
    id: "frappuccino",
    locationId: "main-location",
    categoryId: "drink",
    name: "Frappuccino",
    priceCents: 450,
    discountCents: 0,
    enabled: true,
    sortOrder: 4,
    productType: "drink",
    defaultSizeOptionId: "regular",
  },
  {
    id: "dirty-chai",
    locationId: "main-location",
    categoryId: "drink",
    name: "Dirty Chai",
    priceCents: 450,
    discountCents: 0,
    enabled: true,
    sortOrder: 5,
    productType: "drink",
    defaultSizeOptionId: "regular",
  },
  {
    id: "red-bull",
    locationId: "main-location",
    categoryId: "drink",
    name: "Red Bull",
    priceCents: 450,
    discountCents: 0,
    enabled: true,
    sortOrder: 6,
    productType: "drink",
    defaultSizeOptionId: "regular",
  },
  {
    id: "americano",
    locationId: "main-location",
    categoryId: "drink",
    name: "Americano",
    priceCents: 350,
    discountCents: 0,
    enabled: true,
    sortOrder: 7,
    productType: "drink",
    defaultSizeOptionId: "regular",
  },
  {
    id: "hot-chocolate",
    locationId: "main-location",
    categoryId: "drink",
    name: "Hot Chocolate",
    priceCents: 350,
    discountCents: 0,
    enabled: true,
    sortOrder: 8,
    productType: "drink",
    defaultSizeOptionId: "regular",
  },
  {
    id: "chai",
    locationId: "main-location",
    categoryId: "drink",
    name: "Chai",
    priceCents: 300,
    discountCents: 0,
    enabled: true,
    sortOrder: 9,
    productType: "drink",
    defaultSizeOptionId: "regular",
  },
  {
    id: "italian-soda",
    locationId: "main-location",
    categoryId: "drink",
    name: "Italian Soda",
    priceCents: 300,
    discountCents: 0,
    enabled: true,
    sortOrder: 10,
    productType: "drink",
    defaultSizeOptionId: "regular",
  },
  {
    id: "test",
    locationId: "main-location",
    categoryId: "drink",
    name: "Test",
    priceCents: 0,
    discountCents: 0,
    enabled: true,
    sortOrder: 11,
    productType: "drink",
    defaultSizeOptionId: null,
  },
] as const;

const productSizeOptions = [
  { productId: "americano", sizeOptionId: "regular", priceDeltaCents: 0 },
  { productId: "chai", sizeOptionId: "kids", priceDeltaCents: -50 },
  { productId: "chai", sizeOptionId: "regular", priceDeltaCents: 0 },
  { productId: "dirty-chai", sizeOptionId: "regular", priceDeltaCents: 0 },
  { productId: "frappuccino", sizeOptionId: "regular", priceDeltaCents: 0 },
  { productId: "hot-chocolate", sizeOptionId: "kids", priceDeltaCents: -100 },
  { productId: "hot-chocolate", sizeOptionId: "regular", priceDeltaCents: 0 },
  { productId: "iced-latte", sizeOptionId: "regular", priceDeltaCents: 0 },
  { productId: "italian-soda", sizeOptionId: "regular", priceDeltaCents: 0 },
  { productId: "latte", sizeOptionId: "regular", priceDeltaCents: 0 },
  { productId: "mocha", sizeOptionId: "regular", priceDeltaCents: 0 },
  { productId: "red-bull", sizeOptionId: "regular", priceDeltaCents: 0 },
] as const;

const productModifiers = [
  { productId: "americano", modifierId: "caramel" },
  { productId: "americano", modifierId: "hazelnut" },
  { productId: "americano", modifierId: "sugar-free-caramel" },
  { productId: "americano", modifierId: "sugar-free-vanilla" },
  { productId: "americano", modifierId: "vanilla" },
  { productId: "chai", modifierId: "caramel" },
  { productId: "chai", modifierId: "hazelnut" },
  { productId: "chai", modifierId: "sugar-free-caramel" },
  { productId: "chai", modifierId: "sugar-free-vanilla" },
  { productId: "chai", modifierId: "vanilla" },
  { productId: "dirty-chai", modifierId: "caramel" },
  { productId: "dirty-chai", modifierId: "hazelnut" },
  { productId: "dirty-chai", modifierId: "sugar-free-caramel" },
  { productId: "dirty-chai", modifierId: "sugar-free-vanilla" },
  { productId: "dirty-chai", modifierId: "vanilla" },
  { productId: "frappuccino", modifierId: "caramel" },
  { productId: "frappuccino", modifierId: "hazelnut" },
  { productId: "frappuccino", modifierId: "sugar-free-caramel" },
  { productId: "frappuccino", modifierId: "sugar-free-vanilla" },
  { productId: "frappuccino", modifierId: "vanilla" },
  { productId: "hot-chocolate", modifierId: "caramel" },
  { productId: "hot-chocolate", modifierId: "hazelnut" },
  { productId: "hot-chocolate", modifierId: "raspberry" },
  { productId: "hot-chocolate", modifierId: "sugar-free-caramel" },
  { productId: "hot-chocolate", modifierId: "sugar-free-vanilla" },
  { productId: "hot-chocolate", modifierId: "vanilla" },
  { productId: "iced-latte", modifierId: "caramel" },
  { productId: "iced-latte", modifierId: "hazelnut" },
  { productId: "iced-latte", modifierId: "sugar-free-caramel" },
  { productId: "iced-latte", modifierId: "sugar-free-vanilla" },
  { productId: "iced-latte", modifierId: "vanilla" },
  { productId: "italian-soda", modifierId: "caramel" },
  { productId: "italian-soda", modifierId: "raspberry" },
  { productId: "italian-soda", modifierId: "sugar-free-caramel" },
  { productId: "italian-soda", modifierId: "sugar-free-vanilla" },
  { productId: "italian-soda", modifierId: "vanilla" },
  { productId: "latte", modifierId: "caramel" },
  { productId: "latte", modifierId: "hazelnut" },
  { productId: "latte", modifierId: "sugar-free-caramel" },
  { productId: "latte", modifierId: "sugar-free-vanilla" },
  { productId: "latte", modifierId: "vanilla" },
  { productId: "mocha", modifierId: "caramel" },
  { productId: "mocha", modifierId: "hazelnut" },
  { productId: "mocha", modifierId: "sugar-free-caramel" },
  { productId: "mocha", modifierId: "sugar-free-vanilla" },
  { productId: "mocha", modifierId: "vanilla" },
  { productId: "red-bull", modifierId: "caramel" },
  { productId: "red-bull", modifierId: "raspberry" },
  { productId: "red-bull", modifierId: "sugar-free-caramel" },
  { productId: "red-bull", modifierId: "sugar-free-vanilla" },
  { productId: "red-bull", modifierId: "vanilla" },
] as const;

const appSettings = [{ key: "recovery_ttl_seconds", value: "300" }] as const;

async function main() {
  await prisma.location.createMany({ data: locations, skipDuplicates: true });
  await prisma.register.createMany({ data: registers, skipDuplicates: true });
  await prisma.staffProfile.createMany({ data: staffProfiles, skipDuplicates: true });
  await prisma.category.createMany({ data: categories, skipDuplicates: true });
  await prisma.sizeOption.createMany({ data: sizeOptions, skipDuplicates: true });
  await prisma.modifier.createMany({ data: modifiers, skipDuplicates: true });
  await prisma.product.createMany({ data: products, skipDuplicates: true });
  await prisma.productSizeOption.createMany({ data: productSizeOptions, skipDuplicates: true });
  await prisma.productModifier.createMany({ data: productModifiers, skipDuplicates: true });
  await prisma.appSetting.createMany({ data: appSettings, skipDuplicates: true });

  console.log("Backup seed applied additively.");
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
