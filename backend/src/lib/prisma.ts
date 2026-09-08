import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let _prismaInstance: PrismaClient | null = null;

function createResilientMock(): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get(_target, prop) {
      if (prop === '$connect' || prop === '$disconnect') {
        return async () => {};
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

export function getPrisma(): PrismaClient {
  if (!_prismaInstance) {
    try {
      _prismaInstance = globalForPrisma.prisma ?? new PrismaClient();
      if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _prismaInstance;
    } catch (err) {
      console.warn('[Prisma] Error inicializando PrismaClient (se activan fallbacks locales):', (err as Error).message);
      _prismaInstance = createResilientMock();
    }
  }
  return _prismaInstance;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrisma() as any)[prop];
  }
});