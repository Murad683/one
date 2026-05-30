import { Router } from 'express';
import { uploadImageFile } from '../controllers/upload.controller';
import { verifyTokenMiddleware } from '../middleware/verifyToken.middleware';
import { isAdmin } from '../middleware/rbac.middleware';
import { uploadImage } from '../middleware/upload.middleware';

const router = Router();

router.post(
  '/image',
  verifyTokenMiddleware,
  isAdmin,
  (req, _res, next) => {
    const folder = typeof req.query.folder === 'string' ? req.query.folder : 'images';
    req.uploadSubfolder = ['thumbnails', 'avatars', 'images'].includes(folder) ? folder : 'images';
    next();
  },
  uploadImage,
  uploadImageFile
);

import { getSecureDownloadUrl } from '../services/upload.service';

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

// Proxy route to redirect to Azure SAS URL for private images
router.get('/:folder/:file', async (req, res) => {
  try {
    const { folder, file } = req.params;
    const storageKey = `${folder}/${file}`;
    const signedUrl = await getSecureDownloadUrl(storageKey);
    res.redirect(signedUrl);
  } catch (err) {
    res.status(404).send('Not found');
  }
});

export default router;
