export type Role = 'ADMIN' | 'MEMBER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  name: string;
  email: string;
  password: string;
}

export interface AdminDashboardData {
  message: string;
  adminUser: {
    userId: string;
    role: Role;
    email: string;
  };
  stats: {
    totalUsers: number;
    totalSnacks: number;
    totalActivities: number;
  };
}

