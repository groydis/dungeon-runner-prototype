import { describe, expect, it } from 'vitest';
import { DEMO_MONSTER_COL, DEMO_MONSTER_ROW } from '../config';
import { mulberry32 } from '../random';
import { createRowRecipe } from '../rowGeneration';
import {
  encounterPoolForRow,
  pickEnemyTypeForRow,
} from './encounterPools';

describe('encounter pool boundaries', () => {
  it('keeps the demo row as a Skeleton Minion', () => {
    const demo = createRowRecipe(DEMO_MONSTER_ROW, () => 0);
    expect(demo[DEMO_MONSTER_COL]).toMatchObject({
      kind: 'monster',
      enemyType: 'skeletonMinion',
    });
  });

  it('uses only Skeleton Minion for rows 5–19', () => {
    expect(encounterPoolForRow(5).map((entry) => entry.item)).toEqual(['skeletonMinion']);
    expect(encounterPoolForRow(19).map((entry) => entry.item)).toEqual(['skeletonMinion']);
    expect(pickEnemyTypeForRow(5, () => 0)).toBe('skeletonMinion');
    expect(pickEnemyTypeForRow(19, () => 0.99)).toBe('skeletonMinion');
  });

  it('begins allowing Crypt Guard and Skeleton Mage at row 20', () => {
    expect(encounterPoolForRow(19).some((entry) => entry.item === 'cryptGuard')).toBe(
      false,
    );
    expect(encounterPoolForRow(20).some((entry) => entry.item === 'cryptGuard')).toBe(
      true,
    );
    expect(encounterPoolForRow(39).some((entry) => entry.item === 'boneBrute')).toBe(
      false,
    );
    expect(encounterPoolForRow(20).some((entry) => entry.item === 'skeletonMage')).toBe(
      true,
    );
  });

  it('reserves the elite Necromancer for row 60+', () => {
    expect(encounterPoolForRow(59).some((entry) => entry.item === 'necromancer')).toBe(
      false,
    );
    expect(encounterPoolForRow(60).some((entry) => entry.item === 'necromancer')).toBe(
      true,
    );
  });

  it('begins allowing Bone Brute and Skeleton Warrior at row 40', () => {
    expect(encounterPoolForRow(40).some((entry) => entry.item === 'boneBrute')).toBe(
      true,
    );
    expect(
      encounterPoolForRow(40).some((entry) => entry.item === 'skeletonWarrior'),
    ).toBe(true);
  });
});

describe('weighted enemy selection', () => {
  it('selects each mid-band branch with a deterministic roll', () => {
    expect(pickEnemyTypeForRow(20, () => 0)).toBe('skeletonMinion');
    expect(pickEnemyTypeForRow(20, () => 0.7)).toBe('cryptGuard');
    expect(pickEnemyTypeForRow(39, () => 0.99)).toBe('skeletonMage');
  });

  it('selects each late-band branch with a deterministic roll', () => {
    expect(pickEnemyTypeForRow(40, () => 0)).toBe('skeletonMinion');
    expect(pickEnemyTypeForRow(40, () => 0.5)).toBe('cryptGuard');
    expect(pickEnemyTypeForRow(40, () => 0.7)).toBe('skeletonWarrior');
    expect(pickEnemyTypeForRow(40, () => 0.8)).toBe('boneBrute');
    expect(pickEnemyTypeForRow(40, () => 0.99)).toBe('skeletonMage');
    expect(pickEnemyTypeForRow(60, () => 0.99)).toBe('necromancer');
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
    expect(first.some((type) => type === 'skeletonMinion')).toBe(true);
  });

  it('can produce a different sequence for a different seed', () => {
    expect(enemyTypes(123, 60)).not.toEqual(enemyTypes(456, 60));
  });
});
