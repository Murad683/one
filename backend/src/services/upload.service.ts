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

export function extractStorageKey(keyOrUrl: string): string {
  if (!keyOrUrl) return keyOrUrl;
  if (keyOrUrl.startsWith('http')) {
    try {
      const url = new URL(keyOrUrl);
      return url.pathname.substring(1); // removes leading slash
    } catch {
      return keyOrUrl;
    }
  }
  return keyOrUrl;
}
