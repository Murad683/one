import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import { sendError } from '../utils/response.util';
import prisma from '../utils/prisma';

// Simple in-memory cache to avoid DB hit on every request
const activeUserCache = new Map<string, number>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export const verifyTokenMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const portal = req.headers['x-portal'] || req.query.portal;
  const tokenName = portal === 'admin' ? 'adminToken' : 'token';
  const cookieToken = req.cookies?.[tokenName];

  const authHeader = req.headers.authorization;
  let token: string | undefined;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  
  // Fallback to cookie if Bearer token is not present
  if (!token) {
    token = cookieToken;
  }

  if (!token) {
    sendError(res, 'No token provided', 401);
    return;
  }

  try {
    const decoded = verifyToken(token);
    const userId = decoded.id;

    // Check cache first
    const cachedTime = activeUserCache.get(userId);
    const now = Date.now();

    if (!cachedTime || now - cachedTime > CACHE_TTL_MS) {
      // Not in cache or expired, check DB
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isActive: true },
      });

      if (!user) {
        sendError(res, 'User no longer exists', 401);
        return;
      }

      if (!user.isActive) {
        sendError(res, 'Account is deactivated', 403);
        return;
      }

      // Update cache
      activeUserCache.set(userId, now);
    }

    req.user = decoded as any;
    next();
  } catch {
    sendError(res, 'Invalid or expired token', 401);
  }
};
