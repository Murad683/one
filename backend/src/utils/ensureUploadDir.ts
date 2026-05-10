import fs from 'fs';
import path from 'path';

export function ensureUploadDirs(): void {
  const dirs = [
    'uploads/',
    'uploads/videos/',
    'uploads/designs/',
    'uploads/avatars/',
    'uploads/thumbnails/',
  ];

  dirs.forEach((dir) => {
    // Determine absolute path to the directory (assuming this file is in src/utils)
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
}
