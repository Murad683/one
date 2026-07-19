import multer, { FileFilterCallback } from 'multer';
import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.util';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fromFile } from 'file-type';

// Determine the max file size from env or default to 2GB
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '2048', 10);
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

// file-type@16 predates HEIC/HEIF magic-byte detection (it recognizes AVIF but not
// HEIC), so fromFile() returns undefined for genuine iPhone photos. Detect the
// ISO-BMFF "ftyp" box ourselves and read the brand to identify these formats.
const HEIC_BRANDS = ['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'hevm', 'hevs', 'mif1', 'msf1'];
const AVIF_BRANDS = ['avif', 'avis'];

const detectIsoBmffBrand = async (filePath: string): Promise<string | null> => {
  const buffer = Buffer.alloc(12);
  const fd = await fs.promises.open(filePath, 'r');
  await fd.read(buffer, 0, 12, 0);
  await fd.close();
  if (buffer.toString('ascii', 4, 8) !== 'ftyp') return null;
  return buffer.toString('ascii', 8, 12).toLowerCase().trim();
};

// Browsers/OSes are unreliable about the mimetype they report for some formats
// (HEIC in particular commonly arrives as a generic placeholder instead of
// 'image/heic') — when the browser's reported type is this uninformative, trust
// the sniffed content type instead of rejecting a genuine file.
const GENERIC_MIME_TYPES = ['application/octet-stream', 'application/octet-binary', ''];

const validateFile = async (file: Express.Multer.File) => {
  const isSvg = await checkSvg(file.path);
  if (isSvg) throw new Error('SVG files are not allowed');

  const type = await fromFile(file.path);

  if (!type) {
    const brand = await detectIsoBmffBrand(file.path);
    if (brand && (HEIC_BRANDS.includes(brand) || AVIF_BRANDS.includes(brand))) {
      const ext = AVIF_BRANDS.includes(brand) ? 'avif' : 'heic';
      file.mimetype = `image/${ext}`;
      file.originalname = `${path.parse(file.originalname).name}.${ext}`;
      return;
    }
    throw new Error('Could not determine file type. File may be corrupted or unsupported.');
  }

  if (type.mime !== file.mimetype && !GENERIC_MIME_TYPES.includes(file.mimetype)) {
    throw new Error(`File type mismatch: expected ${file.mimetype}, got ${type.mime}`);
  }

  // Trust the sniffed mimetype (ground truth) and override the extension to match
  file.mimetype = type.mime;
  file.originalname = `${path.parse(file.originalname).name}.${type.ext}`;
};

// Browsers/OSes are inconsistent about the mimetype they report for HEIC/HEIF/AVIF
// files (some send '', 'application/octet-stream', etc.), so also accept by extension.
const HEIC_MIME_TYPES = ['image/heic', 'image/heif', 'image/avif'];
const isHeicOrAvifByExt = (filename: string) => /\.(heic|heif|avif)$/i.test(filename);

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
    'image/jpeg', 'image/png', 'image/webp', ...HEIC_MIME_TYPES,
  ];
  if (allowedTypes.includes(file.mimetype) || isHeicOrAvifByExt(file.originalname)) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Invalid file type. Only MP4, MOV, AVI, JPG, PNG, WEBP, and HEIC are allowed.'));
  }
};

const designFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedTypes = [
    'application/zip',
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    ...HEIC_MIME_TYPES,
  ];
  if (allowedTypes.includes(file.mimetype) || isHeicOrAvifByExt(file.originalname)) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Invalid file type. Only ZIP, PDF, JPG, PNG, WEBP, and HEIC are allowed for designs.'));
  }
};

const imageFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', ...HEIC_MIME_TYPES];
  if (allowedTypes.includes(file.mimetype) || isHeicOrAvifByExt(file.originalname)) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Invalid file type. Only JPG, PNG, WEBP, and HEIC are allowed for images.'));
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

export const wrapMulterFields = (
  multerInstance: multer.Multer,
  fields: multer.Field[]
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    multerInstance.fields(fields)(req, res, async (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return sendError(res, err.message, 400);
        }
        return sendError(res, 'An unknown error occurred during upload', 500);
      }
      const filesMap = req.files as Record<string, Express.Multer.File[]> | undefined;
      if (filesMap) {
        for (const fieldFiles of Object.values(filesMap)) {
          for (const file of fieldFiles) {
            try {
              await validateFile(file);
            } catch (validationError: any) {
              // Cleanup all uploaded files on validation failure
              for (const ff of Object.values(filesMap)) {
                for (const f of ff) {
                  await fs.promises.unlink(f.path).catch(() => {});
                }
              }
              return sendError(res, validationError.message || 'Invalid file in upload', 400);
            }
          }
        }
      }
      next();
    });
  };
};

export const uploadSiteMediaWithThumbnail = wrapMulterFields(
  multer({
    storage,
    fileFilter: siteMediaFilter,
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
  }),
  [
    { name: 'files', maxCount: 10 },
    { name: 'thumbnail', maxCount: 1 },
  ]
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
