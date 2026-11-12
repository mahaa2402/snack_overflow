import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Public auth endpoints
router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.post('/logout', authController.logout);

// Protected user profile endpoint
router.get('/me', authenticate, authController.getMe);

export default router;

