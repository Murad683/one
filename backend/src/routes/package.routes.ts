import { Router } from 'express';
import * as ctrl from '../controllers/package.controller';
import { verifyTokenMiddleware } from '../middleware/verifyToken.middleware';
import { isAdmin } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createPackageSchema,
  updatePackageSchema,
} from '../utils/validators/content.validators';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Packages
 *   description: Pricing packages management
 */

/**
 * @swagger
 * /packages:
 *   get:
 *     summary: Get all active packages
 *     tags: [Packages]
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
 *         description: Paginated list of active packages
 */
router.get('/', ctrl.getAll);

/**
 * @swagger
 * /packages/{id}:
 *   get:
 *     summary: Get a package by ID
 *     tags: [Packages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Package details
 *       404:
 *         description: Package not found
 */
router.get('/:id', ctrl.getById);

/**
 * @swagger
 * /packages:
 *   post:
 *     summary: Create a new package
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, description, price, features]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               currency:
 *                 type: string
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *               isPopular:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Package created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — Admin only
 */
router.post('/', verifyTokenMiddleware, isAdmin, validate(createPackageSchema), ctrl.create);

/**
 * @swagger
 * /packages/{id}:
 *   patch:
 *     summary: Update a package
 *     tags: [Packages]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *               isPopular:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Package updated
 *       404:
 *         description: Package not found
 */
router.patch('/:id', verifyTokenMiddleware, isAdmin, validate(updatePackageSchema), ctrl.update);

/**
 * @swagger
 * /packages/{id}:
 *   delete:
 *     summary: Soft-delete a package (set isActive to false)
 *     tags: [Packages]
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
 *         description: Package deleted
 *       404:
 *         description: Package not found
 */
router.delete('/:id', verifyTokenMiddleware, isAdmin, ctrl.remove);

export default router;
