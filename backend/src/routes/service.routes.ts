import { Router } from 'express';
import * as ctrl from '../controllers/service.controller';
import { verifyTokenMiddleware } from '../middleware/verifyToken.middleware';
import { isAdmin } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createServiceSchema,
  updateServiceSchema,
} from '../utils/validators/content.validators';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Services
 *   description: Service offerings management
 */

/**
 * @swagger
 * /services:
 *   get:
 *     summary: Get all active services
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *     responses:
 *       200:
 *         description: Paginated list of active services
 */
router.get('/', ctrl.getAll);

/**
 * @swagger
 * /services/{id}:
 *   get:
 *     summary: Get a service by ID
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service details
 *       404:
 *         description: Service not found
 */
router.get('/:id', ctrl.getById);

/**
 * @swagger
 * /services:
 *   post:
 *     summary: Create a new service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               iconName:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Service created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — Admin only
 */
router.post('/', verifyTokenMiddleware, isAdmin, validate(createServiceSchema), ctrl.create);

/**
 * @swagger
 * /services/{id}:
 *   patch:
 *     summary: Update a service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               iconName:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Service updated
 *       404:
 *         description: Service not found
 */
router.patch('/:id', verifyTokenMiddleware, isAdmin, validate(updateServiceSchema), ctrl.update);

/**
 * @swagger
 * /services/{id}:
 *   delete:
 *     summary: Soft-delete a service (set isActive to false)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Service deleted
 *       404:
 *         description: Service not found
 */
router.delete('/:id', verifyTokenMiddleware, isAdmin, ctrl.remove);

export default router;
