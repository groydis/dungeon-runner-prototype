import { type Monster } from './Monster';
import { type Player } from './Player';

export type EncounterKind = 'combat' | 'evade' | 'ambush';

export interface EncounterEvent {
  kind: EncounterKind;
  monster: Monster;
}

export type AvoidanceRoll = () => boolean;

export function rollAvoidance(random: () => number = Math.random): boolean {
  return random() < 0.5;
}

/**
 * Development helper: `?avoid=1` always evades, `?avoid=0` always ambushes.
 * Production play uses a live 50/50 roll.
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
      events.push({ kind: 'combat', monster });
      continue;
    }

    if (!isMonsterAttackPosition(player, monster)) {
      continue;
    }

    // Same lane, one row in front or behind: guaranteed fight.
    if (monster.col === player.col) {
      events.push({ kind: 'combat', monster });
      continue;
    }

    // Same row, adjacent lane: one avoidance roll.
    events.push({
      kind: roll() ? 'evade' : 'ambush',
      monster,
    });
  }

  return events;
}

export function encounterStatusText(event: EncounterEvent): string {
  const { name } = event.monster;
  if (event.kind === 'combat') {
    return `A ${name} blocks your path! Combat will resolve here later.`;
  }
  if (event.kind === 'evade') {
    return `You slip past the ${name}.`;
  }
  return `The ${name} ambushes you! Combat will resolve here later.`;
}
