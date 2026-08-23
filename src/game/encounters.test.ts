import { describe, expect, it } from 'vitest';
import { PLAYER_BASE_EVADE } from './config';
import { ENEMY_DEFINITIONS } from './definitions/enemies';
import {
  avoidanceRollerFromSearch,
  encounterStartText,
  evadeChance,
  findAlignedMonsterEncounters,
  rollAvoidance,
} from './encounters';
import { createMonster } from './Monster';

function minion(row: number, col: number) {
  return createMonster('minion-1', 'skeletonMinion', row, col);
}

describe('encounters', () => {
  it('treats same-lane front and behind as front-on combat', () => {
    const front = findAlignedMonsterEncounters({ row: 5, col: 1 }, [minion(6, 1)]);
    const behind = findAlignedMonsterEncounters({ row: 5, col: 1 }, [minion(4, 1)]);

    expect(front).toEqual([
      { kind: 'combat', approach: 'frontOn', monster: expect.objectContaining({ row: 6, col: 1 }) },
    ]);
    expect(behind).toEqual([
      { kind: 'combat', approach: 'frontOn', monster: expect.objectContaining({ row: 4, col: 1 }) },
    ]);
  });

  it('uses the injected avoidance roll for adjacent same-row encounters', () => {
    const monster = minion(5, 2);
    const evade = findAlignedMonsterEncounters({ row: 5, col: 1 }, [monster], () => true);
    const surprise = findAlignedMonsterEncounters({ row: 5, col: 1 }, [monster], () => false);

    expect(evade).toEqual([
      {
        kind: 'evade',
        monster: expect.objectContaining({
          id: monster.id,
          name: 'Skeleton Minion',
          row: 5,
          col: 2,
          renderKey: 'skeletonMinion',
        }),
        evadeChance: 1,
      },
    ]);
    expect(surprise).toEqual([
      {
        kind: 'combat',
        approach: 'surprise',
        monster: expect.objectContaining({
          id: monster.id,
          row: 5,
          col: 2,
        }),
        evadeChance: 1,
      },
    ]);
  });

  it('ignores diagonal positions', () => {
    const events = findAlignedMonsterEncounters({ row: 5, col: 1 }, [
      minion(6, 0),
      minion(6, 2),
      minion(4, 0),
      minion(4, 2),
    ]);

    expect(events).toEqual([]);
  });
});

describe('evade chance', () => {
  it('uses each enemy’s Perception against player Evade', () => {
    expect(ENEMY_DEFINITIONS.skeletonMinion.perception).toBe(0);
    expect(ENEMY_DEFINITIONS.cryptGuard.perception).toBe(5);
    expect(ENEMY_DEFINITIONS.boneBrute.perception).toBe(10);

    expect(evadeChance(PLAYER_BASE_EVADE, ENEMY_DEFINITIONS.skeletonMinion.perception)).toBe(1);
    expect(evadeChance(PLAYER_BASE_EVADE, ENEMY_DEFINITIONS.cryptGuard.perception)).toBe(0);
    expect(evadeChance(PLAYER_BASE_EVADE, ENEMY_DEFINITIONS.boneBrute.perception)).toBe(0);
    expect(evadeChance(20, ENEMY_DEFINITIONS.cryptGuard.perception)).toBe(15);
    expect(evadeChance(20, ENEMY_DEFINITIONS.boneBrute.perception)).toBe(10);
  });

  it('clamps the final chance to 0 and 85', () => {
    expect(evadeChance(0, 10)).toBe(0);
    expect(evadeChance(4, 10)).toBe(0);
    expect(evadeChance(90, 0)).toBe(85);
    expect(evadeChance(85, ENEMY_DEFINITIONS.skeletonMinion.perception)).toBe(85);
  });

  it('rolls against the computed percent, not a flat 50/50', () => {
    expect(rollAvoidance(0, () => 0)).toBe(false);
    expect(rollAvoidance(1, () => 0)).toBe(true);
    expect(rollAvoidance(1, () => 0.02)).toBe(false);
    expect(rollAvoidance(16, () => 0.159)).toBe(true);
    expect(rollAvoidance(16, () => 0.16)).toBe(false);
  });

  it('passes that enemy’s chance into the avoidance roll', () => {
    const guard = createMonster('guard-1', 'cryptGuard', 5, 2);
    const brute = createMonster('brute-1', 'boneBrute', 5, 2);
    const seen: number[] = [];
    const record: (chance?: number) => boolean = (chance) => {
      seen.push(chance ?? -1);
      return true;
    };

    findAlignedMonsterEncounters({ row: 5, col: 1, evade: 20 }, [guard], record);
    findAlignedMonsterEncounters({ row: 5, col: 1, evade: 20 }, [brute], record);
    expect(seen).toEqual([15, 10]);
  });

  it('includes the chance in side-pass status text', () => {
    const monster = minion(5, 2);
    const [evade] = findAlignedMonsterEncounters({ row: 5, col: 1 }, [monster], () => true);
    expect(encounterStartText(evade!)).toBe(
      'You slip past the Skeleton Minion. Evade chance: 1.',
    );
  });

  it('lets ?avoid=1 and ?avoid=0 force the outcome against any enemy', () => {
    const brute = createMonster('brute-1', 'boneBrute', 5, 2);
    const always = avoidanceRollerFromSearch('?avoid=1');
    const never = avoidanceRollerFromSearch('?avoid=0');

    expect(
      findAlignedMonsterEncounters({ row: 5, col: 1, evade: 0 }, [brute], always),
    ).toEqual([
      expect.objectContaining({ kind: 'evade', evadeChance: 0 }),
    ]);
    expect(
      findAlignedMonsterEncounters({ row: 5, col: 1, evade: 85 }, [brute], never),
    ).toEqual([
      expect.objectContaining({ kind: 'combat', approach: 'surprise', evadeChance: 75 }),
    ]);
  });
});

