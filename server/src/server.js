import { createApp } from './app.js';
import { env } from './config/env.js';
import { getProvider } from './providers/index.js';
import { getAuthProvider } from './auth/index.js';
import { logger } from './config/logger.js';

const app = createApp();
const provider = getProvider();
const authProvider = getAuthProvider();

if (provider.mode === 'supabase') {
  logger.info(`Data provider: Supabase (${env.supabase.url})`);
} else {
  logger.warn(`Data provider: ${provider.mode} — Supabase NOT connected. ${provider.mode === 'local' ? 'State persists to disk; concurrency guarantees are single-process only.' : 'State is in-memory and resets on restart.'}`);
}
logger.info(`Auth provider: ${authProvider.mode}${authProvider.mode === 'demo' ? ' (isolated demo auth, fictional accounts)' : ' (Supabase Auth)'}`);
logger.info(`CORS origins: ${env.corsOrigins.join(', ')}`);

const server = app.listen(env.port, () => {
  logger.info(`Boundary11 API listening on http://localhost:${env.port}`);
});

function shutdown(signal) {
  logger.info(`${signal} received, shutting down.`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { app };
