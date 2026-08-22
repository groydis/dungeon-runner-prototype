import { describe, expect, it } from 'vitest';
import {
  DEMO_MONSTER_COL,
  DEMO_MONSTER_ID,
  DEMO_MONSTER_ROW,
  LANE_COUNT,
  SAFE_ROWS_AFTER_START,
  SHOP_ROW_INTERVAL,
  START_ROW,
} from './config';
import { mulberry32 } from './random';
import {
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
  expect((kinds.monster ?? 0) <= 1).toBe(true);
  expect((kinds.gold ?? 0) + (kinds.potion ?? 0) <= 1).toBe(true);
  expect((kinds.shop ?? 0) <= 1).toBe(true);

  if (isMerchantRow(row)) {
    expect(kinds.shop).toBe(1);
    expect(kinds.empty).toBe(2);
    expect(kinds.monster ?? 0).toBe(0);
    expect((kinds.gold ?? 0) + (kinds.potion ?? 0)).toBe(0);
  }
}

describe('row generation', () => {
  it('keeps the safe opening empty and the demo rat on row 4 centre', () => {
    const rng = mulberry32(123);
    for (let row = START_ROW; row <= LAST_SAFE_ROW; row += 1) {
      expect(createRowRecipe(row, rng).every((lane) => lane.kind === 'empty')).toBe(true);
    }

    const demo = createRowRecipe(DEMO_MONSTER_ROW, rng);
    expect(demo[DEMO_MONSTER_COL]).toEqual({
      kind: 'monster',
      entityId: DEMO_MONSTER_ID,
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
});
