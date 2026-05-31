import prisma from './src/utils/prisma';

async function main() {
  const username = 'habibmammadov_';
  console.log(`Clearing highlights for user: ${username}`);
  
  const user = await prisma.user.findFirst({
    where: { igUsername: username },
  });

  if (!user) {
    console.log('User not found.');
    return;
  }

  console.log('Before update:', user.igHighlights);

  await prisma.user.update({
    where: { id: user.id },
    data: { igHighlights: [] },
  });

  const userAfter = await prisma.user.findFirst({
    where: { igUsername: username },
  });

  console.log('After update:', userAfter?.igHighlights);
}

main().catch(console.error).finally(() => prisma.$disconnect());
