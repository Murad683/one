import { Router } from 'express';
import {
  createHighlight,
  deleteHighlight,
  discardUploads,
  getHighlight,
  listClientHighlights,
  reorderHighlights,
  stageUpload,
  updateHighlight,
} from '../controllers/highlight.controller';
import { verifyTokenMiddleware } from '../middleware/verifyToken.middleware';
import { isAdminOrCreator } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { uploadImage } from '../middleware/upload.middleware';
import { highlightUploadRateLimiter } from '../middleware/rateLimiter.middleware';
import {
  createHighlightSchema,
  deleteUploadsSchema,
  orderSchema,
  updateHighlightSchema,
} from '../utils/validators/highlight.validators';

const router = Router();

// Story-style highlights, managed by staff (admins and creators). The editor works on a draft:
// images are staged first (/uploads) and everything is written in one request on "Yadda saxla".
router.use(verifyTokenMiddleware, isAdminOrCreator);

router.post('/uploads', highlightUploadRateLimiter, uploadImage, stageUpload);
router.delete('/uploads', validate(deleteUploadsSchema), discardUploads);

router.get('/client/:clientId', listClientHighlights);
router.post('/client/:clientId', validate(createHighlightSchema), createHighlight);
router.put('/client/:clientId/order', validate(orderSchema), reorderHighlights);

router.get('/:id', getHighlight);
router.put('/:id', validate(updateHighlightSchema), updateHighlight);
router.delete('/:id', deleteHighlight);

export default router;
