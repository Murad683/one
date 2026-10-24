import { storageProvider } from './storage/storage.factory';
import { UploadResult } from './storage/storage.interface';
import prisma from '../utils/prisma';

// How long a signed read/display URL stays valid. Default 1 day so a portal
// tab left open for hours (or overnight) doesn't start returning 403s on its
// images and download links. Clamped to [60s, 7d] — 7 days is the AWS SigV4
// hard maximum. Tradeoff: a leaked URL is usable for this long.
const PRESIGNED_URL_TTL_SECONDS = Math.min(
  Math.max(
    parseInt(process.env.PRESIGNED_URL_TTL_SECONDS || '86400', 10) || 86400,
    60
  ),
  604800
);

export async function processAndStoreFile(file: Express.Multer.File, folder: string): Promise<UploadResult> {
  return storageProvider.upload(file, folder);
}

export async function deleteFile(storageKey: string): Promise<void> {
  return storageProvider.delete(storageKey);
}

export async function getSecureDownloadUrl(storageKey: string): Promise<string> {
  return storageProvider.getSignedUrl(storageKey, PRESIGNED_URL_TTL_SECONDS);
}

export async function getSecureDownloadUrlForDownload(storageKey: string): Promise<string> {
  // Signed URL with forced 'attachment' disposition for downloads.
  return storageProvider.getSignedUrl(storageKey, PRESIGNED_URL_TTL_SECONDS, 'attachment');
}

export function extractStorageKey(keyOrUrl: string | null | undefined): string {
  if (!keyOrUrl) return '';
  const keyStr = String(keyOrUrl);
  if (keyStr.includes('uploads/') || keyStr.includes('undefined') || keyStr.includes('null')) {
    return keyStr;
  }
  if (keyStr.startsWith('http')) {
    try {
      const url = new URL(keyStr);
      return url.pathname.substring(1); // removes leading slash
    } catch {
      return keyStr;
    }
  }
  return keyStr;
}

// Deletes every key in oldUrls that is not also in newUrls. Keys are compared
// in normalized form so the same object written as a URL in one place and as a
// bare key in another is never deleted by mistake.
export async function cleanupOrphanFiles(oldUrls: string[], newUrls: string[]): Promise<void> {
  const keep = new Set(newUrls.map(extractStorageKey).filter(Boolean));
  const seen = new Set<string>();

  for (const url of oldUrls) {
    const key = extractStorageKey(url);
    if (!key || keep.has(key) || seen.has(key)) continue;
    seen.add(key);
    try {
      await deleteFile(url);
      console.log(`Cleaned up orphan file: ${url}`);
    } catch (err) {
      console.warn(`Failed to clean up orphan file ${url}:`, err);
    }
  }
}

// Every storage key a deliverable row points at: each file plus its 720p
// preview, the cover image and (for images) the untouched original.
export function collectDeliverableKeys(row: {
  files?: unknown;
  thumbnailUrl?: string | null;
  originalUrl?: string | null;
}): string[] {
  const files = Array.isArray(row.files) ? (row.files as Array<{ url?: unknown; previewUrl?: unknown }>) : [];
  const keys = [
    ...files.flatMap((f) => [f?.url, f?.previewUrl]),
    row.thumbnailUrl,
    row.originalUrl,
  ].filter((k): k is string => typeof k === 'string' && k.length > 0);
  return [...new Set(keys)];
}

// Deletes the given keys from storage, skipping any key a deliverable still
// points at. Call it only AFTER the database reflects the change (new files
// saved, row updated or deleted): then the worst a failure here can do is
// leave an orphan behind, never break a live record. Never throws.
export async function deleteUnreferencedDeliverableKeys(keys: string[]): Promise<void> {
  const unused: string[] = [];
  for (const key of new Set(keys.map(extractStorageKey).filter(Boolean))) {
    try {
      const used = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Deliverable"
        WHERE strpos(files::text, ${key}) > 0
          OR strpos(COALESCE("originalUrl", ''), ${key}) > 0
          OR strpos(COALESCE("thumbnailUrl", ''), ${key}) > 0
        LIMIT 1`;
      if (used.length === 0) unused.push(key);
      else console.warn(`[Storage cleanup] Kept ${key}: still referenced by deliverable ${used[0].id}`);
    } catch (err) {
      console.warn(`[Storage cleanup] Kept ${key}: reference check failed`, err);
    }
  }
  await cleanupOrphanFiles(unused, []);
}

export async function getPresignedUploadUrl(folder: string, fileName: string, mimeType: string, expiresInSeconds?: number) {
  return storageProvider.getPresignedUploadUrl(folder, fileName, mimeType, expiresInSeconds);
}

export async function getBlobProperties(storageKey: string) {
  return storageProvider.getBlobProperties(storageKey);
}

// --- Multipart direct upload (parallel parts) ---
export async function createMultipartUpload(folder: string, fileName: string, mimeType: string) {
  return storageProvider.createMultipartUpload(folder, fileName, mimeType);
}

export async function getMultipartUploadUrls(
  storageKey: string,
  uploadId: string,
  partCount: number,
  expiresInSeconds?: number
) {
  return storageProvider.getMultipartUploadUrls(storageKey, uploadId, partCount, expiresInSeconds);
}

export async function completeMultipartUpload(
  storageKey: string,
  uploadId: string,
  parts: { partNumber: number; etag: string }[]
) {
  return storageProvider.completeMultipartUpload(storageKey, uploadId, parts);
}

export async function abortMultipartUpload(storageKey: string, uploadId: string) {
  return storageProvider.abortMultipartUpload(storageKey, uploadId);
}

export async function downloadBlobToFile(storageKey: string, localPath: string) {
  return storageProvider.downloadToFile(storageKey, localPath);
}
