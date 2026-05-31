import { Router } from 'express';
import { uploadImageFile } from '../controllers/upload.controller';
import { verifyTokenMiddleware } from '../middleware/verifyToken.middleware';
import { isAdmin } from '../middleware/rbac.middleware';
import { uploadImage } from '../middleware/upload.middleware';
import { getSecureDownloadUrl } from '../services/upload.service';
import prisma from '../utils/prisma';

const router = Router();

router.post(
  '/image',
  verifyTokenMiddleware,
  isAdmin,
  (req, _res, next) => {
    const folder = typeof req.query.folder === 'string' ? req.query.folder : 'images';
    req.uploadSubfolder = ['thumbnails', 'avatars', 'images', 'highlights'].includes(folder) ? folder : 'images';
    next();
  },
  uploadImage,
  uploadImageFile
);


router.post(
  '/avatar',
  verifyTokenMiddleware,
  (req, _res, next) => {
    req.query.folder = 'avatars';
    next();
  },
  uploadImage,
  uploadImageFile
);

router.post(
  '/highlights',
  verifyTokenMiddleware,
  (req, _res, next) => {
    req.query.folder = 'highlights';
    next();
  },
  uploadImage,
  uploadImageFile
);

// Proxy route to redirect to Azure SAS URL for private images
router.get('/:folder/:file', verifyTokenMiddleware, async (req, res) => {
  try {
    const folder = req.params.folder as string;
    const file = req.params.file as string;
    const storageKey = `${folder}/${file}`;

    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).send('Unauthorized');
    }

    if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
      let isOwner = false;

      if (folder === 'invoices') {
        const payment = await prisma.payment.findFirst({ where: { invoicePdfUrl: { contains: file } } });
        if (payment && payment.userId === userId) isOwner = true;
      } else if (['avatars', 'images', 'thumbnails', 'highlights'].includes(folder)) {
        isOwner = true; 
      } else if (['videos', 'designs'].includes(folder)) {
        const deliverables = await prisma.deliverable.findMany({ where: { clientId: userId } });
        for (const d of deliverables) {
          if (typeof d.files === 'string' && d.files.includes(file)) isOwner = true;
          if (Array.isArray(d.files) && JSON.stringify(d.files).includes(file)) isOwner = true;
          if (d.thumbnailUrl && d.thumbnailUrl.includes(file)) isOwner = true;
        }
      }

      if (!isOwner) {
        return res.status(403).send('Forbidden: Access denied to this file');
      }
    }

    const signedUrl = await getSecureDownloadUrl(storageKey);
    res.redirect(signedUrl);
  } catch (err) {
    res.status(404).send('Not found');
  }
});

export default router;
