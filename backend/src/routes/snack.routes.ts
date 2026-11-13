import { Router } from 'express';
import { snackController } from '../controllers/snack.controller';
import { authenticate, optionalAuthenticate, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Public / Read-only endpoints
router.get('/', optionalAuthenticate, snackController.getSnacks);
router.get('/stats', snackController.getPantryStats);
router.get('/popular', optionalAuthenticate, snackController.getPopularSnacks);
router.get('/featured', optionalAuthenticate, snackController.getFeaturedSnack);
router.get('/activities', authenticate, requireAdmin, snackController.getActivities);
router.get('/:id', optionalAuthenticate, snackController.getSnackById);

// Admin-only operations
router.post('/', authenticate, requireAdmin, snackController.createSnack);
router.patch('/:id', authenticate, requireAdmin, snackController.updateSnack);
router.put('/:id', authenticate, requireAdmin, snackController.updateSnack);
router.delete('/:id', authenticate, requireAdmin, snackController.deleteSnack);
router.post('/:id/restock', authenticate, requireAdmin, snackController.restockSnack);

// Member actions
router.post('/:id/consume', authenticate, snackController.consumeSnack);
router.post('/:id/vote', authenticate, snackController.toggleVote);
router.delete('/:id/vote', authenticate, snackController.removeVote);

export default router;
