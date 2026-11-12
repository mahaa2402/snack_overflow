import { Snack, SnackCategory, ActivityAction, Role } from '@prisma/client';

export type SnackStatus = 'GONE' | 'RUNNING_LOW' | 'STOCKED';

export interface SnackWithDerivedStatus extends Snack {
  status: SnackStatus;
}

export { Snack, SnackCategory, ActivityAction, Role };

