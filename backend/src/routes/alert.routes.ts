import { Router } from 'express';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware';
import { alertController } from '../controllers/alert.controller';

const router = Router();

// Enforce admin-only access on all alert endpoints
router.use(authenticate, requireAdmin);

/**
 * GET /alerts
 * Returns live stock alerts for running-low and gone snacks
 */
router.get('/', alertController.getAlerts);

/**
 * GET /alerts/stream
 * Real-time SSE stream for stock updates and shortage notifications
 */
router.get('/stream', alertController.streamAlerts);

export default router;

