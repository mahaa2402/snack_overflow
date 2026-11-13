import { Request, Response, NextFunction } from 'express';
import { SnackCategory } from '@prisma/client';
import { restockService } from '../services/restock.service';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/customError';

export class RestockController {
  /**
   * GET /restock/suggestions
   * Returns smart restock suggestions for low-stock and out-of-stock snacks.
   */
  public async getSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let category: SnackCategory | undefined;

      if (req.query.category) {
        const catStr = String(req.query.category).toUpperCase();
        if (!Object.values(SnackCategory).includes(catStr as SnackCategory)) {
          throw new AppError(
            `Invalid category. Allowed values: ${Object.values(SnackCategory).join(', ')}`,
            400,
            'VALIDATION_ERROR'
          );
        }
        category = catStr as SnackCategory;
      }

      const suggestions = await restockService.getRestockSuggestions(category);

      sendSuccess(
        res,
        suggestions,
        'Smart restock suggestions retrieved successfully',
        200
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /restock/all
   * Atomically restocks all or specified snacks with optional quantity overrides.
   */
  public async restockAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user!.userId;
      const result = await restockService.restockAll(adminUserId, req.body);

      sendSuccess(
        res,
        result,
        `Successfully restocked ${result.restockedCount} snack(s) with ${result.totalUnitsAdded} total units.`,
        200
      );
    } catch (error) {
      next(error);
    }
  }
}

export const restockController = new RestockController();
