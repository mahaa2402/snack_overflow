export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code?: string;
    details?: unknown;
  };
  timestamp: string;
}

export interface HealthCheckData {
  status: 'UP' | 'DOWN';
  uptime: number;
  timestamp: string;
  environment: string;
  version: string;
}

