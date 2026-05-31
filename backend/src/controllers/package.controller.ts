import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response.util';

// GET /api/v1/packages
export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 12));
    const skip = (page - 1) * limit;
    const includeInactive = req.query.includeInactive === 'true';

    const where = includeInactive ? {} : { isActive: true };

    const [items, total] = await Promise.all([
      prisma.package.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.package.count({ where }),
    ]);

    sendSuccess(res, {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Package getAll error:', err);
    sendError(res, 'Failed to fetch packages', 500);
  }
};

// GET /api/v1/packages/:id
export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const pkg = await prisma.package.findUnique({ where: { id } });

    if (!pkg) {
      sendError(res, 'Package not found', 404);
      return;
    }

    sendSuccess(res, pkg);
  } catch (err) {
    console.error('Package getById error:', err);
    sendError(res, 'Failed to fetch package', 500);
  }
};

// POST /api/v1/packages
export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.body.isPopular === true) {
      await prisma.package.updateMany({ data: { isPopular: false } });
    }

    const pkg = await prisma.package.create({ data: req.body });
    sendSuccess(res, pkg, 201);
  } catch (err) {
    console.error('Package create error:', err);
    sendError(res, 'Failed to create package', 500);
  }
};

// PATCH /api/v1/packages/:id
export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.package.findUnique({ where: { id } });

    if (!existing) {
      sendError(res, 'Package not found', 404);
      return;
    }

    if (req.body.isPopular === true) {
      await prisma.package.updateMany({
        where: { id: { not: id } },
        data: { isPopular: false },
      });
    }

    const updated = await prisma.package.update({
      where: { id },
      data: req.body,
    });

    sendSuccess(res, updated);
  } catch (err) {
    console.error('Package update error:', err);
    sendError(res, 'Failed to update package', 500);
  }
};

// DELETE /api/v1/packages/:id
export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.package.findUnique({ where: { id } });

    if (!existing) {
      sendError(res, 'Package not found', 404);
      return;
    }

    await prisma.package.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    console.error('Package delete error:', err);
    sendError(res, 'Failed to delete package', 500);
  }
};
