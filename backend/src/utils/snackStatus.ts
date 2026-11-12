import { Snack, SnackStatus, SnackWithDerivedStatus } from '../types/snack.types';

/**
 * Derives the snack inventory status based on business logic:
 * - quantity = 0 → GONE
 * - quantity > 0 and <= lowStockThreshold → RUNNING_LOW
 * - quantity > lowStockThreshold → STOCKED
 */
export const deriveSnackStatus = (
  quantity: number,
  lowStockThreshold: number = 5
): SnackStatus => {
  if (quantity <= 0) {
    return 'GONE';
  }
  if (quantity <= lowStockThreshold) {
    return 'RUNNING_LOW';
  }
  return 'STOCKED';
};

/**
 * Attaches the derived status property to a Snack model instance.
 */
export const withDerivedStatus = (snack: Snack): SnackWithDerivedStatus => {
  return {
    ...snack,
    status: deriveSnackStatus(snack.quantity, snack.lowStockThreshold),
  };
};

