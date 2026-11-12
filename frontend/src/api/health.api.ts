import apiClient from './client';
import { ApiResponse, HealthCheckData } from '../types/api';

export const getHealthStatus = async (): Promise<ApiResponse<HealthCheckData>> => {
  const response = await apiClient.get<ApiResponse<HealthCheckData>>('/health');
  return response.data;
};

