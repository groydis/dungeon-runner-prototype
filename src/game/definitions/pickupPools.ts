import {
  type PickupCategory,
  type PickupId,
} from './pickupCatalog';

export interface WeightedPickupEntry {
  id: PickupId;
  weight: number;
}

export interface PickupPool {
  entries: readonly WeightedPickupEntry[];
  totalWeight: number;
}

function required(entries: WeightedPickupEntry[]): PickupPool {
  if (entries.length === 0 || entries.some((entry) => entry.weight <= 0)) {
    throw new Error('Pickup pools must be non-empty with positive weights');
  }
  return {
    entries,
    totalWeight: entries.reduce((sum, entry) => sum + entry.weight, 0),
  };
}

/**
 * Distance-scaled tiers keyed on the generated row (same bands as iOS
 * `PickupPools`). Deeper bands add larger tiers without removing opening ones.
 */
export const PICKUP_POOLS = {
  goldRows0Through19: required([{ id: 'gold', weight: 100 }]),
  goldRows20Through39: required([
    { id: 'gold', weight: 70 },
    { id: 'gold_stack', weight: 30 },
  ]),
  goldRows40AndBeyond: required([
    { id: 'gold', weight: 40 },
    { id: 'gold_stack', weight: 40 },
    { id: 'gold_hoard', weight: 20 },
  ]),
  potionRows0Through19: required([{ id: 'potion', weight: 100 }]),
  potionRows20Through39: required([
    { id: 'potion', weight: 60 },
    { id: 'potion_medium', weight: 30 },
    { id: 'potion_large', weight: 10 },
  ]),
  /** Greater appears in this band alone — depth is the only way to reach it. */
  potionRows40AndBeyond: required([
    { id: 'potion', weight: 35 },
    { id: 'potion_medium', weight: 35 },
    { id: 'potion_large', weight: 22 },
    { id: 'potion_greater', weight: 8 },
  ]),
} as const;

export function pickupPoolForRow(
  row: number,
  category: PickupCategory,
): PickupPool {
  if (category === 'gold') {
    if (row < 20) {
      return PICKUP_POOLS.goldRows0Through19;
    }
    if (row < 40) {
      return PICKUP_POOLS.goldRows20Through39;
    }
    return PICKUP_POOLS.goldRows40AndBeyond;
  }
  if (row < 20) {
    return PICKUP_POOLS.potionRows0Through19;
  }
  if (row < 40) {
    return PICKUP_POOLS.potionRows20Through39;
  }
  return PICKUP_POOLS.potionRows40AndBeyond;
}

/** Accepts an integer in `0..<totalWeight`. */
export function pickFromPickupPool(pool: PickupPool, roll: number): PickupId {
  if (roll < 0 || roll >= pool.totalWeight) {
    throw new Error(`Pickup pool roll ${roll} out of range`);
  }
  let boundary = 0;
  for (const entry of pool.entries) {
    boundary += entry.weight;
    if (roll < boundary) {
      return entry.id;
    }
  }
  return pool.entries[pool.entries.length - 1].id;
}
