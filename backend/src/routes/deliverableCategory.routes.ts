import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/deliverableCategory.controller';
import { verifyTokenMiddleware } from '../middleware/verifyToken.middleware';
import { isAdmin } from '../middleware/rbac.middleware';

const router = Router();

router.get('/', getCategories);
router.post('/', verifyTokenMiddleware, isAdmin, createCategory);
router.patch('/:id', verifyTokenMiddleware, isAdmin, updateCategory);
router.delete('/:id', verifyTokenMiddleware, isAdmin, deleteCategory);

export default router;
