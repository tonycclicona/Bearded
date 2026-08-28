import { Request, Response, NextFunction } from 'express';
import { AppError } from '@antigravity/shared/utils/errors';

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

  return res.status(500).json({
    data: null,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
      statusCode: 500
    }
  });
}