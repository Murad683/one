import { createLimiter } from '../utils/limiter';

// Caps concurrent ffmpeg pipelines (thumbnail + faststart + 720p transcode)
// across every media path — client deliverables AND portfolio/package showcase
// videos share this one queue. Uploads are unaffected; only post-upload
// processing is gated. Extra jobs wait in an in-memory queue.
// Override with MEDIA_PROCESSING_CONCURRENCY.
const MEDIA_PROCESSING_CONCURRENCY = Math.max(
  1,
  parseInt(process.env.MEDIA_PROCESSING_CONCURRENCY || '2', 10) || 2
);

export const mediaProcessingLimiter = createLimiter(MEDIA_PROCESSING_CONCURRENCY, 200);
