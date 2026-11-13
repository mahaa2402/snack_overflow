import { Snack, SnackCategory, ActivityAction, Role } from '@prisma/client';

export type SnackStatus = 'GONE' | 'RUNNING_LOW' | 'STOCKED';

export interface SnackWithDerivedStatus extends Snack {
  status: SnackStatus;
}

export interface SnackItemDto extends SnackWithDerivedStatus {
  voteCount: number;
  hasVoted?: boolean;
}

export interface CreateSnackDto {
  name: string;
  category: SnackCategory;
  quantity?: number;
  lowStockThreshold?: number;
}

export interface UpdateSnackDto {
  name?: string;
  category?: SnackCategory;
  quantity?: number;
  lowStockThreshold?: number;
}

export interface RestockSnackDto {
  amount: number;
}

export interface ConsumeSnackDto {
  amount?: number;
}

export interface PantryStatsDto {
  totalSnacks: number;
  totalQuantity: number;
  runningLowCount: number;
  outOfStockCount: number;
  stockedCount: number;
  totalVotes: number;
  totalActivities: number;
}

export interface SnackQueryOptions {
  search?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'votes' | 'quantity' | 'createdAt';
  userId?: string;
}

export interface PaginatedSnacksResult {
  items: SnackItemDto[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface RestockSuggestionItem {
  snackId: string;
  snackName: string;
  category: SnackCategory;
  currentQuantity: number;
  lowStockThreshold: number;
  status: SnackStatus;
  weeklyConsumptionRate: number;
  suggestedRestockAmount: number;
  urgency: 'CRITICAL' | 'URGENT' | 'PREVENTATIVE';
  reasoning: string;
}

export interface PantryInsightsDto {
  kpis: {
    mostConsumedSnack: {
      id: string;
      name: string;
      category: SnackCategory;
      totalConsumed: number;
      currentStock: number;
      status: SnackStatus;
    } | null;
    mostVotedSnack: {
      id: string;
      name: string;
      category: SnackCategory;
      voteCount: number;
      currentStock: number;
      status: SnackStatus;
    } | null;
    totalConsumedThisWeek: number;
    totalConsumedLastWeek: number;
    weeklyConsumptionGrowth: number;
    totalRestockedThisWeek: number;
    totalAllTimeConsumed: number;
  };
  consumptionTrends: {
    daily: Array<{
      date: string;
      dayLabel: string;
      fullDate: string;
      consumed: number;
      restocked: number;
    }>;
    weekly: Array<{
      weekLabel: string;
      rangeLabel: string;
      consumed: number;
      restocked: number;
    }>;
    monthly: Array<{
      monthLabel: string;
      year: number;
      consumed: number;
      restocked: number;
    }>;
  };
  categoryBreakdown: Array<{
    category: SnackCategory;
    label: string;
    totalConsumed: number;
    percentage: number;
    snackCount: number;
    currentStock: number;
  }>;
  topConsumedSnacks: Array<{
    id: string;
    name: string;
    category: SnackCategory;
    totalConsumed: number;
    currentStock: number;
    lowStockThreshold: number;
    status: SnackStatus;
    voteCount: number;
    burnRatePerDay: number;
  }>;
  restockSuggestions: RestockSuggestionItem[];
}

export interface MyPantryDashboardDto {
  overview: {
    totalConsumed: number;
    favouriteSnack: {
      id: string;
      name: string;
      category: SnackCategory;
      amount: number;
    } | null;
    totalVotes: number;
    activeDays: number;
  };
  favouriteSnacks: Array<{
    id: string;
    name: string;
    category: SnackCategory;
    amount: number;
  }>;
  weeklyConsumption: Array<{
    date: string;
    label: string;
    amount: number;
  }>;
  monthlyConsumption: Array<{
    month: string;
    label: string;
    amount: number;
  }>;
  monthlyRecap: {
    consumed: number;
    previousMonthConsumed: number;
    changePercent: number | null;
    activeDays: number;
    favouriteSnack: {
      id: string;
      name: string;
      category: SnackCategory;
      amount: number;
    } | null;
  };
  timeline: Array<{
    id: string;
    type: 'CONSUMED' | 'VOTED';
    snackId: string;
    snackName: string;
    category: SnackCategory;
    amount: number;
    createdAt: Date;
  }>;
}

export { Snack, SnackCategory, ActivityAction, Role };
