export interface UploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
}

export interface IStorageProvider {
  upload(file: Express.Multer.File, folder: string): Promise<UploadResult>;
  delete(storageKey: string): Promise<void>;
  getSignedUrl(storageKey: string, expiresInSeconds: number): Promise<string>;
  generateUploadSasUrl(containerName: string, blobName: string, expiresInSeconds?: number): Promise<string>;
}
