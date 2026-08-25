import { type Player } from './Player';
import { nextLevelExperience } from './progression';

/** Free points to distribute on each level-up (after the automatic +1 to all). */
export const LEVEL_UP_FREE_POINTS = 2;

export interface LevelUpAllocation {
  str: number;
  con: number;
  def: number;
  dex: number;
}

export type LevelUpUnavailableReason = 'noLevelUp' | 'invalidAllocation';

export type LevelUpAttributeId = keyof LevelUpAllocation;

export const LEVEL_UP_ATTRIBUTES: readonly LevelUpAttributeId[] = [
  'str',
  'con',
  'def',
  'dex',
];

export interface LevelUpView {
  level: number;
  experience: number;
  nextLevelExperience: number | null;
  freePoints: number;
  /** Current attributes shown for context while allocating. */
  attributes: LevelUpAllocation;
}

export interface LevelUpResult {
  success: boolean;
  reason?: LevelUpUnavailableReason;
  allocation?: LevelUpAllocation;
  strGained: number;
  conGained: number;
  defGained: number;
  dexGained: number;
  pendingRemaining: number;
  status: string;
}

export function emptyLevelUpAllocation(): LevelUpAllocation {
  return { str: 0, con: 0, def: 0, dex: 0 };
}

export function allocationSum(allocation: LevelUpAllocation): number {
  return allocation.str + allocation.con + allocation.def + allocation.dex;
}

export function isValidLevelUpAllocation(
  allocation: LevelUpAllocation,
): boolean {
  for (const key of LEVEL_UP_ATTRIBUTES) {
    const value = allocation[key];
    if (!Number.isInteger(value) || value < 0) {
      return false;
    }
  }
  return allocationSum(allocation) === LEVEL_UP_FREE_POINTS;
}

export function buildLevelUpView(
  level: number,
  experience: number,
  attributes: LevelUpAllocation,
): LevelUpView {
  return {
    level,
    experience,
    nextLevelExperience: nextLevelExperience(experience),
    freePoints: LEVEL_UP_FREE_POINTS,
    attributes: { ...attributes },
  };
}

/**
 * Automatic +1 to every attribute, plus the player's free-point allocation.
 * Rejects (no partial apply) if the allocation is invalid.
 */
export function applyLevelUpAllocation(
  player: Player,
  allocation: LevelUpAllocation,
): Omit<LevelUpResult, 'success' | 'pendingRemaining' | 'reason'> | null {
  if (!isValidLevelUpAllocation(allocation)) {
    return null;
  }

  const strGained = 1 + allocation.str;
  const conGained = 1 + allocation.con;
  const defGained = 1 + allocation.def;
  const dexGained = 1 + allocation.dex;

  player.increaseStr(strGained);
  player.increaseCon(conGained);
  player.increaseDef(defGained);
  player.increaseDex(dexGained);

  const stats = player.stats;
  return {
    allocation: { ...allocation },
    strGained,
    conGained,
    defGained,
    dexGained,
    status:
      `Level up: +1 all stats, plus ${allocationSummary(allocation)}. ` +
      `Now STR ${stats.str} · CON ${stats.con} · DEF ${stats.defence} · DEX ${stats.dex}.`,
  };
}

function allocationSummary(allocation: LevelUpAllocation): string {
  const parts = LEVEL_UP_ATTRIBUTES.filter((key) => allocation[key] > 0).map(
    (key) => `+${allocation[key]} ${key.toUpperCase()}`,
  );
  return parts.length > 0 ? parts.join(', ') : 'no free points spent';
}

export function playerAttributeSnapshot(player: {
  stats: { str: number; con: number; defence: number; dex: number };
}): LevelUpAllocation {
  const stats = player.stats;
  return {
    str: stats.str,
    con: stats.con,
    def: stats.defence,
    dex: stats.dex,
  };
}
