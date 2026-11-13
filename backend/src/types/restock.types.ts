import { SnackCategory, SnackStatus } from './snack.types';

export type UrgencyLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export interface RestockSuggestion {
  snackId: string;
  snackName: string;
  category: SnackCategory;
  currentQuantity: number;
  lowStockThreshold: number;
  status: SnackStatus;
  totalConsumedLast7Days: number;
  avgDailyConsumption: number;
  daysLeft: number;
  suggestedQuantity: number;
  urgency: UrgencyLevel;
  reasoning: string;
}

export interface RestockItemInput {
  snackId: string;
  amount?: number;
}

export interface RestockAllInput {
  items?: RestockItemInput[];
}

export interface RestockAllResult {
  restockedCount: number;
  totalUnitsAdded: number;
  restockedItems: Array<{
    snackId: string;
    snackName: string;
    amount: number;
    newQuantity: number;
  }>;
}

export type AlertSeverity = 'CRITICAL' | 'WARNING';

export interface StockAlert {
  id: string;
  snackId: string;
  snackName: string;
  category: SnackCategory;
  currentQuantity: number;
  lowStockThreshold: number;
  severity: AlertSeverity;
  message: string;
  createdAt: string;
}

