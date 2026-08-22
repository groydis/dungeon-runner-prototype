import { EVADE_CHANCE_MAX, PLAYER_BASE_EVADE } from './config';
import { type Monster } from './Monster';
import { type Player } from './Player';
import { type Rng } from './random';

export type CombatApproach = 'frontOn' | 'surprise';

export type EncounterEvent =
  | {
      kind: 'combat';
      approach: CombatApproach;
      monster: Monster;
      evadeChance?: number;
    }
  | {
      kind: 'evade';
      monster: Monster;
      evadeChance?: number;
    };

export type AvoidanceRoll = (chance?: number) => boolean;

export function evadeChance(
  playerEvade: number,
  enemyPerception: number,
): number {
  return Math.min(
    EVADE_CHANCE_MAX,
    Math.max(0, playerEvade - enemyPerception),
  );
}

/** `chance` is a percent. `random()` is [0, 1). */
export function rollAvoidance(
  chance: number,
  random: () => number = Math.random,
): boolean {
  return random() * 100 < chance;
}

/**
 * Development helper: `?avoid=1` always evades, `?avoid=0` always starts
 * Surprise Attack combat, ignoring Evade and Perception.
 * When neither is set, returns undefined so GameState can use its evade RNG.
 */
export function avoidanceOverrideFromSearch(search: string): AvoidanceRoll | undefined {
  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  );
  const forced = params.get('avoid');
  if (forced === '1' || forced === 'true') {
    return () => true;
  }
  if (forced === '0' || forced === 'false') {
    return () => false;
  }
  return undefined;
}

/**
 * Testing helper. Forced `?avoid=` values win; otherwise rolls against chance
 * with the optional RNG (defaults to `Math.random`).
 */
export function avoidanceRollerFromSearch(
  search: string,
  random?: Rng,
): AvoidanceRoll {
  return (
    avoidanceOverrideFromSearch(search) ??
    ((chance = PLAYER_BASE_EVADE) => rollAvoidance(chance, random))
  );
}

/**
 * Cardinal plus around the monster. Diagonals do not engage.
 *
 *        [ x ]
 *   [ x ][ o ][ x ]
 *        [ x ]
 */
export function isMonsterAttackPosition(
  player: Pick<Player, 'row' | 'col'>,
  monster: Pick<Monster, 'row' | 'col'>,
): boolean {
  const dRow = Math.abs(player.row - monster.row);
  const dCol = Math.abs(player.col - monster.col);
  return (dRow === 1 && dCol === 0) || (dRow === 0 && dCol === 1);
}

function isOnMonsterTile(
  player: Pick<Player, 'row' | 'col'>,
  monster: Pick<Monster, 'row' | 'col'>,
): boolean {
  return player.row === monster.row && player.col === monster.col;
}

/** Pure checks. Does not mutate monsters or tiles. */
export function findAlignedMonsterEncounters(
  player: Pick<Player, 'row' | 'col'> & { evade?: number },
  monsters: Iterable<Monster>,
  roll: AvoidanceRoll = (chance = PLAYER_BASE_EVADE) => rollAvoidance(chance),
): EncounterEvent[] {
  const events: EncounterEvent[] = [];
  const playerEvade = player.evade ?? PLAYER_BASE_EVADE;

  for (const monster of monsters) {
    if (monster.encounterResolved) {
      continue;
    }

    if (isOnMonsterTile(player, monster)) {
      events.push({ kind: 'combat', approach: 'frontOn', monster });
      continue;
    }

    if (!isMonsterAttackPosition(player, monster)) {
      continue;
    }

    // Same lane, one row in front or behind: guaranteed front-on fight.
    if (monster.col === player.col) {
      events.push({ kind: 'combat', approach: 'frontOn', monster });
      continue;
    }

    const chance = evadeChance(playerEvade, monster.perception);
    if (roll(chance)) {
      events.push({ kind: 'evade', monster, evadeChance: chance });
    } else {
      events.push({
        kind: 'combat',
        approach: 'surprise',
        monster,
        evadeChance: chance,
      });
    }
  }

  return events;
}

export function encounterStartText(event: EncounterEvent): string {
  const { name } = event.monster;
  const chanceSuffix =
    event.evadeChance === undefined ? '' : ` Evade chance: ${event.evadeChance}%.`;
  if (event.kind === 'evade') {
    return `You slip past the ${name}.${chanceSuffix}`;
  }
  if (event.approach === 'surprise') {
    return `You catch the ${name} off guard!${chanceSuffix}`;
  }
  return `A ${name} blocks your path!`;
}

export function combatVictoryText(monsterName: string): string {
  return `You defeated the ${monsterName}.`;
}

export function combatDefeatText(monsterName: string): string {
  return `You were killed by the ${monsterName}.`;
}
