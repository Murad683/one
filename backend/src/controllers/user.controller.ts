import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response.util';
import { hashPassword } from '../utils/password.util';

const SHARE_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { role, page = '1', limit = '10' } = req.query;
    const pageNumber = parseInt(page as string, 10) || 1;
    const limitNumber = parseInt(limit as string, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const where: any = {};
    if (role === 'CLIENT' || role === 'ADMIN') {
      where.role = role;
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNumber,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          igHighlights: true,
          shareToken: true,
          shareTokenExpiresAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return sendSuccess(res, {
      items,
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
    });
  } catch (error) {
    return sendError(res, 'Error fetching users', 500, error);
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.user.findUnique({ where: { id } });

    if (!existing) {
      return sendError(res, 'User not found', 404);
    }

    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN' && req.user!.id !== id) {
      return sendError(res, 'Forbidden', 403);
    }

    const { name, email, password, isActive, igHighlights } = req.body;
    const data: {
      name?: string;
      email?: string;
      password?: string;
      isActive?: boolean;
      igHighlights?: any;
    } = {};

    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (isActive !== undefined) data.isActive = isActive;
    if (igHighlights !== undefined) data.igHighlights = igHighlights;
    if (password) data.password = await hashPassword(password);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        igHighlights: true,
      },
    });

    return sendSuccess(res, user);
  } catch (error) {
    return sendError(res, 'Error updating user', 500, error);
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.user.findUnique({ where: { id } });

    if (!existing) {
      return sendError(res, 'User not found', 404);
    }

    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN' && req.user!.id !== id) {
      return sendError(res, 'Forbidden', 403);
    }

    // Prevent deleting the last admin or yourself if necessary?
    // For now, following the "hard-delete" instruction.
    await prisma.user.delete({ where: { id } });

    return res.status(204).send();
  } catch (error) {
    return sendError(res, 'Error deleting user', 500, error);
  }
};

// POST /api/v1/users/:id/share-link (Admin only)
export const generateShareLink = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.user.findUnique({ where: { id } });

    if (!existing) {
      return sendError(res, 'User not found', 404);
    }

    if (existing.role !== 'CLIENT') {
      return sendError(res, 'Share links can only be generated for clients', 400);
    }

    const shareToken = crypto.randomBytes(32).toString('hex');
    const shareTokenExpiresAt = new Date(Date.now() + SHARE_LINK_TTL_MS);

    await prisma.user.update({
      where: { id },
      data: { shareToken, shareTokenExpiresAt },
    });

    return sendSuccess(res, {
      token: shareToken,
      url: `${process.env.FRONTEND_URL}/share/${shareToken}`,
      expiresAt: shareTokenExpiresAt,
    });
  } catch (error) {
    return sendError(res, 'Error generating share link', 500, error);
  }
};

// DELETE /api/v1/users/:id/share-link (Admin only)
export const revokeShareLink = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.user.findUnique({ where: { id } });

    if (!existing) {
      return sendError(res, 'User not found', 404);
    }

    await prisma.user.update({
      where: { id },
      data: { shareToken: null, shareTokenExpiresAt: null },
    });

    return sendSuccess(res, { id, shareToken: null });
  } catch (error) {
    return sendError(res, 'Error revoking share link', 500, error);
  }
};
