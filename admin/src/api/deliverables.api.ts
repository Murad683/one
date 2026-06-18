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
  onProgress?: (percent: number) => void
): Promise<ApiResponse<Deliverable>> => {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));

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
