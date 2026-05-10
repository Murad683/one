import client from './client';
import type { ApiResponse, PaginatedResponse, TeamMember } from '@/types';

export const getTeamMembers = async (
  page?: number,
  limit?: number
): Promise<ApiResponse<PaginatedResponse<TeamMember>>> => {
  const response = await client.get<ApiResponse<PaginatedResponse<TeamMember>>>('/team', {
    params: { page, limit },
  });
  return response.data;
};

export const getTeamMember = async (id: string): Promise<ApiResponse<TeamMember>> => {
  const response = await client.get<ApiResponse<TeamMember>>(`/team/${id}`);
  return response.data;
};

export const createTeamMember = async (data: Partial<TeamMember>): Promise<ApiResponse<TeamMember>> => {
  const response = await client.post<ApiResponse<TeamMember>>('/team', data);
  return response.data;
};

export const updateTeamMember = async (
  id: string,
  data: Partial<TeamMember>
): Promise<ApiResponse<TeamMember>> => {
  const response = await client.patch<ApiResponse<TeamMember>>(`/team/${id}`, data);
  return response.data;
};

export const deleteTeamMember = async (id: string): Promise<void> => {
  await client.delete(`/team/${id}`);
};
