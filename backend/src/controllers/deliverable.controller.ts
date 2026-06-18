import { Request, Response, NextFunction } from 'express';
import path from 'path';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response.util';
import { processAndStoreFile, deleteFile, getSecureDownloadUrl, getSecureDownloadUrlForDownload, cleanupOrphanFiles } from '../services/upload.service';
import { uploadSiteMediaArray } from '../middleware/upload.middleware';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

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
    let newThumbnailUrl: string | null = null;

    for (const file of uploadedFiles) {
      // --- THUMBNAIL GENERATION ---
      // Trigger if DB says it's a video OR if the actual uploaded file is a video mimetype
      const isVideoByDb = deliverable.category?.isVideo === true || deliverable.type === 'VIDEO';
      const isVideoByMime = file.mimetype?.startsWith('video/') === true;
      const shouldGenerateThumb = (isVideoByDb || isVideoByMime) && !newThumbnailUrl && (!!file.path || !!file.buffer);

      console.log('[Thumb Debug] Thumbnail condition check:', {
        isVideoByDb,
        isVideoByMime,
        categoryIsVideo: deliverable.category?.isVideo,
        deliverableType: deliverable.type,
        fileMimetype: file.mimetype,
        filePath: file.path,
        hasBuffer: !!file.buffer,
        bufferLength: file.buffer?.length,
        alreadyHasThumb: !!newThumbnailUrl,
        shouldGenerateThumb,
      });

      if (shouldGenerateThumb) {
        // Temp file paths — declared here so `finally` can always clean them up
        let tempVideoPath: string | undefined;
        let tempThumbPath: string | undefined;

        try {
          // Resolve the video source path on disk.
          // If Multer used disk storage, file.path exists. Otherwise, write the buffer.
          let videoInputPath = file.path;

          if (!videoInputPath && file.buffer) {
            const ext = path.extname(file.originalname) || '.mp4';
            tempVideoPath = path.join(os.tmpdir(), `${crypto.randomUUID()}${ext}`);
            console.log('[Thumb Debug] file.path is undefined — writing buffer to temp file:', tempVideoPath, '| buffer size:', file.buffer.length);
            await fs.promises.writeFile(tempVideoPath, file.buffer);
            videoInputPath = tempVideoPath;
          }

          console.log('--- STARTING THUMBNAIL GEN ---', { isVideoByDb, isVideoByMime, fileMimeType: file.mimetype, videoInputPath });

          // Generate the thumbnail frame
          tempThumbPath = await generateVideoThumbnail(videoInputPath!) ?? undefined;
          console.log('[Thumb Debug] generateVideoThumbnail returned:', tempThumbPath);

          if (tempThumbPath) {
            console.log('[Thumb Debug] Attempting to upload thumbnail to Azure...');
            const thumbFileBuffer = await fs.promises.readFile(tempThumbPath);
            console.log('[Thumb Debug] Thumbnail file buffer size:', thumbFileBuffer.length);

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
            console.log('[Thumb Debug] Azure upload SUCCESS. thumbnailUrl:', newThumbnailUrl);
          } else {
            console.log('[Thumb Debug] generateVideoThumbnail returned null — no thumbnail generated.');
          }
        } catch (thumbError) {
          console.error('Azure Thumbnail Upload Error:', thumbError);
          newThumbnailUrl = null; // Graceful degradation
        } finally {
          // Aggressive async cleanup — never block, never throw
          if (tempVideoPath) {
            await fs.promises.unlink(tempVideoPath).catch((err) => console.error('Video Cleanup Error:', err));
          }
          if (tempThumbPath) {
            await fs.promises.unlink(tempThumbPath).catch((err) => {
              if (err.code !== 'ENOENT') console.error('Thumb Cleanup Error:', err);
            });
          }
        }
      }
      // --- END THUMBNAIL GENERATION ---

      // --- APPLY FASTSTART FOR WEB OPTIMIZATION ---
      const isVideoFileExt = ['.mp4', '.mov', '.m4v', '.webm'].includes(path.extname(file.originalname).toLowerCase());
      const isVideoByMimeForFaststart = file.mimetype?.startsWith('video/') || isVideoFileExt;
      
      let faststartTempPath: string | null = null;
      if (isVideoByMimeForFaststart && file.path) {
        faststartTempPath = await applyVideoFaststart(file.path);
        if (faststartTempPath) {
          // Delete original temp file created by multer
          await fs.promises.unlink(file.path).catch(() => {});
          
          // Override file properties for processAndStoreFile
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
              console.log('[Video Debug] Preview uploaded to Azure:', previewUrl);
            } catch (previewError) {
              console.error('[Video Debug] Preview upload error:', previewError);
            }
            // Cleanup preview temp file
            await fs.promises.unlink(previewPath).catch(() => {});
          }
        } else {
          console.log('[Video Debug] Video height <=720px, skipping preview transcode.');
        }
      }

      const result = await processAndStoreFile(file, folder);
      
      // Cleanup faststart file if Azure SDK didn't already
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

    const updated = await prisma.deliverable.update({
      where: { id },
      data: {
        files: newFileObjects,
        uploadedAt: new Date(),
        status: 'READY',
        clientFeedback: null, // Reset feedback so client can review new version
        ...(newThumbnailUrl !== undefined && { thumbnailUrl: newThumbnailUrl }),
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
