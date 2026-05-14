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
import { uploadDeliverableFile } from '@/api/deliverables.api';

interface FileUploadCellProps {
  deliverable: Deliverable;
  onUploadSuccess: (updated: Deliverable) => void;
}

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

    try {
      const res = await uploadDeliverableFile(deliverable.id, file, (percent) => {
        setProgress(percent);
      });
      
      setUploadState('success');
      onUploadSuccess(res.data);
      
      setTimeout(() => {
        setUploadState('idle');
      }, 2500);
    } catch (err: any) {
      setUploadState('error');
      setErrorMessage(err.response?.data?.message || 'Upload failed. Please try again.');
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
