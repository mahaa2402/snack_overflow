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

export { Snack, SnackCategory, ActivityAction, Role };
