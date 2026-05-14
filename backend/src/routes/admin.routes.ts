import { Router } from 'express';
import {
  createPayment,
  getClientUsers,
  updateUserPackage,
  uploadInvoice,
  getAllTickets,
  updateTicketStatus,
  getUserPayments,
  deletePayment,
  getDashboardStats,
  getAdmins,
  createAdminUser,
  deleteAdminUser,
} from '../controllers/admin.controller';
import { getSubmissions } from '../controllers/contactSubmission.controller';
import { verifyTokenMiddleware } from '../middleware/verifyToken.middleware';
import { isAdmin, isSuperAdmin } from '../middleware/rbac.middleware';
import { uploadInvoicePdf } from '../middleware/upload.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only management endpoints
 */

/**
 * @swagger
 * /admin/payments:
 *   post:
 *     summary: Create a payment record for a client
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, amount, paidAt, nextPaymentDate]
 *             properties:
 *               userId:
 *                 type: string
 *               amount:
 *                 type: number
 *               paidAt:
 *                 type: string
 *                 format: date-time
 *               nextPaymentDate:
 *                 type: string
 *                 format: date-time
 *               invoicePdfUrl:
 *                 type: string
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment created
 *       400:
 *         description: Validation error
 */
router.post('/payments', verifyTokenMiddleware, isAdmin, createPayment);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all client users with package and payment count
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of client users
 */
router.get('/users', verifyTokenMiddleware, isAdmin, getClientUsers);

/**
 * @swagger
 * /admin/users/{userId}/package:
 *   patch:
 *     summary: Assign or unassign a package to a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               packageId:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: User updated with new package
 *       404:
 *         description: User or package not found
 */
router.patch('/users/:userId/package', verifyTokenMiddleware, isAdmin, updateUserPackage);

/**
 * @swagger
 * /admin/invoices/upload:
 *   post:
 *     summary: Upload an invoice PDF
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
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
 *       201:
 *         description: Invoice uploaded, returns URL
 *       400:
 *         description: No file or invalid file type
 */
router.post('/invoices/upload', verifyTokenMiddleware, isAdmin, uploadInvoicePdf, uploadInvoice);

router.get('/tickets', verifyTokenMiddleware, isAdmin, getAllTickets);
router.patch('/tickets/:id/status', verifyTokenMiddleware, isAdmin, updateTicketStatus);

// Payment history routes
router.get('/payments/user/:userId', verifyTokenMiddleware, isAdmin, getUserPayments);
router.delete('/payments/:id', verifyTokenMiddleware, isAdmin, deletePayment);

// Dashboard stats
router.get('/stats', verifyTokenMiddleware, isAdmin, getDashboardStats);

// Messages history
router.get('/messages', verifyTokenMiddleware, isAdmin, getSubmissions);

// Team management (Super Admin Only)
router.get('/team', verifyTokenMiddleware, isSuperAdmin, getAdmins);
router.post('/team', verifyTokenMiddleware, isSuperAdmin, createAdminUser);
router.delete('/team/:id', verifyTokenMiddleware, isSuperAdmin, deleteAdminUser);

export default router;
