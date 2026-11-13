import { describe, expect, it } from 'vitest';
import { getLoginDestination } from './loginDestination';

describe('getLoginDestination', () => {
  it('sends an admin to the requested admin route', () => {
    expect(getLoginDestination('ADMIN', '/admin/inventory')).toBe('/admin/inventory');
  });

  it('defaults an admin to the admin console', () => {
    expect(getLoginDestination('ADMIN')).toBe('/admin');
  });

  it('does not send a member to a requested admin route', () => {
    expect(getLoginDestination('MEMBER', '/admin/inventory')).toBe('/');
  });

  it('preserves a member requested route outside the admin area', () => {
    expect(getLoginDestination('MEMBER', '/my-pantry')).toBe('/my-pantry');
  });
});
