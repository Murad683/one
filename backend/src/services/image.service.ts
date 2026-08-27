import path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import sharp from 'sharp';
import heicConvert from 'heic-convert';
import { processAndStoreFile } from './upload.service';
import { UploadResult } from './storage/storage.interface';

export const isHeicFile = (filePath: string): boolean =>
  /\.(heic|heif)$/i.test(filePath);

/**
 * Decodes a HEIC/HEIF file to a JPEG buffer via heic-convert (WASM libheif).
 * Needed because sharp's bundled libheif rejects iPhone multi-tile HEICs
 * ("iref box exceeds the security limits of 16 references").
 * Returns null on failure.
 */
export const decodeHeicToJpegBuffer = async (inputPath: string): Promise<Buffer | null> => {
  try {
    const inputBuffer = await fs.promises.readFile(inputPath);
    const output = await heicConvert({
      buffer: inputBuffer,
      format: 'JPEG',
      quality: 0.92,
    });
    return Buffer.from(output);
  } catch (err: any) {
    console.error('[Image Optimize Debug] heic-convert fallback failed:', err?.message);
    return null;
  }
};

export interface OptimizedImage {
  path: string;
  width: number;
  height: number;
}

/**
 * Produces a web-optimized WebP copy of an image: EXIF orientation is
 * auto-corrected, the image is downscaled only if its longest side exceeds
 * `maxEdge` px, and it's re-encoded as WebP at the given quality.
 * Returns null on any failure — the caller falls back to the original file.
 * The caller owns the returned temp file and must unlink it after upload.
 */
export const optimizeImage = async (
  inputPath: string,
  opts: { maxEdge?: number; quality?: number } = {}
): Promise<OptimizedImage | null> => {
  const maxEdge = opts.maxEdge ?? 1920;
  const quality = opts.quality ?? 85;
  const outputPath = path.join(
    os.tmpdir(),
    `optimized_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.webp`
  );

  const encodeToWebp = async (input: string | Buffer) => {
    const info = await sharp(input)
      .rotate()
      .resize(maxEdge, maxEdge, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toFile(outputPath);
    return { path: outputPath, width: info.width, height: info.height };
  };

  try {
    return await encodeToWebp(inputPath);
  } catch (err) {
    console.error('[Image Optimize Debug] Failed to optimize image:', err);

    if (isHeicFile(inputPath)) {
      const jpegBuffer = await decodeHeicToJpegBuffer(inputPath);
      if (jpegBuffer) {
        try {
          const result = await encodeToWebp(jpegBuffer);
          console.log('[Image Optimize Debug] HEIC decoded via heic-convert fallback');
          return result;
        } catch (fallbackErr) {
          console.error('[Image Optimize Debug] Fallback optimize failed:', fallbackErr);
        }
      }
    }

    return null;
  }
};

// Raster formats we re-encode to WebP. Everything else (svg, gif, non-images)
// passes through untouched. SVG/GIF are already blocked by upload.middleware
// validateFile — these checks are defensive against a future filter change.
const OPTIMIZABLE_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
]);

const isOptimizableImage = (file: Express.Multer.File): boolean =>
  !!file.path &&
  typeof file.mimetype === 'string' &&
  file.mimetype.startsWith('image/') &&
  OPTIMIZABLE_IMAGE_MIME.has(file.mimetype) &&
  file.mimetype !== 'image/svg+xml' &&
  file.mimetype !== 'image/gif';

export interface OptimizedStoreResult extends UploadResult {
  width?: number;
  height?: number;
}

/**
 * Optimize a raster image to WebP (resize + re-encode) and store it; anything
 * that isn't an optimizable raster image (video, PDF, SVG, GIF) is stored
 * as-is. If optimization fails the original is stored unchanged — an upload is
 * never blocked on optimization.
 *
 * Only new uploads are affected; existing stored objects are never touched.
 */
export const optimizeAndStore = async (
  file: Express.Multer.File,
  folder: string,
  opts: { maxEdge?: number; quality?: number } = {}
): Promise<OptimizedStoreResult> => {
  if (!isOptimizableImage(file)) {
    return processAndStoreFile(file, folder);
  }

  // Skip pointless re-encode: an already-small WebP within the size budget.
  try {
    const meta = await sharp(file.path).metadata();
    const longestEdge = Math.max(meta.width ?? 0, meta.height ?? 0);
    const maxEdge = opts.maxEdge ?? 1920;
    if (meta.format === 'webp' && longestEdge > 0 && longestEdge <= maxEdge) {
      return processAndStoreFile(file, folder);
    }
  } catch {
    // metadata read failed — fall through and let optimizeImage try / fail safely
  }

  const optimized = await optimizeImage(file.path, opts);
  if (!optimized) {
    return processAndStoreFile(file, folder);
  }

  // The original temp file (file.path) is now redundant. The S3/Azure providers
  // unlink whatever path they're handed once the bytes are stored; hand them the
  // optimized file and let them clean it up. (The original is left for the
  // provider too — harmless, it also unlinks that on the non-optimized path.)
  await fs.promises.unlink(file.path).catch(() => {});

  const buffer = fs.readFileSync(optimized.path);
  const synthetic: Express.Multer.File = {
    fieldname: file.fieldname,
    originalname: `${path.basename(file.originalname, path.extname(file.originalname))}.webp`,
    encoding: file.encoding,
    mimetype: 'image/webp',
    buffer,
    size: buffer.length,
    stream: null as any,
    destination: os.tmpdir(),
    filename: path.basename(optimized.path),
    path: optimized.path,
  };
  const result = await processAndStoreFile(synthetic, folder);
  return { ...result, width: optimized.width, height: optimized.height };
};
