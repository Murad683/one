import client from './client';
import type { ApiResponse, PaginatedResponse, User } from '@/types';

export const getClients = async (): Promise<ApiResponse<PaginatedResponse<User>>> => {
  const response = await client.get<ApiResponse<PaginatedResponse<User>>>('/users', {
    params: { role: 'CLIENT', limit: 1000 }, // fetching all clients for the dropdown
  });
  return response.data;
};
