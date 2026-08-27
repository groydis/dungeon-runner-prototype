import { describe, expect, it } from 'vitest';
import { ENEMY_DEFINITIONS } from './definitions/enemies';
import {
  avoidanceRollerFromSearch,
  encounterStartText,
  findAlignedMonsterEncounters,
  previewAlignedMonsterThreats,
  rollEvadeContest,
} from './encounters';
import { createMonster } from './Monster';

function minion(row: number, col: number) {
  return createMonster('minion-1', 'skeletonMinion', row, col);
}

const rangerDex = 8;

describe('encounters', () => {
  it('treats same-lane front and behind as front-on combat', () => {
    const front = findAlignedMonsterEncounters(
      { row: 5, col: 1, dex: rangerDex },
      [minion(6, 1)],
    );
    const behind = findAlignedMonsterEncounters(
      { row: 5, col: 1, dex: rangerDex },
      [minion(4, 1)],
    );

    expect(front).toEqual([
      { kind: 'combat', approach: 'frontOn', monster: expect.objectContaining({ row: 6, col: 1 }) },
    ]);
    expect(behind).toEqual([
      { kind: 'combat', approach: 'frontOn', monster: expect.objectContaining({ row: 4, col: 1 }) },
    ]);
  });

  it('uses the injected avoidance roll for adjacent same-row encounters', () => {
    const monster = minion(5, 2);
    const evade = findAlignedMonsterEncounters(
      { row: 5, col: 1, dex: rangerDex },
      [monster],
      () => true,
    );
    const surprise = findAlignedMonsterEncounters(
      { row: 5, col: 1, dex: rangerDex },
      [monster],
      () => false,
    );

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
      },
    ]);
  });

  it('ignores diagonal positions', () => {
    const events = findAlignedMonsterEncounters(
      { row: 5, col: 1, dex: rangerDex },
      [minion(6, 0), minion(6, 2), minion(4, 0), minion(4, 2)],
    );

    expect(events).toEqual([]);
  });
});

describe('FIN and awareness evade contest', () => {
  it('previews guaranteed fights and actual enemy-specific evade chances', () => {
    const front = createMonster('front-1', 'skeletonMage', 6, 1);
    const side = createMonster('side-1', 'cryptGuard', 5, 2);
    const threats = previewAlignedMonsterThreats(
      { row: 5, col: 1, dex: 16, evadeBonus: 10 },
      [front, side],
    );
    expect(threats).toEqual([
      expect.objectContaining({ monsterId: 'front-1', channel: 'arcane', approach: 'frontOn', evadeChance: null }),
      expect.objectContaining({ monsterId: 'side-1', channel: 'physical', approach: 'sidePass', evadeChance: 65 }),
    ]);
  });

  it('rolls once against the bounded percentage chance', () => {
    let calls = 0;
    expect(rollEvadeContest(10, 0, () => { calls += 1; return 0.49; })).toBe(true);
    expect(rollEvadeContest(10, 0, () => 0.5)).toBe(false);
    expect(calls).toBe(1);
  });

  it('uses each enemy’s awareness in side-pass contests', () => {
    expect(ENEMY_DEFINITIONS.skeletonMinion.startingStats.awareness).toBe(0);
    expect(ENEMY_DEFINITIONS.cryptGuard.startingStats.awareness).toBe(2);
    expect(ENEMY_DEFINITIONS.boneBrute.startingStats.awareness).toBe(-1);

    const guard = createMonster('guard-1', 'cryptGuard', 5, 2);
    const rolls: number[] = [];
    findAlignedMonsterEncounters(
      { row: 5, col: 1, dex: 20 },
      [guard],
      undefined,
      () => {
        rolls.push(0.5);
        return 0.5;
      },
    );
    expect(rolls).toHaveLength(1);
  });

  it('omits chance text from side-pass status', () => {
    const monster = minion(5, 2);
    const [evade] = findAlignedMonsterEncounters(
      { row: 5, col: 1, dex: rangerDex },
      [monster],
      () => true,
    );
    expect(encounterStartText(evade!)).toBe('You slip past the Skeleton Minion.');
  });

  it('lets ?avoid=1 and ?avoid=0 force the outcome against any enemy', () => {
    const brute = createMonster('brute-1', 'boneBrute', 5, 2);
    const always = avoidanceRollerFromSearch('?avoid=1');
    const never = avoidanceRollerFromSearch('?avoid=0');

    expect(
      findAlignedMonsterEncounters({ row: 5, col: 1, dex: 0 }, [brute], always),
    ).toEqual([expect.objectContaining({ kind: 'evade' })]);
    expect(
      findAlignedMonsterEncounters({ row: 5, col: 1, dex: 99 }, [brute], never),
    ).toEqual([
      expect.objectContaining({ kind: 'combat', approach: 'surprise' }),
    ]);
  });
});
