import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let _prismaInstance: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!_prismaInstance) {
    _prismaInstance = globalForPrisma.prisma ?? new PrismaClient();
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _prismaInstance;
  }
  return _prismaInstance;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrisma() as any)[prop];
  }
});