import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions } from '@azure/storage-blob';
import { IStorageProvider, UploadResult } from './storage.interface';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

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

    // Determine if the container should be public
    const publicContainers = ['avatars', 'images', 'thumbnails'];
    const isPublic = publicContainers.includes(containerName);

    // Ensure the container exists dynamically without specifying access policy in createIfNotExists
    // because it will crash if the storage account denies public access.
    await containerClient.createIfNotExists();

    // For already existing private containers, explicitly set them to public
    if (isPublic) {
      try {
        await containerClient.setAccessPolicy('blob');
      } catch (err) {
        // If the storage account completely denies public access, this will throw 409 PublicAccessNotPermitted.
        // We catch it and log a warning instead of crashing the upload.
        console.warn(`Could not update access policy for ${containerName}. Public access might be disabled on the Azure Storage Account level.`);
      }
    }

    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    const blockBlobClient = containerClient.getBlockBlobClient(uniqueName);

    if (!file.path) {
      throw new Error('File path is undefined. Ensure multer.diskStorage() is being used.');
    }

    try {
      await blockBlobClient.uploadFile(file.path, {
        blobHTTPHeaders: { blobContentType: file.mimetype },
      });
    } finally {
      await fs.promises.unlink(file.path).catch(() => {});
    }

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
        contentDisposition: 'attachment',
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
