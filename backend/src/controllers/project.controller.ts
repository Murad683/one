import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response.util';
import { processAndStoreFile, getSecureDownloadUrl } from '../services/upload.service';

function extractStorageKey(keyOrUrl: string | null | undefined): string {
  if (!keyOrUrl) return '';
  const keyStr = String(keyOrUrl);
  if (keyStr.includes('uploads/') || keyStr.includes('undefined') || keyStr.includes('null')) {
    return keyStr;
  }
  if (keyStr.startsWith('http')) {
    try {
      const url = new URL(keyStr);
      return url.pathname.substring(1);
    } catch {
      return keyStr;
    }
  }
  return keyStr;
}

const normalizeProjectData = (body: Record<string, unknown>): Record<string, unknown> => {
  const { category, ...data } = body;

  if (category !== undefined && data.categoryLegacy === undefined) {
    data.categoryLegacy = category;
  }

  if (typeof data.thumbnailUrl === 'string') {
    data.thumbnailUrl = extractStorageKey(data.thumbnailUrl);
  }

  return data;
};

// Helper to sign project urls
const signProjectUrls = async (project: any) => {
  if (project.thumbnailUrl) {
    try {
      project.thumbnailUrl = await getSecureDownloadUrl(project.thumbnailUrl);
    } catch (e) {
      console.warn('Failed to sign thumbnailUrl', e);
    }
  }
  return project;
};

// GET /api/v1/projects
export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 12));
    const skip = (page - 1) * limit;
    const category = req.query.category as string | undefined;
    const includeInactive = req.query.includeInactive === 'true';

    const where: Prisma.ProjectWhereInput = includeInactive ? {} : { isPublished: true };
    if (category) {
      where.OR = [
        { categoryLegacy: category },
        { category: { slug: category } },
        { category: { name: category } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: { category: true },
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.project.count({ where }),
    ]);

    const signedItems = await Promise.all(items.map(signProjectUrls));

    sendSuccess(res, {
      items: signedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Project getAll error:', err);
    sendError(res, 'Failed to fetch projects', 500);
  }
};

// GET /api/v1/projects/:id
export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const project = await prisma.project.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!project) {
      sendError(res, 'Project not found', 404);
      return;
    }

    const signedProject = await signProjectUrls(project);
    sendSuccess(res, signedProject);
  } catch (err) {
    console.error('Project getById error:', err);
    sendError(res, 'Failed to fetch project', 500);
  }
};

// GET /api/v1/projects/featured
export const getFeatured = async (_req: Request, res: Response): Promise<void> => {
  try {
    const projects = await prisma.project.findMany({
      where: { isFeatured: true, isPublished: true },
      include: { category: true },
      orderBy: { sortOrder: 'asc' },
    });

    const signedProjects = await Promise.all(projects.map(signProjectUrls));
    sendSuccess(res, signedProjects);
  } catch (err) {
    console.error('Project getFeatured error:', err);
    sendError(res, 'Failed to fetch featured projects', 500);
  }
};

// POST /api/v1/projects
export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const project = await prisma.project.create({
      data: normalizeProjectData(req.body) as Prisma.ProjectUncheckedCreateInput,
      include: { category: true },
    });
    sendSuccess(res, project, 201);
  } catch (err) {
    console.error('Project create error:', err);
    sendError(res, 'Failed to create project', 500);
  }
};

// PATCH /api/v1/projects/:id
export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.project.findUnique({ where: { id } });

    if (!existing) {
      sendError(res, 'Project not found', 404);
      return;
    }

    const updated = await prisma.project.update({
      where: { id },
      data: normalizeProjectData(req.body) as Prisma.ProjectUncheckedUpdateInput,
      include: { category: true },
    });

    sendSuccess(res, updated);
  } catch (err) {
    console.error('Project update error:', err);
    sendError(res, 'Failed to update project', 500);
  }
};

// DELETE /api/v1/projects/:id
export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.project.findUnique({ where: { id } });

    if (!existing) {
      sendError(res, 'Project not found', 404);
      return;
    }

    await prisma.project.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    console.error('Project delete error:', err);
    sendError(res, 'Failed to delete project', 500);
  }
};

// POST /api/v1/projects/:id/thumbnail
export const uploadThumbnail = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) {
      sendError(res, 'Project not found', 404);
      return;
    }

    if (!req.file) {
      sendError(res, 'No file uploaded', 400);
      return;
    }

    const result = await processAndStoreFile(req.file, 'thumbnails');

    const updated = await prisma.project.update({
      where: { id },
      data: { thumbnailUrl: result.fileUrl },
    });

    sendSuccess(res, updated);
  } catch (err) {
    console.error('Project uploadThumbnail error:', err);
    sendError(res, 'Failed to upload thumbnail', 500);
  }
};
