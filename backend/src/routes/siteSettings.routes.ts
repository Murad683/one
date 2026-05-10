import { Router } from 'express';
import { getSettings, updateSettings, uploadSettingsMedia } from '../controllers/siteSettings.controller';
import { verifyTokenMiddleware } from '../middleware/verifyToken.middleware';
import { isAdmin } from '../middleware/rbac.middleware';
import { uploadSiteMedia } from '../middleware/upload.middleware';

const router = Router();

router.get('/', getSettings);
router.patch('/', verifyTokenMiddleware, isAdmin, updateSettings);
router.patch('/upload', verifyTokenMiddleware, isAdmin, uploadSiteMedia, uploadSettingsMedia);

export default router;
