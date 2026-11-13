import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env';
import apiRoutes from './routes';
import authRoutes from './routes/auth.routes';
import snackRoutes from './routes/snack.routes';
import voteRoutes from './routes/vote.routes';
import activityRoutes from './routes/activity.routes';
import restockRoutes from './routes/restock.routes';
import alertRoutes from './routes/alert.routes';
import realtimeRoutes from './routes/realtime.routes';
import { requestLogger } from './middlewares/requestLogger';
import { notFoundHandler } from './middlewares/notFoundHandler';
import { errorHandler } from './middlewares/errorHandler';

export const createApp = (): Application => {
  const app = express();

  // Security & Parsing Middleware
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true, // Allow cookies across origins
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    })
  );
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Root welcome endpoint
  app.get('/', (_req, res) => {
    res.json({
      name: 'Snack Overflow API',
      status: 'active',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth',
        snacks: '/api/snacks',
        votes: '/api/votes',
        activities: '/api/activities',
        admin: '/api/admin',
      },
    });
  });

  // Top-level direct routes
  app.use('/auth', authRoutes);
  app.use('/snacks', snackRoutes);
  app.use('/votes', voteRoutes);
  app.use('/activities', activityRoutes);
  app.use('/restock', restockRoutes);
  app.use('/alerts', alertRoutes);
  app.use('/realtime', realtimeRoutes);

  // Central API routes under /api
  app.use('/api', apiRoutes);

  // 404 Not Found Handler
  app.use(notFoundHandler);

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp;
