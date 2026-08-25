import { describe, expect, it } from 'vitest';
import { ENEMY_DEFINITIONS } from './definitions/enemies';
import {
  avoidanceRollerFromSearch,
  encounterStartText,
  findAlignedMonsterEncounters,
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

describe('opposed DEX evade contest', () => {
  it('wins only when player total is strictly greater', () => {
    // playerDex 5 + roll 3 = 8; enemyDex 5 + roll 3 = 8 → tie fails
    let calls = 0;
    const tie = () => {
      calls += 1;
      return 0.2; // floor(0.2*10)+1 = 3
    };
    expect(rollEvadeContest(5, 5, tie)).toBe(false);
    expect(calls).toBe(2);

    // player 10+1=11 > enemy 5+10=15? use controlled rolls
    const sequence = [0.0, 0.9]; // d10=1 then d10=10 → 8+1=9 vs 5+10=15 fail
    let i = 0;
    expect(rollEvadeContest(8, 5, () => sequence[i++]!)).toBe(false);

    const winSeq = [0.9, 0.0]; // 5+10=15 > 10+1=11
    i = 0;
    expect(rollEvadeContest(5, 10, () => winSeq[i++]!)).toBe(true);
  });

  it('uses each enemy’s dex attribute in side-pass contests', () => {
    expect(ENEMY_DEFINITIONS.skeletonMinion.startingStats.dex).toBe(9);
    expect(ENEMY_DEFINITIONS.cryptGuard.startingStats.dex).toBe(6);
    expect(ENEMY_DEFINITIONS.boneBrute.startingStats.dex).toBe(1);

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
    expect(rolls).toHaveLength(2);
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
