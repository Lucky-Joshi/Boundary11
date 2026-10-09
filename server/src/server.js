import { createApp } from './app.js';
import { env } from './config/env.js';
import { getProvider } from './providers/index.js';
import { logger } from './config/logger.js';

const app = createApp();
const provider = getProvider();

const server = app.listen(env.port, () => {
  logger.info(`Boundary11 API listening on http://localhost:${env.port}`);
  logger.info(`Data mode: ${provider.mode}${provider.mode === 'demo' ? ' (in-memory prototype data)' : ''}`);
  logger.info(`CORS origins: ${env.corsOrigins.join(', ')}`);
});

function shutdown(signal) {
  logger.info(`${signal} received, shutting down.`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { app };
