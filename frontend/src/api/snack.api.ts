import apiClient from './client';
import { ApiResponse } from '../types/api';
import {
  ActivityItem,
  CreateSnackInput,
  PaginatedSnacks,
  PantryStats,
  SnackItem,
  UpdateSnackInput,
} from '../types/snack';

export interface GetSnacksParams {
  search?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
}

/**
 * Fetch paginated snacks with search and filters
 */
export const getSnacksApi = async (params: GetSnacksParams = {}): Promise<PaginatedSnacks> => {
  const response = await apiClient.get<ApiResponse<PaginatedSnacks>>('/snacks', {
    params,
  });
  if (!response.data.data) {
    throw new Error('Failed to retrieve snacks');
  }
  return response.data.data;
};

/**
 * Fetch pantry inventory summary stats (total snacks, quantity, low stock, out of stock)
 */
export const getPantryStatsApi = async (): Promise<PantryStats> => {
  const response = await apiClient.get<ApiResponse<PantryStats>>('/snacks/stats');
  if (!response.data.data) {
    throw new Error('Failed to retrieve pantry statistics');
  }
  return response.data.data;
};

/**
 * Fetch popular snacks (top voted)
 */
export const getPopularSnacksApi = async (limit: number = 4): Promise<SnackItem[]> => {
  const response = await apiClient.get<ApiResponse<SnackItem[]>>('/snacks/popular', {
    params: { limit },
  });
  return response.data.data || [];
};

/**
 * Fetch Snack of the Week (#1 voted snack)
 */
export const getFeaturedSnackApi = async (): Promise<SnackItem | null> => {
  const response = await apiClient.get<ApiResponse<SnackItem | null>>('/snacks/featured');
  return response.data.data || null;
};

/**
 * Consume a snack item (decrements quantity and logs activity)
 */
export const consumeSnackApi = async (
  snackId: string,
  amount: number = 1
): Promise<{ snack: SnackItem; activity: ActivityItem }> => {
  const response = await apiClient.post<ApiResponse<{ snack: SnackItem; activity: ActivityItem }>>(
    `/snacks/${snackId}/consume`,
    { amount }
  );
  if (!response.data.data) {
    throw new Error('Failed to consume snack');
  }
  return response.data.data;
};

/**
 * Toggle vote for a snack (Vote / Remove Vote)
 */
export const toggleVoteApi = async (
  snackId: string
): Promise<{ hasVoted: boolean; voteCount: number }> => {
  const response = await apiClient.post<ApiResponse<{ hasVoted: boolean; voteCount: number }>>(
    `/snacks/${snackId}/vote`
  );
  if (!response.data.data) {
    throw new Error('Failed to vote for snack');
  }
  return response.data.data;
};

/**
 * Fetch recent pantry activity audit feed
 */
export const getRecentActivitiesApi = async (limit: number = 10): Promise<ActivityItem[]> => {
  const response = await apiClient.get<ApiResponse<ActivityItem[]>>('/snacks/activities', {
    params: { limit },
  });
  return response.data.data || [];
};

/**
 * Admin: Create new snack (POST /snacks)
 */
export const createSnackApi = async (data: CreateSnackInput): Promise<SnackItem> => {
  const response = await apiClient.post<ApiResponse<SnackItem>>('/snacks', data);
  if (!response.data.data) {
    throw new Error('Failed to create snack');
  }
  return response.data.data;
};

/**
 * Admin: Update snack (PATCH /snacks/:id)
 */
export const updateSnackApi = async (
  snackId: string,
  data: UpdateSnackInput
): Promise<SnackItem> => {
  const response = await apiClient.patch<ApiResponse<SnackItem>>(`/snacks/${snackId}`, data);
  if (!response.data.data) {
    throw new Error('Failed to update snack');
  }
  return response.data.data;
};

/**
 * Admin: Delete snack (DELETE /snacks/:id)
 */
export const deleteSnackApi = async (snackId: string): Promise<void> => {
  await apiClient.delete(`/snacks/${snackId}`);
};

/**
 * Admin: Restock snack
 */
export const restockSnackApi = async (
  snackId: string,
  amount: number
): Promise<{ snack: SnackItem; activity: ActivityItem }> => {
  const response = await apiClient.post<ApiResponse<{ snack: SnackItem; activity: ActivityItem }>>(
    `/snacks/${snackId}/restock`,
    { amount }
  );
  if (!response.data.data) {
    throw new Error('Failed to restock snack');
  }
  return response.data.data;
};

