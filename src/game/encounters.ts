import { type Monster } from './Monster';
import { type Player } from './Player';

export type CombatApproach = 'frontOn' | 'surprise';

export type EncounterEvent =
  | {
      kind: 'combat';
      approach: CombatApproach;
      monster: Monster;
    }
  | {
      kind: 'evade';
      monster: Monster;
    };

export type AvoidanceRoll = () => boolean;

export function rollAvoidance(random: () => number = Math.random): boolean {
  return random() < 0.5;
}

/**
 * Development helper: `?avoid=1` always evades, `?avoid=0` always starts
 * Surprise Attack combat. Production play uses a live 50/50 roll.
 */
export function avoidanceRollerFromSearch(search: string): AvoidanceRoll {
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
  return () => rollAvoidance();
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
  player: Pick<Player, 'row' | 'col'>,
  monsters: Iterable<Monster>,
  roll: AvoidanceRoll = () => rollAvoidance(),
): EncounterEvent[] {
  const events: EncounterEvent[] = [];

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

    // Same row, adjacent lane: one avoidance roll.
    if (roll()) {
      events.push({ kind: 'evade', monster });
    } else {
      events.push({ kind: 'combat', approach: 'surprise', monster });
    }
  }

  return events;
}

export function encounterStartText(event: EncounterEvent): string {
  const { name } = event.monster;
  if (event.kind === 'evade') {
    return `You slip past the ${name}.`;
  }
  if (event.approach === 'surprise') {
    return `You catch the ${name} off guard!`;
  }
  return `A ${name} blocks your path!`;
}

export function combatVictoryText(monsterName: string): string {
  return `You defeated the ${monsterName}.`;
}

export function combatDefeatText(monsterName: string): string {
  return `You were killed by the ${monsterName}.`;
}
