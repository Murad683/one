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

export default router;
