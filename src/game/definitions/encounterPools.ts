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

/** Inclusive lower bounds. The highest matching minRow wins. */
export const ENCOUNTER_POOLS: readonly EncounterPoolBand[] = [
  {
    minRow: LATE_ENEMY_POOL_MIN_ROW,
    entries: [
      { item: 'caveRat', weight: 50 },
      { item: 'cryptGuard', weight: 35 },
      { item: 'boneBrute', weight: 15 },
    ],
  },
  {
    minRow: MID_ENEMY_POOL_MIN_ROW,
    entries: [
      { item: 'caveRat', weight: 75 },
      { item: 'cryptGuard', weight: 25 },
    ],
  },
  {
    minRow: EARLY_ENEMY_POOL_MIN_ROW,
    entries: [{ item: 'caveRat', weight: 100 }],
  },
];

export function encounterPoolForRow(row: number): readonly EncounterPoolEntry[] {
  const band = ENCOUNTER_POOLS.find((entry) => row >= entry.minRow);
  return band?.entries ?? ENCOUNTER_POOLS[ENCOUNTER_POOLS.length - 1].entries;
}

export function pickEnemyTypeForRow(row: number, rng: Rng): EnemyType {
  return pickWeighted(encounterPoolForRow(row), rng);
}
