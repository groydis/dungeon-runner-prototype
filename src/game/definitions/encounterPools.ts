import { pickWeighted, type Rng } from '../random';
import { type EnemyType } from './enemies';

export interface EncounterPoolEntry {
  item: EnemyType;
  weight: number;
}

export interface EncounterPoolBand {
  minRow: number;
  entries: readonly EncounterPoolEntry[];
}

export const EARLY_ENEMY_POOL_MIN_ROW = 5;
export const MID_ENEMY_POOL_MIN_ROW = 20;
export const LATE_ENEMY_POOL_MIN_ROW = 40;
export const ELITE_ENEMY_POOL_MIN_ROW = 60;

/** Inclusive lower bounds. The highest matching minRow wins. */
export const ENCOUNTER_POOLS: readonly EncounterPoolBand[] = [
  {
    minRow: ELITE_ENEMY_POOL_MIN_ROW,
    entries: [
      { item: 'skeletonMinion', weight: 25 },
      { item: 'cryptGuard', weight: 30 },
      { item: 'boneBrute', weight: 22 },
      { item: 'skeletonMage', weight: 15 },
      { item: 'necromancer', weight: 8 },
    ],
  },
  {
    minRow: LATE_ENEMY_POOL_MIN_ROW,
    entries: [
      { item: 'skeletonMinion', weight: 40 },
      { item: 'cryptGuard', weight: 30 },
      { item: 'boneBrute', weight: 20 },
      { item: 'skeletonMage', weight: 10 },
    ],
  },
  {
    minRow: MID_ENEMY_POOL_MIN_ROW,
    entries: [
      { item: 'skeletonMinion', weight: 65 },
      { item: 'cryptGuard', weight: 25 },
      { item: 'skeletonMage', weight: 10 },
    ],
  },
  {
    minRow: EARLY_ENEMY_POOL_MIN_ROW,
    entries: [{ item: 'skeletonMinion', weight: 100 }],
  },
];

export function encounterPoolForRow(row: number): readonly EncounterPoolEntry[] {
  const band = ENCOUNTER_POOLS.find((entry) => row >= entry.minRow);
  return band?.entries ?? ENCOUNTER_POOLS[ENCOUNTER_POOLS.length - 1].entries;
}

export function pickEnemyTypeForRow(row: number, rng: Rng): EnemyType {
  return pickWeighted(encounterPoolForRow(row), rng);
}
