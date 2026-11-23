import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response.util';
import { isUniqueViolation } from '../utils/email';

const NAME_IN_USE_MESSAGE = 'Bu adda kateqoriya artıq var';

const isNotFound = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2025';

const cleanName = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name ? name : null;
};

// GET: every category with how many files use it (the admin shows it and keeps delete off while > 0).
export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.deliverableCategory.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { deliverables: true } } },
    });
    sendSuccess(
      res,
      categories.map(({ _count, ...c }) => ({ ...c, fileCount: _count.deliverables })),
    );
  } catch (err) {
    console.error('DeliverableCategory getCategories error:', err);
    sendError(res, 'Failed to fetch categories', 500);
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const name = cleanName(req.body?.name);
    if (!name) {
      sendError(res, 'Kateqoriyanın adı mütləqdir', 400);
      return;
    }

    const category = await prisma.deliverableCategory.create({
      data: { name, isVideo: req.body?.isVideo === true },
    });
    sendSuccess(res, category, 201);
  } catch (err) {
    if (isUniqueViolation(err)) {
      sendError(res, NAME_IN_USE_MESSAGE, 409);
      return;
    }
    console.error('DeliverableCategory createCategory error:', err);
    sendError(res, 'Failed to create category', 500);
  }
};

// PATCH: the name and/or whether it is a video category. isVideo only decides the storage folder of new
// uploads and the cover field in the form; existing files and the video retention rule do not depend on it.
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data: { name?: string; isVideo?: boolean } = {};

    if (req.body?.name !== undefined) {
      const name = cleanName(req.body.name);
      if (!name) {
        sendError(res, 'Kateqoriyanın adı boş ola bilməz', 400);
        return;
      }
      data.name = name;
    }
    if (typeof req.body?.isVideo === 'boolean') data.isVideo = req.body.isVideo;

    if (data.name === undefined && data.isVideo === undefined) {
      sendError(res, 'Dəyişiklik yoxdur', 400);
      return;
    }

    const category = await prisma.deliverableCategory.update({ where: { id }, data });
    sendSuccess(res, category);
  } catch (err) {
    if (isUniqueViolation(err)) {
      sendError(res, NAME_IN_USE_MESSAGE, 409);
      return;
    }
    if (isNotFound(err)) {
      sendError(res, 'Kateqoriya tapılmadı', 404);
      return;
    }
    console.error('DeliverableCategory updateCategory error:', err);
    sendError(res, 'Failed to update category', 500);
  }
};

// DELETE: only an unused category. Deleting one with files left every file without a type (23 Nov 2026).
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const fileCount = await prisma.deliverable.count({ where: { categoryId: id } });
    if (fileCount > 0) {
      sendError(
        res,
        `Bu kateqoriyada ${fileCount} fayl var, silmək olmur. Əvvəl faylları başqa növə keçirin.`,
        409,
      );
      return;
    }

    await prisma.deliverableCategory.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    if (isNotFound(err)) {
      sendError(res, 'Kateqoriya tapılmadı', 404);
      return;
    }
    console.error('DeliverableCategory deleteCategory error:', err);
    sendError(res, 'Failed to delete category', 500);
  }
};
