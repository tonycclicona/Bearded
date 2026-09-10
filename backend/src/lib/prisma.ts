import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let _prismaInstance: PrismaClient | null = null;

function createResilientMock(): PrismaClient {
  const mock = new Proxy({} as PrismaClient, {
    get(_target, prop) {
      if (prop === '$connect' || prop === '$disconnect') {
        return async () => {};
      }
      if (prop === '_isMock') return true;
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
  return mock;
}

export function getPrisma(): PrismaClient {
  // Si no hay instancia o la instancia anterior era un mock transitorio, intentar conectar con la base de datos real
  if (!_prismaInstance || (_prismaInstance as any)._isMock) {
    try {
      const client = globalForPrisma.prisma ?? new PrismaClient();
      _prismaInstance = client;
      if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _prismaInstance;
      return _prismaInstance;
    } catch (err) {
      console.warn('[Prisma] Error inicializando PrismaClient (se activan fallbacks locales):', (err as Error).message);
      const mock = createResilientMock();
      _prismaInstance = mock;
      return mock;
    }
  }
  return _prismaInstance;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrisma() as any)[prop];
  }
});