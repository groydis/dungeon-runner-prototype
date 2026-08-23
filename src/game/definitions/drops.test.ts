import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ENEMY_DROP_TABLE,
  ELITE_ENEMY_DROP_TABLE,
  ENEMY_DEFINITIONS,
  enemyDropCollectibleId,
  rollEnemyDrop,
} from './enemies';

describe('enemy drop tables', () => {
  it('gives normal enemies the shared 60/25/15 table and elite its own table', () => {
    expect(DEFAULT_ENEMY_DROP_TABLE).toEqual([
      { item: 'none', weight: 60 },
      { item: 'gold', weight: 25 },
      { item: 'potion', weight: 15 },
    ]);
    expect(
      DEFAULT_ENEMY_DROP_TABLE.reduce((sum, entry) => sum + entry.weight, 0),
    ).toBe(100);

    for (const type of [
      'caveRat',
      'cryptGuard',
      'boneBrute',
      'skeletonMage',
    ] as const) {
      expect(ENEMY_DEFINITIONS[type].dropTable).toBe(DEFAULT_ENEMY_DROP_TABLE);
    }
    expect(ENEMY_DEFINITIONS.necromancer.dropTable).toBe(ELITE_ENEMY_DROP_TABLE);
  });

  it('selects none, gold, and potion from deterministic roll values', () => {
    expect(rollEnemyDrop(DEFAULT_ENEMY_DROP_TABLE, () => 0)).toBe('none');
    expect(rollEnemyDrop(DEFAULT_ENEMY_DROP_TABLE, () => 0.599)).toBe('none');
    expect(rollEnemyDrop(DEFAULT_ENEMY_DROP_TABLE, () => 0.6)).toBe('gold');
    expect(rollEnemyDrop(DEFAULT_ENEMY_DROP_TABLE, () => 0.849)).toBe('gold');
    expect(rollEnemyDrop(DEFAULT_ENEMY_DROP_TABLE, () => 0.85)).toBe('potion');
    expect(rollEnemyDrop(DEFAULT_ENEMY_DROP_TABLE, () => 0.999)).toBe('potion');
  });

  it('builds unique drop collectible ids from the enemy id', () => {
    expect(enemyDropCollectibleId('gold', 'demo-cave-rat')).toBe(
      'drop-gold-demo-cave-rat',
    );
    expect(enemyDropCollectibleId('potion', 'monster-11')).toBe(
      'drop-potion-monster-11',
    );
    expect(enemyDropCollectibleId('gold', 'a')).not.toBe(
      enemyDropCollectibleId('gold', 'b'),
    );
  });
});
