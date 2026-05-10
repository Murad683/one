import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.util';

export const isAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'ADMIN') {
    sendError(res, 'Forbidden', 403);
    return;
  }
  next();
};

export const isClient = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'CLIENT') {
    sendError(res, 'Forbidden', 403);
    return;
  }
  next();
};

export const isAdminOrClient = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'CLIENT') {
    sendError(res, 'Forbidden', 403);
    return;
  }
  next();
};
