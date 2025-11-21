import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma 7 configuration
// Note: Prisma 7 reads DATABASE_URL from prisma.config.ts automatically
// The connection is managed via prisma.config.ts which imports dotenv/config
const createPrismaClient = () => {
  // During build time, DATABASE_URL might not be available
  // Prisma will use the connection from prisma.config.ts at runtime
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

