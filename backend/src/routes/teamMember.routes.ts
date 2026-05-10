import { Router } from 'express';
import * as ctrl from '../controllers/teamMember.controller';
import { verifyTokenMiddleware } from '../middleware/verifyToken.middleware';
import { isAdmin } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createTeamMemberSchema,
  updateTeamMemberSchema,
} from '../utils/validators/content.validators';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Team
 *   description: Team members management
 */

/**
 * @swagger
 * /team:
 *   get:
 *     summary: Get all active team members
 *     tags: [Team]
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
 *         description: Paginated list of active team members
 */
router.get('/', ctrl.getAll);

/**
 * @swagger
 * /team/{id}:
 *   get:
 *     summary: Get a team member by ID
 *     tags: [Team]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Team member details
 *       404:
 *         description: Team member not found
 */
router.get('/:id', ctrl.getById);

/**
 * @swagger
 * /team:
 *   post:
 *     summary: Create a new team member
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, role]
 *             properties:
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *               bio:
 *                 type: string
 *               avatarUrl:
 *                 type: string
 *               linkedinUrl:
 *                 type: string
 *               twitterUrl:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Team member created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — Admin only
 */
router.post('/', verifyTokenMiddleware, isAdmin, validate(createTeamMemberSchema), ctrl.create);

/**
 * @swagger
 * /team/{id}:
 *   patch:
 *     summary: Update a team member
 *     tags: [Team]
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
 *               role:
 *                 type: string
 *               bio:
 *                 type: string
 *               avatarUrl:
 *                 type: string
 *               linkedinUrl:
 *                 type: string
 *               twitterUrl:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Team member updated
 *       404:
 *         description: Team member not found
 */
router.patch('/:id', verifyTokenMiddleware, isAdmin, validate(updateTeamMemberSchema), ctrl.update);

/**
 * @swagger
 * /team/{id}:
 *   delete:
 *     summary: Soft-delete a team member (set isActive to false)
 *     tags: [Team]
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
 *         description: Team member deleted
 *       404:
 *         description: Team member not found
 */
router.delete('/:id', verifyTokenMiddleware, isAdmin, ctrl.remove);

export default router;
