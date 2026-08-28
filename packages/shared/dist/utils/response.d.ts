export declare class AppResponse<T> {
    data: T | null;
    error: {
        code: string;
        message: string;
        statusCode: number;
    } | null;
    meta: Record<string, unknown> | null;
    constructor(data: T | null, error?: {
        code: string;
        message: string;
        statusCode: number;
    } | null, meta?: Record<string, unknown> | null);
    static success<T>(data: T, meta?: Record<string, unknown> | null): AppResponse<T>;
    static fail(code: string, message: string, statusCode?: number, meta?: Record<string, unknown> | null): AppResponse<null>;
}
//# sourceMappingURL=response.d.ts.map