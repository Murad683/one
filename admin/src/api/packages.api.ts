import client from './client';
import type { ApiResponse, PaginatedResponse, Package } from '@/types';

export const getPackages = async (
  page?: number,
  limit?: number
): Promise<ApiResponse<PaginatedResponse<Package>>> => {
  const response = await client.get<ApiResponse<PaginatedResponse<Package>>>('/packages', {
    params: { page, limit },
  });
  return response.data;
};

export const getPackage = async (id: string): Promise<ApiResponse<Package>> => {
  const response = await client.get<ApiResponse<Package>>(`/packages/${id}`);
  return response.data;
};

export const createPackage = async (data: Partial<Package>): Promise<ApiResponse<Package>> => {
  const response = await client.post<ApiResponse<Package>>('/packages', data);
  return response.data;
};

export const updatePackage = async (
  id: string,
  data: Partial<Package>
): Promise<ApiResponse<Package>> => {
  const response = await client.patch<ApiResponse<Package>>(`/packages/${id}`, data);
  return response.data;
};

export const deletePackage = async (id: string): Promise<void> => {
  await client.delete(`/packages/${id}`);
};
