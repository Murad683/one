import { Router } from 'express';
import { chat, assistantChatSchema } from '../controllers/assistant.controller';
import { verifyTokenMiddleware } from '../middleware/verifyToken.middleware';
import { isAdminOrCreator } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  assistantRateLimiter,
  assistantDailyLimiter,
  assistantGlobalLimiter,
} from '../middleware/rateLimiter.middleware';

// Help assistant for the admin panel. Staff only (admins and creators): clients
// and anonymous visitors never reach it.
const router = Router();

router.post(
  '/',
  verifyTokenMiddleware,
  isAdminOrCreator,
  assistantRateLimiter,
  assistantDailyLimiter,
  assistantGlobalLimiter,
  validate(assistantChatSchema),
  chat
);

export default router;
