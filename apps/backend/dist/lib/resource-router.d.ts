import { Router } from 'express';
interface ResourceController<T> {
    findMany(filter: unknown): Promise<T[]>;
    findUnique(filter: unknown): Promise<T | null>;
}
interface ResourceRouterOptions<T> {
    model: ResourceController<T>;
    select: Record<string, boolean>;
    label: string;
    singularLabel: string;
    key: 'id' | 'slug';
    transform?: (item: T) => unknown;
}
export declare function createResourceRouter<T>(options: ResourceRouterOptions<T>): Router;
export {};
//# sourceMappingURL=resource-router.d.ts.map