import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response.util';
import { processAndStoreFile, deleteFile, getSecureDownloadUrl } from '../services/upload.service';
import { uploadVideo, uploadDesign } from '../middleware/upload.middleware';

// ─── Dynamic Multer Selector ──────────────────
// Determines the correct upload middleware based on the deliverable type
export const dynamicUploadMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const deliverable = await prisma.deliverable.findUnique({ where: { id } });

    if (!deliverable) {
      sendError(res, 'Deliverable not found', 404);
      return;
    }

    // Set the subfolder based on type
    if (deliverable.type === 'VIDEO_1' || deliverable.type === 'VIDEO_2') {
      req.uploadSubfolder = 'videos';
      uploadVideo(req, res, next);
    } else if (deliverable.type === 'DESIGNS') {
      req.uploadSubfolder = 'designs';
      uploadDesign(req, res, next);
    } else {
      // OTHER type — use design filter as a fallback (supports zip, pdf, images)
      req.uploadSubfolder = 'designs';
      uploadDesign(req, res, next);
    }
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
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    // Generate secure download URLs for each deliverable that has a file
    const itemsWithUrls = await Promise.all(
      deliverables.map(async (d) => {
        if (d.fileUrl) {
          try {
            const downloadUrl = await getSecureDownloadUrl(d.fileUrl);
            return { ...d, downloadUrl, fileSize: d.fileSize?.toString() };
          } catch {
            return { ...d, downloadUrl: null, fileSize: d.fileSize?.toString() };
          }
        }
        return { ...d, downloadUrl: null, fileSize: d.fileSize?.toString() };
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
        },
      }),
      prisma.deliverable.count({ where }),
    ]);

    // Serialize BigInt fileSize to string for JSON
    const serialized = items.map((d) => ({
      ...d,
      fileSize: d.fileSize?.toString() ?? null,
    }));

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
    const { clientId, type, month, year, notes, status } = req.body;

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
        type,
        month,
        year,
        notes,
        status: status ?? 'PENDING',
      },
    });

    sendSuccess(res, { ...deliverable, fileSize: deliverable.fileSize?.toString() ?? null }, 201);
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

    const { clientId, type, status, month, year, fileUrl, fileName, notes } = req.body;
    const updated = await prisma.deliverable.update({
      where: { id },
      data: {
        ...(clientId !== undefined && { clientId }),
        ...(type !== undefined && { type }),
        ...(status !== undefined && { status }),
        ...(month !== undefined && { month }),
        ...(year !== undefined && { year }),
        ...(fileUrl !== undefined && { fileUrl }),
        ...(fileName !== undefined && { fileName }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        client: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    sendSuccess(res, { ...updated, fileSize: updated.fileSize?.toString() ?? null });
  } catch (err) {
    console.error('updateDeliverable error:', err);
    sendError(res, 'Failed to update deliverable', 500);
  }
};

// PATCH /api/v1/deliverables/:id/upload (Admin only)
export const uploadDeliverableFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const deliverable = await prisma.deliverable.findUnique({ where: { id } });

    if (!deliverable) {
      sendError(res, 'Deliverable not found', 404);
      return;
    }

    if (!req.file) {
      sendError(res, 'No file uploaded', 400);
      return;
    }

    // Delete old file if one exists
    if (deliverable.fileUrl) {
      try {
        await deleteFile(deliverable.fileUrl);
      } catch (err) {
        console.warn('Failed to delete old file:', err);
      }
    }

    // Determine the folder based on deliverable type
    const folder =
      deliverable.type === 'VIDEO_1' || deliverable.type === 'VIDEO_2'
        ? 'videos'
        : 'designs';

    const result = await processAndStoreFile(req.file, folder);

    const updated = await prisma.deliverable.update({
      where: { id },
      data: {
        fileUrl: result.storageKey,
        fileName: result.fileName,
        fileSize: BigInt(result.fileSize),
        mimeType: result.mimeType,
        uploadedAt: new Date(),
        status: 'READY',
      },
    });

    sendSuccess(res, { ...updated, fileSize: updated.fileSize?.toString() ?? null });
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

    sendSuccess(res, { ...updated, fileSize: updated.fileSize?.toString() ?? null });
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

    // Delete file from storage if exists
    if (existing.fileUrl) {
      try {
        await deleteFile(existing.fileUrl);
      } catch (err) {
        console.warn('Failed to delete file during deliverable deletion:', err);
      }
    }

    // Hard delete the record
    await prisma.deliverable.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    console.error('deleteDeliverable error:', err);
    sendError(res, 'Failed to delete deliverable', 500);
  }
};
