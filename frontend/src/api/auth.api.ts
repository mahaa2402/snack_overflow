import apiClient from './client';
import { ApiResponse } from '../types/api';
import {
  AuthResponse,
  LoginCredentials,
  SignupCredentials,
  User,
  AdminDashboardData,
} from '../types/auth';

/**
 * Login user
 */
export const loginApi = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
  if (!response.data.data) {
    throw new Error('Failed to retrieve authentication data from server');
  }
  return response.data.data;
};

/**
 * Register new member
 */
export const signupApi = async (credentials: SignupCredentials): Promise<AuthResponse> => {
  const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/signup', credentials);
  if (!response.data.data) {
    throw new Error('Failed to retrieve registration data from server');
  }
  return response.data.data;
};

/**
 * Logout user (clears HttpOnly cookie on backend)
 */
export const logoutApi = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
};

/**
 * Fetch current authenticated user's profile
 */
export const getMeApi = async (): Promise<User> => {
  const response = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
  if (!response.data.data?.user) {
    throw new Error('User profile not found in response');
  }
  return response.data.data.user;
};

/**
 * Fetch Admin Dashboard data (Admin-only)
 */
export const getAdminDashboardApi = async (): Promise<AdminDashboardData> => {
  const response = await apiClient.get<ApiResponse<AdminDashboardData>>('/admin/dashboard');
  if (!response.data.data) {
    throw new Error('Failed to load admin dashboard data');
  }
  return response.data.data;
};

/**
 * Fetch all registered users (Admin-only)
 */
export const getAdminUsersApi = async (): Promise<User[]> => {
  const response = await apiClient.get<ApiResponse<{ users: User[] }>>('/admin/users');
  return response.data.data?.users || [];
};

