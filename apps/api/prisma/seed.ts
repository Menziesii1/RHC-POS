import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const locationId = process.env.LOCATION_ID ?? "main-location";
  const registerId = process.env.REGISTER_ID ?? "kiosk-register-1";

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
      { id: "jamie", name: "Jamie", active: true }
    ],
    skipDuplicates: true,
  });

  await prisma.category.createMany({
    data: [
      { id: "drinks", locationId, name: "Drinks", sortOrder: 1 },
      { id: "food", locationId, name: "Food", sortOrder: 2 },
      { id: "specials", locationId, name: "Specials", sortOrder: 3 }
    ],
    skipDuplicates: true,
  });

  await prisma.modifier.createMany({
    data: [
      { id: "extra-shot", locationId, name: "Extra Shot", priceCents: 100, enabled: true, sortOrder: 1 },
      { id: "oat-milk", locationId, name: "Oat Milk", priceCents: 75, enabled: true, sortOrder: 2 },
      { id: "syrup", locationId, name: "Syrup", priceCents: 50, enabled: true, sortOrder: 3 }
    ],
    skipDuplicates: true,
  });

  await prisma.product.createMany({
    data: [
      { id: "drip-coffee", locationId, categoryId: "drinks", name: "Drip Coffee", priceCents: 250, enabled: true, sortOrder: 1 },
      { id: "latte", locationId, categoryId: "drinks", name: "Latte", priceCents: 450, enabled: true, sortOrder: 2 },
      { id: "tea", locationId, categoryId: "drinks", name: "Tea", priceCents: 300, enabled: true, sortOrder: 3 },
      { id: "pastry", locationId, categoryId: "food", name: "Pastry", priceCents: 350, enabled: true, sortOrder: 1 },
      { id: "muffin", locationId, categoryId: "food", name: "Muffin", priceCents: 300, enabled: true, sortOrder: 2 },
      { id: "bagel", locationId, categoryId: "food", name: "Bagel", priceCents: 325, enabled: true, sortOrder: 3 }
    ],
    skipDuplicates: true,
  });

  for (const relation of [
    ["latte", "extra-shot"],
    ["latte", "oat-milk"],
    ["latte", "syrup"],
    ["drip-coffee", "extra-shot"],
    ["drip-coffee", "syrup"],
    ["tea", "syrup"]
  ]) {
    const [productId, modifierId] = relation;
    await prisma.productModifier.upsert({
      where: { productId_modifierId: { productId, modifierId } },
      update: {},
      create: { productId, modifierId },
    });
  }

  await prisma.appSetting.upsert({
    where: { key: "recovery_ttl_seconds" },
    update: { value: process.env.RECOVERY_TTL_SECONDS ?? "300" },
    create: { key: "recovery_ttl_seconds", value: process.env.RECOVERY_TTL_SECONDS ?? "300" },
  });
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
