import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';
import { JwtUserPayload } from '../types/auth.types';
import { AppError } from './customError';

export const generateToken = (payload: JwtUserPayload): string => {
  const options: SignOptions = {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  };

  return jwt.sign(payload, config.jwtSecret, options);
};

export const verifyToken = (token: string): JwtUserPayload => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtUserPayload;
    if (!decoded.userId || !decoded.role || !decoded.email) {
      throw new AppError('Invalid token payload', 401, 'INVALID_TOKEN');
    }
    return decoded;
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Authentication token has expired', 401, 'TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid authentication token', 401, 'INVALID_TOKEN');
    }
    throw error;
  }
};

