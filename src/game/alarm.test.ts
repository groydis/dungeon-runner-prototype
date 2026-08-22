import { describe, expect, it } from 'vitest';
import {
  alarmTrapMessage,
  chooseEnemyAdvanceStep,
  manhattan,
  selectClosestVisibleEnemy,
} from './alarm';
import { gameplayVisibleRowRange } from './config';
import { createMonster } from './Monster';

const visible = gameplayVisibleRowRange(8);

describe('alarm targeting', () => {
  it('ignores defeated, resolved, and out-of-window enemies', () => {
    const resolved = createMonster('resolved', 'caveRat', 10, 1);
    resolved.resolveEncounter();
    const dead = createMonster('dead', 'caveRat', 10, 2);
    dead.applyHealth(0);
    const far = createMonster('far', 'caveRat', 30, 1);
    const behind = createMonster('behind', 'caveRat', 6, 1);

    expect(
      selectClosestVisibleEnemy({ row: 8, col: 1 }, [resolved, dead, far, behind], visible),
    ).toBeUndefined();
  });

  it('selects the closest visible enemy by Manhattan distance', () => {
    const near = createMonster('near', 'cryptGuard', 10, 1);
    const far = createMonster('far', 'boneBrute', 14, 2);

    expect(
      selectClosestVisibleEnemy({ row: 8, col: 1 }, [far, near], visible)?.id,
    ).toBe('near');
  });

  it('breaks ties by row distance, then column distance, then id', () => {
    const player = { row: 8, col: 1 };
    const wider = createMonster('a-wide', 'caveRat', 10, 1);
    const nearerRow = createMonster('z-side', 'caveRat', 9, 2);
    expect(
      selectClosestVisibleEnemy(player, [wider, nearerRow], visible)?.id,
    ).toBe('z-side');

    const left = createMonster('z-left', 'caveRat', 10, 0);
    const right = createMonster('a-right', 'caveRat', 10, 2);
    expect(selectClosestVisibleEnemy(player, [left, right], visible)?.id).toBe(
      'a-right',
    );

    const first = createMonster('guard-a', 'cryptGuard', 11, 0);
    const second = createMonster('guard-b', 'cryptGuard', 11, 2);
    expect(selectClosestVisibleEnemy(player, [second, first], visible)?.id).toBe(
      'guard-a',
    );
  });
});

describe('alarm enemy advance', () => {
  it('prefers a vertical step toward the player when that tile is valid', () => {
    const dest = chooseEnemyAdvanceStep({ row: 10, col: 1 }, { row: 8, col: 0 }, () => true);
    expect(dest).toEqual({ row: 9, col: 1 });
    expect(manhattan(dest!, { row: 8, col: 0 })).toBe(2);
  });

  it('falls back to a horizontal step when the vertical tile is blocked', () => {
    const dest = chooseEnemyAdvanceStep(
      { row: 10, col: 0 },
      { row: 8, col: 1 },
      (row, col) => !(row === 9 && col === 0),
    );
    expect(dest).toEqual({ row: 10, col: 1 });
  });

  it('does not leave the three lanes or move diagonally', () => {
    const dest = chooseEnemyAdvanceStep({ row: 10, col: 0 }, { row: 8, col: 0 }, () => true);
    expect(dest).toEqual({ row: 9, col: 0 });
    expect(
      chooseEnemyAdvanceStep({ row: 10, col: 0 }, { row: 8, col: 0 }, (_row, col) => col >= 0 && col <= 2),
    ).toEqual({ row: 9, col: 0 });
  });

  it('returns no move when every closer cardinal tile is invalid', () => {
    expect(
      chooseEnemyAdvanceStep({ row: 10, col: 1 }, { row: 8, col: 1 }, () => false),
    ).toBeNull();
  });
});

describe('alarm status text', () => {
  it('reports no answer, a close-in, and crushed items', () => {
    expect(alarmTrapMessage({ moved: false })).toBe(
      'You trigger an Alarm Trap… but nothing answers.',
    );
    expect(alarmTrapMessage({ enemyName: 'Crypt Guard', moved: true })).toBe(
      'Alarm Trap! The Crypt Guard closes in.',
    );
    expect(
      alarmTrapMessage({ enemyName: 'Bone Brute', moved: true, consumed: 'potion' }),
    ).toBe('Alarm Trap! The Bone Brute closes in and crushes a potion.');
  });
});
