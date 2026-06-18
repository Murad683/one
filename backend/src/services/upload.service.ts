import { storageProvider } from './storage/storage.factory';
import { UploadResult } from './storage/storage.interface';

export async function processAndStoreFile(file: Express.Multer.File, folder: string): Promise<UploadResult> {
  return storageProvider.upload(file, folder);
}

export async function deleteFile(storageKey: string): Promise<void> {
  return storageProvider.delete(storageKey);
}

export async function getSecureDownloadUrl(storageKey: string): Promise<string> {
  // Returns a signed URL valid for 1 hour (3600 seconds)
  return storageProvider.getSignedUrl(storageKey, 3600);
}

export async function getSecureDownloadUrlForDownload(storageKey: string): Promise<string> {
  // Returns a signed URL with forced 'attachment' disposition for downloads
  return storageProvider.getSignedUrl(storageKey, 3600, 'attachment');
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
