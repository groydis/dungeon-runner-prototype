import { describe, expect, it } from 'vitest';
import { DEMO_MONSTER_COL, DEMO_MONSTER_ROW } from '../config';
import { mulberry32 } from '../random';
import { createRowRecipe } from '../rowGeneration';
import {
  encounterPoolForRow,
  pickEnemyTypeForRow,
} from './encounterPools';

describe('encounter pool boundaries', () => {
  it('keeps the demo row as a Cave Rat', () => {
    const demo = createRowRecipe(DEMO_MONSTER_ROW, () => 0);
    expect(demo[DEMO_MONSTER_COL]).toMatchObject({
      kind: 'monster',
      enemyType: 'caveRat',
    });
  });

  it('uses only Cave Rat for rows 5–19', () => {
    expect(encounterPoolForRow(5).map((entry) => entry.item)).toEqual(['caveRat']);
    expect(encounterPoolForRow(19).map((entry) => entry.item)).toEqual(['caveRat']);
    expect(pickEnemyTypeForRow(5, () => 0)).toBe('caveRat');
    expect(pickEnemyTypeForRow(19, () => 0.99)).toBe('caveRat');
  });

  it('begins allowing Crypt Guard at row 20', () => {
    expect(encounterPoolForRow(19).some((entry) => entry.item === 'cryptGuard')).toBe(
      false,
    );
    expect(encounterPoolForRow(20).some((entry) => entry.item === 'cryptGuard')).toBe(
      true,
    );
    expect(encounterPoolForRow(39).some((entry) => entry.item === 'boneBrute')).toBe(
      false,
    );
  });

  it('begins allowing Bone Brute at row 40', () => {
    expect(encounterPoolForRow(40).some((entry) => entry.item === 'boneBrute')).toBe(
      true,
    );
  });
});

describe('weighted enemy selection', () => {
  it('selects each mid-band branch with a deterministic roll', () => {
    expect(pickEnemyTypeForRow(20, () => 0)).toBe('caveRat');
    expect(pickEnemyTypeForRow(20, () => 0.75)).toBe('cryptGuard');
    expect(pickEnemyTypeForRow(39, () => 0.99)).toBe('cryptGuard');
  });

  it('selects each late-band branch with a deterministic roll', () => {
    expect(pickEnemyTypeForRow(40, () => 0)).toBe('caveRat');
    expect(pickEnemyTypeForRow(40, () => 0.5)).toBe('cryptGuard');
    expect(pickEnemyTypeForRow(40, () => 0.85)).toBe('boneBrute');
  });
});

describe('seeded enemy-type sequences', () => {
  function enemyTypes(seed: number, rows: number): Array<string | null> {
    const rng = mulberry32(seed);
    return Array.from({ length: rows }, (_, row) => {
      const monster = createRowRecipe(row, rng).find((lane) => lane.kind === 'monster');
      return monster && monster.kind === 'monster' ? monster.enemyType : null;
    });
  }

  it('replays the same enemy-type sequence for the same seed', () => {
    const first = enemyTypes(123, 60);
    expect(enemyTypes(123, 60)).toEqual(first);
    expect(first.some((type) => type === 'caveRat')).toBe(true);
  });

  it('can produce a different sequence for a different seed', () => {
    expect(enemyTypes(123, 60)).not.toEqual(enemyTypes(456, 60));
  });
});
