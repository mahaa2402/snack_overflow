import { Router } from 'express';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware';
import { restockController } from '../controllers/restock.controller';

const router = Router();

// Enforce admin-only access on all restock endpoints
router.use(authenticate, requireAdmin);

/**
 * GET /restock/suggestions
 * Query params: ?category=SWEET|SAVOURY|DRINK|HEALTHY_ISH
 */
router.get('/suggestions', restockController.getSuggestions);

/**
 * POST /restock/all
 * Body: { items?: [{ snackId: string, amount?: number }] }
 */
router.post('/all', restockController.restockAll);

export default router;

