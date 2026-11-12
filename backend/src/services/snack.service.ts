import { Prisma, ActivityAction } from '@prisma/client';
import prisma from '../config/database';
import {
  PantryStatsDto,
  SnackItemDto,
} from '../types/snack.types';
import {
  ValidatedCreateSnack,
  ValidatedSnackQuery,
  ValidatedUpdateSnack,
} from '../validators/snack.validator';
import { AppError } from '../utils/customError';
import { deriveSnackStatus, withDerivedStatus } from '../utils/snackStatus';

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

    return prisma.$transaction(async (tx) => {
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
  }

  /**
   * Toggle Vote for a snack
   */
  public async toggleVote(snackId: string, userId: string) {
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

    const voteCount = await prisma.vote.count({
      where: { snackId },
    });

    return {
      hasVoted: !existingVote,
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
   */
  public async getRecentActivities(limit: number = 10) {
    return prisma.activity.findMany({
      take: Math.min(50, limit),
      orderBy: { createdAt: 'desc' },
      include: {
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
          },
        },
      },
    });
  }
}

export const snackService = new SnackService();
