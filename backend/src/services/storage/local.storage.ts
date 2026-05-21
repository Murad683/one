import fs from 'fs/promises';
import path from 'path';
import { IStorageProvider, UploadResult } from './storage.interface';

export class LocalStorageProvider implements IStorageProvider {
  async upload(file: Express.Multer.File, folder: string): Promise<UploadResult> {
    // Multer already saved the file to disk in the destination folder.
    // We just return the relative URL and metadata.
    const url = `/uploads/${folder}/${file.filename}`;
    
    return {
      url,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      storageKey: file.path, // Absolute path on disk
    };
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await fs.unlink(storageKey);
    } catch (err: any) {
      // Ignore if file doesn't exist
      if (err.code !== 'ENOENT') {
        console.error(`Failed to delete local file: ${storageKey}`, err);
      }
    }
  }

  async getSignedUrl(storageKey: string, expiresInSeconds: number): Promise<string> {
    console.warn('LocalStorageProvider: getSignedUrl is not supported for local storage. Returning relative URL.');
    // Extract the relative part to serve
    const filename = path.basename(storageKey);
    const folder = path.basename(path.dirname(storageKey));
    return `/uploads/${folder}/${filename}`;
  }
}
