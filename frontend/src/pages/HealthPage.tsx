import React from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useHealthCheck } from '../hooks/useHealthCheck';

export const HealthPage: React.FC = () => {
  const { data, isLoading, error, checkHealth } = useHealthCheck();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Health Monitor</h1>
        <p className="text-sm text-gray-500 mt-1">
          Detailed telemetry and operational status for Snack Overflow API services.
        </p>
      </div>

      <Card
        title="API Health Check Endpoint"
        subtitle="GET /api/health"
        actions={
          <Button size="sm" onClick={checkHealth} isLoading={isLoading}>
            Run Health Check
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-600">Overall Status</span>
            {isLoading ? (
              <Badge variant="warning">Checking...</Badge>
            ) : data?.status === 'UP' ? (
              <Badge variant="success">HEALTHY (UP)</Badge>
            ) : (
              <Badge variant="danger">UNREACHABLE</Badge>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <p className="font-semibold">Health Check Failed</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {data && (
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

