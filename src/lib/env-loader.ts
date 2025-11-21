/**
 * Custom environment variable loader
 * Ensures we only use .env file, not .env.local
 */
import { config } from 'dotenv';
import { resolve } from 'path';

// Explicitly load only .env file
config({ path: resolve(process.cwd(), '.env') });

// Re-export process.env to ensure we're using .env values
export const getEnv = (key: string): string | undefined => {
  // Force reload from .env only
  const env = config({ path: resolve(process.cwd(), '.env') });
  return env.parsed?.[key] || process.env[key];
};

