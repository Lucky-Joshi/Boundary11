import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { requestContext } from './middleware/requestContext.js';
import { authenticate } from './middleware/auth.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin / server-to-server (no Origin header) requests.
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
      },
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'x-cart-id', 'x-request-id'],
      exposedHeaders: ['x-request-id'],
    }),
  );

  // Small body limit — the API never accepts large payloads.
  app.use(express.json({ limit: '256kb' }));

  app.use(requestContext);
  app.use(apiLimiter);
  app.use(authenticate);

  app.use('/api/v1', apiRoutes);

  app.get('/', (_req, res) => {
    res.json({ name: 'Boundary11 API', version: 'v1', docs: '/api/v1/health' });
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
