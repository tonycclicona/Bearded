import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      data: null,
      error: {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode
      }
    });
  }

  const statusCode = (err as any).status || (err as any).statusCode || 500;
  return res.status(statusCode).json({
    data: null,
    error: {
      code: (err as any).code || 'INTERNAL_ERROR',
      message: err.message || 'Error interno del servidor',
      statusCode
    }
  });
}