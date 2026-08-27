import { Request, Response, NextFunction } from 'express';
import path from 'path';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response.util';
import { processAndStoreFile, deleteFile, getSecureDownloadUrl, getSecureDownloadUrlForDownload, cleanupOrphanFiles, getPresignedUploadUrl, getBlobProperties, downloadBlobToFile, createMultipartUpload, getMultipartUploadUrls, completeMultipartUpload as completeMultipartUploadStorage, abortMultipartUpload as abortMultipartUploadStorage } from '../services/upload.service';
import { uploadSiteMediaWithThumbnail } from '../middleware/upload.middleware';
import { optimizeImage } from '../services/image.service';
import {
  getVideoHeight,
  getMediaDimensions,
  generateVideoThumbnail,
  generateWebPreview,
  applyVideoFaststart,
} from '../services/video.service';
import { mediaProcessingLimiter } from '../services/mediaQueue';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import { SAS_UPLOAD_EXPIRY_SECONDS, FILE_SIZE_TOLERANCE_PERCENT, MAX_UPLOAD_SIZE_BYTES, MULTIPART_PART_SIZE_BYTES, MULTIPART_MAX_PARTS } from '../config/upload.constants';

// Video helpers (getVideoHeight / getVideoRotationDegrees / getMediaDimensions /
// generateVideoThumbnail / generateWebPreview / applyVideoFaststart) moved to
// ../services/video.service; the transcode concurrency limiter to
// ../services/mediaQueue — both shared with the showcase-video pipeline.
// isHeicFile / decodeHeicToJpegBuffer / optimizeImage live in
// ../services/image.service.

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

    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN' && deliverable.clientId !== req.user!.id) {
      sendError(res, 'Forbidden', 403);
      return;
    }

    // Set the subfolder based on category isVideo flag or legacy type
    const isVideo = deliverable.category?.isVideo || deliverable.type === 'VIDEO';
    req.uploadSubfolder = isVideo ? 'videos' : 'designs';
    
    // Use the universal media filter that accepts both video and image formats + optional thumbnail
    uploadSiteMediaWithThumbnail(req, res, next);
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
              const downloadUrl = await getSecureDownloadUrlForDownload(f.url);
              const previewSignedUrl = f.previewUrl
                ? await getSecureDownloadUrl(f.previewUrl)
                : (f.url ? await getSecureDownloadUrl(f.url) : null);
              return { ...f, downloadUrl, previewUrl: previewSignedUrl };
            } catch {
              return { ...f, downloadUrl: null };
            }
          })
        );

        let signedThumbnailUrl = d.thumbnailUrl;
        if (signedThumbnailUrl && typeof signedThumbnailUrl === 'string') {
          try {
            signedThumbnailUrl = await getSecureDownloadUrl(signedThumbnailUrl);
          } catch (e) {
            console.warn('Failed to sign thumbnailUrl', e);
          }
        }

        // originalUrl is a raw storage key — sign it, otherwise the client
        // resolves it as a relative URL and downloads the SPA's index.html
        let signedOriginalUrl = d.originalUrl;
        if (signedOriginalUrl) {
          try {
            signedOriginalUrl = await getSecureDownloadUrlForDownload(signedOriginalUrl);
          } catch (e) {
            console.warn('Failed to sign originalUrl', e);
            signedOriginalUrl = null;
          }
        }

        return { ...d, files: filesWithSignedUrls, thumbnailUrl: signedThumbnailUrl, originalUrl: signedOriginalUrl };
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
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 12));
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
              const downloadUrl = await getSecureDownloadUrlForDownload(f.url);
              const previewSignedUrl = f.previewUrl
                ? await getSecureDownloadUrl(f.previewUrl)
                : (f.url ? await getSecureDownloadUrl(f.url) : null);
              return { ...f, downloadUrl, previewUrl: previewSignedUrl };
            } catch {
              return { ...f, downloadUrl: null };
            }
          })
        );

        let signedThumbnailUrl = d.thumbnailUrl;
        if (signedThumbnailUrl && typeof signedThumbnailUrl === 'string') {
          try {
            signedThumbnailUrl = await getSecureDownloadUrl(signedThumbnailUrl);
          } catch (e) {
            console.warn('Failed to sign thumbnailUrl', e);
          }
        }

        // originalUrl is a raw storage key — sign it, otherwise the admin panel
        // resolves it as a relative URL instead of the stored file
        let signedOriginalUrl = d.originalUrl;
        if (signedOriginalUrl) {
          try {
            signedOriginalUrl = await getSecureDownloadUrlForDownload(signedOriginalUrl);
          } catch (e) {
            console.warn('Failed to sign originalUrl', e);
            signedOriginalUrl = null;
          }
        }

        return {
          ...d,
          files: filesWithSignedUrls,
          thumbnailUrl: signedThumbnailUrl,
          originalUrl: signedOriginalUrl,
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

    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN' && existing.clientId !== req.user!.id) {
      sendError(res, 'Forbidden', 403);
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

    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN' && deliverable.clientId !== req.user!.id) {
      sendError(res, 'Forbidden', 403);
      return;
    }

    const filesMap = req.files as Record<string, Express.Multer.File[]> | undefined;
    const uploadedFiles = filesMap?.['files'] || [];
    const customThumbnailFile = filesMap?.['thumbnail']?.[0] || null;

    if ((!uploadedFiles || uploadedFiles.length === 0) && !customThumbnailFile) {
      sendError(res, 'No files or thumbnail uploaded', 400);
      return;
    }

    // Immediately set status to PROCESSING and return 201
    const updatedDeliverable = await prisma.deliverable.update({
      where: { id },
      data: {
        status: 'PROCESSING',
      },
    });

    sendSuccess(res, updatedDeliverable);

    // Fire and forget — gated so no more than MEDIA_PROCESSING_CONCURRENCY
    // transcodes run at once; the rest queue in memory.
    if (mediaProcessingLimiter.pending > 0) {
      console.log(`[Media Queue] ${mediaProcessingLimiter.active} running, ${mediaProcessingLimiter.pending + 1} queued`);
    }
    mediaProcessingLimiter(() =>
      processDeliverableBackground(id, deliverable, uploadedFiles, customThumbnailFile)
    ).catch((err) => {
      console.error('[Video Debug] Fatal error in background processing:', err);
    });
  } catch (err) {
    console.error('uploadDeliverableFile error:', err);
    sendError(res, 'Failed to initiate file upload', 500);
  }
};

const processDeliverableBackground = async (
  id: string,
  deliverable: any,
  uploadedFiles: Express.Multer.File[],
  customThumbnailFile?: Express.Multer.File | null
) => {
  const startTime = Date.now();
  try {
    const oldFiles = (deliverable.files as any[]) || [];
    const isUpdatingVideo = uploadedFiles.length > 0;

    if (isUpdatingVideo) {
      const oldUrls = oldFiles.map((f: any) => f.url);
      await cleanupOrphanFiles(oldUrls, []);
    }

    const isVideo = deliverable.category?.isVideo || deliverable.type === 'VIDEO';
    const folder = isVideo ? 'videos' : 'designs';

    const newFileObjects: any[] = isUpdatingVideo ? [] : [...oldFiles];
    let newThumbnailUrl: string | null = null;
    let newWidth: number | null = null;
    let newHeight: number | null = null;
    let newOriginalUrl: string | null = null;
    let dimensionsCaptured = false;

    // --- CUSTOM THUMBNAIL UPLOAD (priority over auto-generation) ---
    if (customThumbnailFile) {
      try {
        const thumbResult = await processAndStoreFile(customThumbnailFile, 'thumbnails');
        newThumbnailUrl = thumbResult.url;
        console.log('[Thumb Debug] Custom thumbnail uploaded. thumbnailUrl:', newThumbnailUrl);
      } catch (thumbError) {
        console.error('[Thumb Debug] Custom thumbnail upload error:', thumbError);
        newThumbnailUrl = null;
      } finally {
        if (customThumbnailFile.path) {
          await fs.promises.unlink(customThumbnailFile.path).catch(() => {});
        }
      }
    }

    for (const file of uploadedFiles) {
      // --- AUTO THUMBNAIL GENERATION (only if no custom thumbnail) ---
      const isVideoByDb = deliverable.category?.isVideo === true || deliverable.type === 'VIDEO';
      const isVideoByMime = file.mimetype?.startsWith('video/') === true;
      const hasExistingThumbnail = !!deliverable.thumbnailUrl;
      const shouldGenerateThumb = !newThumbnailUrl && !hasExistingThumbnail && (isVideoByDb || isVideoByMime) && (!!file.path || !!file.buffer);

      if (shouldGenerateThumb) {
        let tempVideoPath: string | undefined;
        let tempThumbPath: string | undefined | null;

        try {
          let videoInputPath = file.path;
          if (!videoInputPath && file.buffer) {
            tempVideoPath = path.join(os.tmpdir(), `temp_video_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.mp4`);
            fs.writeFileSync(tempVideoPath, file.buffer);
            videoInputPath = tempVideoPath;
          }

          if (videoInputPath) {
            tempThumbPath = await generateVideoThumbnail(videoInputPath);
          }

          if (tempThumbPath) {
            const thumbFileBuffer = fs.readFileSync(tempThumbPath);
            const thumbMulterFile: Express.Multer.File = {
              fieldname: 'thumbnail',
              originalname: path.basename(tempThumbPath),
              encoding: '7bit',
              mimetype: 'image/jpeg',
              buffer: thumbFileBuffer,
              size: thumbFileBuffer.length,
              stream: null as any,
              destination: os.tmpdir(),
              filename: path.basename(tempThumbPath),
              path: tempThumbPath,
            };

            const thumbResult = await processAndStoreFile(thumbMulterFile, 'thumbnails');
            newThumbnailUrl = thumbResult.url;
            console.log('[Thumb Debug] Auto-generated thumbnail. thumbnailUrl:', newThumbnailUrl);
          }
        } catch (thumbError) {
          console.error('Azure Thumbnail Upload Error:', thumbError);
          newThumbnailUrl = null; 
        } finally {
          if (tempVideoPath) {
            await fs.promises.unlink(tempVideoPath).catch(() => {});
          }
          if (tempThumbPath) {
            await fs.promises.unlink(tempThumbPath).catch(() => {});
          }
        }
      }

      // --- APPLY FASTSTART FOR WEB OPTIMIZATION ---
      const isVideoFileExt = ['.mp4', '.mov', '.m4v', '.webm'].includes(path.extname(file.originalname).toLowerCase());
      const isVideoByMimeForFaststart = file.mimetype?.startsWith('video/') || isVideoFileExt;
      
      let faststartTempPath: string | null = null;
      if (isVideoByMimeForFaststart && file.path) {
        faststartTempPath = await applyVideoFaststart(file.path);
        if (faststartTempPath) {
          await fs.promises.unlink(file.path).catch(() => {});
          file.path = faststartTempPath;
          file.size = fs.statSync(faststartTempPath).size;
        }
      }

      // --- GENERATE WEB PREVIEW FOR LARGE VIDEOS ---
      let previewUrl: string | null = null;
      const isVideoForPreview = file.mimetype?.startsWith('video/');

      if (isVideoForPreview && file.path) {
        const height = await getVideoHeight(file.path);
        if (height > 720) {
          const previewPath = await generateWebPreview(file.path);
          if (previewPath) {
            try {
              const previewMulterFile: Express.Multer.File = {
                fieldname: 'preview',
                originalname: `preview-${file.originalname}`,
                encoding: '7bit',
                mimetype: 'video/mp4',
                buffer: null as any,
                size: fs.statSync(previewPath).size,
                stream: null as any,
                destination: os.tmpdir(),
                filename: path.basename(previewPath),
                path: previewPath,
              };
              const previewResult = await processAndStoreFile(previewMulterFile, 'previews');
              previewUrl = previewResult.url;
            } catch (previewError) {
              console.error('[Video Debug] Preview upload error:', previewError);
            }
            await fs.promises.unlink(previewPath).catch(() => {});
          }
        }
      }

      // --- IMAGE OPTIMIZATION: upload original as-is, then a resized WebP as the main file ---
      const isImageFileExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'].includes(path.extname(file.originalname).toLowerCase());
      const isImageByMimeForOptimize = file.mimetype?.startsWith('image/') || isImageFileExt;

      let result: { url: string; fileName: string; fileSize: number; mimeType: string };
      let optimizedTempPath: string | null = null;

      if (isImageByMimeForOptimize && file.path) {
        // Read dimensions and optimize BEFORE uploading the original —
        // processAndStoreFile deletes the local temp file once it's uploaded.
        const optimized = await optimizeImage(file.path);
        const fallbackDims = optimized ? null : await getMediaDimensions(file.path, false);
        const originalUploadResult = await processAndStoreFile(file, folder);

        if (optimized) {
          optimizedTempPath = optimized.path;
          const optimizedBuffer = fs.readFileSync(optimized.path);
          const optimizedMulterFile: Express.Multer.File = {
            fieldname: file.fieldname,
            originalname: `${path.basename(file.originalname, path.extname(file.originalname))}.webp`,
            encoding: file.encoding,
            mimetype: 'image/webp',
            buffer: optimizedBuffer,
            size: optimizedBuffer.length,
            stream: null as any,
            destination: os.tmpdir(),
            filename: path.basename(optimized.path),
            path: optimized.path,
          };
          result = await processAndStoreFile(optimizedMulterFile, folder);
          if (!dimensionsCaptured) {
            newWidth = optimized.width;
            newHeight = optimized.height;
          }
        } else {
          // Optimization failed — serve the original as the main file too
          result = originalUploadResult;
          if (!dimensionsCaptured) {
            newWidth = fallbackDims?.width ?? null;
            newHeight = fallbackDims?.height ?? null;
          }
        }

        if (!dimensionsCaptured) {
          newOriginalUrl = originalUploadResult.url;
          dimensionsCaptured = true;
        }
      } else {
        // --- CAPTURE MEDIA DIMENSIONS (videos & other files — unchanged) ---
        if (!dimensionsCaptured && file.path) {
          const dims = await getMediaDimensions(file.path, isVideoByMimeForFaststart);
          newWidth = dims?.width ?? null;
          newHeight = dims?.height ?? null;
          dimensionsCaptured = true;
        }
        result = await processAndStoreFile(file, folder);
      }

      if (optimizedTempPath) {
        await fs.promises.unlink(optimizedTempPath).catch(() => {});
      }
      if (faststartTempPath) {
        await fs.promises.unlink(faststartTempPath).catch(() => {});
      }
      newFileObjects.push({
        url: result.url,
        name: result.fileName,
        size: result.fileSize,
        type: result.mimeType,
        ...(previewUrl && { previewUrl }),
      });
    }

    const processingDuration = Math.floor((Date.now() - startTime) / 1000);

    await prisma.deliverable.update({
      where: { id },
      data: {
        files: newFileObjects,
        uploadedAt: new Date(),
        status: 'READY',
        processingDuration,
        clientFeedback: null,
        ...(newThumbnailUrl !== undefined && { thumbnailUrl: newThumbnailUrl }),
        ...(isUpdatingVideo && { width: newWidth, height: newHeight, originalUrl: newOriginalUrl }),
      },
    });

    console.log(`[Video Debug] Deliverable ${id} processed successfully in ${processingDuration}s`);

  } catch (err) {
    console.error(`[Video Debug] Background processing failed for ${id}:`, err);
    await prisma.deliverable.update({
      where: { id },
      data: {
        status: 'FAILED',
      },
    });
  }
};

// POST /api/v1/deliverables/:id/initiate-upload
export const initiateDirectUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { fileName, fileSize, mimeType } = req.body;

    // Validate file size
    if (fileSize && fileSize > MAX_UPLOAD_SIZE_BYTES) {
      sendError(res, `File size exceeds maximum limit of ${Math.round(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024 * 1024))}GB`, 400);
      return;
    }

    const deliverable = await prisma.deliverable.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!deliverable) { sendError(res, 'Deliverable not found', 404); return; }

    const isVideo = deliverable.category?.isVideo || deliverable.type === 'VIDEO';
    const folder = isVideo ? 'videos' : 'designs';

    const { uploadUrl, storageKey } = await getPresignedUploadUrl(
      folder, fileName, mimeType, SAS_UPLOAD_EXPIRY_SECONDS
    );

    sendSuccess(res, { uploadUrl, storageKey, folder });
  } catch (err) {
    console.error('initiateDirectUpload error:', err);
    sendError(res, 'Failed to initiate upload', 500);
  }
};

// POST /api/v1/deliverables/:id/initiate-multipart
// Starts an S3 multipart upload and returns a presigned PUT URL per part so the
// browser can upload chunks in parallel. Used for large files instead of a
// single-stream PUT (much faster over high-latency links).
export const initiateMultipartUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { fileName, fileSize, mimeType } = req.body;

    if (!fileName || !mimeType || !fileSize) {
      sendError(res, 'fileName, fileSize and mimeType are required', 400);
      return;
    }
    if (fileSize > MAX_UPLOAD_SIZE_BYTES) {
      sendError(res, `File size exceeds maximum limit of ${Math.round(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024 * 1024))}GB`, 400);
      return;
    }

    const deliverable = await prisma.deliverable.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!deliverable) { sendError(res, 'Deliverable not found', 404); return; }

    const isVideo = deliverable.category?.isVideo || deliverable.type === 'VIDEO';
    const folder = isVideo ? 'videos' : 'designs';

    // Pick a part size: at least MULTIPART_PART_SIZE_BYTES, but grow it so the
    // part count never exceeds MULTIPART_MAX_PARTS.
    let partSize = Math.max(
      MULTIPART_PART_SIZE_BYTES,
      Math.ceil(fileSize / MULTIPART_MAX_PARTS)
    );
    // round up to a whole MB for tidy chunking on the client
    partSize = Math.ceil(partSize / (1024 * 1024)) * (1024 * 1024);
    const partCount = Math.max(1, Math.ceil(fileSize / partSize));

    const { storageKey, uploadId } = await createMultipartUpload(folder, fileName, mimeType);
    const partUrls = await getMultipartUploadUrls(storageKey, uploadId, partCount, SAS_UPLOAD_EXPIRY_SECONDS);

    sendSuccess(res, { storageKey, uploadId, partSize, partCount, partUrls, folder });
  } catch (err) {
    console.error('initiateMultipartUpload error:', err);
    sendError(res, 'Failed to initiate multipart upload', 500);
  }
};

// POST /api/v1/deliverables/:id/complete-multipart
// Assembles the uploaded parts into a single object. Processing is still kicked
// off separately by the existing /finalize-upload call.
export const completeMultipartUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    const { storageKey, uploadId, parts } = req.body as {
      storageKey?: string;
      uploadId?: string;
      parts?: { partNumber: number; etag: string }[];
    };

    if (!storageKey || !uploadId || !Array.isArray(parts) || parts.length === 0) {
      sendError(res, 'storageKey, uploadId and a non-empty parts array are required', 400);
      return;
    }
    if (parts.some((p) => !p || typeof p.partNumber !== 'number' || !p.etag)) {
      sendError(res, 'Each part needs a numeric partNumber and an etag', 400);
      return;
    }

    await completeMultipartUploadStorage(storageKey, uploadId, parts);
    sendSuccess(res, { storageKey });
  } catch (err) {
    console.error('completeMultipartUpload error:', err);
    sendError(res, 'Failed to complete multipart upload', 500);
  }
};

// POST /api/v1/deliverables/:id/abort-multipart
// Best-effort cleanup so a failed upload leaves no dangling multipart upload.
export const abortMultipartUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    const { storageKey, uploadId } = req.body as { storageKey?: string; uploadId?: string };
    if (!storageKey || !uploadId) {
      sendError(res, 'storageKey and uploadId are required', 400);
      return;
    }
    try {
      await abortMultipartUploadStorage(storageKey, uploadId);
    } catch (e) {
      console.warn('abortMultipartUpload: storage abort failed (ignored):', e);
    }
    sendSuccess(res, { aborted: true });
  } catch (err) {
    console.error('abortMultipartUpload error:', err);
    sendError(res, 'Failed to abort multipart upload', 500);
  }
};

// POST /api/v1/deliverables/:id/finalize-upload
export const finalizeDirectUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { files, thumbnailStorageKey } = req.body;
    // files: [{ storageKey, fileName, fileSize, mimeType }]
    // thumbnailStorageKey: optional string — storageKey for custom thumbnail uploaded via direct upload

    const deliverable = await prisma.deliverable.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!deliverable) { sendError(res, 'Deliverable not found', 404); return; }

    // Paralel blob doğrulaması — bütün fayllar eyni anda yoxlanır
    const verifications = await Promise.all(
      files.map(async (f: any) => {
        const props = await getBlobProperties(f.storageKey);
        return { ...f, blobExists: props.exists, blobSize: props.contentLength };
      })
    );

    // Mövcudluq yoxlaması
    const missing = verifications.filter((v: any) => !v.blobExists);
    if (missing.length > 0) {
      sendError(res, `Blob(s) not found in storage: ${missing.map((m: any) => m.storageKey).join(', ')}`, 400);
      return;
    }

    // Fayl ölçüsü uyğunsuzluğu yoxlaması
    const sizeMismatches = verifications.filter((v: any) => {
      if (!v.blobSize || !v.fileSize) return false;
      const diff = Math.abs(v.blobSize - v.fileSize) / v.fileSize * 100;
      return diff > FILE_SIZE_TOLERANCE_PERCENT;
    });

    if (sizeMismatches.length > 0) {
      await prisma.deliverable.update({
        where: { id },
        data: { status: 'FAILED' },
      });
      sendError(res, 'File size mismatch detected. Upload may be corrupted.', 400);
      return;
    }

    // PROCESSING statusuna keçir və dərhal cavab qaytar
    await prisma.deliverable.update({
      where: { id },
      data: { status: 'PROCESSING' },
    });

    sendSuccess(res, { message: 'Processing started' });

    // Arxa planda emal başla — eyni limiter ilə (upload yollarının hər ikisi
    // birlikdə MEDIA_PROCESSING_CONCURRENCY həddini aşmır).
    if (mediaProcessingLimiter.pending > 0) {
      console.log(`[Media Queue] ${mediaProcessingLimiter.active} running, ${mediaProcessingLimiter.pending + 1} queued`);
    }
    mediaProcessingLimiter(() =>
      processDirectUploadBackground(id, deliverable, verifications, thumbnailStorageKey || null)
    ).catch((err) => {
      console.error('[Direct Upload] Fatal error in background processing:', err);
    });
  } catch (err) {
    console.error('finalizeDirectUpload error:', err);
    sendError(res, 'Failed to finalize upload', 500);
  }
};

const processDirectUploadBackground = async (
  id: string,
  deliverable: any,
  files: Array<{ storageKey: string; fileName: string; fileSize: number; mimeType: string }>,
  customThumbnailStorageKey?: string | null
) => {
  const startTime = Date.now();
  const tempFilesToCleanup: string[] = [];

  try {

    const isVideo = deliverable.category?.isVideo || deliverable.type === 'VIDEO';
    const folder = isVideo ? 'videos' : 'designs';
    const newFileObjects = [];
    let newThumbnailUrl: string | null = null;
    let newWidth: number | null = null;
    let newHeight: number | null = null;
    let newOriginalUrl: string | null = null;
    let dimensionsCaptured = false;

    // --- CUSTOM THUMBNAIL (uploaded via direct upload) ---
    if (customThumbnailStorageKey) {
      newThumbnailUrl = customThumbnailStorageKey;
      console.log('[Direct Upload] Using custom thumbnail storageKey:', customThumbnailStorageKey);
    }

    for (const file of files) {
      // Unique temp path: deliverableId + uuid
      const tempExt = path.extname(file.fileName) || '.mp4';
      const tempFileName = `direct_${id}_${crypto.randomUUID()}${tempExt}`;
      const tempFilePath = path.join(os.tmpdir(), tempFileName);
      tempFilesToCleanup.push(tempFilePath);

      // Azure-dan temp faylına endir
      await downloadBlobToFile(file.storageKey, tempFilePath);

      // --- THUMBNAIL ---
      const isVideoFile = file.mimeType?.startsWith('video/');
      if (isVideoFile && !newThumbnailUrl && !customThumbnailStorageKey) {
        const tempThumbPath = await generateVideoThumbnail(tempFilePath);
        if (tempThumbPath) {
          tempFilesToCleanup.push(tempThumbPath);
          const thumbFileBuffer = fs.readFileSync(tempThumbPath);
          const thumbMulterFile: Express.Multer.File = {
            fieldname: 'thumbnail',
            originalname: path.basename(tempThumbPath),
            encoding: '7bit',
            mimetype: 'image/jpeg',
            buffer: thumbFileBuffer,
            size: thumbFileBuffer.length,
            stream: null as any,
            destination: os.tmpdir(),
            filename: path.basename(tempThumbPath),
            path: tempThumbPath,
          };
          const thumbResult = await processAndStoreFile(thumbMulterFile, 'thumbnails');
          newThumbnailUrl = thumbResult.url;
        }
      }

      // --- FASTSTART ---
      let currentFilePath = tempFilePath;
      if (isVideoFile) {
        const faststartPath = await applyVideoFaststart(tempFilePath);
        if (faststartPath) {
          tempFilesToCleanup.push(faststartPath);
          currentFilePath = faststartPath;
        }
      }

      // --- 720p PREVIEW ---
      let previewUrl: string | null = null;
      if (isVideoFile) {
        const height = await getVideoHeight(currentFilePath);
        if (height > 720) {
          const previewPath = await generateWebPreview(currentFilePath);
          if (previewPath) {
            tempFilesToCleanup.push(previewPath);
            const previewMulterFile: Express.Multer.File = {
              fieldname: 'preview',
              originalname: `preview-${file.fileName}`,
              encoding: '7bit',
              mimetype: 'video/mp4',
              buffer: null as any,
              size: fs.statSync(previewPath).size,
              stream: null as any,
              destination: os.tmpdir(),
              filename: path.basename(previewPath),
              path: previewPath,
            };
            const previewResult = await processAndStoreFile(previewMulterFile, 'previews');
            previewUrl = previewResult.url;
          }
        }
      }

      // --- IMAGE OPTIMIZATION: upload original as-is, then a resized WebP as the main file ---
      const isImageFileExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'].includes(path.extname(file.fileName).toLowerCase());
      const isImageByMimeForOptimize = file.mimeType?.startsWith('image/') || isImageFileExt;

      let result: { url: string; fileName: string; fileSize: number; mimeType: string };

      if (isImageByMimeForOptimize) {
        // Read dimensions and optimize BEFORE uploading the original —
        // processAndStoreFile deletes the local temp file once it's uploaded.
        const optimized = await optimizeImage(currentFilePath);
        const fallbackDims = optimized ? null : await getMediaDimensions(currentFilePath, false);

        const originalMulterFile: Express.Multer.File = {
          fieldname: 'file',
          originalname: file.fileName,
          encoding: '7bit',
          mimetype: file.mimeType,
          buffer: null as any,
          size: fs.statSync(currentFilePath).size,
          stream: null as any,
          destination: os.tmpdir(),
          filename: path.basename(currentFilePath),
          path: currentFilePath,
        };
        const originalUploadResult = await processAndStoreFile(originalMulterFile, folder);

        if (optimized) {
          tempFilesToCleanup.push(optimized.path);
          const optimizedBuffer = fs.readFileSync(optimized.path);
          const optimizedMulterFile: Express.Multer.File = {
            fieldname: 'file',
            originalname: `${path.basename(file.fileName, path.extname(file.fileName))}.webp`,
            encoding: '7bit',
            mimetype: 'image/webp',
            buffer: optimizedBuffer,
            size: optimizedBuffer.length,
            stream: null as any,
            destination: os.tmpdir(),
            filename: path.basename(optimized.path),
            path: optimized.path,
          };
          result = await processAndStoreFile(optimizedMulterFile, folder);
          if (!dimensionsCaptured) {
            newWidth = optimized.width;
            newHeight = optimized.height;
          }
        } else {
          // Optimization failed — serve the original as the main file too
          result = originalUploadResult;
          if (!dimensionsCaptured) {
            newWidth = fallbackDims?.width ?? null;
            newHeight = fallbackDims?.height ?? null;
          }
        }

        if (!dimensionsCaptured) {
          newOriginalUrl = originalUploadResult.url;
          dimensionsCaptured = true;
        }
      } else {
        // --- CAPTURE MEDIA DIMENSIONS (videos & other files — unchanged) ---
        if (!dimensionsCaptured) {
          const dims = await getMediaDimensions(currentFilePath, isVideoFile);
          newWidth = dims?.width ?? null;
          newHeight = dims?.height ?? null;
          dimensionsCaptured = true;
        }

        // Orijinal faylı Azure-a yüklə (faststart tətbiq edilmiş versiya)
        const uploadMulterFile: Express.Multer.File = {
          fieldname: 'file',
          originalname: file.fileName,
          encoding: '7bit',
          mimetype: file.mimeType,
          buffer: null as any,
          size: fs.statSync(currentFilePath).size,
          stream: null as any,
          destination: os.tmpdir(),
          filename: path.basename(currentFilePath),
          path: currentFilePath,
        };
        result = await processAndStoreFile(uploadMulterFile, folder);
      }

      newFileObjects.push({
        url: result.url,
        name: result.fileName,
        size: result.fileSize,
        type: result.mimeType,
        ...(previewUrl && { previewUrl }),
      });
    }

    const processingDuration = Math.floor((Date.now() - startTime) / 1000);

    // Bütün yeni fayllar uğurla yükləndikdən sonra köhnə faylları silirik
    const oldFiles = (deliverable.files as any[]) || [];
    const oldUrls = oldFiles.map((f: any) => f.url);
    await cleanupOrphanFiles(oldUrls, []);

    await prisma.deliverable.update({
      where: { id },
      data: {
        files: newFileObjects,
        uploadedAt: new Date(),
        status: 'READY',
        processingDuration,
        clientFeedback: null,
        ...(newThumbnailUrl !== undefined && { thumbnailUrl: newThumbnailUrl }),
        width: newWidth,
        height: newHeight,
        originalUrl: newOriginalUrl,
      },
    });

    console.log(`[Direct Upload] Deliverable ${id} processed successfully in ${processingDuration}s`);

  } catch (err) {
    console.error(`[Direct Upload] Background processing failed for ${id}:`, err);
    await prisma.deliverable.update({
      where: { id },
      data: { status: 'FAILED' },
    });
  } finally {
    // Bütün temp faylları sil — hətta FFmpeg xəta versə belə
    for (const tempFile of tempFilesToCleanup) {
      await fs.promises.unlink(tempFile).catch(() => {});
    }
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

    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN' && existing.clientId !== req.user!.id) {
      sendError(res, 'Forbidden', 403);
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

    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN' && existing.clientId !== req.user!.id) {
      sendError(res, 'Forbidden', 403);
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
