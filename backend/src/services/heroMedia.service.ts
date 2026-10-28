import * as fs from 'fs';
import sharp from 'sharp';
import { applyVideoFaststart, generateVideoThumbnail } from './video.service';
import { mediaProcessingLimiter } from './mediaQueue';

// The poster travels inside the /site-settings JSON, so it has to stay tiny.
// The hero overlay is dark and the image is stretched with object-cover, which
// hides the low resolution.
const POSTER_WIDTH = 480;
const POSTER_QUALITY = 55;

export interface HeroVideoResult {
  /** The file to store: faststarted when that worked, otherwise the upload untouched. */
  file: Express.Multer.File;
  /** `data:image/webp;base64,...` of the first frame, or null when it could not be made. */
  poster: string | null;
}

const unlinkQuietly = (p: string | null | undefined) => (p ? fs.promises.unlink(p).catch(() => {}) : Promise.resolve());

const makePoster = async (framePath: string): Promise<string> => {
  const buffer = await sharp(framePath)
    .resize(POSTER_WIDTH, undefined, { withoutEnlargement: true })
    .webp({ quality: POSTER_QUALITY })
    .toBuffer();
  return `data:image/webp;base64,${buffer.toString('base64')}`;
};

const run = async (file: Express.Multer.File): Promise<HeroVideoResult> => {
  let faststartPath: string | null = null;
  let framePath: string | null = null;
  try {
    faststartPath = await applyVideoFaststart(file.path);
    const working = faststartPath ?? file.path;

    framePath = await generateVideoThumbnail(working);
    const poster = framePath ? await makePoster(framePath).catch(() => null) : null;

    if (!faststartPath) return { file, poster };

    // The storage provider reads file.path and sends file.size as the length;
    // the original upload is no longer needed.
    const processed: Express.Multer.File = {
      ...file,
      path: faststartPath,
      filename: faststartPath,
      size: fs.statSync(faststartPath).size,
    };
    await unlinkQuietly(file.path);
    faststartPath = null; // ownership moved to the caller / storage provider
    return { file: processed, poster };
  } catch (err) {
    console.error('[HeroMedia] processing failed, storing the original:', err);
    return { file, poster: null };
  } finally {
    await unlinkQuietly(framePath);
    await unlinkQuietly(faststartPath); // only still set when something failed after it was made
  }
};

/**
 * Makes a freshly uploaded hero video quick to start: moves the mp4 index
 * (moov) to the front, so a browser can play it after the first request
 * instead of first fetching the end of the file, and cuts a small poster frame
 * to show until the video is ready. Neither step re-encodes the video.
 *
 * Never throws and never blocks the upload: whatever fails is skipped and the
 * original file is used (same principle as optimizeAndStore for images).
 */
export const processHeroVideo = async (file: Express.Multer.File): Promise<HeroVideoResult> => {
  try {
    return await mediaProcessingLimiter(() => run(file));
  } catch (err) {
    // e.g. the media queue is full
    console.error('[HeroMedia] could not process, storing the original:', err);
    return { file, poster: null };
  }
};
