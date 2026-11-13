import { Router } from 'express';
import { snackController } from '../controllers/snack.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Delete vote by vote ID (User can only delete their own vote)
router.delete('/:id', authenticate, snackController.deleteVoteById);

export default router;

