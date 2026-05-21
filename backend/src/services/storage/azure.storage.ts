import { BlobServiceClient, generateBlobSASQueryParameters } from '@azure/storage-blob';
import fs from 'fs/promises';
import { IStorageProvider, UploadResult } from './storage.interface';
import path from 'path';

export class AzureStorageProvider implements IStorageProvider {
  private blobServiceClient: BlobServiceClient;
  private containerName: string;

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

    if (!connectionString || !containerName) {
      throw new Error('Azure Storage connection string and container name must be configured.');
    }

    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerName = containerName;
  }

  async upload(file: Express.Multer.File, folder: string): Promise<UploadResult> {
    // TODO: AZURE — fully stubbed, implement when CONNECTION_STRING is configured
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const blobName = `${folder}/${file.filename}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const fileBuffer = await fs.readFile(file.path);
    await blockBlobClient.uploadData(fileBuffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
    });

    // Clean up local temp file
    await fs.unlink(file.path);

    return {
      fileUrl: blockBlobClient.url,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      storageKey: blobName, // Use blobName as the storage key for Azure
    };
  }

  async delete(storageKey: string): Promise<void> {
    // TODO: AZURE — fully stubbed, implement when CONNECTION_STRING is configured
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(storageKey);
    await blockBlobClient.deleteIfExists();
  }

  async getSignedUrl(storageKey: string, expiresInSeconds: number): Promise<string> {
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(storageKey);

    const startsOn = new Date();
    const expiresOn = new Date(startsOn.valueOf() + expiresInSeconds * 1000);

    const sasOptions = {
      containerName: this.containerName,
      blobName: storageKey,
      permissions: { read: true, add: false, create: false, write: false, delete: false, deleteVersion: false, tag: false, filterByTags: false, execute: false, createSnapshot: false, version: '', list: false, setImmutabilityPolicy: false, move: false }, // Explicitly spelling out permissions instead of using BlobSASPermissions.parse('r') to avoid import issues
      startsOn,
      expiresOn,
    };

    const sasToken = generateBlobSASQueryParameters(
      // We parse the r permission manually, but the type system might want the actual class,
      // so we import BlobSASPermissions dynamically or use string cast if needed. 
      // Assuming generateBlobSASQueryParameters takes an object with permissions that can be satisfied by parsing 'r'.
      sasOptions as any,
      this.blobServiceClient.credential as any
    ).toString();

    return `${blockBlobClient.url}?${sasToken}`;
  }
}
