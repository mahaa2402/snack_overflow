import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { realtimeController } from '../controllers/realtime.controller';

const router = Router();

router.get('/stream', authenticate, realtimeController.streamUpdates);

export default router;
