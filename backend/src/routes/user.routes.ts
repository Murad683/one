import { Router } from 'express';
import { getUsers, updateUser, deleteUser, generateShareLink, revokeShareLink } from '../controllers/user.controller';
import { verifyTokenMiddleware as verifyToken } from '../middleware/verifyToken.middleware';
import { isAdmin } from '../middleware/rbac.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management (Admin only)
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ADMIN, CLIENT]
 *         description: Filter by role
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/', verifyToken, isAdmin, getUsers);

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     summary: Update user details
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User updated
 */
router.patch('/:id', verifyToken, isAdmin, updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Permanently delete a user
 *     tags: [Users]
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
 *         description: User deleted
 */
router.delete('/:id', verifyToken, isAdmin, deleteUser);

/**
 * @swagger
 * /users/{id}/share-link:
 *   post:
 *     summary: Generate (or regenerate) a public share link for a client's deliverables
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Share link generated
 *       400:
 *         description: User is not a client
 *       404:
 *         description: User not found
 *   delete:
 *     summary: Revoke a client's public share link
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Share link revoked
 *       404:
 *         description: User not found
 */
router.post('/:id/share-link', verifyToken, isAdmin, generateShareLink);
router.delete('/:id/share-link', verifyToken, isAdmin, revokeShareLink);

export default router;
