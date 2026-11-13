import { Prisma, ActivityAction, SnackCategory } from '@prisma/client';
import prisma from '../config/database';
import {
  PantryInsightsDto,
  PantryStatsDto,
  RestockSuggestionItem,
  SnackItemDto,
  MyPantryDashboardDto,
} from '../types/snack.types';
import {
  ValidatedCreateSnack,
  ValidatedSnackQuery,
  ValidatedUpdateSnack,
} from '../validators/snack.validator';
import { AppError } from '../utils/customError';
import { deriveSnackStatus, withDerivedStatus } from '../utils/snackStatus';
import { alertEmitterService } from './alertEmitter.service';

export class SnackService {
  /**
   * Get all snacks with server-side search, filtering, and pagination.
   * Does NOT load all records into application memory.
   */
  public async getAllSnacks(options: ValidatedSnackQuery, userId?: string) {
    const { search, category, status, page, limit, sortBy = 'votes' } = options;

    const skip = (page - 1) * limit;

    // Build Prisma WhereInput
    const where: Prisma.SnackWhereInput = {};

    // 1. Server-side search by name (case-insensitive)
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // 2. Server-side category filter
    if (category) {
      where.category = category;
    }

    // 3. Server-side status filter
    // Status is derived:
    // GONE: quantity = 0
    // RUNNING_LOW: quantity > 0 AND quantity <= lowStockThreshold
    // STOCKED: quantity > lowStockThreshold
    if (status) {
      if (status === 'GONE') {
        where.quantity = 0;
      } else if (status === 'RUNNING_LOW') {
        const matchingIds = await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM snacks WHERE quantity > 0 AND quantity <= "lowStockThreshold"
        `;
        where.id = { in: matchingIds.map((m) => m.id) };
      } else if (status === 'STOCKED') {
        const matchingIds = await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM snacks WHERE quantity > "lowStockThreshold"
        `;
        where.id = { in: matchingIds.map((m) => m.id) };
      }
    }

    // Count matching records at database level
    const total = await prisma.snack.count({ where });

    // Order By
    let orderBy: Prisma.SnackOrderByWithRelationInput = { createdAt: 'desc' };
    if (sortBy === 'name') {
      orderBy = { name: 'asc' };
    } else if (sortBy === 'quantity') {
      orderBy = { quantity: 'desc' };
    } else if (sortBy === 'createdAt') {
      orderBy = { createdAt: 'desc' };
    } else if (sortBy === 'votes') {
      orderBy = { votes: { _count: 'desc' } };
    }

    // Fetch ONLY the requested page from PostgreSQL
    const snacks = await prisma.snack.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        _count: {
          select: { votes: true },
        },
        votes: userId
          ? {
              where: { userId },
              select: { id: true },
            }
          : false,
      },
    });

    const items: SnackItemDto[] = snacks.map((s) => {
      const hasVoted = userId ? Boolean(s.votes && s.votes.length > 0) : false;
      return {
        id: s.id,
        name: s.name,
        category: s.category,
        quantity: s.quantity,
        lowStockThreshold: s.lowStockThreshold,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        status: deriveSnackStatus(s.quantity, s.lowStockThreshold),
        voteCount: s._count.votes,
        hasVoted,
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Get single snack by ID with vote count and derived status
   */
  public async getSnackById(id: string, userId?: string): Promise<SnackItemDto> {
    const snack = await prisma.snack.findUnique({
      where: { id },
      include: {
        _count: {
          select: { votes: true },
        },
        votes: userId
          ? {
              where: { userId },
              select: { id: true },
            }
          : false,
      },
    });

    if (!snack) {
      throw new AppError('Snack not found', 404, 'NOT_FOUND');
    }

    const hasVoted = userId ? Boolean(snack.votes && snack.votes.length > 0) : false;

    return {
      id: snack.id,
      name: snack.name,
      category: snack.category,
      quantity: snack.quantity,
      lowStockThreshold: snack.lowStockThreshold,
      createdAt: snack.createdAt,
      updatedAt: snack.updatedAt,
      status: deriveSnackStatus(snack.quantity, snack.lowStockThreshold),
      voteCount: snack._count.votes,
      hasVoted,
    };
  }

  /**
   * Create a new snack (Admin only)
   */
  public async createSnack(dto: ValidatedCreateSnack, adminUserId?: string) {
    const { name, category, quantity, lowStockThreshold } = dto;

    // Name uniqueness check
    const existing = await prisma.snack.findUnique({
      where: { name },
    });

    if (existing) {
      throw new AppError('A snack with this name already exists', 409, 'CONFLICT');
    }

    return prisma.$transaction(async (tx) => {
      const newSnack = await tx.snack.create({
        data: {
          name,
          category,
          quantity,
          lowStockThreshold,
        },
      });

      // Log initial inventory stock if adminUserId and quantity > 0
      if (adminUserId && newSnack.quantity > 0) {
        await tx.activity.create({
          data: {
            userId: adminUserId,
            snackId: newSnack.id,
            action: ActivityAction.RESTOCKED,
            amount: newSnack.quantity,
          },
        });
      }

      return {
        ...withDerivedStatus(newSnack),
        voteCount: 0,
        hasVoted: false,
      };
    });
  }

  /**
   * Update snack information (PATCH / PUT /snacks/:id - Admin only)
   */
  public async updateSnack(id: string, dto: ValidatedUpdateSnack) {
    // 1. Verify snack exists
    const existing = await prisma.snack.findUnique({
      where: { id },
      include: {
        _count: {
          select: { votes: true },
        },
      },
    });

    if (!existing) {
      throw new AppError('Snack not found', 404, 'NOT_FOUND');
    }

    // 2. If name is being changed, verify uniqueness
    if (dto.name && dto.name !== existing.name) {
      const duplicate = await prisma.snack.findUnique({
        where: { name: dto.name },
      });
      if (duplicate && duplicate.id !== id) {
        throw new AppError('A snack with this name already exists', 409, 'CONFLICT');
      }
    }

    // 3. Update snack
    const data: Prisma.SnackUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.quantity !== undefined) data.quantity = dto.quantity;
    if (dto.lowStockThreshold !== undefined) data.lowStockThreshold = dto.lowStockThreshold;

    const updated = await prisma.snack.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { votes: true },
        },
      },
    });

    return {
      ...withDerivedStatus(updated),
      voteCount: updated._count.votes,
      hasVoted: false,
    };
  }

  /**
   * Delete a snack safely (Admin only)
   * Safely removes related votes and activities in a transaction to prevent foreign key errors.
   */
  public async deleteSnack(id: string) {
    const existing = await prisma.snack.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Snack not found', 404, 'NOT_FOUND');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Delete associated activities (Activity has Restrict onDelete)
      await tx.activity.deleteMany({
        where: { snackId: id },
      });

      // 2. Delete associated votes (Vote has Cascade, but explicitly deleting ensures total safety)
      await tx.vote.deleteMany({
        where: { snackId: id },
      });

      // 3. Delete snack
      return tx.snack.delete({
        where: { id },
      });
    });
  }

  /**
   * Restock snack inventory (Admin only)
   * Safely increments quantity and logs Activity in the same transaction.
   * If activity insertion fails, the stock increment rolls back.
   */
  public async restockSnack(id: string, adminUserId: string, amount: number) {
    if (!amount || amount <= 0 || !Number.isInteger(amount)) {
      throw new AppError('Restock amount must be a positive integer (> 0)', 400, 'VALIDATION_ERROR');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Verify snack exists
      const existing = await tx.snack.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing) {
        throw new AppError('Snack not found', 404, 'NOT_FOUND');
      }

      // 2. Safely increment quantity at database level
      const updated = await tx.snack.update({
        where: { id },
        data: {
          quantity: {
            increment: amount,
          },
        },
        include: {
          _count: {
            select: { votes: true },
          },
        },
      });

      // 3. Insert Activity record in the same transaction
      const activity = await tx.activity.create({
        data: {
          userId: adminUserId,
          snackId: id,
          action: ActivityAction.RESTOCKED,
          amount,
        },
      });

      return {
        snack: {
          ...withDerivedStatus(updated),
          voteCount: updated._count.votes,
          hasVoted: false,
        },
        activity,
      };
    });
  }

  /**
   * Consume a snack (Member/Admin)
   * Uses an atomic database-level conditional update inside a transaction.
   * Conditions: id = snackId AND quantity >= amount.
   * Decrements quantity ONLY when the condition matches.
   * If stock is insufficient, returns 409 Conflict.
   * If snack does not exist, returns 404 Not Found.
   * Inserts Activity in the same transaction. If activity fails, rollback occurs.
   */
  public async consumeSnack(snackId: string, userId: string, amount: number = 1) {
    if (!amount || amount <= 0 || !Number.isInteger(amount)) {
      throw new AppError('Amount must be a positive integer (> 0)', 400, 'VALIDATION_ERROR');
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Atomic database-level conditional update via updateMany
      // Conditions: id = snackId AND quantity >= amount
      const updateResult = await tx.snack.updateMany({
        where: {
          id: snackId,
          quantity: {
            gte: amount,
          },
        },
        data: {
          quantity: {
            decrement: amount,
          },
        },
      });

      // 2. If affected row count is 0, condition did not match.
      // Differentiate between "Snack does not exist" (404) and "Insufficient stock" (409)
      if (updateResult.count === 0) {
        const existing = await tx.snack.findUnique({
          where: { id: snackId },
          select: { id: true, quantity: true },
        });

        if (!existing) {
          throw new AppError('Snack not found', 404, 'NOT_FOUND');
        }

        // Snack exists, but quantity was less than requested amount
        throw new AppError(
          `Insufficient stock available. Requested ${amount}, but only ${existing.quantity} remaining.`,
          409,
          'INSUFFICIENT_STOCK'
        );
      }

      // 3. Fetch the newly updated snack record
      const updatedSnack = await tx.snack.findUnique({
        where: { id: snackId },
        include: {
          _count: {
            select: { votes: true },
          },
        },
      });

      // 4. Insert corresponding Activity record in the SAME database transaction
      const activity = await tx.activity.create({
        data: {
          userId,
          snackId,
          action: ActivityAction.CONSUMED,
          amount,
        },
      });

      return {
        snack: {
          ...withDerivedStatus(updatedSnack!),
          voteCount: updatedSnack!._count.votes,
          hasVoted: false,
        },
        activity,
      };
    });

    if (result.snack.quantity <= result.snack.lowStockThreshold) {
      alertEmitterService.broadcastRefresh();
    }

    return result;
  }

  /**
   * Vote or Toggle Vote for a snack
   * Supports:
   * - action: 'toggle' (default) -> toggles between voted and unvoted
   * - action: 'vote' -> strictly casts vote; throws 409 if already voted
   * - action: 'unvote' -> strictly removes vote; throws 404 if not found
   */
  public async toggleVote(
    snackId: string,
    userId: string,
    action: 'vote' | 'unvote' | 'toggle' = 'toggle'
  ) {
    const snack = await prisma.snack.findUnique({
      where: { id: snackId },
    });

    if (!snack) {
      throw new AppError('Snack not found', 404, 'NOT_FOUND');
    }

    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_snackId: {
          userId,
          snackId,
        },
      },
    });

    if (action === 'vote') {
      if (existingVote) {
        throw new AppError('You have already voted for this snack', 409, 'ALREADY_VOTED');
      }
      await prisma.vote.create({
        data: {
          userId,
          snackId,
        },
      });
    } else if (action === 'unvote') {
      if (!existingVote) {
        throw new AppError('Vote not found for this user and snack', 404, 'NOT_FOUND');
      }
      await prisma.vote.delete({
        where: { id: existingVote.id },
      });
    } else {
      // Default: Toggle mode
      if (existingVote) {
        await prisma.vote.delete({
          where: { id: existingVote.id },
        });
      } else {
        await prisma.vote.create({
          data: {
            userId,
            snackId,
          },
        });
      }
    }

    const voteCount = await prisma.vote.count({
      where: { snackId },
    });

    const hasVoted = action === 'vote' ? true : action === 'unvote' ? false : !existingVote;

    return {
      hasVoted,
      voteCount,
    };
  }

  /**
   * Remove a user's vote for a snack (DELETE /snacks/:id/vote)
   * Users can only remove their own vote. Cross-user vote removal is forbidden.
   */
  public async removeVoteBySnack(snackId: string, userId: string, targetUserId?: string) {
    if (targetUserId && targetUserId !== userId) {
      throw new AppError("You cannot remove another user's vote", 403, 'FORBIDDEN');
    }
    return this.toggleVote(snackId, userId, 'unvote');
  }

  /**
   * Remove a vote by vote ID (DELETE /votes/:id)
   * Enforces that users can only delete their own vote. Cross-user vote deletion is forbidden.
   */
  public async deleteVoteById(voteId: string, userId: string) {
    const vote = await prisma.vote.findUnique({
      where: { id: voteId },
    });

    if (!vote) {
      throw new AppError('Vote not found', 404, 'NOT_FOUND');
    }

    if (vote.userId !== userId) {
      throw new AppError("You cannot remove another user's vote", 403, 'FORBIDDEN');
    }

    await prisma.vote.delete({
      where: { id: voteId },
    });

    const voteCount = await prisma.vote.count({
      where: { snackId: vote.snackId },
    });

    return {
      snackId: vote.snackId,
      voteCount,
    };
  }

  /**
   * Aggregate Pantry Statistics
   */
  public async getPantryStats(): Promise<PantryStatsDto> {
    const snacks = await prisma.snack.findMany({
      select: {
        quantity: true,
        lowStockThreshold: true,
      },
    });

    const [totalVotes, totalActivities] = await Promise.all([
      prisma.vote.count(),
      prisma.activity.count(),
    ]);

    let totalQuantity = 0;
    let runningLowCount = 0;
    let outOfStockCount = 0;
    let stockedCount = 0;

    for (const snack of snacks) {
      totalQuantity += snack.quantity;
      const status = deriveSnackStatus(snack.quantity, snack.lowStockThreshold);
      if (status === 'GONE') {
        outOfStockCount++;
      } else if (status === 'RUNNING_LOW') {
        runningLowCount++;
      } else {
        stockedCount++;
      }
    }

    return {
      totalSnacks: snacks.length,
      totalQuantity,
      runningLowCount,
      outOfStockCount,
      stockedCount,
      totalVotes,
      totalActivities,
    };
  }

  /**
   * Get Popular snacks
   */
  public async getPopularSnacks(limit: number = 4, userId?: string) {
    const result = await this.getAllSnacks(
      {
        page: 1,
        limit,
        sortBy: 'votes',
      },
      userId
    );
    return result.items;
  }

  /**
   * Get Featured snack of the week
   */
  public async getFeaturedSnack(userId?: string) {
    const popular = await this.getPopularSnacks(1, userId);
    return popular.length > 0 ? popular[0] : null;
  }

  /**
   * Get recent activities
   * Sanitizes sensitive fields (password, tokens are never exposed).
   * Supports optional action filter (CONSUMED / RESTOCKED).
   */
  public async getRecentActivities(limit: number = 20, action?: string, userId?: string) {
    const where: Prisma.ActivityWhereInput = {};
    if (action === 'CONSUMED' || action === 'RESTOCKED') {
      where.action = action;
    }
    if (userId) {
      where.userId = userId;
    }

    return prisma.activity.findMany({
      where,
      take: Math.min(100, Math.max(1, limit)),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        amount: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        snack: {
          select: {
            id: true,
            name: true,
            category: true,
            quantity: true,
          },
        },
      },
    });
  }

  /**
   * Builds a personal dashboard exclusively from records owned by the caller.
   */
  public async getMyPantryDashboard(userId: string): Promise<MyPantryDashboardDto> {
      const now = new Date();
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const weekStart = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const chartMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
      const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      const consumedWhere: Prisma.ActivityWhereInput = { userId, action: ActivityAction.CONSUMED };

      const [
        consumedAggregate,
        totalVotes,
        favouriteGroups,
        weeklyGroups,
        monthlyGroups,
        activeDayRows,
        thisMonthAggregate,
        previousMonthAggregate,
        thisMonthFavouriteGroups,
        thisMonthActiveDayRows,
        recentConsumed,
        recentVotes,
      ] = await Promise.all([
        prisma.activity.aggregate({
          where: consumedWhere,
          _sum: { amount: true },
        }),
        prisma.vote.count({ where: { userId } }),
        prisma.activity.groupBy({
          by: ['snackId'],
          where: consumedWhere,
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
          take: 5,
        }),
        prisma.$queryRaw<Array<{ day: Date; amount: number }>>`
          SELECT DATE_TRUNC('day', "createdAt") AS day, SUM(amount)::int AS amount
          FROM activities
          WHERE "userId" = ${userId} AND action = 'CONSUMED'
            AND "createdAt" >= ${weekStart} AND "createdAt" < ${tomorrow}
          GROUP BY DATE_TRUNC('day', "createdAt")
        `,
        prisma.$queryRaw<Array<{ month: Date; amount: number }>>`
          SELECT DATE_TRUNC('month', "createdAt") AS month, SUM(amount)::int AS amount
          FROM activities
          WHERE "userId" = ${userId} AND action = 'CONSUMED'
            AND "createdAt" >= ${chartMonthStart} AND "createdAt" < ${nextMonthStart}
          GROUP BY DATE_TRUNC('month', "createdAt")
        `,
        prisma.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(DISTINCT DATE("createdAt"))::int AS count
          FROM activities
          WHERE "userId" = ${userId} AND action = 'CONSUMED'
        `,
        prisma.activity.aggregate({
          where: { ...consumedWhere, createdAt: { gte: currentMonthStart, lt: nextMonthStart } },
          _sum: { amount: true },
        }),
        prisma.activity.aggregate({
          where: { ...consumedWhere, createdAt: { gte: previousMonthStart, lt: currentMonthStart } },
          _sum: { amount: true },
        }),
        prisma.activity.groupBy({
          by: ['snackId'],
          where: { ...consumedWhere, createdAt: { gte: currentMonthStart, lt: nextMonthStart } },
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
          take: 1,
        }),
        prisma.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(DISTINCT DATE("createdAt"))::int AS count
          FROM activities
          WHERE "userId" = ${userId} AND action = 'CONSUMED'
            AND "createdAt" >= ${currentMonthStart} AND "createdAt" < ${nextMonthStart}
        `,
        prisma.activity.findMany({
          where: consumedWhere,
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            snackId: true,
            amount: true,
            createdAt: true,
            snack: { select: { name: true, category: true } },
          },
        }),
        prisma.vote.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            snackId: true,
            createdAt: true,
            snack: { select: { name: true, category: true } },
          },
        }),
      ]);

      const snackIds = [
        ...new Set([
          ...favouriteGroups.map((item) => item.snackId),
          ...thisMonthFavouriteGroups.map((item) => item.snackId),
        ]),
      ];
      const snacks = snackIds.length
        ? await prisma.snack.findMany({
            where: { id: { in: snackIds } },
            select: { id: true, name: true, category: true },
          })
        : [];
      const snackById = new Map(snacks.map((snack) => [snack.id, snack]));

      const toFavouriteSnack = (
        group: (typeof favouriteGroups)[number] | undefined
      ): MyPantryDashboardDto['overview']['favouriteSnack'] => {
        if (!group) return null;
        const snack = snackById.get(group.snackId);
        if (!snack) return null;
        return {
          ...snack,
          amount: group._sum.amount ?? 0,
        };
      };

      const weeklyAmountByDay = new Map(
        weeklyGroups.map((row) => [row.day.toISOString().slice(0, 10), row.amount])
      );
      const weeklyConsumption = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart.getTime() + index * 24 * 60 * 60 * 1000);
        const dateKey = date.toISOString().slice(0, 10);
        return {
          date: dateKey,
          label: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
          amount: weeklyAmountByDay.get(dateKey) ?? 0,
        };
      });

      const monthlyAmountByMonth = new Map(
        monthlyGroups.map((row) => [row.month.toISOString().slice(0, 7), row.amount])
      );
      const monthlyConsumption = Array.from({ length: 6 }, (_, index) => {
        const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
        const monthKey = date.toISOString().slice(0, 7);
        return {
          month: monthKey,
          label: date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
          amount: monthlyAmountByMonth.get(monthKey) ?? 0,
        };
      });

      const favouriteSnacks = favouriteGroups.flatMap((group) => {
        const snack = snackById.get(group.snackId);
        return snack ? [{ ...snack, amount: group._sum.amount ?? 0 }] : [];
      });
      const totalConsumed = consumedAggregate._sum.amount ?? 0;
      const thisMonthConsumed = thisMonthAggregate._sum.amount ?? 0;
      const previousMonthConsumed = previousMonthAggregate._sum.amount ?? 0;
      const timeline: MyPantryDashboardDto['timeline'] = [
        ...recentConsumed.map((activity) => ({
          id: activity.id,
          type: 'CONSUMED' as const,
          snackId: activity.snackId,
          snackName: activity.snack.name,
          category: activity.snack.category,
          amount: activity.amount,
          createdAt: activity.createdAt,
        })),
        ...recentVotes.map((vote) => ({
          id: vote.id,
          type: 'VOTED' as const,
          snackId: vote.snackId,
          snackName: vote.snack.name,
          category: vote.snack.category,
          amount: 1,
          createdAt: vote.createdAt,
        })),
      ]
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .slice(0, 20);

      return {
        overview: {
          totalConsumed,
          favouriteSnack: toFavouriteSnack(favouriteGroups[0]),
          totalVotes,
          activeDays: activeDayRows[0]?.count ?? 0,
        },
        favouriteSnacks,
        weeklyConsumption,
        monthlyConsumption,
        monthlyRecap: {
          consumed: thisMonthConsumed,
          previousMonthConsumed,
          changePercent:
            previousMonthConsumed === 0
              ? thisMonthConsumed === 0
                ? 0
                : null
              : Math.round(((thisMonthConsumed - previousMonthConsumed) / previousMonthConsumed) * 100),
          activeDays: thisMonthActiveDayRows[0]?.count ?? 0,
          favouriteSnack: toFavouriteSnack(thisMonthFavouriteGroups[0]),
        },
        timeline,
      };
  }

  /**
   * Aggregate Pantry Insights & Analytics (Feature 2 & 3)
   * Dynamically calculated from PostgreSQL Activity, Snack, and Vote tables.
   */
  public async getPantryInsights(): Promise<PantryInsightsDto> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Fetch aggregate metrics
    const [
      consumedBySnack,
      mostVotedSnackRecord,
      thisWeekConsumedAgg,
      lastWeekConsumedAgg,
      thisWeekRestockedAgg,
      allTimeConsumedAgg,
      allSnacks,
      recentActivities,
    ] = await Promise.all([
      // Group by snackId where action is CONSUMED
      prisma.activity.groupBy({
        by: ['snackId'],
        where: { action: ActivityAction.CONSUMED },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      // Most voted snack
      prisma.snack.findFirst({
        include: {
          _count: { select: { votes: true } },
        },
        orderBy: {
          votes: { _count: 'desc' },
        },
      }),
      // This week's consumption (last 7 days)
      prisma.activity.aggregate({
        where: { action: ActivityAction.CONSUMED, createdAt: { gte: sevenDaysAgo } },
        _sum: { amount: true },
      }),
      // Prior week's consumption (14 to 7 days ago)
      prisma.activity.aggregate({
        where: { action: ActivityAction.CONSUMED, createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
        _sum: { amount: true },
      }),
      // Restocked this week
      prisma.activity.aggregate({
        where: { action: ActivityAction.RESTOCKED, createdAt: { gte: sevenDaysAgo } },
        _sum: { amount: true },
      }),
      // All-time total consumed
      prisma.activity.aggregate({
        where: { action: ActivityAction.CONSUMED },
        _sum: { amount: true },
      }),
      // All snacks with vote counts
      prisma.snack.findMany({
        include: {
          _count: { select: { votes: true } },
        },
      }),
      // Recent activities for trend mapping
      prisma.activity.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { action: true, amount: true, createdAt: true, snackId: true },
      }),
    ]);

    const snackMap = new Map(allSnacks.map((s) => [s.id, s]));

    // 2. Most consumed snack
    let mostConsumedSnack: PantryInsightsDto['kpis']['mostConsumedSnack'] = null;
    if (consumedBySnack.length > 0) {
      const topSnackId = consumedBySnack[0].snackId;
      const topSnack = snackMap.get(topSnackId);
      if (topSnack) {
        mostConsumedSnack = {
          id: topSnack.id,
          name: topSnack.name,
          category: topSnack.category,
          totalConsumed: consumedBySnack[0]._sum.amount || 0,
          currentStock: topSnack.quantity,
          status: deriveSnackStatus(topSnack.quantity, topSnack.lowStockThreshold),
        };
      }
    }

    // 3. Most voted snack
    let mostVotedSnack: PantryInsightsDto['kpis']['mostVotedSnack'] = null;
    if (mostVotedSnackRecord) {
      mostVotedSnack = {
        id: mostVotedSnackRecord.id,
        name: mostVotedSnackRecord.name,
        category: mostVotedSnackRecord.category,
        voteCount: mostVotedSnackRecord._count.votes,
        currentStock: mostVotedSnackRecord.quantity,
        status: deriveSnackStatus(mostVotedSnackRecord.quantity, mostVotedSnackRecord.lowStockThreshold),
      };
    }

    // 4. Growth calculation
    const totalConsumedThisWeek = thisWeekConsumedAgg._sum.amount || 0;
    const totalConsumedLastWeek = lastWeekConsumedAgg._sum.amount || 0;
    const weeklyConsumptionGrowth =
      totalConsumedLastWeek > 0
        ? Math.round(((totalConsumedThisWeek - totalConsumedLastWeek) / totalConsumedLastWeek) * 100)
        : totalConsumedThisWeek > 0
        ? 100
        : 0;

    // 5. Daily trend (past 7 days)
    const daily: PantryInsightsDto['consumptionTrends']['daily'] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      const fullDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      let consumed = 0;
      let restocked = 0;
      for (const act of recentActivities) {
        const actDate = act.createdAt.toISOString().split('T')[0];
        if (actDate === dateStr) {
          if (act.action === ActivityAction.CONSUMED) consumed += act.amount;
          if (act.action === ActivityAction.RESTOCKED) restocked += act.amount;
        }
      }
      daily.push({ date: dateStr, dayLabel, fullDate, consumed, restocked });
    }

    // 6. Weekly trend (past 4 weeks)
    const weekly: PantryInsightsDto['consumptionTrends']['weekly'] = [];
    for (let w = 3; w >= 0; w--) {
      const start = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
      const rangeLabel = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

      let consumed = 0;
      let restocked = 0;
      for (const act of recentActivities) {
        if (act.createdAt >= start && act.createdAt < end) {
          if (act.action === ActivityAction.CONSUMED) consumed += act.amount;
          if (act.action === ActivityAction.RESTOCKED) restocked += act.amount;
        }
      }
      weekly.push({
        weekLabel: w === 0 ? 'This Week' : `Week -${w}`,
        rangeLabel,
        consumed,
        restocked,
      });
    }

    // 7. Monthly trend (past 6 months)
    const monthly: PantryInsightsDto['consumptionTrends']['monthly'] = [];
    for (let m = 5; m >= 0; m--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
      const monthLabel = targetDate.toLocaleDateString('en-US', { month: 'short' });

      let consumed = 0;
      let restocked = 0;
      for (const act of recentActivities) {
        if (act.createdAt >= targetDate && act.createdAt < nextMonth) {
          if (act.action === ActivityAction.CONSUMED) consumed += act.amount;
          if (act.action === ActivityAction.RESTOCKED) restocked += act.amount;
        }
      }
      monthly.push({
        monthLabel,
        year: targetDate.getFullYear(),
        consumed,
        restocked,
      });
    }

    // 8. Category Breakdown
    const categoryTotals: Record<SnackCategory, { consumed: number; currentStock: number; count: number }> = {
      SWEET: { consumed: 0, currentStock: 0, count: 0 },
      SAVOURY: { consumed: 0, currentStock: 0, count: 0 },
      DRINK: { consumed: 0, currentStock: 0, count: 0 },
      HEALTHY_ISH: { consumed: 0, currentStock: 0, count: 0 },
    };

    for (const s of allSnacks) {
      if (categoryTotals[s.category]) {
        categoryTotals[s.category].currentStock += s.quantity;
        categoryTotals[s.category].count += 1;
      }
    }

    for (const act of recentActivities) {
      if (act.action === ActivityAction.CONSUMED) {
        const s = snackMap.get(act.snackId);
        if (s && categoryTotals[s.category]) {
          categoryTotals[s.category].consumed += act.amount;
        }
      }
    }

    const totalAllConsumed = allTimeConsumedAgg._sum.amount || 1;
    const categoryLabels: Record<SnackCategory, string> = {
      SWEET: 'Sweet Treats',
      SAVOURY: 'Savoury Bites',
      DRINK: 'Cold Drinks & Brews',
      HEALTHY_ISH: 'Healthy & Wellness',
    };

    const categoryBreakdown: PantryInsightsDto['categoryBreakdown'] = (
      Object.keys(categoryTotals) as SnackCategory[]
    ).map((cat) => {
      const data = categoryTotals[cat];
      return {
        category: cat,
        label: categoryLabels[cat],
        totalConsumed: data.consumed,
        percentage: totalAllConsumed > 0 ? Math.round((data.consumed / totalAllConsumed) * 100) : 0,
        snackCount: data.count,
        currentStock: data.currentStock,
      };
    });

    // 9. Top 5 Consumed Snacks Leaderboard
    const topConsumedSnacks: PantryInsightsDto['topConsumedSnacks'] = consumedBySnack
      .slice(0, 5)
      .map((entry) => {
        const s = snackMap.get(entry.snackId);
        const total = entry._sum.amount || 0;
        const burnRate = Number((total / 14).toFixed(1));
        return {
          id: entry.snackId,
          name: s ? s.name : 'Unknown Snack',
          category: s ? s.category : SnackCategory.SWEET,
          totalConsumed: total,
          currentStock: s ? s.quantity : 0,
          lowStockThreshold: s ? s.lowStockThreshold : 5,
          status: s ? deriveSnackStatus(s.quantity, s.lowStockThreshold) : 'GONE',
          voteCount: s ? s._count.votes : 0,
          burnRatePerDay: burnRate,
        };
      });

    // 10. Smart Restock Suggestions (Feature 3)
    const consumptionPerSnackLast14Days = new Map<string, number>();
    for (const act of recentActivities) {
      if (act.action === ActivityAction.CONSUMED) {
        const curr = consumptionPerSnackLast14Days.get(act.snackId) || 0;
        consumptionPerSnackLast14Days.set(act.snackId, curr + act.amount);
      }
    }

    const restockSuggestions: RestockSuggestionItem[] = [];

    for (const s of allSnacks) {
      const recentConsumed = consumptionPerSnackLast14Days.get(s.id) || 0;
      const weeklyRate = Math.max(1, Math.ceil(recentConsumed / 2));
      const status = deriveSnackStatus(s.quantity, s.lowStockThreshold);

      const isDepleted = s.quantity === 0;
      const isRunningLow = s.quantity <= s.lowStockThreshold;
      const isFastDepleting = s.quantity > s.lowStockThreshold && s.quantity / (weeklyRate / 7) < 5;

      if (isDepleted || isRunningLow || isFastDepleting) {
        const targetBuffer = Math.max(s.lowStockThreshold * 2, weeklyRate * 2, 10);
        const suggestedRestockAmount = Math.max(5, targetBuffer - s.quantity);

        let urgency: 'CRITICAL' | 'URGENT' | 'PREVENTATIVE' = 'PREVENTATIVE';
        let reasoning = '';

        if (isDepleted) {
          urgency = 'CRITICAL';
          reasoning = `Depleted (0 units in stock). Highly recommended to restock +${suggestedRestockAmount} units to re-establish a 14-day supply.`;
        } else if (isRunningLow) {
          urgency = 'URGENT';
          reasoning = `Remaining stock (${s.quantity}) is at or below threshold (${s.lowStockThreshold}). Weekly burn rate is ~${weeklyRate} units. Suggested +${suggestedRestockAmount} units.`;
        } else {
          urgency = 'PREVENTATIVE';
          reasoning = `High velocity demand (~${weeklyRate} units/week). Stock (${s.quantity}) estimated to run out in under 5 days. Suggested restock +${suggestedRestockAmount} units.`;
        }

        restockSuggestions.push({
          snackId: s.id,
          snackName: s.name,
          category: s.category,
          currentQuantity: s.quantity,
          lowStockThreshold: s.lowStockThreshold,
          status,
          weeklyConsumptionRate: weeklyRate,
          suggestedRestockAmount,
          urgency,
          reasoning,
        });
      }
    }

    const urgencyOrder = { CRITICAL: 0, URGENT: 1, PREVENTATIVE: 2 };
    restockSuggestions.sort(
      (a, b) =>
        urgencyOrder[a.urgency] - urgencyOrder[b.urgency] ||
        b.weeklyConsumptionRate - a.weeklyConsumptionRate
    );

    return {
      kpis: {
        mostConsumedSnack,
        mostVotedSnack,
        totalConsumedThisWeek,
        totalConsumedLastWeek,
        weeklyConsumptionGrowth,
        totalRestockedThisWeek: thisWeekRestockedAgg._sum.amount || 0,
        totalAllTimeConsumed: allTimeConsumedAgg._sum.amount || 0,
      },
      consumptionTrends: {
        daily,
        weekly,
        monthly,
      },
      categoryBreakdown,
      topConsumedSnacks,
      restockSuggestions,
    };
  }
}

export const snackService = new SnackService();
