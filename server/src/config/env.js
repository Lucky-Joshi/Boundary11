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

/** Provider selection. 'auto' picks Supabase when configured, else the local adapter. */
function providerFromEnv(value) {
  const normalized = String(value || 'auto').trim().toLowerCase();
  return ['auto', 'local', 'supabase', 'demo'].includes(normalized) ? normalized : 'auto';
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS || process.env.STOREFRONT_URL),
  storefrontUrl: process.env.STOREFRONT_URL || 'http://localhost:5173',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:5174',
  apiUrl: process.env.API_URL || `http://localhost:${process.env.PORT || 5000}/api/v1`,
  demoAuthSecret: process.env.DEMO_AUTH_SECRET || 'boundary11-demo-secret-change-me',
  // Explicit configuration. 'auto' is the default and picks sensibly.
  dataProvider: providerFromEnv(process.env.DATA_PROVIDER),
  authProvider: providerFromEnv(process.env.AUTH_PROVIDER),
  // Where the durable local adapter persists its JSON store (server-only).
  localDataDir: process.env.LOCAL_DATA_DIR || path.join(__dirname, '../../.data'),
  supabase: Object.freeze({
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    serviceRoleKey: supabaseServiceRoleKey,
    // The API only leaves local mode when a URL and service-role key are set.
    configured: Boolean(supabaseUrl && supabaseServiceRoleKey),
    // Auth against Supabase additionally needs the anon key.
    authConfigured: Boolean(supabaseUrl && supabaseAnonKey),
  }),
});

export const isProd = env.nodeEnv === 'production';
export const isTest = env.nodeEnv === 'test';

/**
 * Startup configuration validation.
 *
 * Returns { errors, warnings } instead of throwing so the API can start in a
 * degraded but explicit mode when Supabase credentials are absent — this is a
 * prototype and local development must work with zero setup. Never silently
 * claim Supabase is connected.
 */
export function validateEnv(environment = env) {
  const errors = [];
  const warnings = [];

  const allowed = ['auto', 'local', 'supabase', 'demo'];
  if (!allowed.includes(String(process.env.DATA_PROVIDER || 'auto').toLowerCase())) {
    errors.push('DATA_PROVIDER must be one of: auto, local, supabase, demo.');
  }
  if (!allowed.includes(String(process.env.AUTH_PROVIDER || 'auto').toLowerCase())) {
    errors.push('AUTH_PROVIDER must be one of: auto, local, supabase, demo.');
  }

  if (environment.dataProvider === 'supabase' && !environment.supabase.configured) {
    warnings.push(
      'DATA_PROVIDER=supabase but SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not both set. ' +
        'Falling back to the durable local adapter. No code claims Supabase is connected.',
    );
  }

  if (environment.dataProvider === 'supabase' && environment.supabase.configured && !environment.supabase.authConfigured) {
    warnings.push(
      'DATA_PROVIDER=supabase but SUPABASE_ANON_KEY is missing. Product data will work, but ' +
        'Supabase Auth (login/register) will not; the auth provider falls back to demo auth.',
    );
  }

  if (environment.authProvider === 'supabase' && !environment.supabase.authConfigured) {
    warnings.push(
      'AUTH_PROVIDER=supabase but SUPABASE_URL and SUPABASE_ANON_KEY are not both set. ' +
        'Falling back to isolated demo auth with fictional accounts.',
    );
  }

  if (environment.dataProvider === 'demo' && environment.nodeEnv === 'production') {
    warnings.push('DATA_PROVIDER=demo is non-persistent. Production should use the local or supabase provider.');
  }

  if (!environment.corsOrigins.length) {
    errors.push('CORS_ORIGINS must list at least one allowed origin.');
  }

  if (!environment.demoAuthSecret || environment.demoAuthSecret === 'boundary11-demo-secret-change-me') {
    warnings.push('DEMO_AUTH_SECRET is the default value. Set it to something unique for anything beyond local dev.');
  }

  return { errors, warnings };
}