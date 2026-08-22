import { describe, expect, it } from 'vitest';
import { createMonster } from './Monster';
import { findAlignedMonsterEncounters } from './encounters';

function rat(row: number, col: number) {
  return createMonster('rat-1', 'caveRat', row, col);
}

describe('encounters', () => {
  it('treats same-lane front and behind as front-on combat', () => {
    const front = findAlignedMonsterEncounters({ row: 5, col: 1 }, [rat(6, 1)]);
    const behind = findAlignedMonsterEncounters({ row: 5, col: 1 }, [rat(4, 1)]);

    expect(front).toEqual([
      { kind: 'combat', approach: 'frontOn', monster: expect.objectContaining({ row: 6, col: 1 }) },
    ]);
    expect(behind).toEqual([
      { kind: 'combat', approach: 'frontOn', monster: expect.objectContaining({ row: 4, col: 1 }) },
    ]);
  });

  it('uses the injected avoidance roll for adjacent same-row encounters', () => {
    const monster = rat(5, 2);
    const evade = findAlignedMonsterEncounters({ row: 5, col: 1 }, [monster], () => true);
    const surprise = findAlignedMonsterEncounters({ row: 5, col: 1 }, [monster], () => false);

    expect(evade).toEqual([{ kind: 'evade', monster }]);
    expect(surprise).toEqual([{ kind: 'combat', approach: 'surprise', monster }]);
  });

  it('ignores diagonal positions', () => {
    const events = findAlignedMonsterEncounters({ row: 5, col: 1 }, [
      rat(6, 0),
      rat(6, 2),
      rat(4, 0),
      rat(4, 2),
    ]);

    expect(events).toEqual([]);
  });
});
