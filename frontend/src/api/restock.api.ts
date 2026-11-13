import apiClient from './client';
import { ApiResponse } from '../types/api';
import {
  RestockAllInput,
  RestockAllResult,
  RestockSuggestionItem,
  StockAlertItem,
} from '../types/restock';

/**
 * Fetch smart restock suggestions (Admin only)
 */
export const getRestockSuggestionsApi = async (
  category?: string
): Promise<RestockSuggestionItem[]> => {
  const params: { category?: string } = {};
  if (category && category !== 'ALL') {
    params.category = category;
  }

  const response = await apiClient.get<ApiResponse<RestockSuggestionItem[]>>(
    '/restock/suggestions',
    { params }
  );

  return response.data.data || [];
};

/**
 * Restock all or selected snacks atomically (Admin only)
 */
export const restockAllApi = async (
  input?: RestockAllInput
): Promise<RestockAllResult> => {
  const response = await apiClient.post<ApiResponse<RestockAllResult>>(
    '/restock/all',
    input || {}
  );

  if (!response.data.data) {
    throw new Error(response.data.message || 'Failed to restock items');
  }

  return response.data.data;
};

/**
 * Fetch live stock alerts (Admin only)
 */
export const getAlertsApi = async (): Promise<StockAlertItem[]> => {
  const response = await apiClient.get<ApiResponse<StockAlertItem[]>>('/alerts');
  return response.data.data || [];
};

