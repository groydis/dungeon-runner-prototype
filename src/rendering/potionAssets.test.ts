import { describe, expect, it } from 'vitest';
import {
  ACTIVE_POTION_MODEL_SIZE,
  FLOOR_POTION_MODEL_SIZES,
  POTION_MODEL_URLS,
  POTION_TARGET_EXTENT,
  RESERVED_POTION_MODEL_SIZES,
} from './potionAssets';

describe('KayKit potion assets', () => {
  it('registers all four floor tiers including huge greater', () => {
    expect(ACTIVE_POTION_MODEL_SIZE).toBe('small');
    expect(FLOOR_POTION_MODEL_SIZES).toEqual([
      'small',
      'medium',
      'large',
      'greater',
    ]);
    expect(RESERVED_POTION_MODEL_SIZES).toEqual(['medium', 'large', 'greater']);
    expect(Object.keys(POTION_MODEL_URLS).sort()).toEqual(
      ['greater', 'large', 'medium', 'small'].sort(),
    );
    expect(POTION_MODEL_URLS.greater).toBe(
      '/models/items/kaykit/potion_huge_red.glb',
    );
    expect(POTION_TARGET_EXTENT.greater).toBeGreaterThan(POTION_TARGET_EXTENT.small);
  });

  it('uses self-contained project-local GLBs', () => {
    for (const url of Object.values(POTION_MODEL_URLS)) {
      expect(url).toMatch(/^\/models\/items\/kaykit\/potion_.+_red\.glb$/);
    }
  });
});
