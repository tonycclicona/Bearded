import { PrismaClient } from '@prisma/client';
const globalForPrisma = globalThis;
let _prismaInstance = null;
export function getPrisma() {
    if (!_prismaInstance) {
        _prismaInstance = globalForPrisma.prisma ?? new PrismaClient();
        if (process.env.NODE_ENV !== 'production')
            globalForPrisma.prisma = _prismaInstance;
    }
    return _prismaInstance;
}
export const prisma = new Proxy({}, {
    get(_target, prop) {
        return getPrisma()[prop];
    }
});
//# sourceMappingURL=prisma.js.map