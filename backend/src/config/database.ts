import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const getLogLevels = (): ('query' | 'info' | 'warn' | 'error')[] => {
  if (process.env.NODE_ENV === 'development') {
    return ['error', 'warn'];
  }
  if (process.env.NODE_ENV === 'test') {
    return [];
  }
  return ['error'];
};

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: getLogLevels(),
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
