import { SnackCategory } from '@prisma/client';
import { AppError } from '../utils/customError';

export interface ValidatedCreateSnack {
  name: string;
  category: SnackCategory;
  quantity: number;
  lowStockThreshold: number;
}

export interface ValidatedUpdateSnack {
  name?: string;
  category?: SnackCategory;
  quantity?: number;
  lowStockThreshold?: number;
}

export interface ValidatedSnackQuery {
  search?: string;
  category?: SnackCategory;
  status?: 'STOCKED' | 'RUNNING_LOW' | 'GONE';
  page: number;
  limit: number;
  sortBy?: 'name' | 'votes' | 'quantity' | 'createdAt';
}

const VALID_CATEGORIES = Object.values(SnackCategory);
const VALID_STATUSES = ['STOCKED', 'RUNNING_LOW', 'GONE'];

/**
 * Validates request payload for creating a snack (POST /snacks)
 */
export const validateCreateSnack = (body: unknown): ValidatedCreateSnack => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Request body must be a JSON object', 400, 'VALIDATION_ERROR');
  }

  const payload = body as Record<string, unknown>;

  // 1. Validate name
  if (
    payload.name === undefined ||
    typeof payload.name !== 'string' ||
    payload.name.trim().length < 2
  ) {
    throw new AppError(
      'Snack name is required and must be at least 2 characters long',
      400,
      'VALIDATION_ERROR'
    );
  }

  // 2. Validate category
  if (!payload.category || typeof payload.category !== 'string') {
    throw new AppError(
      `Category is required. Allowed values: ${VALID_CATEGORIES.join(', ')}`,
      400,
      'VALIDATION_ERROR'
    );
  }

  const category = payload.category.trim().toUpperCase() as SnackCategory;
  if (!VALID_CATEGORIES.includes(category)) {
    throw new AppError(
      `Invalid category "${payload.category}". Allowed values: ${VALID_CATEGORIES.join(', ')}`,
      400,
      'VALIDATION_ERROR'
    );
  }

  // 3. Validate quantity
  let quantity = 0;
  if (payload.quantity !== undefined && payload.quantity !== null) {
    const parsedQty = Number(payload.quantity);
    if (isNaN(parsedQty) || !Number.isInteger(parsedQty) || parsedQty < 0) {
      throw new AppError('Quantity must be a non-negative integer (>= 0)', 400, 'VALIDATION_ERROR');
    }
    quantity = parsedQty;
  }

  // 4. Validate threshold (accepts either lowStockThreshold or threshold)
  let lowStockThreshold = 5;
  const rawThreshold = payload.lowStockThreshold ?? payload.threshold;
  if (rawThreshold !== undefined && rawThreshold !== null) {
    const parsedThreshold = Number(rawThreshold);
    if (isNaN(parsedThreshold) || !Number.isInteger(parsedThreshold) || parsedThreshold < 0) {
      throw new AppError(
        'Threshold must be a non-negative integer (>= 0)',
        400,
        'VALIDATION_ERROR'
      );
    }
    lowStockThreshold = parsedThreshold;
  }

  return {
    name: payload.name.trim(),
    category,
    quantity,
    lowStockThreshold,
  };
};

/**
 * Validates request payload for updating a snack (PATCH /snacks/:id)
 */
export const validateUpdateSnack = (body: unknown): ValidatedUpdateSnack => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Request body must be a JSON object', 400, 'VALIDATION_ERROR');
  }

  const payload = body as Record<string, unknown>;
  const result: ValidatedUpdateSnack = {};
  let fieldsCount = 0;

  // Name
  if (payload.name !== undefined) {
    if (typeof payload.name !== 'string' || payload.name.trim().length < 2) {
      throw new AppError('Name must be at least 2 characters long', 400, 'VALIDATION_ERROR');
    }
    result.name = payload.name.trim();
    fieldsCount++;
  }

  // Category
  if (payload.category !== undefined) {
    if (typeof payload.category !== 'string') {
      throw new AppError(
        `Invalid category. Allowed values: ${VALID_CATEGORIES.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }
    const cat = payload.category.trim().toUpperCase() as SnackCategory;
    if (!VALID_CATEGORIES.includes(cat)) {
      throw new AppError(
        `Invalid category "${payload.category}". Allowed values: ${VALID_CATEGORIES.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }
    result.category = cat;
    fieldsCount++;
  }

  // Quantity
  if (payload.quantity !== undefined && payload.quantity !== null) {
    const parsedQty = Number(payload.quantity);
    if (isNaN(parsedQty) || !Number.isInteger(parsedQty) || parsedQty < 0) {
      throw new AppError('Quantity must be a non-negative integer (>= 0)', 400, 'VALIDATION_ERROR');
    }
    result.quantity = parsedQty;
    fieldsCount++;
  }

  // Threshold (lowStockThreshold or threshold)
  const rawThreshold = payload.lowStockThreshold ?? payload.threshold;
  if (rawThreshold !== undefined && rawThreshold !== null) {
    const parsedThreshold = Number(rawThreshold);
    if (isNaN(parsedThreshold) || !Number.isInteger(parsedThreshold) || parsedThreshold < 0) {
      throw new AppError(
        'Threshold must be a non-negative integer (>= 0)',
        400,
        'VALIDATION_ERROR'
      );
    }
    result.lowStockThreshold = parsedThreshold;
    fieldsCount++;
  }

  if (fieldsCount === 0) {
    throw new AppError(
      'At least one valid field (name, category, quantity, threshold) must be provided for update',
      400,
      'VALIDATION_ERROR'
    );
  }

  return result;
};

/**
 * Validates query parameters for listing snacks (GET /snacks)
 */
export const validateSnackQuery = (query: Record<string, unknown>): ValidatedSnackQuery => {
  const page = query.page ? Number(query.page) : 1;
  if (isNaN(page) || !Number.isInteger(page) || page < 1) {
    throw new AppError('Page must be a positive integer >= 1', 400, 'VALIDATION_ERROR');
  }

  const limit = query.limit ? Number(query.limit) : 12;
  if (isNaN(limit) || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError('Limit must be an integer between 1 and 100', 400, 'VALIDATION_ERROR');
  }

  let category: SnackCategory | undefined;
  if (query.category && typeof query.category === 'string' && query.category.trim() !== 'ALL') {
    const upperCat = query.category.trim().toUpperCase() as SnackCategory;
    if (!VALID_CATEGORIES.includes(upperCat)) {
      throw new AppError(
        `Invalid category filter. Allowed: ALL, ${VALID_CATEGORIES.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }
    category = upperCat;
  }

  let status: 'STOCKED' | 'RUNNING_LOW' | 'GONE' | undefined;
  if (query.status && typeof query.status === 'string' && query.status.trim() !== 'ALL') {
    const upperStatus = query.status.trim().toUpperCase();
    if (!VALID_STATUSES.includes(upperStatus)) {
      throw new AppError(
        `Invalid status filter. Allowed: ALL, ${VALID_STATUSES.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }
    status = upperStatus as 'STOCKED' | 'RUNNING_LOW' | 'GONE';
  }

  let sortBy: 'name' | 'votes' | 'quantity' | 'createdAt' | undefined;
  if (query.sortBy && typeof query.sortBy === 'string') {
    const validSorts = ['name', 'votes', 'quantity', 'createdAt'];
    if (validSorts.includes(query.sortBy)) {
      sortBy = query.sortBy as 'name' | 'votes' | 'quantity' | 'createdAt';
    }
  }

  const search =
    typeof query.search === 'string' && query.search.trim().length > 0
      ? query.search.trim()
      : undefined;

  return {
    search,
    category,
    status,
    page,
    limit,
    sortBy,
  };
};

