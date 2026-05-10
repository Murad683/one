import client from './client';
import type { ApiResponse, User } from '@/types';

export const loginApi = async (email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> => {
  const response = await client.post<ApiResponse<{ user: User; token: string }>>('/auth/login', {
    email,
    password,
  });
  return response.data;
};

export const getMeApi = async (): Promise<ApiResponse<{ user: User }>> => {
  const response = await client.get<ApiResponse<{ user: User }>>('/auth/me');
  return response.data;
};
