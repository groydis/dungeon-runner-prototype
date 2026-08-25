import { describe, expect, it } from 'vitest';
import {
  ACTIVE_POTION_MODEL_SIZE,
  POTION_MODEL_URLS,
  RESERVED_POTION_MODEL_SIZES,
} from './potionAssets';

describe('KayKit potion assets', () => {
  it('activates small red and reserves medium, large, and greater', () => {
    expect(ACTIVE_POTION_MODEL_SIZE).toBe('small');
    expect(RESERVED_POTION_MODEL_SIZES).toEqual(['medium', 'large', 'greater']);
    expect(Object.keys(POTION_MODEL_URLS).sort()).toEqual(
      ['greater', 'large', 'medium', 'small'].sort(),
    );
  });

  it('uses self-contained project-local GLBs', () => {
    for (const url of Object.values(POTION_MODEL_URLS)) {
      expect(url).toMatch(/^\/models\/items\/kaykit\/potion_.+_red\.glb$/);
    }
    expect(POTION_MODEL_URLS.greater).toBe(
      '/models/items/kaykit/potion_huge_red.glb',
    );
  });
});
