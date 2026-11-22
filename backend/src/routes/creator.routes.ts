import { Router } from 'express';
import { getCreatorClients, updateClientHighlights, requireClientTarget } from '../controllers/creator.controller';
import { generateShareLink, revokeShareLink, updateShareLinkExpiry } from '../controllers/user.controller';
import { validate } from '../middleware/validate.middleware';
import { createShareLinkSchema, shareDurationSchema } from '../utils/validators/dashboard.validators';
import { verifyTokenMiddleware } from '../middleware/verifyToken.middleware';
import { isAdminOrCreator } from '../middleware/rbac.middleware';

// Narrow endpoints for creators (videographers). Deliverable uploads live in
// deliverable.routes with per-record ownership checks.
const router = Router();

router.use(verifyTokenMiddleware, isAdminOrCreator);

router.get('/clients', getCreatorClients);
router.patch('/clients/:id/highlights', requireClientTarget, updateClientHighlights);
router.post('/clients/:id/share-link', requireClientTarget, validate(createShareLinkSchema), generateShareLink);
router.patch('/clients/:id/share-link', requireClientTarget, validate(shareDurationSchema), updateShareLinkExpiry);
router.delete('/clients/:id/share-link', requireClientTarget, revokeShareLink);

export default router;
