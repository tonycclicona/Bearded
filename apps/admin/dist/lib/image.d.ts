import type { Request, Response, NextFunction } from 'express';
export declare const MAX_WIDTH = 1200;
export declare const WEBP_QUALITY = 80;
export declare function optimizeToWebp(filename: string): Promise<string>;
export declare function processImageMiddleware(req: Request, _res: Response, next: NextFunction): void;
export declare function processImagesMiddleware(req: Request, _res: Response, next: NextFunction): void;
//# sourceMappingURL=image.d.ts.map