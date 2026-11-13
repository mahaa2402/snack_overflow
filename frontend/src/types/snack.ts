export type SnackCategory = 'SWEET' | 'SAVOURY' | 'DRINK' | 'HEALTHY_ISH';
export type SnackStatus = 'STOCKED' | 'RUNNING_LOW' | 'GONE';
export type ActivityAction = 'RESTOCKED' | 'CONSUMED';

export interface SnackItem {
  id: string;
  name: string;
  category: SnackCategory;
  quantity: number;
  lowStockThreshold: number;
  status: SnackStatus;
  voteCount: number;
  hasVoted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PantryStats {
  totalSnacks: number;
  totalQuantity: number;
  runningLowCount: number;
  outOfStockCount: number;
  stockedCount: number;
  totalVotes: number;
  totalActivities: number;
}

export interface ActivityItem {
  id: string;
  userId: string;
  snackId: string;
  action: ActivityAction;
  amount: number;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  snack?: {
    id: string;
    name: string;
    category: SnackCategory;
  };
}

export interface MyPantryDashboard {
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
    createdAt: string;
  }>;
}

export interface PaginatedSnacks {
  items: SnackItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateSnackInput {
  name: string;
  category: SnackCategory;
  quantity: number;
  lowStockThreshold: number;
}

export interface UpdateSnackInput {
  name?: string;
  category?: SnackCategory;
  quantity?: number;
  lowStockThreshold?: number;
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

export interface PantryInsights {
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

