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

export interface IStorageProvider {
  upload(file: Express.Multer.File, folder: string): Promise<UploadResult>;
  delete(storageKey: string): Promise<void>;
  getSignedUrl(storageKey: string, expiresInSeconds: number, forceDisposition?: 'inline' | 'attachment'): Promise<string>;
  getPresignedUploadUrl(folder: string, fileName: string, mimeType: string, expiresInSeconds?: number): Promise<{ uploadUrl: string; storageKey: string }>;
  getBlobProperties(storageKey: string): Promise<{ exists: boolean; contentLength?: number }>;
  downloadToFile(storageKey: string, localPath: string): Promise<void>;

  // --- Multipart direct upload (parallel parts) ---
  createMultipartUpload(folder: string, fileName: string, mimeType: string): Promise<{ storageKey: string; uploadId: string }>;
  getMultipartUploadUrls(storageKey: string, uploadId: string, partCount: number, expiresInSeconds?: number): Promise<MultipartPartUrl[]>;
  completeMultipartUpload(storageKey: string, uploadId: string, parts: CompletedPart[]): Promise<void>;
  abortMultipartUpload(storageKey: string, uploadId: string): Promise<void>;
}
