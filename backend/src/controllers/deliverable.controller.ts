import { Request, Response, NextFunction } from 'express';
import path from 'path';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response.util';
import { processAndStoreFile, deleteFile, getSecureDownloadUrl, cleanupOrphanFiles } from '../services/upload.service';
import { uploadSiteMediaArray } from '../middleware/upload.middleware';

// No longer needed: resolveStoragePath

// ─── Dynamic Multer Selector ──────────────────
// Accepts all common media types for deliverables (video + images + docs)
export const dynamicUploadMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const deliverable = await prisma.deliverable.findUnique({ 
      where: { id },
      include: { category: true }
    });

    if (!deliverable) {
      sendError(res, 'Deliverable not found', 404);
      return;
    }

    // Set the subfolder based on category isVideo flag or legacy type
    const isVideo = deliverable.category?.isVideo || deliverable.type === 'VIDEO';
    req.uploadSubfolder = isVideo ? 'videos' : 'designs';
    
    // Use the universal media filter that accepts both video and image formats, for arrays
    uploadSiteMediaArray(req, res, next);
  } catch (err) {
    console.error('Dynamic upload middleware error:', err);
    sendError(res, 'Failed to determine upload type', 500);
  }
};

// GET /api/v1/deliverables/my (Client only)
export const getMyDeliverables = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.user!.id;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;

    const where: Record<string, unknown> = { clientId };
    if (year) where.year = year;
    if (month) where.month = month;

    const deliverables = await prisma.deliverable.findMany({
      where,
      include: { category: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    // Generate secure download URLs for each deliverable file
    const itemsWithUrls = await Promise.all(
      deliverables.map(async (d) => {
        const files = (d.files as any[]) || [];
        const filesWithSignedUrls = await Promise.all(
          files.map(async (f) => {
            try {
              const downloadUrl = await getSecureDownloadUrl(f.url);
              return { ...f, downloadUrl };
            } catch {
              return { ...f, downloadUrl: null };
            }
          })
        );
        return { ...d, files: filesWithSignedUrls, fileUrl: undefined, fileSize: undefined, fileName: undefined, mimeType: undefined };
      })
    );

    sendSuccess(res, itemsWithUrls);
  } catch (err) {
    console.error('getMyDeliverables error:', err);
    sendError(res, 'Failed to fetch deliverables', 500);
  }
};

// GET /api/v1/deliverables (Admin only)
export const getAllDeliverables = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 12));
    const skip = (page - 1) * limit;

    const clientId = req.query.clientId as string | undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (year) where.year = year;
    if (month) where.month = month;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        {
          client: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
        {
          client: {
            email: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.deliverable.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        include: {
          client: {
            select: { id: true, name: true, email: true },
          },
          category: true,
        },
      }),
      prisma.deliverable.count({ where }),
    ]);

    // Sign URLs in files array
    const serialized = await Promise.all(
      items.map(async (d) => {
        const files = (d.files as any[]) || [];
        const filesWithSignedUrls = await Promise.all(
          files.map(async (f) => {
            try {
              const downloadUrl = await getSecureDownloadUrl(f.url);
              return { ...f, downloadUrl };
            } catch {
              return { ...f, downloadUrl: null };
            }
          })
        );
        return {
          ...d,
          files: filesWithSignedUrls,
        };
      })
    );

    sendSuccess(res, {
      items: serialized,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('getAllDeliverables error:', err);
    sendError(res, 'Failed to fetch deliverables', 500);
  }
};

// POST /api/v1/deliverables (Admin only)
export const createDeliverable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId, title, type, categoryId, month, year, notes, status } = req.body;

    // Verify that the client user exists and has role CLIENT
    const clientUser = await prisma.user.findUnique({
      where: { id: clientId },
    });

    if (!clientUser) {
      sendError(res, 'Client user not found', 404);
      return;
    }

    if (clientUser.role !== 'CLIENT') {
      sendError(res, 'The specified user is not a CLIENT', 400);
      return;
    }

    const deliverable = await prisma.deliverable.create({
      data: {
        clientId,
        title,
        type,
        categoryId,
        month,
        year,
        notes,
        status: status ?? 'PENDING',
        files: [],
      },
    });

    sendSuccess(res, deliverable, 201);
  } catch (err) {
    console.error('createDeliverable error:', err);
    sendError(res, 'Failed to create deliverable', 500);
  }
};

// PATCH /api/v1/deliverables/:id (Admin only)
export const updateDeliverable = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.deliverable.findUnique({ where: { id } });

    if (!existing) {
      sendError(res, 'Deliverable not found', 404);
      return;
    }

    const { clientId, title, type, categoryId, status, month, year, files, notes } = req.body;

    if (files && Array.isArray(files)) {
      const oldFiles = (existing.files as any[]) || [];
      const oldUrls = oldFiles.map((f: any) => f.url);
      const newUrls = files.map((f: any) => f.url);
      await cleanupOrphanFiles(oldUrls, newUrls);
    }

    const updated = await prisma.deliverable.update({
      where: { id },
      data: {
        ...(clientId !== undefined && { clientId }),
        ...(title !== undefined && { title }),
        ...(type !== undefined && { type }),
        ...(categoryId !== undefined && { categoryId }),
        ...(status !== undefined && { status }),
        ...(month !== undefined && { month }),
        ...(year !== undefined && { year }),
        ...(files !== undefined && { files }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        client: {
          select: { id: true, name: true, email: true },
        },
        category: true,
      },
    });

    sendSuccess(res, updated);
  } catch (err) {
    console.error('updateDeliverable error:', err);
    sendError(res, 'Failed to update deliverable', 500);
  }
};

// PATCH /api/v1/deliverables/:id/upload (Admin only)
export const uploadDeliverableFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const deliverable = await prisma.deliverable.findUnique({ 
      where: { id },
      include: { category: true }
    });

    if (!deliverable) {
      sendError(res, 'Deliverable not found', 404);
      return;
    }

    const uploadedFiles = req.files as Express.Multer.File[];
    if (!uploadedFiles || uploadedFiles.length === 0) {
      sendError(res, 'No files uploaded', 400);
      return;
    }

    // Delete old files since this is a new upload batch replacing the old
    const oldFiles = (deliverable.files as any[]) || [];
    const oldUrls = oldFiles.map((f: any) => f.url);
    await cleanupOrphanFiles(oldUrls, []);

    // Determine the folder based on deliverable category or legacy type
    const isVideo = deliverable.category?.isVideo || deliverable.type === 'VIDEO';
    const folder = isVideo ? 'videos' : 'designs';

    const newFileObjects = [];
    for (const file of uploadedFiles) {
      const result = await processAndStoreFile(file, folder);
      newFileObjects.push({
        url: result.fileUrl,
        name: result.fileName,
        size: result.fileSize,
        type: result.mimeType,
      });
    }

    const updated = await prisma.deliverable.update({
      where: { id },
      data: {
        files: newFileObjects,
        uploadedAt: new Date(),
        status: 'READY',
        clientFeedback: null, // Reset feedback so client can review new version
      },
    });

    sendSuccess(res, updated);
  } catch (err) {
    console.error('uploadDeliverableFile error:', err);
    sendError(res, 'Failed to upload file', 500);
  }
};

// PATCH /api/v1/deliverables/:id/status (Admin only)
export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.deliverable.findUnique({ where: { id } });

    if (!existing) {
      sendError(res, 'Deliverable not found', 404);
      return;
    }

    const updated = await prisma.deliverable.update({
      where: { id },
      data: { status: req.body.status },
    });

    sendSuccess(res, updated);
  } catch (err) {
    console.error('updateStatus error:', err);
    sendError(res, 'Failed to update status', 500);
  }
};

// DELETE /api/v1/deliverables/:id (Admin only)
export const deleteDeliverable = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.deliverable.findUnique({ where: { id } });

    if (!existing) {
      sendError(res, 'Deliverable not found', 404);
      return;
    }

    // Delete files from storage if exist
    const oldFiles = (existing.files as any[]) || [];
    const oldUrls = oldFiles.map((f: any) => f.url);
    await cleanupOrphanFiles(oldUrls, []);

    // Hard delete the record
    await prisma.deliverable.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    console.error('deleteDeliverable error:', err);
    sendError(res, 'Failed to delete deliverable', 500);
  }
};
