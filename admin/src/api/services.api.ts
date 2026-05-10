import client from './client';
import type { ApiResponse, PaginatedResponse, Service } from '@/types';

export const getServices = async (
  page?: number,
  limit?: number
): Promise<ApiResponse<PaginatedResponse<Service>>> => {
  const response = await client.get<ApiResponse<PaginatedResponse<Service>>>('/services', {
    params: { page, limit },
  });
  return response.data;
};

export const getService = async (id: string): Promise<ApiResponse<Service>> => {
  const response = await client.get<ApiResponse<Service>>(`/services/${id}`);
  return response.data;
};

export const createService = async (data: Partial<Service>): Promise<ApiResponse<Service>> => {
  const response = await client.post<ApiResponse<Service>>('/services', data);
  return response.data;
};

export const updateService = async (
  id: string,
  data: Partial<Service>
): Promise<ApiResponse<Service>> => {
  const response = await client.patch<ApiResponse<Service>>(`/services/${id}`, data);
  return response.data;
};

export const deleteService = async (id: string): Promise<void> => {
  await client.delete(`/services/${id}`);
};
