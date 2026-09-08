import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request {
    user?: Record<string, unknown>;
}
export declare function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void;
export declare function authorize(roles: string[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map