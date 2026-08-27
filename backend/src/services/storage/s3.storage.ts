import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as presignS3Url } from '@aws-sdk/s3-request-presigner';
import { IStorageProvider, UploadResult, MultipartPartUrl, CompletedPart } from './storage.interface';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Generic S3-compatible provider — works with Hetzner Object Storage, AWS S3,
// MinIO, or any other S3-API-compatible service, by pointing S3_ENDPOINT at
// the right host. A single bucket is used; "folder" (thumbnails/, avatars/,
// videos/, etc.) is stored as a key prefix, matching the "container/blob"
// shaped storageKey the rest of the app already expects (see azure.storage.ts).
function extractStorageKey(keyOrUrl: string | null | undefined): string {
  if (!keyOrUrl) return '';
  const keyStr = String(keyOrUrl);
  if (keyStr.includes('uploads/') || keyStr.includes('undefined') || keyStr.includes('null')) {
    return keyStr;
  }
  if (keyStr.startsWith('http')) {
    try {
      const url = new URL(keyStr);
      return url.pathname.substring(1);
    } catch {
      return keyStr;
    }
  }
  return keyStr;
}

export class S3StorageProvider implements IStorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION || 'us-east-1';
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const bucket = process.env.S3_BUCKET;

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error(
        'S3 storage is not fully configured. Required: S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET.'
      );
    }

    this.bucket = bucket;
    this.client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      // Hetzner Object Storage (and most non-AWS S3-compatible services) use
      // path-style URLs (https://endpoint/bucket/key) rather than AWS's
      // virtual-hosted style (https://bucket.endpoint/key).
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
      // aws-sdk v3 defaults to sending CRC32 checksums on every request. Ceph
      // RGW (Hetzner Object Storage) rejects the x-amz-checksum-* / x-amz-sdk-
      // checksum-algorithm params — and for browser presigned PUT URLs the
      // checksum is signed with a placeholder that can never match the real
      // body, breaking direct uploads. Only send checksums when the operation
      // actually requires them.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  async upload(file: Express.Multer.File, folder: string): Promise<UploadResult> {
    const folderKey = folder.toLowerCase();
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    const storageKey = `${folderKey}/${uniqueName}`;

    if (!file.path) {
      throw new Error('File path is undefined. Ensure multer.diskStorage() is being used.');
    }

    try {
      const body = fs.createReadStream(file.path);
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
          Body: body,
          ContentType: file.mimetype,
          ContentLength: file.size,
        })
      );
    } finally {
      await fs.promises.unlink(file.path).catch(() => {});
    }

    return {
      url: storageKey,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      storageKey,
    };
  }

  async delete(rawKey: string): Promise<void> {
    const storageKey = extractStorageKey(rawKey);
    if (!storageKey) return;
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey })
    );
  }

  async getSignedUrl(
    rawKey: string | null | undefined,
    expiresInSeconds: number,
    forceDisposition?: 'inline' | 'attachment'
  ): Promise<string> {
    if (!rawKey) return '';
    const keyStr = String(rawKey);

    // Legacy local-storage paths pass through unsigned, same as the Azure provider.
    if (keyStr.includes('uploads/') || keyStr.includes('undefined') || keyStr.includes('null')) {
      return keyStr;
    }

    const storageKey = extractStorageKey(rawKey);

    try {
      const ext = path.extname(storageKey).toLowerCase();
      const inlineExtensions = [
        '.mp4', '.webm', '.ogg', '.mov', '.avi',
        '.jpg', '.jpeg', '.png', '.gif', '.webp',
      ];
      const filename = encodeURIComponent(path.basename(storageKey));
      const disposition = forceDisposition
        ? `${forceDisposition}; filename="${filename}"`
        : inlineExtensions.includes(ext)
          ? `inline; filename="${filename}"`
          : `attachment; filename="${filename}"`;

      return await presignS3Url(
        this.client,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
          ResponseContentDisposition: disposition,
        }),
        { expiresIn: expiresInSeconds }
      );
    } catch (error) {
      console.error(`Error signing URL for key ${rawKey}:`, error);
      return keyStr;
    }
  }

  async getPresignedUploadUrl(
    folder: string,
    fileName: string,
    mimeType: string,
    expiresInSeconds = 7200
  ): Promise<{ uploadUrl: string; storageKey: string }> {
    const folderKey = folder.toLowerCase();
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(fileName)}`;
    const storageKey = `${folderKey}/${uniqueName}`;

    const uploadUrl = await presignS3Url(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        ContentType: mimeType,
      }),
      { expiresIn: expiresInSeconds }
    );

    return { uploadUrl, storageKey };
  }

  // --- Multipart direct upload ---

  async createMultipartUpload(
    folder: string,
    fileName: string,
    mimeType: string
  ): Promise<{ storageKey: string; uploadId: string }> {
    const folderKey = folder.toLowerCase();
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(fileName)}`;
    const storageKey = `${folderKey}/${uniqueName}`;

    const out = await this.client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucket,
        Key: storageKey,
        ContentType: mimeType,
      })
    );

    if (!out.UploadId) {
      throw new Error('S3 CreateMultipartUpload returned no UploadId');
    }
    return { storageKey, uploadId: out.UploadId };
  }

  async getMultipartUploadUrls(
    storageKey: string,
    uploadId: string,
    partCount: number,
    expiresInSeconds = 7200
  ): Promise<MultipartPartUrl[]> {
    const urls: MultipartPartUrl[] = [];
    for (let partNumber = 1; partNumber <= partCount; partNumber++) {
      const url = await presignS3Url(
        this.client,
        new UploadPartCommand({
          Bucket: this.bucket,
          Key: storageKey,
          UploadId: uploadId,
          PartNumber: partNumber,
        }),
        { expiresIn: expiresInSeconds }
      );
      urls.push({ partNumber, url });
    }
    return urls;
  }

  async completeMultipartUpload(
    storageKey: string,
    uploadId: string,
    parts: CompletedPart[]
  ): Promise<void> {
    const Parts = [...parts]
      .sort((a, b) => a.partNumber - b.partNumber)
      .map((p) => ({
        PartNumber: p.partNumber,
        // S3 / Ceph expect the ETag quoted; browsers hand it back already quoted,
        // but normalise in case it isn't.
        ETag: p.etag.startsWith('"') ? p.etag : `"${p.etag}"`,
      }));

    await this.client.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: storageKey,
        UploadId: uploadId,
        MultipartUpload: { Parts },
      })
    );
  }

  async abortMultipartUpload(storageKey: string, uploadId: string): Promise<void> {
    await this.client.send(
      new AbortMultipartUploadCommand({
        Bucket: this.bucket,
        Key: storageKey,
        UploadId: uploadId,
      })
    );
  }

  async getBlobProperties(storageKey: string): Promise<{ exists: boolean; contentLength?: number }> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: storageKey })
      );
      return { exists: true, contentLength: result.ContentLength };
    } catch (err: any) {
      if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') {
        return { exists: false };
      }
      throw err;
    }
  }

  async downloadToFile(storageKey: string, localPath: string): Promise<void> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: storageKey })
    );
    const body = result.Body as NodeJS.ReadableStream;
    await new Promise<void>((resolve, reject) => {
      const writeStream = fs.createWriteStream(localPath);
      body.pipe(writeStream);
      body.on('error', reject);
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);
    });
  }
}
