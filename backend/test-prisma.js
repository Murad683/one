const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.findFirst({ where: { igUsername: 'habibmammadov_' } });
  console.log('Before:', u.igHighlights);
  
  await prisma.user.update({
    where: { id: u.id },
    data: { igHighlights: [] }
  });
  
  const u2 = await prisma.user.findFirst({ where: { igUsername: 'habibmammadov_' } });
  console.log('After:', u2.igHighlights);
}

main().finally(() => prisma.$disconnect());
