import { Router } from 'express';
import { register, login, me, updateProfile } from '../controllers/auth.controller';
import { verifyTokenMiddleware } from '../middleware/verifyToken.middleware';
import { validate } from '../middleware/validate.middleware';
import { registerSchema, loginSchema } from '../utils/validators/auth.validators';
import { updateProfileSchema } from '../utils/validators/profile.validators';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and user management
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               role:
 *                 type: string
 *                 enum: [ADMIN, CLIENT]
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: Email already in use
 *       422:
 *         description: Validation failed
 */
router.post('/register', validate(registerSchema), register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns JWT
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authRateLimiter, validate(loginSchema), login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthorized — invalid or missing token
 */
router.get('/me', verifyTokenMiddleware, me);

/**
 * @swagger
 * /auth/profile:
 *   patch:
 *     summary: Update authenticated user's profile (Instagram fields)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               igUsername:
 *                 type: string
 *               igBio:
 *                 type: string
 *               igFollowers:
 *                 type: string
 *               igFollowing:
 *                 type: string
 *               igPostsCount:
 *                 type: string
 *               igProfilePic:
 *                 type: string
 *               igHighlights:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     imageUrl:
 *                       type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation failed
 */
router.patch('/profile', verifyTokenMiddleware, validate(updateProfileSchema), updateProfile);

export default router;
