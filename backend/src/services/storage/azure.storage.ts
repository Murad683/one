import { BlobServiceClient, generateBlobSASQueryParameters } from '@azure/storage-blob';
import { IStorageProvider, UploadResult } from './storage.interface';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

function extractStorageKey(keyOrUrl: string): string {
  if (!keyOrUrl) return keyOrUrl;
  if (keyOrUrl.startsWith('http')) {
    try {
      const url = new URL(keyOrUrl);
      return url.pathname.substring(1); // removes leading slash, e.g., 'container/blob'
    } catch {
      return keyOrUrl;
    }
  }
  return keyOrUrl;
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
      fileUrl: storageKey, // We store the storageKey as fileUrl so Prisma saves it
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

  async getSignedUrl(rawKey: string, expiresInSeconds: number): Promise<string> {
    const storageKey = extractStorageKey(rawKey);
    const [containerName, ...blobParts] = storageKey.split('/');
    if (!containerName || blobParts.length === 0) {
      throw new Error(`Invalid storageKey format: ${storageKey}`);
    }
    const blobName = blobParts.join('/');

    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const startsOn = new Date();
    const expiresOn = new Date(startsOn.valueOf() + expiresInSeconds * 1000);

    const sasOptions = {
      containerName,
      blobName,
      permissions: { read: true, add: false, create: false, write: false, delete: false, deleteVersion: false, tag: false, filterByTags: false, execute: false, createSnapshot: false, version: '', list: false, setImmutabilityPolicy: false, move: false },
      startsOn,
      expiresOn,
    };

    const sasToken = generateBlobSASQueryParameters(
      sasOptions as any,
      this.blobServiceClient.credential as any
    ).toString();

    return `${blockBlobClient.url}?${sasToken}`;
  }
}
