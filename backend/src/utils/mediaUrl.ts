import crypto from 'crypto';

/**
 * Stable, signed links for PUBLIC site media (portfolio, packages, team, site
 * settings), served by this API at `/media/<signature>/<storage key>` so that
 * Cloudflare can cache them next to the visitor.
 *
 * The key stays visible in the path, but the server only serves a key whose
 * signature it made itself, and it only makes signatures for the public
 * entities' own fields. This matters because the `thumbnails/` folder is shared
 * with clients' private deliverable covers: a folder allow-list would not be safe.
 */

const SIG_BYTES = 16;
const SIG_LENGTH = 22; // 16 bytes as base64url
const SIG_PATTERN = /^[A-Za-z0-9_-]{22}$/;
// Keys this app writes look like `folder/<uuid>-<timestamp>.<ext>`.
const KEY_PATTERN = /^[a-z0-9_-]+\/[A-Za-z0-9._-]+$/;
const MAX_KEY_LENGTH = 300;
const DEFAULT_PUBLIC_API_URL = 'https://api.ourneweye.com';

/** True for a plain `folder/file.ext` key with nothing that could escape it. */
export const isSafeMediaKey = (key: unknown): key is string =>
  typeof key === 'string' &&
  key.length <= MAX_KEY_LENGTH &&
  KEY_PATTERN.test(key) &&
  !key.includes('..') &&
  !/\/\./.test(key);

const signingKey = (env: NodeJS.ProcessEnv): Buffer => {
  const secret = env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set; cannot sign media links');
  return crypto.createHash('sha256').update(`media-url|${secret}`).digest();
};

export const signMediaKey = (key: string, env: NodeJS.ProcessEnv = process.env): string =>
  crypto.createHmac('sha256', signingKey(env)).update(key).digest().subarray(0, SIG_BYTES).toString('base64url');

export const verifyMediaSignature = (sig: unknown, key: unknown, env: NodeJS.ProcessEnv = process.env): boolean => {
  if (typeof sig !== 'string' || !SIG_PATTERN.test(sig) || !isSafeMediaKey(key)) return false;
  const expected = Buffer.from(signMediaKey(key, env));
  const given = Buffer.from(sig);
  return given.length === SIG_LENGTH && expected.length === given.length && crypto.timingSafeEqual(expected, given);
};

export const publicApiUrl = (env: NodeJS.ProcessEnv = process.env): string =>
  ((env.PUBLIC_API_URL || '').trim() || DEFAULT_PUBLIC_API_URL).replace(/\/+$/, '');

export const buildPublicMediaUrl = (key: string, env: NodeJS.ProcessEnv = process.env): string =>
  `${publicApiUrl(env)}/media/${signMediaKey(key, env)}/${key}`;

/**
 * If `value` is one of our public media links (absolute or a bare `/media/...`
 * path), returns the storage key inside it; otherwise null. The signature is
 * deliberately not checked here: this only recovers the key (e.g. when the
 * admin panel sends back the link it received), and serving is what verifies it.
 */
export const parsePublicMediaUrl = (value: string): string | null => {
  let pathname = value;
  if (/^https?:\/\//i.test(value)) {
    try {
      pathname = new URL(value).pathname;
    } catch {
      return null;
    }
  }
  const match = /^\/media\/([A-Za-z0-9_-]{22})\/(.+)$/.exec(pathname);
  if (!match) return null;
  const key = match[2];
  return isSafeMediaKey(key) ? key : null;
};

export const MEDIA_CACHE_CONTROL = 'public, max-age=31536000, immutable';

const EXTENSION_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
};

export const contentTypeForKey = (key: string): string => {
  const dot = key.lastIndexOf('.');
  return (dot >= 0 && EXTENSION_TYPES[key.slice(dot).toLowerCase()]) || 'application/octet-stream';
};

/**
 * A single `bytes=a-b` / `bytes=a-` / `bytes=-n` range, or undefined for
 * anything else (no header, several ranges, bad syntax). Undefined means "serve
 * the whole file", which every client accepts.
 */
export const parseSingleRange = (header: unknown): string | undefined => {
  if (typeof header !== 'string') return undefined;
  const value = header.trim();
  return /^bytes=(\d+-\d*|-\d+)$/.test(value) ? value : undefined;
};
