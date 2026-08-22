import {
  DEMO_MONSTER_COL,
  DEMO_MONSTER_ID,
  DEMO_MONSTER_ROW,
  LANE_COUNT,
  SAFE_ROWS_AFTER_START,
  SHOP_ROW_INTERVAL,
  START_ROW,
} from './config';
import { collectibleId, type CollectibleKind } from './Collectible';
import { merchantId } from './Merchant';
import { pickWeighted, randomInt, type Rng } from './random';

export type LaneKind = 'empty' | 'monster' | 'gold' | 'potion' | 'shop';

export interface LaneRecipe {
  kind: LaneKind;
  entityId?: string;
}

/**
 * Early prototype weights. Must sum to 100.
 * empty 45 / rat 25 / gold 15 / potion 10 / rat+loot 5
 */
export const ROW_PATTERN_WEIGHTS = [
  { item: 'empty', weight: 45 },
  { item: 'rat', weight: 25 },
  { item: 'gold', weight: 15 },
  { item: 'potion', weight: 10 },
  { item: 'ratAndLoot', weight: 5 },
] as const;

export type RowPattern = (typeof ROW_PATTERN_WEIGHTS)[number]['item'];

const LAST_SAFE_ROW = START_ROW + SAFE_ROWS_AFTER_START;

export function createRowRecipe(row: number, rng: Rng): LaneRecipe[] {
  const empty = emptyRow();

  if (row <= LAST_SAFE_ROW) {
    return empty;
  }

  if (row === DEMO_MONSTER_ROW) {
    empty[DEMO_MONSTER_COL] = {
      kind: 'monster',
      entityId: DEMO_MONSTER_ID,
    };
    return empty;
  }

  if (isMerchantRow(row)) {
    const col = randomInt(rng, LANE_COUNT);
    empty[col] = {
      kind: 'shop',
      entityId: merchantId(row),
    };
    return empty;
  }

  return recipeFromPattern(row, pickWeighted(ROW_PATTERN_WEIGHTS, rng), rng);
}

export function isMerchantRow(row: number): boolean {
  return row >= SHOP_ROW_INTERVAL && row % SHOP_ROW_INTERVAL === 0;
}

function emptyRow(): LaneRecipe[] {
  return Array.from({ length: LANE_COUNT }, () => ({ kind: 'empty' as const }));
}

function recipeFromPattern(row: number, pattern: RowPattern, rng: Rng): LaneRecipe[] {
  const lanes = emptyRow();

  if (pattern === 'empty') {
    return lanes;
  }

  if (pattern === 'rat') {
    place(lanes, randomInt(rng, LANE_COUNT), {
      kind: 'monster',
      entityId: `monster-${row}`,
    });
    return lanes;
  }

  if (pattern === 'gold' || pattern === 'potion') {
    const col = randomInt(rng, LANE_COUNT);
    place(lanes, col, {
      kind: pattern,
      entityId: collectibleId(pattern, row, col),
    });
    return lanes;
  }

  const first = randomInt(rng, LANE_COUNT);
  let second = randomInt(rng, LANE_COUNT - 1);
  if (second >= first) {
    second += 1;
  }
  const lootKind: CollectibleKind = rng() < 0.5 ? 'gold' : 'potion';
  place(lanes, first, {
    kind: 'monster',
    entityId: `monster-${row}`,
  });
  place(lanes, second, {
    kind: lootKind,
    entityId: collectibleId(lootKind, row, second),
  });
  return lanes;
}

function place(lanes: LaneRecipe[], col: number, recipe: LaneRecipe): void {
  lanes[col] = recipe;
}
