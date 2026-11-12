import React from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useHealthCheck } from '../hooks/useHealthCheck';

export const HomePage: React.FC = () => {
  const { data, isLoading, error, checkHealth } = useHealthCheck();

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
          🍿 Snack <span className="text-orange-600">Overflow</span>
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-lg text-gray-600">
          A scalable, production-ready Full Stack application architecture powered by React, TypeScript, Vite, Tailwind CSS, Express, and Prisma ORM with PostgreSQL.
        </p>
      </div>

      {/* Backend Connection & Health Status Widget */}
      <Card
        title="Backend API Connection"
        subtitle="Live verification of the Express + TypeScript backend health status"
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={checkHealth}
            isLoading={isLoading}
          >
            Refresh Status
          </Button>
        }
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-500">Service Status:</span>
            {isLoading ? (
              <Badge variant="warning">Checking API...</Badge>
            ) : data?.status === 'UP' ? (
              <Badge variant="success">● Connected (UP)</Badge>
            ) : (
              <Badge variant="danger">● Disconnected (DOWN)</Badge>
            )}
          </div>

          <div className="text-xs text-gray-400">
            Endpoint: <code className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded">/api/health</code>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <span className="font-semibold">Connection Error:</span> {error}
            <div className="mt-1 text-xs text-red-600">
              Ensure the backend server is running on port 5000 (<code className="font-mono">npm run dev</code> in the backend folder).
            </div>
          </div>
        )}

        {data && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg text-sm border border-gray-100">
            <div>
              <span className="text-xs text-gray-500 block">Environment</span>
              <span className="font-semibold text-gray-800">{data.environment}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">API Version</span>
              <span className="font-semibold text-gray-800">{data.version}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Server Uptime</span>
              <span className="font-semibold text-gray-800">{Math.round(data.uptime)}s</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Timestamp</span>
              <span className="font-mono text-xs text-gray-700">{new Date(data.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Architecture Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Frontend Architecture" subtitle="React + TypeScript + Vite">
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center space-x-2">
              <span className="text-emerald-500">✓</span>
              <span><strong>TypeScript Strict Mode:</strong> Full type safety without any.</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-emerald-500">✓</span>
              <span><strong>Tailwind CSS:</strong> Utility-first styling with custom palette.</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-emerald-500">✓</span>
              <span><strong>Centralized Axios Client:</strong> BaseURL config, auth & error interceptors.</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-emerald-500">✓</span>
              <span><strong>Reusable Components:</strong> Button, Card, Badge, Header.</span>
            </li>
          </ul>
        </Card>

        <Card title="Backend Architecture" subtitle="Express + TypeScript + Prisma">
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center space-x-2">
              <span className="text-emerald-500">✓</span>
              <span><strong>Layered Architecture:</strong> Controllers, Services, Routes, Middlewares.</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-emerald-500">✓</span>
              <span><strong>Prisma ORM & PostgreSQL:</strong> Scalable relational schema and queries.</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-emerald-500">✓</span>
              <span><strong>Standardized Response Formatter:</strong> Consistent success/error structure.</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-emerald-500">✓</span>
              <span><strong>Testing Suite:</strong> Jest and Supertest for integration tests.</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

