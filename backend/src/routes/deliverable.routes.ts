import { Router } from 'express';
import * as ctrl from '../controllers/deliverable.controller';
import { verifyTokenMiddleware } from '../middleware/verifyToken.middleware';
import { isAdmin, isClient } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createDeliverableSchema,
  updateDeliverableStatusSchema,
  updateDeliverableSchema,
} from '../utils/validators/deliverable.validators';
import { uploadRateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Deliverables
 *   description: Client deliverables and file management
 */

/**
 * @swagger
 * /deliverables/my:
 *   get:
 *     summary: Get current client's deliverables
 *     tags: [Deliverables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of client deliverables with download URLs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — Client only
 */
router.get('/my', verifyTokenMiddleware, isClient, ctrl.getMyDeliverables);

/**
 * @swagger
 * /deliverables:
 *   get:
 *     summary: Get all deliverables (admin view)
 *     tags: [Deliverables]
 *     security:
 *       - bearerAuth: []
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
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PROCESSING, READY, ARCHIVED]
 *     responses:
 *       200:
 *         description: Paginated list of all deliverables with client info
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — Admin only
 */
router.get('/', verifyTokenMiddleware, isAdmin, ctrl.getAllDeliverables);

/**
 * @swagger
 * /deliverables:
 *   post:
 *     summary: Create a new deliverable record
 *     tags: [Deliverables]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId, type, month, year]
 *             properties:
 *               clientId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [VIDEO, SMM_DESIGN, BRANDING, REPORT, OTHER]
 *               month:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *               year:
 *                 type: integer
 *                 minimum: 2020
 *                 maximum: 2100
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Deliverable created
 *       400:
 *         description: Client user has wrong role
 *       404:
 *         description: Client user not found
 */
router.post('/', verifyTokenMiddleware, isAdmin, validate(createDeliverableSchema), ctrl.createDeliverable);

/**
 * @swagger
 * /deliverables/{id}/upload:
 *   patch:
 *     summary: Upload a file to a deliverable
 *     tags: [Deliverables]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded, deliverable updated
 *       400:
 *         description: No file uploaded
 *       404:
 *         description: Deliverable not found
 */
router.patch(
  '/:id/upload',
  verifyTokenMiddleware,
  isAdmin,
  uploadRateLimiter,
  ctrl.dynamicUploadMiddleware,
  ctrl.uploadDeliverableFile
);

/**
 * @swagger
 * /deliverables/{id}/status:
 *   patch:
 *     summary: Update deliverable status
 *     tags: [Deliverables]
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, PROCESSING, READY, ARCHIVED]
 *     responses:
 *       200:
 *         description: Status updated
 *       404:
 *         description: Deliverable not found
 */
router.patch(
  '/:id/status',
  verifyTokenMiddleware,
  isAdmin,
  validate(updateDeliverableStatusSchema),
  ctrl.updateStatus
);

router.patch(
  '/:id',
  verifyTokenMiddleware,
  isAdmin,
  validate(updateDeliverableSchema),
  ctrl.updateDeliverable
);

/**
 * @swagger
 * /deliverables/{id}:
 *   delete:
 *     summary: Delete a deliverable and its associated file
 *     tags: [Deliverables]
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
 *         description: Deliverable deleted
 *       404:
 *         description: Deliverable not found
 */
router.delete('/:id', verifyTokenMiddleware, isAdmin, ctrl.deleteDeliverable);

export default router;
