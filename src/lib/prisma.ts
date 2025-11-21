import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma 7 configuration
// Note: Prisma 7 reads DATABASE_URL from prisma.config.ts automatically
// The connection is managed via prisma.config.ts which imports dotenv/config
const createPrismaClient = () => {
  // Ensure DATABASE_URL is available
  if (!process.env.DATABASE_URL) {
    console.error('⚠️ DATABASE_URL is not set. Please check your environment variables.');
    console.error('Make sure DATABASE_URL is set in your .env file or Vercel environment variables.');
  }

  // Create Prisma client
  // DATABASE_URL is read from environment variables automatically
  // Connection is lazy (established on first query) which is ideal for serverless
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  return client;
};

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

// In development, reuse the same instance to avoid too many connections
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

