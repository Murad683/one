import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response.util';

// GET /api/v1/services
export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 12));
    const skip = (page - 1) * limit;
    const includeInactive = req.query.includeInactive === 'true';

    const where = includeInactive ? {} : { isActive: true };

    const [items, total] = await Promise.all([
      prisma.service.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.service.count({ where }),
    ]);

    sendSuccess(res, {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Service getAll error:', err);
    sendError(res, 'Failed to fetch services', 500);
  }
};

// GET /api/v1/services/:id
export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const service = await prisma.service.findUnique({ where: { id } });

    if (!service) {
      sendError(res, 'Service not found', 404);
      return;
    }

    sendSuccess(res, service);
  } catch (err) {
    console.error('Service getById error:', err);
    sendError(res, 'Failed to fetch service', 500);
  }
};

// POST /api/v1/services
export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const service = await prisma.service.create({ data: req.body });
    sendSuccess(res, service, 201);
  } catch (err) {
    console.error('Service create error:', err);
    sendError(res, 'Failed to create service', 500);
  }
};

// PATCH /api/v1/services/:id
export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.service.findUnique({ where: { id } });

    if (!existing) {
      sendError(res, 'Service not found', 404);
      return;
    }

    const updated = await prisma.service.update({
      where: { id },
      data: req.body,
    });

    sendSuccess(res, updated);
  } catch (err) {
    console.error('Service update error:', err);
    sendError(res, 'Failed to update service', 500);
  }
};

// DELETE /api/v1/services/:id
export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.service.findUnique({ where: { id } });

    if (!existing) {
      sendError(res, 'Service not found', 404);
      return;
    }

    await prisma.service.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    console.error('Service delete error:', err);
    sendError(res, 'Failed to delete service', 500);
  }
};
