import { Router } from 'express';
import type { Request, Response } from 'express';
import { pipeline } from 'stream';
import { storageProvider } from '../services/storage/storage.factory';
import { mediaRateLimiter } from '../middleware/rateLimiter.middleware';
import {
  MEDIA_CACHE_CONTROL,
  contentTypeForKey,
  isSafeMediaKey,
  parseSingleRange,
  verifyMediaSignature,
} from '../utils/mediaUrl';

/**
 * GET /media/<signature>/<storage key>: public site media, cached by Cloudflare.
 *
 * Mounted before cors, helmet, cookies and the global rate limiter (see
 * index.ts): the answer must carry no Set-Cookie or Vary so it stays cacheable,
 * and only keys this server signed can be read, so nothing private is reachable.
 */
export const mediaRouter = Router();

const notFound = (res: Response) => {
  res.set('Cache-Control', 'no-store').status(404).end();
};

// PUBLIC_MEDIA_RANGE=off answers every request with the whole file, in case the
// CDN does not cache partial (206) answers.
const rangeEnabled = () => (process.env.PUBLIC_MEDIA_RANGE || '').trim().toLowerCase() !== 'off';

export const serveMedia = async (req: Request, res: Response): Promise<void> => {
  const sig = req.params.sig;
  const wildcard = (req.params as Record<string, unknown>).key;
  const key = Array.isArray(wildcard) ? wildcard.join('/') : String(wildcard ?? '');

  if (!storageProvider.getObjectStream || !isSafeMediaKey(key) || !verifyMediaSignature(sig, key)) {
    notFound(res);
    return;
  }

  const range = rangeEnabled() ? parseSingleRange(req.headers.range) : undefined;

  let object;
  try {
    object = await storageProvider.getObjectStream(key, range);
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    if (status === 404 || (err as { name?: string })?.name === 'NoSuchKey') {
      notFound(res);
    } else if (status === 416) {
      res.set('Cache-Control', 'no-store').status(416).end();
    } else {
      console.error('[Media] storage error:', err);
      res.set('Cache-Control', 'no-store').status(502).end();
    }
    return;
  }

  res.status(object.contentRange ? 206 : 200);
  res.set({
    'Content-Type': object.contentType || contentTypeForKey(key),
    'Cache-Control': MEDIA_CACHE_CONTROL,
    'Accept-Ranges': rangeEnabled() ? 'bytes' : 'none',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Content-Type-Options': 'nosniff',
  });
  if (object.contentLength !== undefined) res.set('Content-Length', String(object.contentLength));
  if (object.contentRange) res.set('Content-Range', object.contentRange);
  if (object.etag) res.set('ETag', object.etag);
  if (object.lastModified) res.set('Last-Modified', object.lastModified.toUTCString());

  if (req.method === 'HEAD') {
    object.body.destroy();
    res.end();
    return;
  }

  // Stop reading from storage when the visitor goes away.
  res.on('close', () => object.body.destroy());
  pipeline(object.body, res, () => {
    /* a closed connection is not an error worth logging */
  });
};

mediaRouter.get('/:sig/*key', mediaRateLimiter, (req, res) => {
  void serveMedia(req, res);
});
