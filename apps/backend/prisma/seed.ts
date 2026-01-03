import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.universe.findFirst({ where: { name: 'Alpha' } });
  if (existing) {
    console.log('Universe Alpha already exists');
    return;
  }
  await prisma.universe.create({
    data: {
      name: 'Alpha',
      speedFleet: 1,
      speedBuild: 2,
      speedResearch: 2,
      isPeacefulDefault: true
    }
  });
  console.log('Universe Alpha created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
