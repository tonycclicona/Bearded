import { Router } from 'express';
import type { RequestHandler } from 'express';
export interface UploadedFile {
    filename: string;
    originalname?: string;
    mimetype?: string;
}
export type MultiFiles = {
    [fieldname: string]: UploadedFile[];
} | UploadedFile[];
interface CrudModel {
    findMany(args?: unknown): Promise<unknown[]>;
    findUnique(args: unknown): Promise<unknown | null>;
    create(args: unknown): Promise<unknown>;
    update(args: unknown): Promise<unknown>;
    delete(args: unknown): Promise<unknown>;
}
interface CrudRouterOptions {
    model: CrudModel;
    listPath: string;
    viewDir: string;
    toInput: (body: Record<string, unknown>, file?: UploadedFile, files?: MultiFiles) => unknown;
    upload?: RequestHandler | RequestHandler[];
    idType?: 'string' | 'number';
}
export declare function createCrudRouter(options: CrudRouterOptions): Router;
export declare function str(value: unknown): string;
export declare function num(value: unknown): number;
export declare function lineArray(value: unknown): string[];
export declare function bool(value: unknown): boolean;
export declare function imageUrlFrom(value: unknown, file: UploadedFile | undefined): string;
export declare function fileOrFieldUrl(bodyValue: unknown, file: UploadedFile | undefined, files: MultiFiles | undefined, fieldName?: string): string;
export declare function galleryUrlsFrom(bodyUrls: unknown, files: MultiFiles | undefined, fieldName?: string): string[];
export {};
//# sourceMappingURL=crud.d.ts.map