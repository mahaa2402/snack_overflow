import { useState, useEffect, useCallback } from 'react';
import { getHealthStatus } from '../api/health.api';
import { HealthCheckData } from '../types/api';

export interface UseHealthCheckResult {
  data: HealthCheckData | null;
  isLoading: boolean;
  error: string | null;
  checkHealth: () => Promise<void>;
}

export const useHealthCheck = (): UseHealthCheckResult => {
  const [data, setData] = useState<HealthCheckData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getHealthStatus();
      if (response.data) {
        setData(response.data);
      } else {
        throw new Error('No data received from health check');
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to connect to backend server';
      setError(errorMessage);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return {
    data,
    isLoading,
    error,
    checkHealth,
  };
};

