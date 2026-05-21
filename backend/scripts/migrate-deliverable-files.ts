import 'dotenv/config';
import prisma from '../src/utils/prisma';

async function main() {
  console.log('Starting migration of deliverable files...');
  
  const deliverables = await prisma.deliverable.findMany({
    where: {
      fileUrl: { not: null },
    },
  });

  console.log(`Found ${deliverables.length} deliverables to migrate.`);

  for (const d of deliverables) {
    if (!d.fileUrl) continue;
    
    const sizeStr = d.fileSize ? d.fileSize.toString() : '0';
    let size = 0;
    try {
      size = parseInt(sizeStr, 10);
    } catch {
      // ignore
    }

    const fileObj = {
      url: d.fileUrl,
      name: d.fileName || 'Untitled File',
      size: size,
      type: d.mimeType || 'application/octet-stream',
    };

    // Handle empty or stringified array based on Prisma JSON representation
    let currentFiles: any[] = [];
    if (Array.isArray(d.files)) {
        currentFiles = d.files;
    } else if (typeof d.files === 'string') {
        try {
            currentFiles = JSON.parse(d.files);
        } catch(e) {}
    }

    if (currentFiles.length === 0) {
      await prisma.deliverable.update({
        where: { id: d.id },
        data: {
          files: [fileObj],
        },
      });
      console.log(`Migrated deliverable ${d.id}`);
    } else {
      console.log(`Skipped deliverable ${d.id} (already has files array)`);
    }
  }

  console.log('Migration complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
