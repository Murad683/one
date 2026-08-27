import { storageProvider } from './storage/storage.factory';
import { UploadResult } from './storage/storage.interface';

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

export async function cleanupOrphanFiles(oldUrls: string[], newUrls: string[]): Promise<void> {
  const oldSet = new Set(oldUrls);
  const newSet = new Set(newUrls);
  
  for (const url of oldUrls) {
    if (!newSet.has(url)) {
      try {
        await deleteFile(url);
        console.log(`Cleaned up orphan file: ${url}`);
      } catch (err) {
        console.warn(`Failed to clean up orphan file ${url}:`, err);
      }
    }
  }
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
