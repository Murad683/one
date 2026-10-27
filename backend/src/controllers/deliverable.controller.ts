import { Request, Response, NextFunction } from 'express';
import path from 'path';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response.util';
import { processAndStoreFile, deleteFile, getSecureDownloadUrl, getSecureDownloadUrlForDownload, collectDeliverableKeys, deleteUnreferencedDeliverableKeys, getPresignedUploadUrl, getBlobProperties, downloadBlobToFile, createMultipartUpload, getMultipartUploadUrls, completeMultipartUpload as completeMultipartUploadStorage, abortMultipartUpload as abortMultipartUploadStorage } from '../services/upload.service';
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
import { isProcessingBusy, PROCESSING_BUSY_MESSAGE } from '../utils/deliverableStatus';
import { buildDeliverableListQuery } from '../utils/deliverableList';
import { CLIENT_VISIBLE_WHERE, isRetentionLocked, presentForAdmin, presentForClient, RETENTION_LOCKED_MESSAGE } from '../utils/retention';
import { stampFirstReady } from '../services/retention.service';

// Video helpers (getVideoHeight / getVideoRotationDegrees / getMediaDimensions /
// generateVideoThumbnail / generateWebPreview / applyVideoFaststart) moved to
// ../services/video.service; the transcode concurrency limiter to
// ../services/mediaQueue — both shared with the showcase-video pipeline.

// ─── Access helpers ───────────────────────────
// Admins can modify any deliverable; creators only the ones they created.
const isAdminRole = (role?: string) => role === 'ADMIN' || role === 'SUPER_ADMIN';

export const canModifyDeliverable = (
  user: { id: string; role: string } | undefined,
  deliverable: { createdById: string | null }
): boolean => {
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  return user.role === 'CREATOR' && deliverable.createdById === user.id;
};

// Direct/multipart uploads hand storage keys back from the browser. A creator
// must only reference freshly uploaded deliverable media, never a key that
// already belongs to another deliverable (which would expose that file).
const creatorStorageKeysAllowed = async (keys: string[], deliverableId: string): Promise<boolean> => {
  for (const key of keys) {
    if (typeof key !== 'string' || key.includes('..') || !/^(videos|designs)\/[^/]+$/.test(key)) {
      return false;
    }
    const used = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Deliverable"
      WHERE id <> ${deliverableId}
        AND (strpos(files::text, ${key}) > 0
          OR strpos(COALESCE("originalUrl", ''), ${key}) > 0
          OR strpos(COALESCE("thumbnailUrl", ''), ${key}) > 0)
      LIMIT 1`;
    if (used.length > 0) return false;
  }
  return true;
};
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

    if (!canModifyDeliverable(req.user, deliverable)) {
      sendError(res, 'Forbidden', 403);
      return;
    }

    if (isRetentionLocked(deliverable)) {
      sendError(res, RETENTION_LOCKED_MESSAGE, 409);
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

    const where: Record<string, unknown> = { clientId, ...CLIENT_VISIBLE_WHERE };
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

        return presentForClient({ ...d, files: filesWithSignedUrls, thumbnailUrl: signedThumbnailUrl, originalUrl: signedOriginalUrl });
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
    // Filters, sort, search and paging live in utils/deliverableList.ts. Creators
    // only see their own uploads and never client emails (enforced there).
    const isCreator = req.user!.role === 'CREATOR';
    const { where, orderBy, page, limit, skip } = buildDeliverableListQuery(req.query, req.user!);

    const [items, total] = await Promise.all([
      prisma.deliverable.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: orderBy as any,
        include: {
          client: {
            select: { id: true, name: true, email: true, shareToken: true, shareTokenExpiresAt: true },
          },
          category: true,
        },
      }),
      prisma.deliverable.count({ where: where as any }),
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

        return presentForAdmin({
          ...d,
          files: filesWithSignedUrls,
          thumbnailUrl: signedThumbnailUrl,
          originalUrl: signedOriginalUrl,
          client: d.client && {
            ...d.client,
            ...(isCreator && { email: undefined }),
            shareUrl: d.client.shareToken ? `${process.env.FRONTEND_URL}/share/${d.client.shareToken}` : null,
          },
        });
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
        // Status is driven by the upload pipeline; creators can't preset it.
        status: req.user!.role === 'CREATOR' ? 'PENDING' : (status ?? 'PENDING'),
        files: [],
        createdById: req.user!.id,
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

    if (!canModifyDeliverable(req.user, existing)) {
      sendError(res, 'Forbidden', 403);
      return;
    }

    const { clientId, title, type, categoryId, month, year, notes } = req.body;
    let { status, files } = req.body;

    if (req.user!.role === 'CREATOR') {
      // Creators edit metadata only; files go through the upload endpoints
      // and status is set by the processing pipeline.
      status = undefined;
      files = undefined;
      if (clientId !== undefined && clientId !== existing.clientId) {
        const target = await prisma.user.findUnique({ where: { id: clientId }, select: { role: true } });
        if (!target || target.role !== 'CLIENT') {
          sendError(res, 'The specified user is not a CLIENT', 400);
          return;
        }
      }
    }

    if (files !== undefined && isRetentionLocked(existing)) {
      sendError(res, RETENTION_LOCKED_MESSAGE, 409);
      return;
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

    // Files dropped from the list (and their 720p previews) are deleted only
    // now that the row no longer points at them.
    if (files && Array.isArray(files)) {
      await deleteUnreferencedDeliverableKeys(collectDeliverableKeys({ files: existing.files }));
    }

    if (updated.status === 'READY') await stampFirstReady(id);

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

    if (!canModifyDeliverable(req.user, deliverable)) {
      sendError(res, 'Forbidden', 403);
      return;
    }

    // The previous upload is still being processed: a second run would orphan its
    // output. (The multipart body is only in memory here, nothing to clean up.)
    if (isProcessingBusy(deliverable)) {
      sendError(res, PROCESSING_BUSY_MESSAGE, 409);
      return;
    }

    if (isRetentionLocked(deliverable)) {
      sendError(res, RETENTION_LOCKED_MESSAGE, 409);
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
  // Keys stored by this run. If the run fails they are deleted again; the old
  // files are only removed after the row points at the new ones.
  const createdKeys: string[] = [];
  try {
    const oldFiles = (deliverable.files as any[]) || [];
    const isUpdatingVideo = uploadedFiles.length > 0;

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
        createdKeys.push(thumbResult.url);
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
      // A replaced video gets a fresh cover from the new file (as the direct
      // upload path does); the old cover is deleted after the row is updated.
      const shouldGenerateThumb = !newThumbnailUrl && (isVideoByDb || isVideoByMime) && (!!file.path || !!file.buffer);

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
            createdKeys.push(thumbResult.url);
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
              createdKeys.push(previewResult.url);
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
        createdKeys.push(originalUploadResult.url);

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
          createdKeys.push(result.url);
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
        createdKeys.push(result.url);
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
    await stampFirstReady(id);
  } catch (err) {
    console.error(`[Video Debug] Background processing failed for ${id}:`, err);
    await prisma.deliverable.update({
      where: { id },
      data: {
        status: 'FAILED',
      },
    }).catch(() => {});
    // The row still points at the old files; drop only what this run stored.
    await deleteUnreferencedDeliverableKeys(createdKeys);
    return;
  }

  // The row now points at the new files: remove the superseded ones (old video,
  // its 720p preview, old cover, old image original). Keys still in use are kept.
  await deleteUnreferencedDeliverableKeys(collectDeliverableKeys(deliverable));
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
    if (!canModifyDeliverable(req.user, deliverable)) { sendError(res, 'Forbidden', 403); return; }
    if (isProcessingBusy(deliverable)) { sendError(res, PROCESSING_BUSY_MESSAGE, 409); return; }
    if (isRetentionLocked(deliverable)) { sendError(res, RETENTION_LOCKED_MESSAGE, 409); return; }

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
    if (!canModifyDeliverable(req.user, deliverable)) { sendError(res, 'Forbidden', 403); return; }
    if (isProcessingBusy(deliverable)) { sendError(res, PROCESSING_BUSY_MESSAGE, 409); return; }
    if (isRetentionLocked(deliverable)) { sendError(res, RETENTION_LOCKED_MESSAGE, 409); return; }

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

// Creator-only guard for multipart complete/abort, which otherwise act on the
// storage key alone. Admin behaviour is unchanged (no extra lookup).
const creatorMultipartAllowed = async (req: Request, res: Response, storageKey: string): Promise<boolean> => {
  if (req.user!.role !== 'CREATOR') return true;
  const id = req.params.id as string;
  const deliverable = await prisma.deliverable.findUnique({ where: { id }, select: { createdById: true } });
  if (!deliverable) { sendError(res, 'Deliverable not found', 404); return false; }
  if (!canModifyDeliverable(req.user, deliverable) || !(await creatorStorageKeysAllowed([storageKey], id))) {
    sendError(res, 'Forbidden', 403);
    return false;
  }
  return true;
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
    if (!(await creatorMultipartAllowed(req, res, storageKey))) return;

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
    if (!(await creatorMultipartAllowed(req, res, storageKey))) return;
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
    if (!canModifyDeliverable(req.user, deliverable)) { sendError(res, 'Forbidden', 403); return; }

    if (req.user!.role === 'CREATOR') {
      if (!Array.isArray(files)) { sendError(res, 'files array is required', 400); return; }
      const keys = [...files.map((f: any) => f?.storageKey), ...(thumbnailStorageKey ? [thumbnailStorageKey] : [])];
      if (!(await creatorStorageKeysAllowed(keys, id))) { sendError(res, 'Forbidden storage key', 403); return; }
    }

    // Another upload for this row is still being processed, or the video has
    // expired. Refuse, and drop the raw objects this request just uploaded:
    // nothing references them, and
    // deleteUnreferencedDeliverableKeys keeps any key a row still points at.
    const lockedMessage = isProcessingBusy(deliverable)
      ? PROCESSING_BUSY_MESSAGE
      : isRetentionLocked(deliverable) ? RETENTION_LOCKED_MESSAGE : null;
    if (lockedMessage) {
      sendError(res, lockedMessage, 409);
      if (Array.isArray(files)) {
        await deleteUnreferencedDeliverableKeys([
          ...files.map((f: any) => f?.storageKey).filter(Boolean),
          ...(thumbnailStorageKey ? [thumbnailStorageKey] : []),
        ]);
      }
      return;
    }

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
      // The raw uploads are unusable and never referenced; the admin re-uploads.
      await deleteUnreferencedDeliverableKeys([
        ...verifications.map((v: any) => v.storageKey),
        ...(thumbnailStorageKey ? [thumbnailStorageKey] : []),
      ]);
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
  // The browser uploaded these raw objects; processing re-stores them under new
  // keys, so the raw ones are never referenced and must be deleted afterwards.
  // A custom cover uploaded the same way IS stored as-is, so it is kept.
  const rawKeys = files.map((f) => f.storageKey).filter((k) => k && k !== customThumbnailStorageKey);
  // Keys stored by this run, deleted again if the run fails.
  const createdKeys: string[] = [];

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
          createdKeys.push(thumbResult.url);
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
            createdKeys.push(previewResult.url);
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
        createdKeys.push(originalUploadResult.url);

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
          createdKeys.push(result.url);
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
        createdKeys.push(result.url);
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
        width: newWidth,
        height: newHeight,
        originalUrl: newOriginalUrl,
      },
    });

    console.log(`[Direct Upload] Deliverable ${id} processed successfully in ${processingDuration}s`);
    await stampFirstReady(id);

    // The row now points at the new files: remove the superseded ones (old
    // video, its 720p preview, old cover, old image original) and the raw
    // browser uploads. Keys still in use are kept.
    await deleteUnreferencedDeliverableKeys([...collectDeliverableKeys(deliverable), ...rawKeys]);
  } catch (err) {
    console.error(`[Direct Upload] Background processing failed for ${id}:`, err);
    await prisma.deliverable.update({
      where: { id },
      data: { status: 'FAILED' },
    }).catch(() => {});
    // The row still points at the old files; drop only what this run stored,
    // plus the raw uploads (and an unused custom cover) — the admin re-uploads.
    await deleteUnreferencedDeliverableKeys([
      ...createdKeys,
      ...rawKeys,
      ...(customThumbnailStorageKey ? [customThumbnailStorageKey] : []),
    ]);
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

    if (updated.status === 'READY') await stampFirstReady(id);

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

    if (!canModifyDeliverable(req.user, existing)) {
      sendError(res, 'Forbidden', 403);
      return;
    }

    // Hard delete the record first, answer immediately, then remove every file it
    // pointed at (video, 720p preview, cover, image original) in the background:
    // object-storage calls can take many seconds and the admin should not wait.
    // If the row delete fails, nothing is lost; if the cleanup fails, the files
    // are only orphaned in storage (never shown anywhere) and the error is logged.
    await prisma.deliverable.delete({ where: { id } });
    res.status(204).send();

    void deleteUnreferencedDeliverableKeys(collectDeliverableKeys(existing)).catch((cleanupErr) => {
      console.error(`deleteDeliverable cleanup failed for ${id}:`, cleanupErr);
    });
  } catch (err) {
    console.error('deleteDeliverable error:', err);
    sendError(res, 'Failed to delete deliverable', 500);
  }
};
