import { Request, Response } from 'express';
import { processAndStoreFile } from '../services/upload.service';
import { sendError, sendSuccess } from '../utils/response.util';

const allowedFolders = new Set(['thumbnails', 'avatars', 'images']);

export const uploadImageFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      sendError(res, 'No file uploaded', 400);
      return;
    }

    const folder = typeof req.query.folder === 'string' && allowedFolders.has(req.query.folder)
      ? req.query.folder
      : 'images';

    const result = await processAndStoreFile(req.file, folder);
    sendSuccess(res, result, 201);
  } catch (err) {
    console.error('uploadImageFile error:', err);
    sendError(res, 'Failed to upload image', 500);
  }
};
