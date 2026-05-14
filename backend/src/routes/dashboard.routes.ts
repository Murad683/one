import { Router } from 'express';
import {
  getOverview,
  getDeliverables,
  getPayments,
  createTicket,
  getTickets,
  submitFeedback,
} from '../controllers/dashboard.controller';
import { verifyTokenMiddleware } from '../middleware/verifyToken.middleware';
import { isAdminOrClient } from '../middleware/rbac.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Client dashboard endpoints
 */

/**
 * @swagger
 * /dashboard/overview:
 *   get:
 *     summary: Get dashboard overview (package, next payment, open tickets)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard overview data
 *       401:
 *         description: Unauthorized
 */
router.get('/overview', verifyTokenMiddleware, isAdminOrClient, getOverview);

/**
 * @swagger
 * /dashboard/deliverables:
 *   get:
 *     summary: Get current user's deliverables
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's deliverables
 *       401:
 *         description: Unauthorized
 */
router.get('/deliverables', verifyTokenMiddleware, isAdminOrClient, getDeliverables);

/**
 * @swagger
 * /dashboard/payments:
 *   get:
 *     summary: Get current user's payment history
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's payments
 *       401:
 *         description: Unauthorized
 */
router.get('/payments', verifyTokenMiddleware, isAdminOrClient, getPayments);

/**
 * @swagger
 * /dashboard/tickets:
 *   post:
 *     summary: Create a new support ticket
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject, body]
 *             properties:
 *               subject:
 *                 type: string
 *               body:
 *                 type: string
 *     responses:
 *       201:
 *         description: Ticket created
 *       400:
 *         description: Validation error
 */
router.post('/tickets', verifyTokenMiddleware, isAdminOrClient, createTicket);

/**
 * @swagger
 * /dashboard/tickets:
 *   get:
 *     summary: Get current user's support tickets
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's tickets
 *       401:
 *         description: Unauthorized
 */
router.get('/tickets', verifyTokenMiddleware, isAdminOrClient, getTickets);
router.patch('/deliverables/:id/feedback', verifyTokenMiddleware, isAdminOrClient, submitFeedback);

export default router;
