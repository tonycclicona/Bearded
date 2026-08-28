import { Request, Response, NextFunction } from 'express';
declare module 'express-session' {
    interface SessionData {
        userId: string;
        userRole: string;
    }
}
declare const router: import("express-serve-static-core").Router;
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
export default router;
//# sourceMappingURL=auth.d.ts.map