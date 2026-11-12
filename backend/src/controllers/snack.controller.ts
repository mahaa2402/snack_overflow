import { Request, Response, NextFunction } from 'express';
import { snackService } from '../services/snack.service';
import { sendSuccess } from '../utils/apiResponse';
import {
  validateCreateSnack,
  validateSnackQuery,
  validateUpdateSnack,
} from '../validators/snack.validator';
import { AppError } from '../utils/customError';

export class SnackController {
  /**
   * GET /snacks
   * Supports server-side search, category filter, status filter, and pagination
   */
  public getSnacks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedQuery = validateSnackQuery(req.query);
      const result = await snackService.getAllSnacks(validatedQuery, req.user?.userId);
      sendSuccess(res, result, 'Snacks retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /snacks/:id
   * Retrieves single snack with vote count and derived status
   */
  public getSnackById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id || typeof id !== 'string') {
        throw new AppError('Snack ID is required', 400, 'VALIDATION_ERROR');
      }

      const snack = await snackService.getSnackById(id, req.user?.userId);
      sendSuccess(res, snack, 'Snack details retrieved', 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /snacks
   * Admin only: Create a new snack item
   */
  public createSnack = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = validateCreateSnack(req.body);
      const newSnack = await snackService.createSnack(validated, req.user?.userId);
      sendSuccess(res, newSnack, 'Snack created successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /snacks/:id (and PUT /snacks/:id)
   * Admin only: Update snack metadata
   */
  public updateSnack = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id || typeof id !== 'string') {
        throw new AppError('Snack ID is required', 400, 'VALIDATION_ERROR');
      }

      const validated = validateUpdateSnack(req.body);
      const updated = await snackService.updateSnack(id, validated);
      sendSuccess(res, updated, 'Snack updated successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /snacks/:id
   * Admin only: Safely delete a snack and its related activities & votes
   */
  public deleteSnack = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id || typeof id !== 'string') {
        throw new AppError('Snack ID is required', 400, 'VALIDATION_ERROR');
      }

      await snackService.deleteSnack(id);
      sendSuccess(res, null, 'Snack deleted successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /snacks/:id/restock
   * Admin only: Restock snack quantity
   */
  public restockSnack = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const amount = Number(req.body.amount);
      if (isNaN(amount) || !Number.isInteger(amount) || amount <= 0) {
        throw new AppError('Restock amount must be a positive integer', 400, 'VALIDATION_ERROR');
      }

      const result = await snackService.restockSnack(id, req.user!.userId, amount);
      sendSuccess(res, result, `Snack restocked with ${amount} units`, 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /snacks/:id/consume
   * Member/Admin action: Grab a snack unit
   */
  public consumeSnack = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const amount = req.body.amount !== undefined ? Number(req.body.amount) : 1;
      if (isNaN(amount) || !Number.isInteger(amount) || amount <= 0) {
        throw new AppError('Amount must be a positive integer', 400, 'VALIDATION_ERROR');
      }

      const result = await snackService.consumeSnack(id, req.user!.userId, amount);
      sendSuccess(res, result, 'Snack consumed successfully! Enjoy your snack.', 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /snacks/:id/vote
   * Member/Admin action: Toggle vote
   */
  public toggleVote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await snackService.toggleVote(id, req.user!.userId);
      const message = result.hasVoted
        ? 'Vote recorded! Thank you for voting.'
        : 'Vote removed successfully.';
      sendSuccess(res, result, message, 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /snacks/stats
   */
  public getPantryStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await snackService.getPantryStats();
      sendSuccess(res, stats, 'Pantry inventory statistics retrieved', 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /snacks/popular
   */
  public getPopularSnacks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 4;
      const popular = await snackService.getPopularSnacks(limit, req.user?.userId);
      sendSuccess(res, popular, 'Popular snacks retrieved', 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /snacks/featured
   */
  public getFeaturedSnack = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const featured = await snackService.getFeaturedSnack(req.user?.userId);
      sendSuccess(res, featured, 'Snack of the week retrieved', 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /snacks/activities
   */
  public getActivities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const activities = await snackService.getRecentActivities(limit);
      sendSuccess(res, activities, 'Recent activities retrieved', 200);
    } catch (error) {
      next(error);
    }
  };
}

export const snackController = new SnackController();
