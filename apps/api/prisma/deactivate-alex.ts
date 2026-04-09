import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.staffProfile.updateMany({
    where: { id: "alex" },
    data: { active: false },
  });
  console.log(`Deactivated ${result.count} staff profile(s) with id "alex".`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
