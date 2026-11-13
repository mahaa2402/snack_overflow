import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import snackRoutes from './snack.routes';
import voteRoutes from './vote.routes';
import activityRoutes from './activity.routes';
import restockRoutes from './restock.routes';
import alertRoutes from './alert.routes';

const router = Router();

// Mount API modules
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/snacks', snackRoutes);
router.use('/votes', voteRoutes);
router.use('/activities', activityRoutes);
router.use('/restock', restockRoutes);
router.use('/alerts', alertRoutes);

export default router;
