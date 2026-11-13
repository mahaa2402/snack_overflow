import { Router } from 'express';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware';
import { snackController } from '../controllers/snack.controller';

const router = Router();

/**
 * GET /activities (and /api/activities)
 * Feature 1: Pantry Activity Timeline
 * Admin-only global activity timeline.
 * Sanitized to never expose sensitive credentials.
 */
router.get('/me/dashboard', authenticate, snackController.getMyPantryDashboard);
router.get('/me', authenticate, snackController.getMyActivities);

router.get('/', authenticate, requireAdmin, snackController.getActivities);

export default router;
