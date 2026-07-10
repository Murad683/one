import client from './client';
import type { ApiResponse, PaginatedResponse, Deliverable } from '@/types';

export const getDeliverables = async (params?: {
  clientId?: string;
  year?: number;
  month?: number;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<PaginatedResponse<Deliverable>>> => {
  const response = await client.get<ApiResponse<PaginatedResponse<Deliverable>>>('/deliverables', {
    params,
  });
  return response.data;
};

export const createDeliverable = async (data: {
  clientId: string;
  type: string;
  month: number;
  year: number;
  notes?: string;
}): Promise<ApiResponse<Deliverable>> => {
  const response = await client.post<ApiResponse<Deliverable>>('/deliverables', data);
  return response.data;
};

export const uploadDeliverableFile = async (
  id: string,
  files: File[],
  onProgress?: (percent: number) => void,
  thumbnail?: File | null
): Promise<ApiResponse<Deliverable>> => {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  if (thumbnail) {
    formData.append('thumbnail', thumbnail);
  }

  const response = await client.patch<ApiResponse<Deliverable>>(
    `/deliverables/${id}/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 600000, // 10 minutes — large video uploads
      onUploadProgress: (event) => {
        if (event.total) {
          onProgress?.(Math.round((event.loaded * 100) / event.total));
        }
      },
    }
  );
  return response.data;
};

export const updateDeliverableStatus = async (
  id: string,
  status: string
): Promise<ApiResponse<Deliverable>> => {
  const response = await client.patch<ApiResponse<Deliverable>>(`/deliverables/${id}/status`, {
    status,
  });
  return response.data;
};

export const deleteDeliverable = async (id: string): Promise<void> => {
  await client.delete(`/deliverables/${id}`);
};

import axios from 'axios';

export const directUploadDeliverableFile = async (
  id: string,
  files: File[],
  onProgress?: (percent: number) => void,
  thumbnail?: File | null
): Promise<any> => {
  const uploadedFiles: { storageKey: string; fileName: string; fileSize: number; mimeType: string }[] = [];
  let thumbnailStorageKey: string | null = null;

  // Upload custom thumbnail first if provided
  if (thumbnail) {
    const thumbInitRes = await client.post(`/deliverables/${id}/initiate-upload`, {
      fileName: thumbnail.name,
      fileSize: thumbnail.size,
      mimeType: thumbnail.type,
    });
    const { uploadUrl: thumbUploadUrl, storageKey: thumbKey } = thumbInitRes.data.data;

    await axios.put(thumbUploadUrl, thumbnail, {
      headers: {
        'Content-Type': thumbnail.type,
        'x-ms-blob-type': 'BlockBlob',
      },
    });
    thumbnailStorageKey = thumbKey;
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Step 1: Get SAS URL from backend
    const initRes = await client.post(`/deliverables/${id}/initiate-upload`, {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });
    const { uploadUrl, storageKey } = initRes.data.data;

    // Step 2: Upload directly to Azure (no auth headers needed)
    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type,
        'x-ms-blob-type': 'BlockBlob',
      },
      onUploadProgress: (event) => {
        if (event.total) {
          const fileProgress = Math.round((event.loaded * 100) / event.total);
          const overallProgress = Math.round(((i * 100) + fileProgress) / files.length);
          onProgress?.(overallProgress);
        }
      },
    });

    uploadedFiles.push({
      storageKey,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });
  }

  // Step 3: Tell backend all files are uploaded, start processing
  const response = await client.post(`/deliverables/${id}/finalize-upload`, {
    files: uploadedFiles,
    ...(thumbnailStorageKey && { thumbnailStorageKey }),
  });
  return response.data;
};
