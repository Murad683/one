import { Request, Response, NextFunction } from 'express';
import path from 'path';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response.util';
import { processAndStoreFile, deleteFile, getSecureDownloadUrl, getSecureDownloadUrlForDownload, cleanupOrphanFiles, getPresignedUploadUrl, getBlobProperties, downloadBlobToFile } from '../services/upload.service';
import { uploadSiteMediaWithThumbnail } from '../middleware/upload.middleware';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
import sharp from 'sharp';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import { SAS_UPLOAD_EXPIRY_SECONDS, FILE_SIZE_TOLERANCE_PERCENT, MAX_UPLOAD_SIZE_BYTES } from '../config/upload.constants';
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const getVideoHeight = (videoPath: string): Promise<number> => {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err || !metadata?.streams) {
        console.error('[Video Debug] ffprobe error:', err?.message);
        resolve(0);
        return;
      }
      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
      const height = videoStream?.height || 0;
      console.log('[Video Debug] Detected video height:', height);
      resolve(height);
    });
  });
};

/**
 * Reads a video stream's display rotation in degrees (0/90/180/270), checking
 * both the legacy tag-based rotation (common on H.264 phone recordings) and the
 * newer Display Matrix side_data (common on HEVC/newer encoders). Browsers apply
 * this rotation when playing the video, so raw stream width/height alone can
 * report the pre-rotation (sensor) orientation instead of what's actually shown.
 */
const getVideoRotationDegrees = (videoStream: any): number => {
  const tagRotate = videoStream?.tags?.rotate;
  if (tagRotate !== undefined) {
    const deg = parseInt(tagRotate, 10);
    if (!isNaN(deg)) return ((deg % 360) + 360) % 360;
  }
  const sideData = videoStream?.side_data_list?.find((sd: any) => typeof sd?.rotation === 'number');
  if (sideData) {
    return ((Math.round(sideData.rotation) % 360) + 360) % 360;
  }
  return 0;
};

/**
 * Reads the natural width/height of an image or video file.
 * Returns null on any failure — dimension reading must never block an upload.
 */
const getMediaDimensions = (
  filePath: string,
  isVideo: boolean
): Promise<{ width: number; height: number } | null> => {
  if (isVideo) {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err || !metadata?.streams) {
          console.error('[Dimension Debug] ffprobe error:', err?.message);
          resolve(null);
          return;
        }
        const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
        if (videoStream?.width && videoStream?.height) {
          const rotation = getVideoRotationDegrees(videoStream);
          const isSwapped = rotation === 90 || rotation === 270;
          resolve({
            width: isSwapped ? videoStream.height : videoStream.width,
            height: isSwapped ? videoStream.width : videoStream.height,
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  return sharp(filePath)
    .metadata()
    .then((metadata) => {
      if (metadata.width && metadata.height) {
        // EXIF orientation 5-8 involve a 90°/270° transpose — browsers auto-rotate
        // for display, so the reported dimensions must be swapped to match.
        const isSwapped = metadata.orientation !== undefined && metadata.orientation >= 5 && metadata.orientation <= 8;
        return {
          width: isSwapped ? metadata.height : metadata.width,
          height: isSwapped ? metadata.width : metadata.height,
        };
      }
      return null;
    })
    .catch((err) => {
      console.error('[Dimension Debug] sharp metadata error:', err?.message);
      return null;
    });
};

/**
 * Produces a web-optimized WebP copy of an image: EXIF orientation is
 * auto-corrected, the image is downscaled only if its longest side exceeds
 * 1920px, and it's re-encoded as WebP at quality 85.
 * Returns null on any failure — the caller falls back to the original file.
 */
const optimizeImage = async (
  inputPath: string
): Promise<{ path: string; width: number; height: number } | null> => {
  try {
    const outputPath = path.join(
      os.tmpdir(),
      `optimized_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.webp`
    );

    const info = await sharp(inputPath)
      .rotate()
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(outputPath);

    return { path: outputPath, width: info.width, height: info.height };
  } catch (err) {
    console.error('[Image Optimize Debug] Failed to optimize image:', err);
    return null;
  }
};

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

        return { ...d, files: filesWithSignedUrls, thumbnailUrl: signedThumbnailUrl };
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

        return {
          ...d,
          files: filesWithSignedUrls,
          thumbnailUrl: signedThumbnailUrl,
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

/**
 * Generates a JPG thumbnail from a video file using FFmpeg.
 * Extracts the frame at the 1-second mark.
 * Returns the local file path of the generated thumbnail, or null on failure.
 * NEVER throws — all errors are caught and logged gracefully.
 */
const generateVideoThumbnail = async (videoFilePath: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const outputDir = os.tmpdir();
    const thumbnailFileName = `thumb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;
    const thumbnailPath = path.join(outputDir, thumbnailFileName);

    console.log('[Thumb Debug] FFmpeg Input Path:', videoFilePath);
    console.log('[Thumb Debug] FFmpeg Output Path:', thumbnailPath);
    console.log('[Thumb Debug] FFmpeg binary:', ffmpegInstaller.path);

    ffmpeg(videoFilePath)
      .on('error', (err) => {
        console.error('FFMPEG FATAL ERROR:', err.message);
        console.error('FFMPEG FATAL ERROR (full):', err);
        resolve(null); // Graceful degradation: return null, do NOT throw
      })
      .on('end', () => {
        console.log('[Thumb Debug] FFmpeg generation finished successfully.');
        // Verify the output file actually exists
        const exists = fs.existsSync(thumbnailPath);
        console.log('[Thumb Debug] Output file exists:', exists, '| Size:', exists ? fs.statSync(thumbnailPath).size : 0);
        resolve(exists ? thumbnailPath : null);
      })
      .screenshots({
        timestamps: ['00:00:00.500'],
        filename: thumbnailFileName,
        folder: outputDir,
        size: '640x?', // Preserve aspect ratio, cap width at 640px
      });
  });
};

const generateWebPreview = async (videoFilePath: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const outputDir = os.tmpdir();
    const previewFileName = `preview_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.mp4`;
    const previewPath = path.join(outputDir, previewFileName);

    console.log('[Video Debug] Starting 720p preview transcode:', videoFilePath);

    ffmpeg(videoFilePath)
      .outputOptions([
        '-vf', 'scale=-2:720',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '28',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
      ])
      .on('error', (err) => {
        console.error('[Video Debug] Preview transcode error:', err.message);
        resolve(null);
      })
      .on('end', () => {
        console.log('[Video Debug] Preview transcode finished successfully.');
        const exists = fs.existsSync(previewPath);
        if (exists) {
          const size = fs.statSync(previewPath).size;
          console.log('[Video Debug] Preview file size:', (size / 1024 / 1024).toFixed(1), 'MB');
        }
        resolve(exists ? previewPath : null);
      })
      .save(previewPath);
  });
};

const applyVideoFaststart = async (videoFilePath: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const ext = path.extname(videoFilePath) || '.mp4';
    const outputDir = os.tmpdir();
    const faststartFileName = `faststart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    const faststartPath = path.join(outputDir, faststartFileName);

    console.log('[Video Debug] Starting faststart processing:', videoFilePath);

    ffmpeg(videoFilePath)
      .outputOptions(['-c copy', '-movflags +faststart'])
      .on('error', (err) => {
        console.error('[Video Debug] faststart FFMPEG ERROR:', err.message);
        resolve(null); // Graceful degradation
      })
      .on('end', () => {
        console.log('[Video Debug] faststart finished successfully.');
        const exists = fs.existsSync(faststartPath);
        resolve(exists ? faststartPath : null);
      })
      .save(faststartPath);
  });
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

    // Fire and forget the background task
    processDeliverableBackground(id, deliverable, uploadedFiles, customThumbnailFile).catch((err) => {
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

    // Arxa planda emal başla (fire and forget)
    processDirectUploadBackground(id, deliverable, verifications, thumbnailStorageKey || null).catch((err) => {
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
