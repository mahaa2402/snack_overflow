/// <reference types="jest" />
import { deriveSnackStatus, withDerivedStatus } from '../src/utils/snackStatus';
import { SnackCategory } from '@prisma/client';

describe('Snack Status Derivation Logic', () => {
  it('should derive GONE when quantity is 0', () => {
    expect(deriveSnackStatus(0, 5)).toBe('GONE');
  });

  it('should derive RUNNING_LOW when quantity is greater than 0 and less than or equal to lowStockThreshold', () => {
    expect(deriveSnackStatus(1, 5)).toBe('RUNNING_LOW');
    expect(deriveSnackStatus(3, 5)).toBe('RUNNING_LOW');
    expect(deriveSnackStatus(5, 5)).toBe('RUNNING_LOW');
  });

  it('should derive STOCKED when quantity is strictly greater than lowStockThreshold', () => {
    expect(deriveSnackStatus(6, 5)).toBe('STOCKED');
    expect(deriveSnackStatus(20, 5)).toBe('STOCKED');
  });

  it('should attach derived status to snack object with withDerivedStatus', () => {
    const mockSnack = {
      id: 'snack-1',
      name: 'Trail Mix',
      category: 'HEALTHY_ISH' as SnackCategory,
      quantity: 4,
      lowStockThreshold: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const enriched = withDerivedStatus(mockSnack);
    expect(enriched.status).toBe('RUNNING_LOW');
    expect(enriched.name).toBe('Trail Mix');
  });
});

