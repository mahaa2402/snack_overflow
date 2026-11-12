import express, { Application } from 'express';
import cors from 'cors';
import { config } from './config/env';
import apiRoutes from './routes';
import { requestLogger } from './middlewares/requestLogger';
import { notFoundHandler } from './middlewares/notFoundHandler';
import { errorHandler } from './middlewares/errorHandler';

export const createApp = (): Application => {
  const app = express();

  // Security & Middleware
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Root welcome endpoint
  app.get('/', (_req, res) => {
    res.json({
      name: 'Snack Overflow API',
      status: 'active',
      version: '1.0.0',
      docs: '/api/health',
    });
  });

  // Mount API Routes under /api
  app.use('/api', apiRoutes);

  // 404 Not Found Handler for unknown routes
  app.use(notFoundHandler);

  // Centralized Error Handler Middleware
  app.use(errorHandler);

  return app;
};

export default createApp;

