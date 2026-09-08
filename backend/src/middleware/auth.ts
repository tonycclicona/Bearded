import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../lib/auth.js';

export interface AuthenticatedRequest extends Request {
  user?: Record<string, unknown>;
}

export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    req.user = verifyToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

export function authorize(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = (req.user as { role?: string })?.role;
    if (!req.user || !userRole || !roles.includes(userRole)) {
      res.status(403).json({
        data: null,
        error: {
          code: 'FORBIDDEN',
          message: 'No tienes permiso para realizar esta acción',
          statusCode: 403
        }
      });
      return;
    }
    next();
  };
}
