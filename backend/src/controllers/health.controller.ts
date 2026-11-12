import { Request, Response, NextFunction } from 'express';
import { healthService } from '../services/health.service';
import { sendSuccess } from '../utils/apiResponse';

export class HealthController {
  public getHealth = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const healthData = await healthService.getHealth();
      sendSuccess(res, healthData, 'Snack Overflow Backend API is healthy', 200);
    } catch (error) {
      next(error);
    }
  };
}

export const healthController = new HealthController();

