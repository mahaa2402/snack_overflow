import { Router } from 'express';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware';
import { snackController } from '../controllers/snack.controller';
import { sendSuccess } from '../utils/apiResponse';
import prisma from '../config/database';
import { snackService } from '../services/snack.service';

const router = Router();

// Apply authentication and admin-only authorization to all routes in this module
router.use(authenticate, requireAdmin);

/**
 * GET /api/admin/dashboard
 * Aggregated administrative metrics & system counts
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const [userCount, stats, recentActivities] = await Promise.all([
      prisma.user.count(),
      snackService.getPantryStats(),
      snackService.getRecentActivities(10),
    ]);

    sendSuccess(
      res,
      {
        message: 'Welcome to the Snack Overflow Admin Dashboard',
        adminUser: req.user,
        stats: {
          totalUsers: userCount,
          totalSnacks: stats.totalSnacks,
          totalQuantity: stats.totalQuantity,
          runningLowCount: stats.runningLowCount,
          outOfStockCount: stats.outOfStockCount,
          stockedCount: stats.stockedCount,
          totalVotes: stats.totalVotes,
          totalActivities: stats.totalActivities,
        },
        recentActivities,
      },
      'Admin dashboard data retrieved successfully',
      200
    );
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/users
 * Protected admin user roster list
 */
router.get('/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, { users }, 'User list retrieved', 200);
  } catch (error) {
    next(error);
  }
});

/**
 * Admin Snack CRUD & Restock Operations
 */
router.post('/snacks', snackController.createSnack);
router.patch('/snacks/:id', snackController.updateSnack);
router.put('/snacks/:id', snackController.updateSnack);
router.delete('/snacks/:id', snackController.deleteSnack);
router.post('/snacks/:id/restock', snackController.restockSnack);

/**
 * Admin Activity Feed
 */
router.get('/activities', snackController.getActivities);

export default router;
