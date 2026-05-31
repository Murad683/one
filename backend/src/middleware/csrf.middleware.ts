import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.util';

export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    next();
    return;
  }

  // Custom CSRF token header pattern for APIs using Bearer tokens or cookies
  const csrfToken = req.headers['x-csrf-token'];
  if (!csrfToken) {
    sendError(res, 'CSRF token missing', 403);
    return;
  }

  next();
};
