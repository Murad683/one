import { parsePublicMediaUrl } from './mediaUrl';

/**
 * Turns whatever is stored or sent back (a bare key, a signed storage URL or a
 * public /media link) into the storage key. One shared implementation: the
 * storage providers, upload.service and the project controller each used to
 * carry their own copy.
 */
export function extractStorageKey(keyOrUrl: string | null | undefined): string {
  if (!keyOrUrl) return '';
  const keyStr = String(keyOrUrl);

  // Checked first: the random signature in a /media link could contain "null".
  const mediaKey = parsePublicMediaUrl(keyStr);
  if (mediaKey) return mediaKey;

  if (keyStr.includes('uploads/') || keyStr.includes('undefined') || keyStr.includes('null')) {
    return keyStr;
  }
  if (keyStr.startsWith('http')) {
    try {
      const path = new URL(keyStr).pathname.substring(1); // removes leading slash
      // Path-style S3 links are /<bucket>/<key>; the key is what follows the bucket.
      const bucket = (process.env.S3_BUCKET || '').trim();
      return bucket && path.startsWith(`${bucket}/`) ? path.slice(bucket.length + 1) : path;
    } catch {
      return keyStr;
    }
  }
  return keyStr;
}
