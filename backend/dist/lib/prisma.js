import { PrismaClient } from '@prisma/client';
const globalForPrisma = globalThis;
let _prismaInstance = null;
function createResilientMock() {
    return new Proxy({}, {
        get(_target, prop) {
            if (prop === '$connect' || prop === '$disconnect') {
                return async () => { };
            }
            return new Proxy({}, {
                get(_subTarget, method) {
                    return async () => {
                        console.warn(`[Prisma Fallback] ${String(prop)}.${String(method)} invocado sin conexión a base de datos.`);
                        return null;
                    };
                }
            });
        }
    });
}
export function getPrisma() {
    if (!_prismaInstance) {
        try {
            _prismaInstance = globalForPrisma.prisma ?? new PrismaClient();
            if (process.env.NODE_ENV !== 'production')
                globalForPrisma.prisma = _prismaInstance;
        }
        catch (err) {
            console.warn('[Prisma] Error inicializando PrismaClient (se activan fallbacks locales):', err.message);
            _prismaInstance = createResilientMock();
        }
    }
    return _prismaInstance;
}
export const prisma = new Proxy({}, {
    get(_target, prop) {
        return getPrisma()[prop];
    }
});
//# sourceMappingURL=prisma.js.map