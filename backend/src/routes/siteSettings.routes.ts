import { Router } from 'express';
import { getSettings, updateSettings, uploadSettingsMedia } from '../controllers/siteSettings.controller';
import { verifyTokenMiddleware } from '../middleware/verifyToken.middleware';
import { isAdmin } from '../middleware/rbac.middleware';
import { uploadSiteMedia } from '../middleware/upload.middleware';
import { uploadRateLimiter } from '../middleware/rateLimiter.middleware';

import { validate } from '../middleware/validate.middleware';
import { updateSiteSettingsSchema } from '../utils/validators/siteSettings.validators';

const router = Router();

router.get('/', getSettings);
router.patch('/', verifyTokenMiddleware, isAdmin, validate(updateSiteSettingsSchema), updateSettings);
router.patch('/upload', verifyTokenMiddleware, isAdmin, uploadRateLimiter, (req, res, next) => {
  req.uploadSubfolder = 'site';
  next();
}, uploadSiteMedia, uploadSettingsMedia);

export default router;
