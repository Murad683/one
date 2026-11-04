import fs from 'fs';
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { sendError, sendSuccess } from '../utils/response.util';
import { storeWithOriginal } from '../services/image.service';
import {
  MAX_STAGED_UPLOADS,
  SaveError,
  SaveInput,
  createHighlightWithItems,
  deleteHighlightFiles,
  detailOf,
  isPermutation,
  listForStaff,
  saveHighlightWithItems,
  signKey,
} from '../services/highlight.service';

// Staff (admin, super admin, creator) endpoints for story-style highlights. Creators may edit any
// client's highlights, as they could with the older JSON form; the target must be a CLIENT.

const itemsInOrder = { orderBy: { sortOrder: 'asc' as const }, select: { id: true, imageUrl: true, originalUrl: true } };

const staffIdOf = (req: Request): string => (req.user as { id: string }).id;

const isClient = async (id: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  return user?.role === 'CLIENT';
};

const fail = (res: Response, err: unknown, what: string): void => {
  console.error(`[Highlights] ${what} failed:`, err);
  sendError(res, 'Xəta baş verdi. Yenidən cəhd edin.', 500);
};

// GET /api/v1/highlights/client/:clientId
export const listClientHighlights = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;
    if (!(await isClient(clientId))) return void sendError(res, 'Müştəri tapılmadı', 404);
    sendSuccess(res, await listForStaff(clientId));
  } catch (err) {
    fail(res, err, 'list');
  }
};

// POST /api/v1/highlights/client/:clientId  { title, items: [{uploadKey}], coverIndex }
export const createHighlight = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;
    if (!(await isClient(clientId))) return void sendError(res, 'Müştəri tapılmadı', 404);
    const row = await createHighlightWithItems(clientId, staffIdOf(req), req.body as SaveInput);
    sendSuccess(res, await detailOf(row), 201);
  } catch (err) {
    if (err instanceof SaveError) return void sendError(res, err.message, err.status);
    fail(res, err, 'create');
  }
};

// PUT /api/v1/highlights/client/:clientId/order  { ids }
export const reorderHighlights = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;
    const { ids } = req.body as { ids: string[] };
    if (!(await isClient(clientId))) return void sendError(res, 'Müştəri tapılmadı', 404);

    const ok = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${clientId} FOR UPDATE`;
      const existing = await tx.highlight.findMany({ where: { userId: clientId }, select: { id: true } });
      if (!isPermutation(ids, existing.map((row) => row.id))) return false;
      for (const [index, id] of ids.entries()) {
        await tx.highlight.update({ where: { id }, data: { sortOrder: index } });
      }
      return true;
    });
    if (!ok) return void sendError(res, 'Sıra düzgün göndərilməyib. Səhifəni yeniləyin.', 400);
    sendSuccess(res, await listForStaff(clientId));
  } catch (err) {
    fail(res, err, 'reorder highlights');
  }
};

// GET /api/v1/highlights/:id
export const getHighlight = async (req: Request, res: Response): Promise<void> => {
  try {
    const row = await prisma.highlight.findUnique({
      where: { id: req.params.id as string },
      include: { items: itemsInOrder },
    });
    if (!row) return void sendError(res, 'Highlight tapılmadı', 404);
    sendSuccess(res, await detailOf(row));
  } catch (err) {
    fail(res, err, 'get');
  }
};

// PUT /api/v1/highlights/:id  { title, items: [{id}|{uploadKey}], coverIndex, expectedUpdatedAt }
export const updateHighlight = async (req: Request, res: Response): Promise<void> => {
  try {
    const { expectedUpdatedAt, ...input } = req.body as SaveInput & { expectedUpdatedAt: string };
    const result = await saveHighlightWithItems(req.params.id as string, staffIdOf(req), input, expectedUpdatedAt);
    if (!result) return void sendError(res, 'Highlight tapılmadı', 404);
    sendSuccess(res, await detailOf(result.row));
    // After the response: a failure here only leaves orphaned files.
    void deleteHighlightFiles(result.removedKeys);
  } catch (err) {
    if (err instanceof SaveError) return void sendError(res, err.message, err.status);
    fail(res, err, 'update');
  }
};

// DELETE /api/v1/highlights/:id
export const deleteHighlight = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const row = await prisma.highlight.findUnique({ where: { id }, include: { items: itemsInOrder } });
    if (!row) return void sendError(res, 'Highlight tapılmadı', 404);
    await prisma.highlight.delete({ where: { id } });
    res.status(204).send();
    // After the response: a failure here only leaves orphaned files.
    void deleteHighlightFiles(row.items.flatMap((item) => [item.imageUrl, item.originalUrl ?? '']));
  } catch (err) {
    fail(res, err, 'delete');
  }
};

// POST /api/v1/highlights/uploads  (multipart, field "file")
// Stores one image as a staged upload: nothing is linked to a highlight until "Yadda saxla".
export const stageUpload = async (req: Request, res: Response): Promise<void> => {
  const file = req.file;
  try {
    if (!file) return void sendError(res, 'Şəkil seçilməyib.', 400);
    const staffId = staffIdOf(req);
    if ((await prisma.highlightUpload.count({ where: { uploadedById: staffId } })) >= MAX_STAGED_UPLOADS) {
      await fs.promises.unlink(file.path).catch(() => {});
      return void sendError(res, 'Çoxlu yüklənmiş şəkil saxlanmayıb. Əvvəlcə yadda saxlayın və ya ləğv edin.', 400);
    }
    // The original is kept for downloads, the optimized copy is what the story shows.
    const result = await storeWithOriginal(file, 'highlights', { maxEdge: 1920, quality: 85 });
    try {
      await prisma.highlightUpload.create({
        data: { key: result.url, originalKey: result.originalUrl, uploadedById: staffId },
      });
    } catch (err) {
      await deleteHighlightFiles([result.url, result.originalUrl ?? '']);
      throw err;
    }
    sendSuccess(res, { key: result.url, url: await signKey(result.url) }, 201);
  } catch (err) {
    if (file) await fs.promises.unlink(file.path).catch(() => {});
    console.error('[Highlights] stage upload failed:', err instanceof Error ? err.message : err);
    sendError(res, 'Şəkil yüklənmədi.', 500);
  }
};

// DELETE /api/v1/highlights/uploads  { keys }  (the editor was cancelled; only the caller's own staged files)
export const discardUploads = async (req: Request, res: Response): Promise<void> => {
  try {
    const { keys } = req.body as { keys: string[] };
    const own = await prisma.highlightUpload.findMany({
      where: { key: { in: keys }, uploadedById: staffIdOf(req) },
      select: { key: true, originalKey: true },
    });
    const ownKeys = own.map((row) => row.key);
    await prisma.highlightUpload.deleteMany({ where: { key: { in: ownKeys } } });
    res.status(204).send();
    void deleteHighlightFiles(own.flatMap((row) => [row.key, row.originalKey ?? '']));
  } catch (err) {
    fail(res, err, 'discard uploads');
  }
};
