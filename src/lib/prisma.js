/**
 * Cliente Prisma único por processo — em desenvolvimento o Next recarrega os
 * módulos a cada alteração, e sem o cache global cada recarga abriria um novo
 * pool de conexões com o PostgreSQL.
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__coralPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__coralPrisma = prisma;
}
