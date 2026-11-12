import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../utils/customError';
import { sendError } from '../utils/apiResponse';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // If it's a known operational AppError
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.code, err.details);
    return;
  }

  // Handle JSON parse error (e.g., malformed body)
  if ('type' in err && (err as { type: string }).type === 'entity.parse.failed') {
    sendError(res, 'Malformed JSON payload in request body', 400, 'BAD_REQUEST');
    return;
  }

  // Check if it's a Prisma known request error (e.g. Unique constraint violation)
  if ('code' in err && typeof (err as { code: unknown }).code === 'string') {
    const prismaCode = (err as { code: string }).code;
    if (prismaCode === 'P2002') {
      sendError(res, 'A unique constraint was violated', 409, 'CONFLICT', {
        prismaCode,
      });
      return;
    }
  }

  // Fallback for unexpected internal errors
  if (process.env.NODE_ENV !== 'test') {
    console.error('Unhandled Error:', err);
  }

  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected internal server error occurred'
      : err.message || 'Internal Server Error';

  sendError(
    res,
    message,
    500,
    'INTERNAL_SERVER_ERROR',
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : undefined
  );
};

