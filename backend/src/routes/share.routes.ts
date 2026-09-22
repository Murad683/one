import { Router } from 'express';
import { getSharedProfile } from '../controllers/share.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Share
 *   description: Public, unauthenticated client-profile share links
 */

/**
 * @swagger
 * /share/{token}:
 *   get:
 *     summary: Get a client's public read-only deliverables by share token
 *     tags: [Share]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated list of READY deliverables with client profile info
 *       404:
 *         description: Link not found or expired
 */
router.get('/:token', getSharedProfile);

export default router;
