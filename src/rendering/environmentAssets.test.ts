import { describe, expect, it } from 'vitest';
import {
  DUNGEON_FLOOR_KEYS,
  DUNGEON_FLOOR_URLS,
  dungeonFloorVariant,
} from './environmentAssets';
import source from './environmentAssets.ts?raw';

describe('dungeon environment assets', () => {
  it('uses three self-contained floor variants', () => {
    expect([...DUNGEON_FLOOR_KEYS].sort()).toEqual(
      ['stone', 'brokenA', 'brokenB'].sort(),
    );
    for (const url of Object.values(DUNGEON_FLOOR_URLS)) {
      expect(url).toMatch(/^\/models\/environment\/kaykit\/dungeon\/.+\.glb$/);
    }
  });

  it('selects variants deterministically without game-state imports', () => {
    expect(dungeonFloorVariant(17, 2)).toBe(dungeonFloorVariant(17, 2));
    expect(
      new Set(
        Array.from({ length: 30 }, (_, row) => dungeonFloorVariant(row, row % 3)),
      ),
    ).toEqual(new Set(['stone', 'brokenA', 'brokenB']));
    expect(source).not.toMatch(/from ['"][^'"]*\/(GameState|RunWorld)['"]/);
  });
});
