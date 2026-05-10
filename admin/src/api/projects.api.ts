import client from './client';
import type { ApiResponse, PaginatedResponse, Project } from '@/types';

export const getProjects = async (
  page?: number,
  limit?: number,
  category?: string
): Promise<ApiResponse<PaginatedResponse<Project>>> => {
  const response = await client.get<ApiResponse<PaginatedResponse<Project>>>('/projects', {
    params: { page, limit, category },
  });
  return response.data;
};

export const getProject = async (id: string): Promise<ApiResponse<Project>> => {
  const response = await client.get<ApiResponse<Project>>(`/projects/${id}`);
  return response.data;
};

export const createProject = async (data: Partial<Project>): Promise<ApiResponse<Project>> => {
  const response = await client.post<ApiResponse<Project>>('/projects', data);
  return response.data;
};

export const updateProject = async (
  id: string,
  data: Partial<Project>
): Promise<ApiResponse<Project>> => {
  const response = await client.patch<ApiResponse<Project>>(`/projects/${id}`, data);
  return response.data;
};

export const deleteProject = async (id: string): Promise<void> => {
  await client.delete(`/projects/${id}`);
};

export const uploadThumbnail = async (id: string, file: File): Promise<ApiResponse<Project>> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await client.post<ApiResponse<Project>>(`/projects/${id}/thumbnail`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
