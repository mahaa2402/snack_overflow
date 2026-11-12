import { Response } from 'express';
import { ApiResponse } from '../types/api.types';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200
): Response => {
  const responseBody: ApiResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(responseBody);
};

export const sendError = (
  res: Response,
  message: string = 'An error occurred',
  statusCode: number = 500,
  code: string = 'INTERNAL_ERROR',
  details?: unknown
): Response => {
  const responseBody: ApiResponse = {
    success: false,
    message,
    error: {
      code,
      ...(details !== undefined ? { details } : {}),
    },
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(responseBody);
};

