import { Router } from 'express';
import {
  addHighlightItems,
  createHighlight,
  deleteHighlight,
  deleteHighlightItem,
  getHighlight,
  listClientHighlights,
  reorderHighlightItems,
  reorderHighlights,
  updateHighlight,
} from '../controllers/highlight.controller';
import { verifyTokenMiddleware } from '../middleware/verifyToken.middleware';
import { isAdminOrCreator } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { uploadHighlightImages } from '../middleware/upload.middleware';
import { uploadRateLimiter } from '../middleware/rateLimiter.middleware';
import { createHighlightSchema, orderSchema, updateHighlightSchema } from '../utils/validators/highlight.validators';

const router = Router();

// Story-style highlights, managed by staff (admins and creators).
router.use(verifyTokenMiddleware, isAdminOrCreator);

router.get('/client/:clientId', listClientHighlights);
router.post('/client/:clientId', validate(createHighlightSchema), createHighlight);
router.put('/client/:clientId/order', validate(orderSchema), reorderHighlights);

router.get('/:id', getHighlight);
router.patch('/:id', validate(updateHighlightSchema), updateHighlight);
router.delete('/:id', deleteHighlight);

router.post('/:id/items', uploadRateLimiter, uploadHighlightImages, addHighlightItems);
router.put('/:id/items/order', validate(orderSchema), reorderHighlightItems);
router.delete('/:id/items/:itemId', deleteHighlightItem);

export default router;
