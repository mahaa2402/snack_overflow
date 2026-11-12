import { Router } from 'express';
import healthRoutes from './health.routes';

const router = Router();

// Mount individual module routers
router.use('/health', healthRoutes);

export default router;

