import { Request, Response } from 'express';
import { optimizeAndStore } from '../services/image.service';
import { sendError, sendSuccess } from '../utils/response.util';

const allowedFolders = new Set(['thumbnails', 'avatars', 'images', 'highlights']);

export const uploadImageFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      sendError(res, 'No file uploaded', 400);
      return;
    }

    const folder = typeof req.query.folder === 'string' && allowedFolders.has(req.query.folder)
      ? req.query.folder
      : 'images';

    // Raster images are downscaled + re-encoded to WebP; non-images pass through.
    const result = await optimizeAndStore(req.file, folder, { maxEdge: 1600 });
    sendSuccess(res, result, 201);
  } catch (err) {
    console.error('uploadImageFile error:', err);
    sendError(res, 'Failed to upload image', 500);
  }
};
