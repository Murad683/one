import type { Readable } from 'stream';

export interface UploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
}

export interface MultipartPartUrl {
  partNumber: number;
  url: string;
}

export interface CompletedPart {
  partNumber: number;
  etag: string;
}

/** An object read as a stream (used by the public /media route). */
export interface ObjectStream {
  body: Readable;
  contentType?: string;
  contentLength?: number;
  /** Set when only a range was returned (HTTP 206). */
  contentRange?: string;
  etag?: string;
  lastModified?: Date;
}

export interface IStorageProvider {
  upload(file: Express.Multer.File, folder: string): Promise<UploadResult>;
  delete(storageKey: string): Promise<void>;
  getSignedUrl(storageKey: string, expiresInSeconds: number, forceDisposition?: 'inline' | 'attachment'): Promise<string>;
  getPresignedUploadUrl(folder: string, fileName: string, mimeType: string, expiresInSeconds?: number): Promise<{ uploadUrl: string; storageKey: string }>;
  getBlobProperties(storageKey: string): Promise<{ exists: boolean; contentLength?: number }>;
  downloadToFile(storageKey: string, localPath: string): Promise<void>;
  /** Optional: only the S3 provider can stream objects for the public /media route. */
  getObjectStream?(storageKey: string, range?: string): Promise<ObjectStream>;

  // --- Multipart direct upload (parallel parts) ---
  createMultipartUpload(folder: string, fileName: string, mimeType: string): Promise<{ storageKey: string; uploadId: string }>;
  getMultipartUploadUrls(storageKey: string, uploadId: string, partCount: number, expiresInSeconds?: number): Promise<MultipartPartUrl[]>;
  completeMultipartUpload(storageKey: string, uploadId: string, parts: CompletedPart[]): Promise<void>;
  abortMultipartUpload(storageKey: string, uploadId: string): Promise<void>;
}
