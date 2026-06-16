import React, { useRef, useState } from 'react';
import {
  FileVideo,
  FileArchive,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { Deliverable } from '@/types';
import Button from '../ui/Button';
import {
  formatFileSize,
  getDeliverableAcceptedFiles,
} from '@/utils/deliverable.helpers';
import { getUploadSasUrl, completeDeliverableUpload } from '@/api/deliverables.api';
import { BlockBlobClient } from '@azure/storage-blob';

interface FileUploadCellProps {
  deliverable: Deliverable;
  onUploadSuccess: (updated: Deliverable) => void;
}

/**
 * Extracts a JPEG thumbnail from a video file using an offscreen
 * <video> + <canvas> pipeline. Seeks to 0.5s (or duration/10).
 */
const extractVideoThumbnail = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.playsInline = true;

    video.addEventListener('loadedmetadata', () => {
      const seekTo = video.duration > 0.5 ? 0.5 : video.duration / 10;
      video.currentTime = seekTo;
    });

    video.addEventListener('seeked', () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          return reject(new Error('Failed to get canvas context'));
        }
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate thumbnail blob'));
            }
          },
          'image/jpeg',
          0.85
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    });

    video.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video for thumbnail extraction'));
    });
  });
};

const FileUploadCell: React.FC<FileUploadCellProps> = ({
  deliverable,
  onUploadSuccess,
}) => {
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploadState('uploading');
    setProgress(0);
    setErrorMessage(null);

    // Client-side validation: Max Size 500MB
    const maxSizeBytes = 500 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setUploadState('error');
      setErrorMessage(`File size exceeds the maximum limit of ${formatFileSize(maxSizeBytes)}.`);
      return;
    }

    // Client-side validation: Expected Mime Type
    const acceptedTypesStr = getDeliverableAcceptedFiles(deliverable.type);
    if (acceptedTypesStr && acceptedTypesStr !== '*') {
      const acceptedTypes = acceptedTypesStr.split(',').map(t => t.trim().toLowerCase());
      if (!acceptedTypes.includes(file.type.toLowerCase())) {
        setUploadState('error');
        setErrorMessage('Unsupported file type.');
        return;
      }
    }

    try {
      // Step 1: Get SAS URLs from backend
      const sasData = await getUploadSasUrl(deliverable.id);

      // Step 2: If video, extract thumbnail via canvas
      const isVideo = file.type.startsWith('video/');
      if (isVideo) {
        try {
          const thumbnailBlob = await extractVideoThumbnail(file);
          const thumbClient = new BlockBlobClient(sasData.thumbSasUrl);
          await thumbClient.uploadData(thumbnailBlob, {
            blobHTTPHeaders: { blobContentType: 'image/jpeg' },
          });
        } catch (thumbErr) {
          console.warn('Thumbnail generation/upload failed, continuing without thumbnail:', thumbErr);
        }
      }

      // Step 3: Upload main file directly to Azure
      const fileClient = new BlockBlobClient(sasData.fileSasUrl);
      await fileClient.uploadData(file, {
        blobHTTPHeaders: { blobContentType: file.type },
        onProgress: (p) => {
          const percent = Math.round((p.loadedBytes / file.size) * 100);
          setProgress(percent);
        },
        blockSize: 8 * 1024 * 1024,   // 8MB chunks
        concurrency: 4,
      });

      // Step 4: Notify backend that upload is complete
      await completeDeliverableUpload(deliverable.id, {
        blobName: sasData.blobName,
        container: sasData.container,
        thumbBlobName: sasData.thumbBlobName,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      setUploadState('success');
      onUploadSuccess(deliverable);

      setTimeout(() => {
        setUploadState('idle');
      }, 2500);
    } catch (err: any) {
      setUploadState('error');
      setErrorMessage(err.response?.data?.message || err.message || 'Upload failed. Please try again.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    if (e.target) e.target.value = '';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  // State: Uploading
  if (uploadState === 'uploading') {
    return (
      <div className="flex w-full min-w-[200px] flex-col justify-center">
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="truncate">Uploading...</span>
          <span>{progress}%</span>
        </div>
        <div className="my-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gray-900 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  // State: Success
  if (uploadState === 'success') {
    return (
      <div className="flex items-center gap-2 py-2">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <span className="text-xs font-medium text-green-600">Upload complete!</span>
      </div>
    );
  }

  // State: Error
  if (uploadState === 'error') {
    return (
      <div className="flex items-start gap-2 py-1">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
        <div className="flex flex-col gap-1">
          <span className="text-xs text-red-600">{errorMessage}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUploadState('idle')}
            className="w-fit !px-2 !py-0.5 !text-xs"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // State: Idle WITH File
  if (deliverable.fileUrl && uploadState === 'idle') {
    const isVideo = deliverable.mimeType?.startsWith('video/');
    const FileIcon = isVideo ? FileVideo : FileArchive;
    const truncatedName =
      deliverable.fileName && deliverable.fileName.length > 24
        ? deliverable.fileName.substring(0, 21) + '...'
        : deliverable.fileName || 'Unknown file';

    return (
      <div className="flex items-center justify-between gap-3 min-w-[200px]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50">
            <FileIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-body" title={deliverable.fileName || ''}>
              {truncatedName}
            </span>
            <span className="text-xs text-gray-400">
              {formatFileSize(deliverable.fileSize)}
            </span>
          </div>
        </div>
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="!p-1.5"
            title="Replace File"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={getDeliverableAcceptedFiles(deliverable.type)}
            onChange={handleFileChange}
          />
        </div>
      </div>
    );
  }

  // State: Idle WITHOUT File (Dropzone)
  return (
    <div className="min-w-[200px]">
      <div
        className={`cursor-pointer rounded-lg border-2 border-dashed p-3 text-center transition-all ${
          isDragOver
            ? 'border-gray-900 bg-gray-50'
            : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50/50'
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mx-auto mb-1 h-4 w-4 text-gray-400" />
        <p className="text-xs font-medium text-gray-600">Drop file or click to upload</p>
        <p className="text-[10px] text-gray-400 mt-0.5 truncate">
          {getDeliverableAcceptedFiles(deliverable.type)}
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={getDeliverableAcceptedFiles(deliverable.type)}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default FileUploadCell;
