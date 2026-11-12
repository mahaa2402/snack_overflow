import prisma from '../config/database';
import { config } from '../config/env';
import { HealthCheckResult } from '../types/api.types';

export class HealthService {
  public async getHealth(): Promise<HealthCheckResult> {
    const healthResult: HealthCheckResult = {
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      version: '1.0.0',
    };

    // Check database connectivity if configured
    if (config.databaseUrl) {
      const startTime = Date.now();
      try {
        await prisma.$queryRaw`SELECT 1`;
        healthResult.database = {
          status: 'CONNECTED',
          responseTimeMs: Date.now() - startTime,
        };
      } catch {
        // If DB is offline, the API service is still up, but database reports DISCONNECTED
        healthResult.database = {
          status: 'DISCONNECTED',
        };
      }
    } else {
      healthResult.database = {
        status: 'UNKNOWN',
      };
    }

    return healthResult;
  }
}

export const healthService = new HealthService();

