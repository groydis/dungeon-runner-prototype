import {
  encounterMonsterView,
  type EncounterMonsterView,
  type MoveThreat,
} from './BoardSnapshot';
import { type Monster } from './Monster';
import { type Player } from './Player';
import { type Rng } from './random';

export type CombatApproach = 'frontOn' | 'surprise';

export type EncounterEvent =
  | {
      kind: 'combat';
      approach: CombatApproach;
      monster: EncounterMonsterView;
    }
  | {
      kind: 'evade';
      monster: EncounterMonsterView;
    };

/** Force evade (`true`) or surprise combat (`false`), bypassing the DEX contest. */
export type AvoidanceRoll = () => boolean;

/**
 * Opposed d10 contest: playerDex + d10 > enemyDex + d10.
 * Ties fail to evade (combat).
 */
export function rollEvadeContest(
  playerDex: number,
  enemyDex: number,
  random: () => number = Math.random,
): boolean {
  return random() * 100 < calculateEvadeChance(playerDex, enemyDex);
}

export function calculateEvadeChance(
  playerFinesse: number,
  enemyAwareness: number,
  evadeBonus = 0,
): number {
  const modifier = Math.floor((playerFinesse - 10) / 2);
  return Math.min(80, Math.max(20, 50 + 5 * (modifier - enemyAwareness) + evadeBonus));
}

/**
 * Development helper: `?avoid=1` always evades, `?avoid=0` always starts
 * Surprise Attack combat, ignoring the DEX contest.
 * When neither is set, returns undefined so GameState can use the contest.
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
 * Testing helper. Forced `?avoid=` values win; otherwise rolls the DEX contest
 * with a placeholder (callers that need a real contest should use
 * `rollEvadeContest` directly). Prefer injecting `forceRoll` into
 * `findAlignedMonsterEncounters`.
 */
export function avoidanceRollerFromSearch(
  search: string,
  _random?: Rng,
): AvoidanceRoll {
  return avoidanceOverrideFromSearch(search) ?? (() => false);
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
  player: Pick<Player, 'row' | 'col'> & { dex: number; evadeBonus?: number },
  monsters: Iterable<Monster>,
  forceRoll?: AvoidanceRoll,
  random: () => number = Math.random,
): EncounterEvent[] {
  const events: EncounterEvent[] = [];

  for (const monster of monsters) {
    if (monster.encounterResolved) {
      continue;
    }

    const view = encounterMonsterView(monster);

    if (isOnMonsterTile(player, monster)) {
      events.push({ kind: 'combat', approach: 'frontOn', monster: view });
      continue;
    }

    if (!isMonsterAttackPosition(player, monster)) {
      continue;
    }

    // Same lane, one row in front or behind: guaranteed front-on fight.
    if (monster.col === player.col) {
      events.push({ kind: 'combat', approach: 'frontOn', monster: view });
      continue;
    }

    const evaded = forceRoll
      ? forceRoll()
      : random() * 100 < calculateEvadeChance(
          player.dex,
          monster.stats.awareness,
          player.evadeBonus ?? 0,
        );
    if (evaded) {
      events.push({ kind: 'evade', monster: view });
    } else {
      events.push({
        kind: 'combat',
        approach: 'surprise',
        monster: view,
      });
    }
  }

  return events;
}

/** Exact, RNG-free preview of encounters a candidate lane would create. */
export function previewAlignedMonsterThreats(
  player: Pick<Player, 'row' | 'col'> & { dex: number; evadeBonus?: number },
  monsters: Iterable<Monster>,
): MoveThreat[] {
  const threats: MoveThreat[] = [];
  for (const monster of monsters) {
    if (monster.encounterResolved) continue;
    const onTile = isOnMonsterTile(player, monster);
    if (!onTile && !isMonsterAttackPosition(player, monster)) continue;
    const sidePass = !onTile && monster.row === player.row && monster.col !== player.col;
    threats.push({
      monsterId: monster.id,
      monsterName: monster.name,
      channel: monster.stats.damageChannel,
      elite: monster.elite,
      approach: sidePass ? 'sidePass' : 'frontOn',
      evadeChance: sidePass
        ? calculateEvadeChance(player.dex, monster.stats.awareness, player.evadeBonus ?? 0)
        : null,
    });
  }
  return threats;
}

export function encounterStartText(event: EncounterEvent): string {
  const { name } = event.monster;
  if (event.kind === 'evade') {
    return `You slip past the ${name}.`;
  }
  if (event.approach === 'surprise') {
    return `The ${name} catches you off guard!`;
  }
  return `A ${name} blocks your path!`;
}

export function combatVictoryText(monsterName: string): string {
  return `You defeated the ${monsterName}.`;
}

export function combatDefeatText(monsterName: string): string {
  return `You were killed by the ${monsterName}.`;
}
