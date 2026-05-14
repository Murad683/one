import multer, { FileFilterCallback } from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { sendError } from '../utils/response.util';

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
  destination: (req, _file, cb) => {
    const subfolder = req.uploadSubfolder || 'temp';
    const uploadPath = path.join(process.cwd(), 'uploads', subfolder);
    
    // Ensure the specific destination directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

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
    multerInstance.single('file')(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return sendError(res, err.message, 400);
        }
        return sendError(res, 'An unknown error occurred during upload', 500);
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
