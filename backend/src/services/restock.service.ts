import { ActivityAction, SnackCategory } from '@prisma/client';
import prisma from '../config/database';
import {
  RestockAllInput,
  RestockAllResult,
  RestockSuggestion,
  StockAlert,
  UrgencyLevel,
} from '../types/restock.types';
import { AppError } from '../utils/customError';
import { deriveSnackStatus } from '../utils/snackStatus';
import { alertEmitterService } from './alertEmitter.service';

export class RestockService {
  /**
   * Get smart restock suggestions for running-low and gone snacks.
   * Calculates 7-day average daily consumption, days left, suggested quantities, and urgency.
   */
  public async getRestockSuggestions(category?: SnackCategory): Promise<RestockSuggestion[]> {
    const whereClause: { category?: SnackCategory } = {};
    if (category) {
      whereClause.category = category;
    }

    // 1. Fetch all candidate snacks in the requested category
    const snacks = await prisma.snack.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
    });

    // 2. Fetch all consumption activities in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentConsumptions = await prisma.activity.findMany({
      where: {
        action: ActivityAction.CONSUMED,
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        snackId: true,
        amount: true,
      },
    });

    // Aggregate consumption per snack
    const consumptionMap = new Map<string, number>();
    for (const act of recentConsumptions) {
      const current = consumptionMap.get(act.snackId) || 0;
      consumptionMap.set(act.snackId, current + act.amount);
    }

    const suggestions: RestockSuggestion[] = [];

    for (const snack of snacks) {
      const isGone = snack.quantity === 0;
      const isRunningLow = snack.quantity > 0 && snack.quantity <= snack.lowStockThreshold;

      // Identify running-low and gone snacks
      if (isGone || isRunningLow) {
        const totalConsumed7d = consumptionMap.get(snack.id) || 0;
        const avgDaily = Math.round((totalConsumed7d / 7) * 100) / 100;

        // Calculate days left
        let daysLeft: number;
        if (snack.quantity === 0) {
          daysLeft = 0;
        } else if (avgDaily > 0) {
          daysLeft = Math.round((snack.quantity / avgDaily) * 10) / 10;
        } else {
          // If no recorded consumption this week, estimate based on 1 unit/day default
          daysLeft = Math.min(snack.quantity, 99);
        }

        // Calculate suggested restock quantity to cover a 14-day supply or buffer above threshold
        const targetBuffer = Math.max(
          snack.lowStockThreshold * 2,
          Math.ceil(avgDaily * 14),
          snack.lowStockThreshold + 5
        );
        const suggestedQuantity = Math.max(targetBuffer - snack.quantity, 5);

        // Determine urgency
        let urgency: UrgencyLevel = 'MEDIUM';
        let reasoning = '';

        if (snack.quantity === 0 || daysLeft <= 1) {
          urgency = 'CRITICAL';
          reasoning =
            snack.quantity === 0
              ? `Out of stock (0 units remaining). Restock +${suggestedQuantity} units immediately.`
              : `Only ${snack.quantity} unit(s) left (~${daysLeft} days of supply remaining). Critical restock required.`;
        } else if (snack.quantity <= snack.lowStockThreshold / 2 || daysLeft <= 3) {
          urgency = 'HIGH';
          reasoning = `Stock critically depleted (${snack.quantity} of ${snack.lowStockThreshold} threshold, ~${daysLeft} days remaining at ${avgDaily}/day).`;
        } else {
          urgency = 'MEDIUM';
          reasoning = `Stock below safe threshold (${snack.quantity}/${snack.lowStockThreshold} units). Replenish +${suggestedQuantity} units to avoid stockout.`;
        }

        suggestions.push({
          snackId: snack.id,
          snackName: snack.name,
          category: snack.category,
          currentQuantity: snack.quantity,
          lowStockThreshold: snack.lowStockThreshold,
          status: deriveSnackStatus(snack.quantity, snack.lowStockThreshold),
          totalConsumedLast7Days: totalConsumed7d,
          avgDailyConsumption: avgDaily,
          daysLeft,
          suggestedQuantity,
          urgency,
          reasoning,
        });
      }
    }

    // Sort suggestions by urgency (CRITICAL -> HIGH -> MEDIUM), then by daysLeft ascending, then by name
    const urgencyWeight: Record<UrgencyLevel, number> = {
      CRITICAL: 1,
      HIGH: 2,
      MEDIUM: 3,
    };

    suggestions.sort((a, b) => {
      const urgencyDiff = urgencyWeight[a.urgency] - urgencyWeight[b.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
      return a.snackName.localeCompare(b.snackName);
    });

    return suggestions;
  }

  /**
   * Restock all or selected snacks atomically.
   * Updates quantities and inserts Activity records in a single database transaction.
   */
  public async restockAll(adminUserId: string, input?: RestockAllInput): Promise<RestockAllResult> {
    let itemsToRestock: Array<{ snackId: string; amount: number }>;

    if (input?.items && input.items.length > 0) {
      // Validate provided items
      for (const item of input.items) {
        if (!item.snackId || typeof item.snackId !== 'string') {
          throw new AppError('Invalid snackId provided in restock list', 400, 'VALIDATION_ERROR');
        }
        if (item.amount !== undefined) {
          if (typeof item.amount !== 'number' || item.amount <= 0 || !Number.isInteger(item.amount)) {
            throw new AppError(
              `Restock amount for snack ${item.snackId} must be a positive integer (> 0)`,
              400,
              'VALIDATION_ERROR'
            );
          }
        }
      }

      // If specific items provided with optional overrides
      const defaultSuggestions = await this.getRestockSuggestions();
      const suggestionMap = new Map<string, number>(
        defaultSuggestions.map((s) => [s.snackId, s.suggestedQuantity])
      );

      itemsToRestock = input.items.map((i) => ({
        snackId: i.snackId,
        amount: i.amount || suggestionMap.get(i.snackId) || 10,
      }));
    } else {
      // Automatically restock all running-low & gone snacks using their calculated suggestions
      const suggestions = await this.getRestockSuggestions();
      itemsToRestock = suggestions.map((s) => ({
        snackId: s.snackId,
        amount: s.suggestedQuantity,
      }));
    }

    if (itemsToRestock.length === 0) {
      return {
        restockedCount: 0,
        totalUnitsAdded: 0,
        restockedItems: [],
      };
    }

    // Verify all snacks exist before running transaction
    const snackIds = itemsToRestock.map((i) => i.snackId);
    const existingSnacks = await prisma.snack.findMany({
      where: { id: { in: snackIds } },
    });

    if (existingSnacks.length !== snackIds.length) {
      throw new AppError('One or more snack IDs to restock do not exist', 404, 'NOT_FOUND');
    }

    const snackMap = new Map(existingSnacks.map((s) => [s.id, s]));

    // Execute atomic batch update and activity logging in a single database transaction
    const result = await prisma.$transaction(async (tx) => {
      const restockedItems: Array<{
        snackId: string;
        snackName: string;
        amount: number;
        newQuantity: number;
      }> = [];

      let totalUnits = 0;

      for (const item of itemsToRestock) {
        const snack = snackMap.get(item.snackId)!;

        // 1. Update snack quantity
        const updatedSnack = await tx.snack.update({
          where: { id: item.snackId },
          data: {
            quantity: { increment: item.amount },
          },
        });

        // 2. Insert audit Activity record
        await tx.activity.create({
          data: {
            userId: adminUserId,
            snackId: item.snackId,
            action: ActivityAction.RESTOCKED,
            amount: item.amount,
          },
        });

        totalUnits += item.amount;
        restockedItems.push({
          snackId: item.snackId,
          snackName: snack.name,
          amount: item.amount,
          newQuantity: updatedSnack.quantity,
        });
      }

      return {
        restockedCount: restockedItems.length,
        totalUnitsAdded: totalUnits,
        restockedItems,
      };
    });

    // Notify connected admin SSE clients that inventory was replenished
    alertEmitterService.broadcastRefresh();

    return result;
  }

  /**
   * Derive live stock alerts for all running-low and gone snacks.
   */
  public async getLiveAlerts(): Promise<StockAlert[]> {
    const snacks = await prisma.snack.findMany({
      orderBy: [{ quantity: 'asc' }, { name: 'asc' }],
    });

    const alerts: StockAlert[] = [];

    for (const snack of snacks) {
      if (snack.quantity === 0) {
        alerts.push({
          id: `alert-${snack.id}`,
          snackId: snack.id,
          snackName: snack.name,
          category: snack.category,
          currentQuantity: 0,
          lowStockThreshold: snack.lowStockThreshold,
          severity: 'CRITICAL',
          message: `${snack.name} is completely out of stock! Immediate restock required.`,
          createdAt: snack.updatedAt.toISOString(),
        });
      } else if (snack.quantity <= snack.lowStockThreshold) {
        alerts.push({
          id: `alert-${snack.id}`,
          snackId: snack.id,
          snackName: snack.name,
          category: snack.category,
          currentQuantity: snack.quantity,
          lowStockThreshold: snack.lowStockThreshold,
          severity: 'WARNING',
          message: `${snack.name} is running low (${snack.quantity}/${snack.lowStockThreshold} units remaining).`,
          createdAt: snack.updatedAt.toISOString(),
        });
      }
    }

    return alerts;
  }
}

export const restockService = new RestockService();

