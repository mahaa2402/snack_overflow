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

