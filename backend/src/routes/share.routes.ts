import { Router } from 'express';
import { getSharedHighlight, getSharedHighlights, getSharedProfile, resolveShareClient } from '../controllers/share.controller';
import { createTicket, deleteFeedback, submitFeedback } from '../controllers/dashboard.controller';
import { createClientHighlightZipTicket, createClientZipTicket } from '../controllers/download.controller';
import { validate } from '../middleware/validate.middleware';
import { createTicketSchema, submitFeedbackSchema } from '../utils/validators/dashboard.validators';
import { shareWriteRateLimiter, zipRateLimiter } from '../middleware/rateLimiter.middleware';

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
router.get('/:token/highlights', getSharedHighlights);
router.get('/:token/highlights/:id', getSharedHighlight);

// Panel actions on the link: the same handlers as the signed-in portal (/dashboard/...), with the
// link's client standing in for the signed-in user (resolveShareClient).
router.patch('/:token/deliverables/:id/feedback', shareWriteRateLimiter, resolveShareClient, validate(submitFeedbackSchema), submitFeedback);
router.delete('/:token/deliverables/:id/feedback', shareWriteRateLimiter, resolveShareClient, deleteFeedback);
router.post('/:token/deliverables/:id/zip-ticket', resolveShareClient, zipRateLimiter, createClientZipTicket);
router.post('/:token/highlights/:id/zip-ticket', resolveShareClient, zipRateLimiter, createClientHighlightZipTicket);
router.post('/:token/tickets', shareWriteRateLimiter, resolveShareClient, validate(createTicketSchema), createTicket);

export default router;
