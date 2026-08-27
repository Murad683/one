import path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
import sharp from 'sharp';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

// These helpers were extracted verbatim from deliverable.controller.ts so the
// deliverable pipeline and the portfolio/package showcase-video pipeline can
// share one implementation. No behaviour change — only the file they live in.

export const getVideoHeight = (videoPath: string): Promise<number> => {
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
export const getVideoRotationDegrees = (videoStream: any): number => {
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
export const getMediaDimensions = (
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
 * Generates a JPG thumbnail from a video file using FFmpeg.
 * Extracts the frame at the 1-second mark.
 * Returns the local file path of the generated thumbnail, or null on failure.
 * NEVER throws — all errors are caught and logged gracefully.
 */
export const generateVideoThumbnail = async (videoFilePath: string): Promise<string | null> => {
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

export const generateWebPreview = async (videoFilePath: string): Promise<string | null> => {
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

export const applyVideoFaststart = async (videoFilePath: string): Promise<string | null> => {
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
