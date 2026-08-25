import { describe, expect, it } from 'vitest';
import {
  COIN_MODEL_URLS,
  COIN_TARGET_EXTENT,
  FLOOR_COIN_MODEL_SIZES,
} from './coinAssets';

describe('KayKit coin assets', () => {
  it('registers all three floor gold tiers', () => {
    expect(FLOOR_COIN_MODEL_SIZES).toEqual([
      'coin',
      'coinStackSmall',
      'coinStackLarge',
    ]);
    expect(Object.keys(COIN_MODEL_URLS).sort()).toEqual(
      [...FLOOR_COIN_MODEL_SIZES].sort(),
    );
    expect(COIN_MODEL_URLS.coinStackLarge).toBe(
      '/models/items/kaykit/coin_stack_large.glb',
    );
    expect(COIN_TARGET_EXTENT.coinStackLarge).toBeGreaterThan(
      COIN_TARGET_EXTENT.coin,
    );
    expect(COIN_TARGET_EXTENT).toEqual({
      coin: 0.34,
      coinStackSmall: 0.5,
      coinStackLarge: 0.66,
    });
  });

  it('uses self-contained project-local GLBs', () => {
    for (const url of Object.values(COIN_MODEL_URLS)) {
      expect(url).toMatch(/^\/models\/items\/kaykit\/coin.*\.glb$/);
    }
  });
});
