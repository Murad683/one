import fs from 'fs';
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { sendError, sendSuccess } from '../utils/response.util';
import { optimizeAndStore } from '../services/image.service';
import {
  MAX_HIGHLIGHTS,
  MAX_ITEMS,
  deleteHighlightFiles,
  detailOf,
  isPermutation,
  listForStaff,
  materializeLegacy,
  signKey,
} from '../services/highlight.service';

// Staff (admin, super admin, creator) endpoints for story-style highlights. Creators may edit any
// client's highlights, as they could with the older JSON form; the target must be a CLIENT.

const itemsInOrder = { orderBy: { sortOrder: 'asc' as const }, select: { id: true, imageUrl: true } };

class LimitError extends Error {}

const isClient = async (id: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  return user?.role === 'CLIENT';
};

const fail = (res: Response, err: unknown, what: string): void => {
  console.error(`[Highlights] ${what} failed:`, err);
  sendError(res, 'Xəta baş verdi. Yenidən cəhd edin.', 500);
};

const unlinkAll = async (files: Express.Multer.File[]): Promise<void> => {
  await Promise.all(files.map((file) => fs.promises.unlink(file.path).catch(() => {})));
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

// POST /api/v1/highlights/client/:clientId  { title }
export const createHighlight = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.params.clientId as string;
    const { title } = req.body as { title: string };
    if (!(await isClient(clientId))) return void sendError(res, 'Müştəri tapılmadı', 404);
    await materializeLegacy(clientId);

    const row = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${clientId} FOR UPDATE`;
      if ((await tx.highlight.count({ where: { userId: clientId } })) >= MAX_HIGHLIGHTS) return null;
      const last = await tx.highlight.aggregate({ where: { userId: clientId }, _max: { sortOrder: true } });
      return tx.highlight.create({
        data: { userId: clientId, title, sortOrder: (last._max.sortOrder ?? -1) + 1 },
        include: { items: itemsInOrder },
      });
    });
    if (!row) return void sendError(res, `Bir müştəridə ən çox ${MAX_HIGHLIGHTS} highlight ola bilər.`, 400);
    sendSuccess(res, await detailOf(row), 201);
  } catch (err) {
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

// PATCH /api/v1/highlights/:id  { title?, coverItemId? }
export const updateHighlight = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { title, coverItemId } = req.body as { title?: string; coverItemId?: string | null };
    const existing = await prisma.highlight.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return void sendError(res, 'Highlight tapılmadı', 404);

    if (coverItemId) {
      const item = await prisma.highlightItem.findFirst({ where: { id: coverItemId, highlightId: id }, select: { id: true } });
      if (!item) return void sendError(res, 'Kover üçün bu highlight-ın şəkli seçilməlidir.', 400);
    }
    const row = await prisma.highlight.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(coverItemId !== undefined && { coverItemId }),
      },
      include: { items: itemsInOrder },
    });
    sendSuccess(res, await detailOf(row));
  } catch (err) {
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
    void deleteHighlightFiles(row.items.map((item) => item.imageUrl));
  } catch (err) {
    fail(res, err, 'delete');
  }
};

// POST /api/v1/highlights/:id/items  (multipart, field "files")
export const addHighlightItems = async (req: Request, res: Response): Promise<void> => {
  const files = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];
  try {
    const id = req.params.id as string;
    if (files.length === 0) return void sendError(res, 'Şəkil seçilməyib.', 400);

    const row = await prisma.highlight.findUnique({
      where: { id },
      select: { id: true, _count: { select: { items: true } } },
    });
    if (!row) {
      await unlinkAll(files);
      return void sendError(res, 'Highlight tapılmadı', 404);
    }
    if (row._count.items + files.length > MAX_ITEMS) {
      await unlinkAll(files);
      return void sendError(res, `Bir highlight-da ən çox ${MAX_ITEMS} şəkil ola bilər (indi ${row._count.items} var).`, 400);
    }

    const uploaded: string[] = [];
    const failed: { name: string; message: string }[] = [];
    for (const file of files) {
      try {
        const result = await optimizeAndStore(file, 'highlights', { maxEdge: 1920, quality: 85 });
        uploaded.push(result.url);
      } catch (err) {
        console.error('[Highlights] image upload failed:', err instanceof Error ? err.message : err);
        failed.push({ name: file.originalname, message: 'Yüklənmədi' });
        await fs.promises.unlink(file.path).catch(() => {});
      }
    }
    if (uploaded.length === 0) return void sendError(res, 'Şəkillər yüklənə bilmədi.', 500, failed);

    let created: { id: string; imageUrl: string }[];
    try {
      created = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Highlight" WHERE "id" = ${id} FOR UPDATE`;
        if ((await tx.highlightItem.count({ where: { highlightId: id } })) + uploaded.length > MAX_ITEMS) {
          throw new LimitError();
        }
        const last = await tx.highlightItem.aggregate({ where: { highlightId: id }, _max: { sortOrder: true } });
        let next = (last._max.sortOrder ?? -1) + 1;
        const rows: { id: string; imageUrl: string }[] = [];
        for (const key of uploaded) {
          rows.push(
            await tx.highlightItem.create({
              data: { highlightId: id, imageUrl: key, sortOrder: next++ },
              select: { id: true, imageUrl: true },
            }),
          );
        }
        return rows;
      });
    } catch (err) {
      await deleteHighlightFiles(uploaded);
      if (err instanceof LimitError) {
        return void sendError(res, `Bir highlight-da ən çox ${MAX_ITEMS} şəkil ola bilər.`, 400);
      }
      throw err;
    }
    const items = await Promise.all(created.map(async (item) => ({ id: item.id, url: await signKey(item.imageUrl) })));
    sendSuccess(res, { items, failed }, 201);
  } catch (err) {
    await unlinkAll(files);
    fail(res, err, 'add items');
  }
};

// PUT /api/v1/highlights/:id/items/order  { ids }
export const reorderHighlightItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { ids } = req.body as { ids: string[] };
    const exists = await prisma.highlight.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return void sendError(res, 'Highlight tapılmadı', 404);

    const ok = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Highlight" WHERE "id" = ${id} FOR UPDATE`;
      const existing = await tx.highlightItem.findMany({ where: { highlightId: id }, select: { id: true } });
      if (!isPermutation(ids, existing.map((row) => row.id))) return false;
      for (const [index, itemId] of ids.entries()) {
        await tx.highlightItem.update({ where: { id: itemId }, data: { sortOrder: index } });
      }
      return true;
    });
    if (!ok) return void sendError(res, 'Sıra düzgün göndərilməyib. Səhifəni yeniləyin.', 400);

    const row = await prisma.highlight.findUnique({ where: { id }, include: { items: itemsInOrder } });
    sendSuccess(res, await detailOf(row!));
  } catch (err) {
    fail(res, err, 'reorder items');
  }
};

// DELETE /api/v1/highlights/:id/items/:itemId
export const deleteHighlightItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const itemId = req.params.itemId as string;
    const item = await prisma.highlightItem.findFirst({ where: { id: itemId, highlightId: id } });
    if (!item) return void sendError(res, 'Şəkil tapılmadı', 404);

    await prisma.$transaction(async (tx) => {
      await tx.highlightItem.delete({ where: { id: itemId } });
      // If it was the cover, go back to "the first image".
      await tx.highlight.updateMany({ where: { id, coverItemId: itemId }, data: { coverItemId: null } });
    });
    res.status(204).send();
    void deleteHighlightFiles([item.imageUrl]);
  } catch (err) {
    fail(res, err, 'delete item');
  }
};
