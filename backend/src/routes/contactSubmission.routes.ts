import { Router } from 'express';
import {
  getSubmissions,
  createSubmission,
  updateSubmission,
  deleteSubmission,
  getUnreadCount,
} from '../controllers/contactSubmission.controller';
import { verifyTokenMiddleware } from '../middleware/verifyToken.middleware';
import { isAdmin } from '../middleware/rbac.middleware';

const router = Router();

router.post('/', createSubmission);
router.get('/unread-count', verifyTokenMiddleware, isAdmin, getUnreadCount);
router.get('/', verifyTokenMiddleware, isAdmin, getSubmissions);
router.patch('/:id', verifyTokenMiddleware, isAdmin, updateSubmission);
router.delete('/:id', verifyTokenMiddleware, isAdmin, deleteSubmission);

export default router;
