import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions } from '@azure/storage-blob';
import { IStorageProvider, UploadResult } from './storage.interface';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

function extractStorageKey(keyOrUrl: string | null | undefined): string {
  if (!keyOrUrl) return '';
  const keyStr = String(keyOrUrl);
  if (keyStr.includes('uploads/') || keyStr.includes('undefined') || keyStr.includes('null')) {
    return keyStr;
  }
  if (keyStr.startsWith('http')) {
    try {
      const url = new URL(keyStr);
      return url.pathname.substring(1); // removes leading slash, e.g., 'container/blob'
    } catch {
      return keyStr;
    }
  }
  return keyStr;
}

export class AzureStorageProvider implements IStorageProvider {
  private blobServiceClient: BlobServiceClient;

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

    if (!connectionString) {
      throw new Error('Azure Storage connection string must be configured.');
    }

    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }

  async upload(file: Express.Multer.File, folder: string): Promise<UploadResult> {
    const containerName = folder.toLowerCase();
    const containerClient = this.blobServiceClient.getContainerClient(containerName);

    // Ensure the container exists dynamically
    await containerClient.createIfNotExists();

    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    const blockBlobClient = containerClient.getBlockBlobClient(uniqueName);

    if (!file.buffer) {
      throw new Error('File buffer is undefined. Ensure multer.memoryStorage() is being used.');
    }

    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
    });

    const storageKey = `${containerName}/${uniqueName}`;

    return {
      url: storageKey, // We store the storageKey as url
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      storageKey,
    };
  }

  async delete(rawKey: string): Promise<void> {
    const storageKey = extractStorageKey(rawKey);
    const [containerName, ...blobParts] = storageKey.split('/');
    if (!containerName || blobParts.length === 0) {
      console.warn(`Invalid storageKey format for deletion: ${storageKey}`);
      return;
    }
    const blobName = blobParts.join('/');

    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
  }

  async getSignedUrl(rawKey: string | null | undefined, expiresInSeconds: number): Promise<string> {
    if (!rawKey) return '';
    const keyStr = String(rawKey);

    // If it contains legacy uploads path, undefined or null, return it as-is without signing
    if (keyStr.includes('uploads/') || keyStr.includes('undefined') || keyStr.includes('null')) {
      return keyStr;
    }

    const storageKey = extractStorageKey(rawKey);
    const parts = storageKey.split('/');
    if (parts.length < 2) {
      // Not a valid Azure key format (container/blob), return as-is
      return storageKey;
    }

    const containerName = parts[0];
    const blobName = parts.slice(1).join('/');

    if (!containerName || !blobName) {
      return storageKey;
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const startsOn = new Date();
      const expiresOn = new Date(startsOn.valueOf() + expiresInSeconds * 1000);

      const sasOptions = {
        containerName,
        blobName,
        permissions: BlobSASPermissions.from({ read: true }),
        startsOn,
        expiresOn,
      };

      const sasToken = generateBlobSASQueryParameters(
        sasOptions,
        this.blobServiceClient.credential as any
      ).toString();

      return `${blockBlobClient.url}?${sasToken}`;
    } catch (error) {
      console.error(`Error signing URL for key ${rawKey}:`, error);
      return keyStr;
    }
  }
}
