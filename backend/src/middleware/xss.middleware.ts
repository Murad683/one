import { Request, Response, NextFunction } from 'express';
import * as xss from 'xss';

const filterXSS = (xss as any).filterXSS || (xss as any).default || xss;

/**
 * Middleware to sanitize user input to prevent XSS attacks.
 * It recursively iterates through the request body, query, and params.
 */
export const xssSanitize = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    if (req.query && Object.keys(req.query).length > 0) {
      const sanitizedQuery = sanitizeObject(req.query);
      for (const key in sanitizedQuery) {
        req.query[key] = sanitizedQuery[key];
      }
    }
    if (req.params && Object.keys(req.params).length > 0) {
      const sanitizedParams = sanitizeObject(req.params);
      for (const key in sanitizedParams) {
        req.params[key] = sanitizedParams[key];
      }
    }
    next();
  } catch (error) {
    console.error('XSS Sanitization Error:', error);
    next(); // Continue even if sanitization fails for now to avoid 500s
  }
};

const sanitizeObject = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) {
    if (typeof obj === 'string') {
      return typeof filterXSS === 'function' ? filterXSS(obj) : obj;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }
  return sanitized;
};
