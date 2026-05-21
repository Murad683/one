import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response.util';
import { getSecureDownloadUrl, extractStorageKey } from '../services/upload.service';

const signTeamMemberUrls = async (member: any) => {
  if (member.avatarUrl) {
    try {
      member.avatarUrl = await getSecureDownloadUrl(member.avatarUrl);
    } catch (e) {
      console.warn('Failed to sign avatarUrl', e);
    }
  }
  return member;
};

// GET /api/v1/team
export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 12));
    const skip = (page - 1) * limit;
    const includeInactive = req.query.includeInactive === 'true';

    const where = includeInactive ? {} : { isActive: true };

    const [items, total] = await Promise.all([
      prisma.teamMember.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.teamMember.count({ where }),
    ]);

    const signedItems = await Promise.all(items.map(signTeamMemberUrls));

    sendSuccess(res, {
      items: signedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('TeamMember getAll error:', err);
    sendError(res, 'Failed to fetch team members', 500);
  }
};

// GET /api/v1/team/:id
export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const member = await prisma.teamMember.findUnique({ where: { id } });

    if (!member) {
      sendError(res, 'Team member not found', 404);
      return;
    }

    const signedMember = await signTeamMemberUrls(member);
    sendSuccess(res, signedMember);
  } catch (err) {
    console.error('TeamMember getById error:', err);
    sendError(res, 'Failed to fetch team member', 500);
  }
};

// POST /api/v1/team
export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = { ...req.body };
    if (typeof data.avatarUrl === 'string') {
      data.avatarUrl = extractStorageKey(data.avatarUrl);
    }

    const member = await prisma.teamMember.create({ data });
    const signedMember = await signTeamMemberUrls(member);
    sendSuccess(res, signedMember, 201);
  } catch (err) {
    console.error('TeamMember create error:', err);
    sendError(res, 'Failed to create team member', 500);
  }
};

// PATCH /api/v1/team/:id
export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.teamMember.findUnique({ where: { id } });

    if (!existing) {
      sendError(res, 'Team member not found', 404);
      return;
    }

    const data = { ...req.body };
    if (typeof data.avatarUrl === 'string') {
      data.avatarUrl = extractStorageKey(data.avatarUrl);
    }

    const updated = await prisma.teamMember.update({
      where: { id },
      data,
    });

    const signedUpdated = await signTeamMemberUrls(updated);
    sendSuccess(res, signedUpdated);
  } catch (err) {
    console.error('TeamMember update error:', err);
    sendError(res, 'Failed to update team member', 500);
  }
};

// DELETE /api/v1/team/:id
export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.teamMember.findUnique({ where: { id } });

    if (!existing) {
      sendError(res, 'Team member not found', 404);
      return;
    }

    await prisma.teamMember.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    console.error('TeamMember delete error:', err);
    sendError(res, 'Failed to delete team member', 500);
  }
};
