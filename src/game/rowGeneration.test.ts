import { describe, expect, it } from 'vitest';
import {
  DEMO_MONSTER_COL,
  DEMO_MONSTER_ID,
  DEMO_MONSTER_ROW,
  LANE_COUNT,
  SAFE_ROWS_AFTER_START,
  SHOP_ROW_INTERVAL,
  START_ROW,
  TRAP_START_ROW,
} from './config';
import { mulberry32 } from './random';
import { encounterPoolForRow } from './definitions/encounterPools';
import {
  EARLY_ROW_PATTERN_WEIGHTS,
  ROW_PATTERN_WEIGHTS,
  createRowRecipe,
  isMerchantRow,
  type LaneRecipe,
} from './rowGeneration';

const LAST_SAFE_ROW = START_ROW + SAFE_ROWS_AFTER_START;

function countKinds(recipe: LaneRecipe[]): Record<string, number> {
  return recipe.reduce<Record<string, number>>((counts, lane) => {
    counts[lane.kind] = (counts[lane.kind] ?? 0) + 1;
    return counts;
  }, {});
}

function assertRowSafety(row: number, recipe: LaneRecipe[]): void {
  expect(recipe).toHaveLength(LANE_COUNT);

  const occupied = recipe.filter((lane) => lane.kind !== 'empty');
  const ids = occupied.map((lane) => lane.entityId).filter(Boolean);
  expect(new Set(ids).size).toBe(ids.length);
  expect(occupied.length).toBeLessThan(LANE_COUNT);

  const kinds = countKinds(recipe);
  for (const lane of recipe) {
    if (lane.kind === 'monster') {
      if (row === DEMO_MONSTER_ROW) {
        expect(lane.enemyType).toBe('skeletonMinion');
      } else {
        expect(encounterPoolForRow(row).map((entry) => entry.item)).toContain(
          lane.enemyType,
        );
      }
    }
  }
  expect((kinds.monster ?? 0) <= 1).toBe(true);
  expect((kinds.gold ?? 0) + (kinds.potion ?? 0) <= 1).toBe(true);
  expect((kinds.shop ?? 0) <= 1).toBe(true);
  expect((kinds.trap ?? 0) <= 1).toBe(true);

  if (row < TRAP_START_ROW) {
    expect(kinds.trap ?? 0).toBe(0);
  }

  if (isMerchantRow(row)) {
    expect(kinds.shop).toBe(1);
    expect(kinds.empty).toBe(2);
    expect(kinds.monster ?? 0).toBe(0);
    expect((kinds.gold ?? 0) + (kinds.potion ?? 0)).toBe(0);
    expect(kinds.trap ?? 0).toBe(0);
  }
}

describe('row generation', () => {
  it('keeps the safe opening empty and the demo minion on row 4 centre', () => {
    const rng = mulberry32(123);
    for (let row = START_ROW; row <= LAST_SAFE_ROW; row += 1) {
      expect(createRowRecipe(row, rng).every((lane) => lane.kind === 'empty')).toBe(true);
    }

    const demo = createRowRecipe(DEMO_MONSTER_ROW, rng);
    expect(demo[DEMO_MONSTER_COL]).toEqual({
      kind: 'monster',
      entityId: DEMO_MONSTER_ID,
      enemyType: 'skeletonMinion',
    });
    expect(demo.filter((lane) => lane.kind === 'empty')).toHaveLength(2);
  });

  it('places Merchant rows at 14, 28, and later multiples', () => {
    expect(isMerchantRow(0)).toBe(false);
    expect(isMerchantRow(4)).toBe(false);
    expect(isMerchantRow(13)).toBe(false);
    expect(isMerchantRow(14)).toBe(true);
    expect(isMerchantRow(28)).toBe(true);
    expect(isMerchantRow(42)).toBe(true);
    expect(14 % SHOP_ROW_INTERVAL).toBe(0);
  });

  it('repeats recipes for a fixed seeded RNG', () => {
    const generate = (seed: number) => {
      const rng = mulberry32(seed);
      return Array.from({ length: 40 }, (_, row) => createRowRecipe(row, rng));
    };

    const first = generate(123);
    expect(generate(123)).toEqual(first);
    expect(first[14]?.some((lane) => lane.kind === 'shop')).toBe(true);
    expect(generate(456)).not.toEqual(first);
  });

  it('keeps existing safety guarantees across a long seeded stretch', () => {
    const rng = mulberry32(123);
    for (let row = 0; row < 80; row += 1) {
      assertRowSafety(row, createRowRecipe(row, rng));
    }
  });

  it('places no traps in rows 0–7 and never on Merchant rows', () => {
    const rng = mulberry32(99);
    for (let row = 0; row < TRAP_START_ROW; row += 1) {
      expect(createRowRecipe(row, rng).some((lane) => lane.kind === 'trap')).toBe(
        false,
      );
    }
    for (const row of [14, 28, 42, 56]) {
      const recipe = createRowRecipe(row, rng);
      expect(recipe.some((lane) => lane.kind === 'shop')).toBe(true);
      expect(recipe.some((lane) => lane.kind === 'trap')).toBe(false);
    }
  });

  it('keeps trap-only and monster-plus-trap recipes inside safety rules', () => {
    const seen = { alarm: false, monsterAndAlarm: false };
    for (let seed = 1; seed < 200 && (!seen.alarm || !seen.monsterAndAlarm); seed += 1) {
      const rng = mulberry32(seed);
      for (let row = TRAP_START_ROW; row < 80; row += 1) {
        const recipe = createRowRecipe(row, rng);
        if (isMerchantRow(row)) {
          continue;
        }
        const kinds = countKinds(recipe);
        if (kinds.trap === 1 && !kinds.monster) {
          expect(kinds.empty).toBe(2);
          seen.alarm = true;
        }
        if (kinds.trap === 1 && kinds.monster === 1) {
          expect(kinds.empty).toBe(1);
          expect((kinds.gold ?? 0) + (kinds.potion ?? 0)).toBe(0);
          seen.monsterAndAlarm = true;
        }
        assertRowSafety(row, recipe);
      }
    }
    expect(seen.alarm).toBe(true);
    expect(seen.monsterAndAlarm).toBe(true);
  });

  it('repeats trap lanes and enemy types for a fixed seed', () => {
    const generate = (seed: number) => {
      const rng = mulberry32(seed);
      return Array.from({ length: 60 }, (_, row) => createRowRecipe(row, rng));
    };

    const first = generate(321);
    expect(generate(321)).toEqual(first);
    expect(first.slice(TRAP_START_ROW).some((row) => row.some((lane) => lane.kind === 'trap'))).toBe(
      true,
    );
    expect(generate(654)).not.toEqual(first);
  });

  it('keeps named generation tables summing to 100', () => {
    const sum = (weights: readonly { weight: number }[]) =>
      weights.reduce((total, entry) => total + entry.weight, 0);
    expect(sum(EARLY_ROW_PATTERN_WEIGHTS)).toBe(100);
    expect(sum(ROW_PATTERN_WEIGHTS)).toBe(100);
  });
});
