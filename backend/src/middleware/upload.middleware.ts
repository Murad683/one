import multer, { FileFilterCallback } from 'multer';
import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.util';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileTypeFromFile } from 'file-type';

// Determine the max file size from env or default to 500MB
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '500', 10);
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// Extend Request to pass a custom subfolder path if needed
declare global {
  namespace Express {
    interface Request {
      uploadSubfolder?: string;
    }
  }
}

const storage = multer.diskStorage({
  destination: os.tmpdir(),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const checkSvg = async (filePath: string) => {
  const buffer = Buffer.alloc(100);
  const fd = await fs.promises.open(filePath, 'r');
  await fd.read(buffer, 0, 100, 0);
  await fd.close();
  const content = buffer.toString('utf8').toLowerCase();
  return content.includes('<svg') || content.includes('<?xml');
};

const validateFile = async (file: Express.Multer.File) => {
  const isSvg = await checkSvg(file.path);
  if (isSvg) throw new Error('SVG files are not allowed');

  const type = await fileTypeFromFile(file.path);
  if (!type) {
    throw new Error('Could not determine file type. File may be corrupted or unsupported.');
  }

  if (type.mime !== file.mimetype) {
    throw new Error(`File type mismatch: expected ${file.mimetype}, got ${type.mime}`);
  }

  // Override extension using the validated mime type extension
  file.originalname = `${path.parse(file.originalname).name}.${type.ext}`;
};

const videoFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Invalid file type. Only MP4, MOV, and AVI are allowed for videos.'));
  }
};

const siteMediaFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedTypes = [
    'video/mp4', 'video/quicktime', 'video/x-msvideo',
    'image/jpeg', 'image/png', 'image/webp'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Invalid file type. Only MP4, MOV, AVI, JPG, PNG, and WEBP are allowed.'));
  }
};

const designFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedTypes = [
    'application/zip',
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Invalid file type. Only ZIP, PDF, JPG, PNG, and WEBP are allowed for designs.'));
  }
};

const imageFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Invalid file type. Only JPG, PNG, and WEBP are allowed for images.'));
  }
};

const wrapMulter = (multerInstance: multer.Multer) => {
  return (req: Request, res: Response, next: NextFunction) => {
    multerInstance.single('file')(req, res, async (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return sendError(res, err.message, 400);
        }
        return sendError(res, 'An unknown error occurred during upload', 500);
      }
      if (req.file) {
        try {
          await validateFile(req.file);
        } catch (validationError: any) {
          await fs.promises.unlink(req.file.path).catch(() => {});
          return sendError(res, validationError.message || 'Invalid file', 400);
        }
      }
      next();
    });
  };
};

export const uploadVideo = wrapMulter(
  multer({
    storage,
    fileFilter: videoFilter,
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
  })
);

export const uploadDesign = wrapMulter(
  multer({
    storage,
    fileFilter: designFilter,
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
  })
);

export const uploadImage = wrapMulter(
  multer({
    storage,
    fileFilter: imageFilter,
    limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  })
);

export const uploadSiteMedia = wrapMulter(
  multer({
    storage,
    fileFilter: siteMediaFilter,
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
  })
);

export const wrapMulterArray = (multerInstance: multer.Multer, fieldName: string, maxCount: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    multerInstance.array(fieldName, maxCount)(req, res, async (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return sendError(res, err.message, 400);
        }
        return sendError(res, 'An unknown error occurred during upload', 500);
      }
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          try {
            await validateFile(file);
          } catch (validationError: any) {
            for (const f of req.files) {
              await fs.promises.unlink(f.path).catch(() => {});
            }
            return sendError(res, validationError.message || 'Invalid file in upload array', 400);
          }
        }
      }
      next();
    });
  };
};

export const uploadSiteMediaArray = wrapMulterArray(
  multer({
    storage,
    fileFilter: siteMediaFilter,
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
  }),
  'files',
  10
);

const pdfFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Yalnız PDF faylları qəbul edilir.'));
  }
};

export const uploadInvoicePdf = (req: Request, res: Response, next: NextFunction) => {
  req.uploadSubfolder = 'invoices';
  wrapMulter(
    multer({
      storage,
      fileFilter: pdfFilter,
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max for invoices
    })
  )(req, res, next);
};
