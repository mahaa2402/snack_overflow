import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError } from '../utils/customError';
import { verifyToken } from '../utils/jwt';

/**
 * Authentication Middleware:
 * Extracts JWT from either HttpOnly cookie or Authorization Bearer header.
 * Verifies token signature and expiration, attaching decoded user to req.user.
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  let token: string | undefined;

  // 1. Try reading from HttpOnly cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // 2. Fallback to Authorization: Bearer <token> header
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) {
    throw new AppError('Authentication required. Missing token.', 401, 'UNAUTHORIZED');
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Optional Authentication Middleware:
 * If a valid token is present, sets req.user.
 * If missing or invalid, proceeds without throwing so public endpoints can still work.
 */
export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  let token: string | undefined;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (token) {
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
    } catch {
      // Ignore token failure for optional authentication
    }
  }

  next();
};

/**
 * Admin-Only Authorization Middleware:
 * Requires the authenticated user to possess the ADMIN role.
 * Never trusts frontend-supplied role; strictly reads from verified req.user.
 */
export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user) {
    throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
  }

  if (req.user.role !== Role.ADMIN) {
    throw new AppError('Forbidden. Admin privileges required.', 403, 'FORBIDDEN');
  }

  next();
};

/**
 * Generic Role Authorization Middleware
 */
export const requireRoles = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError('Forbidden. Insufficient permissions.', 403, 'FORBIDDEN');
    }

    next();
  };
};
