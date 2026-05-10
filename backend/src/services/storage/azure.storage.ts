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
    // TODO: AZURE — fully stubbed, implement when CONNECTION_STRING is configured
    throw new Error('Method not completely implemented. Requires SAS token generation logic.');
  }
}
