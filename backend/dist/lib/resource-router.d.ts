import { Router } from 'express';
interface ResourceController<T> {
    findMany(filter: unknown): Promise<T[]>;
    findUnique(filter: unknown): Promise<T | null>;
    create?(data: unknown): Promise<T>;
    update?(data: unknown): Promise<T>;
    delete?(data: unknown): Promise<T>;
}
interface ResourceRouterOptions<T, F = unknown> {
    model: ResourceController<T>;
    select: Record<string, boolean>;
    label: string;
    singularLabel: string;
    key: 'id' | 'slug';
    transform?: (item: T) => unknown;
    fallbackData?: F[];
}
export declare function createResourceRouter<T, F = unknown>(options: ResourceRouterOptions<T, F>): Router;
export {};
//# sourceMappingURL=resource-router.d.ts.map