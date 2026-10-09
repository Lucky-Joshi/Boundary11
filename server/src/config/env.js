import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');

dotenv.config({ path: path.join(repoRoot, '.env') });

function parseOrigins(value) {
  if (!value) return ['http://localhost:5173', 'http://localhost:5174'];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS || process.env.STOREFRONT_URL),
  demoAuthSecret: process.env.DEMO_AUTH_SECRET || 'boundary11-demo-secret-change-me',
  supabase: Object.freeze({
    url: supabaseUrl,
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: supabaseServiceRoleKey,
    // The API only leaves demo mode when a URL and service-role key are set.
    configured: Boolean(supabaseUrl && supabaseServiceRoleKey),
  }),
});

export const isProd = env.nodeEnv === 'production';
export const isTest = env.nodeEnv === 'test';
