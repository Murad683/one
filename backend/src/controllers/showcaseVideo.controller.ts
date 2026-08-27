import { Request, Response } from 'express';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response.util';
import {
  getPresignedUploadUrl,
  getBlobProperties,
  downloadBlobToFile,
  processAndStoreFile,
  cleanupOrphanFiles,
} from '../services/upload.service';
import {
  applyVideoFaststart,
  getVideoHeight,
  generateVideoThumbnail,
  generateWebPreview,
} from '../services/video.service';
import { mediaProcessingLimiter } from '../services/mediaQueue';
import { SAS_UPLOAD_EXPIRY_SECONDS, SHOWCASE_MAX_UPLOAD_SIZE_BYTES } from '../config/upload.constants';

type Kind = 'project' | 'package';
const SHOWCASE_FOLDER = 'showcase';

interface VideoRow {
  id: string;
  videoUrl: string | null;
  videoThumbnailUrl: string | null;
  videoStatus: string | null;
}

const findRow = (kind: Kind, id: string): Promise<VideoRow | null> =>
  (kind === 'project'
    ? prisma.project.findUnique({ where: { id } })
    : prisma.package.findUnique({ where: { id } })) as Promise<VideoRow | null>;

const updateVideo = (
  kind: Kind,
  id: string,
  data: { videoUrl?: string | null; videoThumbnailUrl?: string | null; videoStatus?: string | null }
) =>
  kind === 'project'
    ? prisma.project.update({ where: { id }, data })
    : prisma.package.update({ where: { id }, data });

function toMulter(filePath: string, mimetype: string): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: path.basename(filePath),
    encoding: '7bit',
    mimetype,
    buffer: null as any,
    size: fs.statSync(filePath).size,
    stream: null as any,
    destination: os.tmpdir(),
    filename: path.basename(filePath),
    path: filePath,
  };
}

// POST /:id/video/initiate — body: { fileName, fileSize, mimeType }
export const initiate = (kind: Kind) => async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { fileName, fileSize, mimeType } = req.body;
    if (!fileName || !mimeType) {
      sendError(res, 'fileName and mimeType are required', 400);
      return;
    }
    if (fileSize && Number(fileSize) > SHOWCASE_MAX_UPLOAD_SIZE_BYTES) {
      sendError(res, 'Video is too large', 400);
      return;
    }
    const row = await findRow(kind, id);
    if (!row) {
      sendError(res, `${kind} not found`, 404);
      return;
    }
    const { uploadUrl, storageKey } = await getPresignedUploadUrl(
      SHOWCASE_FOLDER,
      fileName,
      mimeType,
      SAS_UPLOAD_EXPIRY_SECONDS
    );
    sendSuccess(res, { uploadUrl, storageKey });
  } catch (err) {
    console.error('showcase initiate error:', err);
    sendError(res, 'Failed to initiate showcase video upload', 500);
  }
};

// POST /:id/video/finalize — body: { storageKey }
export const finalize = (kind: Kind) => async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { storageKey } = req.body;
    if (!storageKey) {
      sendError(res, 'storageKey is required', 400);
      return;
    }
    const row = await findRow(kind, id);
    if (!row) {
      sendError(res, `${kind} not found`, 404);
      return;
    }
    const props = await getBlobProperties(storageKey);
    if (!props.exists) {
      sendError(res, 'Uploaded blob not found in storage', 400);
      return;
    }

    await updateVideo(kind, id, { videoStatus: 'PROCESSING' });
    sendSuccess(res, { message: 'Processing started' });

    mediaProcessingLimiter(() => processShowcaseVideo(kind, id, storageKey)).catch((e) =>
      console.error('[Showcase] fatal background error:', e)
    );
  } catch (err) {
    console.error('showcase finalize error:', err);
    sendError(res, 'Failed to finalize showcase video upload', 500);
  }
};

// DELETE /:id/video
export const remove = (kind: Kind) => async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const row = await findRow(kind, id);
    if (!row) {
      sendError(res, `${kind} not found`, 404);
      return;
    }
    await cleanupOrphanFiles(
      [row.videoUrl, row.videoThumbnailUrl].filter(Boolean) as string[],
      []
    );
    const updated = await updateVideo(kind, id, {
      videoUrl: null,
      videoThumbnailUrl: null,
      videoStatus: null,
    });
    sendSuccess(res, updated);
  } catch (err) {
    console.error('showcase remove error:', err);
    sendError(res, 'Failed to remove showcase video', 500);
  }
};

/**
 * Downloads the just-uploaded raw clip, faststarts it, transcodes to 720p when
 * taller, grabs a poster frame, stores the web copy + poster, deletes the
 * previous video/poster AND the raw upload, and flips the row to READY.
 * Never throws — on any failure the row is marked FAILED.
 */
async function processShowcaseVideo(kind: Kind, id: string, storageKey: string): Promise<void> {
  const temps: string[] = [];
  try {
    const row = await findRow(kind, id);
    if (!row) return;
    const prevVideoKey = row.videoUrl;
    const prevThumbKey = row.videoThumbnailUrl;

    const src = path.join(os.tmpdir(), `showcase_${id}_${crypto.randomUUID()}.mp4`);
    temps.push(src);
    await downloadBlobToFile(storageKey, src);

    let working = src;
    const fast = await applyVideoFaststart(src);
    if (fast) {
      temps.push(fast);
      working = fast;
    }

    const height = await getVideoHeight(working);
    if (height > 720) {
      const preview = await generateWebPreview(working);
      if (preview) {
        temps.push(preview);
        working = preview;
      }
    }

    const thumb = await generateVideoThumbnail(working);
    if (thumb) temps.push(thumb);

    const videoStored = await processAndStoreFile(toMulter(working, 'video/mp4'), SHOWCASE_FOLDER);
    let thumbUrl: string | null = null;
    if (thumb) {
      const t = await processAndStoreFile(toMulter(thumb, 'image/jpeg'), 'thumbnails');
      thumbUrl = t.url;
    }

    await cleanupOrphanFiles(
      [prevVideoKey, prevThumbKey, storageKey].filter(Boolean) as string[],
      [videoStored.url, thumbUrl].filter(Boolean) as string[]
    );

    await updateVideo(kind, id, {
      videoUrl: videoStored.url,
      videoThumbnailUrl: thumbUrl,
      videoStatus: 'READY',
    });
  } catch (err) {
    console.error(`[Showcase] processing failed for ${kind} ${id}:`, err);
    await updateVideo(kind, id, { videoStatus: 'FAILED' }).catch(() => {});
  } finally {
    for (const f of temps) {
      try {
        fs.unlinkSync(f);
      } catch {
        /* already gone */
      }
    }
  }
}
