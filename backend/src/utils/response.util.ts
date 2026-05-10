import { Response } from 'express';

interface SuccessMeta {
  [key: string]: unknown;
}

export const sendSuccess = (
  res: Response,
  data: unknown,
  statusCode: number = 200,
  meta?: SuccessMeta
): void => {
  const body: Record<string, unknown> = { success: true, data };
  if (meta) body.meta = meta;
  res.status(statusCode).json(body);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  errors?: unknown
): void => {
  const body: Record<string, unknown> = { success: false, message };
  if (errors) body.errors = errors;
  res.status(statusCode).json(body);
};
