import { Router } from 'express';
import * as ctrl from '../controllers/project.controller';
import { verifyTokenMiddleware } from '../middleware/verifyToken.middleware';
import { isAdmin } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { uploadImage } from '../middleware/upload.middleware';
import {
  createProjectSchema,
  updateProjectSchema,
} from '../utils/validators/content.validators';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Portfolio projects management
 */

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Get all published projects
 *     tags: [Projects]
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
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of published projects
 */
router.get('/', ctrl.getAll);
router.get('/featured', ctrl.getFeatured);

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Get a project by ID
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project details
 *       404:
 *         description: Project not found
 */
router.get('/:id', ctrl.getById);

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, category]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               thumbnailUrl:
 *                 type: string
 *               youtubeId:
 *                 type: string
 *               category:
 *                 type: string
 *               isPublished:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Project created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — Admin only
 */
router.post('/', verifyTokenMiddleware, isAdmin, validate(createProjectSchema), ctrl.create);

/**
 * @swagger
 * /projects/{id}:
 *   patch:
 *     summary: Update a project
 *     tags: [Projects]
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
 *               category:
 *                 type: string
 *               isPublished:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Project updated
 *       404:
 *         description: Project not found
 */
router.patch('/:id', verifyTokenMiddleware, isAdmin, validate(updateProjectSchema), ctrl.update);

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: Soft-delete a project (set isPublished to false)
 *     tags: [Projects]
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
 *         description: Project deleted
 *       404:
 *         description: Project not found
 */
router.delete('/:id', verifyTokenMiddleware, isAdmin, ctrl.remove);

/**
 * @swagger
 * /projects/{id}/thumbnail:
 *   post:
 *     summary: Upload a project thumbnail image
 *     tags: [Projects]
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
 *         description: Thumbnail uploaded and project updated
 *       400:
 *         description: No file uploaded
 *       404:
 *         description: Project not found
 */
router.post(
  '/:id/thumbnail',
  verifyTokenMiddleware,
  isAdmin,
  (req, _res, next) => { req.uploadSubfolder = 'thumbnails'; next(); },
  uploadImage,
  ctrl.uploadThumbnail
);

export default router;
