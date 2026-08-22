import { describe, expect, it } from 'vitest';
import {
  DEMO_MONSTER_COL,
  DEMO_MONSTER_ID,
  DEMO_MONSTER_ROW,
} from './config';
import {
  ENEMY_DEFINITIONS,
  createEnemyStats,
  enemyDropCollectibleId,
  enemyStatsFactoryFromSearch,
} from './definitions/enemies';
import { type EncounterEvent } from './encounters';
import { GameState, type TurnResolution } from './GameState';
import { mulberry32 } from './random';
import {
  alarmLane,
  emptyRow,
  monsterLane,
  type LaneRecipe,
  type RowRecipeFactory,
} from './rowGeneration';
import { collectibleId } from './Collectible';

function seededState(): GameState {
  return new GameState({
    createRng: () => mulberry32(123),
    rollAvoidance: () => true,
  });
}

function shopColAt(state: GameState, row: number): number {
  for (let col = 0; col < 3; col += 1) {
    if (state.getTile(row, col)?.content.type === 'shop') {
      return col;
    }
  }
  throw new Error(`Expected a shop on row ${row}`);
}

function safestCol(state: GameState): number {
  const nextRow = state.player.row + 1;
  for (let col = 0; col < 3; col += 1) {
    if (!state.isForwardTile(nextRow, col)) {
      continue;
    }
    const here = state.getTile(nextRow, col)?.content.type;
    const ahead = state.getTile(nextRow + 1, col)?.content.type;
    if (here !== 'monster' && here !== 'trap' && ahead !== 'monster') {
      return col;
    }
  }
  return state.player.col;
}

function playEncounters(state: GameState, encounters: EncounterEvent[]): void {
  for (const event of encounters) {
    if (event.kind === 'evade') {
      state.applyEvade(event.monster);
      continue;
    }
    const result = state.createCombatResult(event);
    for (const entry of result.log) {
      state.applyCombatLogEntry(entry, event.monster);
    }
    state.finishCombat(result, event.monster);
  }
}

function walkTo(state: GameState, row: number, col: number): TurnResolution | null {
  let last: TurnResolution | null = null;
  while (state.player.row < row) {
    const nextRow = state.player.row + 1;
    const nextCol =
      nextRow === row && state.isForwardTile(nextRow, col)
        ? col
        : safestCol(state);
    last = state.resolveCompletedMove(nextCol);
    playEncounters(state, last.encounters);
    if (state.runOver) {
      throw new Error(`Died while walking to row ${row}`);
    }
    if (state.shopOpen && state.player.row < row) {
      state.leaveShop();
    }
  }
  return last;
}

describe('enemy definitions', () => {
  it('spawns the demo Cave Rat from the enemy definition', () => {
    const state = new GameState({
      createRng: () => mulberry32(1),
      rollAvoidance: () => true,
    });

    const monster = state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL);
    const definition = ENEMY_DEFINITIONS.caveRat;

    expect(monster?.id).toBe(DEMO_MONSTER_ID);
    expect(monster?.type).toBe('caveRat');
    expect(monster?.name).toBe(definition.name);
    expect(monster?.renderKey).toBe(definition.renderKey);
    expect(monster?.stats).toEqual(definition.startingStats);
    expect(monster?.stats).toEqual(createEnemyStats('caveRat'));
  });

  it('does not need a separate Cave Rat stats factory for default spawning', () => {
    const state = new GameState();
    const monster = state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL);
    expect(monster?.stats).toEqual(ENEMY_DEFINITIONS.caveRat.startingStats);
  });

  it('applies the fatal query-string override on top of the Cave Rat definition', () => {
    const state = new GameState({
      createEnemyStats: enemyStatsFactoryFromSearch('?fatal=1'),
      rollAvoidance: () => true,
    });

    walkTo(state, DEMO_MONSTER_ROW - 2, 1);
    const resolution = state.resolveCompletedMove(DEMO_MONSTER_COL);
    const combat = resolution.encounters.find((event) => event.kind === 'combat');
    expect(combat).toBeDefined();
    if (!combat || combat.kind !== 'combat') {
      throw new Error('Expected front-on combat with the demo rat');
    }

    expect(combat.monster.stats.attack).toBe(99);
    expect(combat.monster.stats.maxHealth).toBe(
      ENEMY_DEFINITIONS.caveRat.startingStats.maxHealth,
    );

    const result = state.createCombatResult(combat);
    for (const entry of result.log) {
      state.applyCombatLogEntry(entry, combat.monster);
    }
    state.finishCombat(result, combat.monster);

    expect(result.winner).toBe('monster');
    expect(state.runOver).toBe(true);
    expect(state.player.stats.health).toBe(0);
  });
});

describe('turn action validity', () => {
  it('rejects movement after the run is over', () => {
    const state = new GameState({
      createEnemyStats: enemyStatsFactoryFromSearch('?fatal=1'),
      rollAvoidance: () => true,
    });
    walkTo(state, DEMO_MONSTER_ROW - 2, 1);
    const resolution = state.resolveCompletedMove(DEMO_MONSTER_COL);
    playEncounters(state, resolution.encounters);

    expect(state.runOver).toBe(true);
    expect(() => state.resolveCompletedMove(1)).toThrow(/run is over/);
  });

  it('rejects movement while a Merchant shop is open', () => {
    const state = seededState();
    walkTo(state, 13, 1);
    const shopCol = shopColAt(state, 14);
    const resolution = state.resolveCompletedMove(shopCol);

    expect(resolution.shop).not.toBeNull();
    expect(state.shopOpen).toBe(true);
    expect(() => state.resolveCompletedMove(1)).toThrow(/shop is open/);
    expect(state.player.row).toBe(14);
  });

  it('rejects landing on a tile occupied by an enemy', () => {
    const state = new GameState();
    walkTo(state, DEMO_MONSTER_ROW - 1, 0);

    expect(state.isForwardTile(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)).toBe(false);
    const before = {
      row: state.player.row,
      col: state.player.col,
      distance: state.distance,
    };

    expect(() => state.resolveCompletedMove(DEMO_MONSTER_COL)).toThrow(
      /occupied enemy tile/,
    );
    expect(state.player.row).toBe(before.row);
    expect(state.player.col).toBe(before.col);
    expect(state.distance).toBe(before.distance);
    expect(state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)).toBeDefined();
  });

  it('rejects invalid lanes', () => {
    const state = new GameState();
    expect(() => state.resolveCompletedMove(-1)).toThrow(/Invalid lane: -1/);
    expect(() => state.resolveCompletedMove(3)).toThrow(/Invalid lane: 3/);
    expect(state.player.row).toBe(0);
  });
});

describe('one-lane sideways movement', () => {
  it('from the centre lane, left, centre, and right are valid', () => {
    const state = new GameState();
    expect(state.player.col).toBe(1);
    expect(state.isForwardTile(1, 0)).toBe(true);
    expect(state.isForwardTile(1, 1)).toBe(true);
    expect(state.isForwardTile(1, 2)).toBe(true);
  });

  it('from the left lane, left and centre are valid and right is invalid', () => {
    const state = new GameState();
    state.resolveCompletedMove(0);
    expect(state.player.col).toBe(0);
    expect(state.isForwardTile(2, 0)).toBe(true);
    expect(state.isForwardTile(2, 1)).toBe(true);
    expect(state.isForwardTile(2, 2)).toBe(false);
  });

  it('from the right lane, centre and right are valid and left is invalid', () => {
    const state = new GameState();
    state.resolveCompletedMove(2);
    expect(state.player.col).toBe(2);
    expect(state.isForwardTile(2, 0)).toBe(false);
    expect(state.isForwardTile(2, 1)).toBe(true);
    expect(state.isForwardTile(2, 2)).toBe(true);
  });

  it('does not advance the run when a two-lane jump is rejected', () => {
    const state = new GameState();
    state.resolveCompletedMove(0);
    const before = {
      row: state.player.row,
      col: state.player.col,
      distance: state.distance,
      gold: state.gold,
      status: state.status,
    };

    expect(() => state.resolveCompletedMove(2)).toThrow(/two lanes/);
    expect(state.player.row).toBe(before.row);
    expect(state.player.col).toBe(before.col);
    expect(state.distance).toBe(before.distance);
    expect(state.gold).toBe(before.gold);
    expect(state.status).toBe(before.status);
    expect(state.shopOpen).toBe(false);
  });
});

describe('turn resolution order', () => {
  it('returns an empty TurnResolution for a safe opening move', () => {
    const state = new GameState();
    const resolution = state.resolveCompletedMove(1);

    expect(resolution).toEqual({
      pickup: null,
      shop: null,
      trap: null,
      encounters: [],
    });
    expect(state.player.row).toBe(1);
    expect(state.distance).toBe(1);
    expect(state.shopOpen).toBe(false);
  });

  it('lands on a Merchant with an open shop and no playable encounters', () => {
    const state = seededState();
    walkTo(state, 13, 1);
    const resolution = state.resolveCompletedMove(shopColAt(state, 14));

    expect(resolution.shop).not.toBeNull();
    expect(resolution.encounters).toEqual([]);
    expect(resolution.pickup).toBeNull();
    expect(state.shopOpen).toBe(true);
    expect(state.status).toMatch(/merchant/i);
  });

  it('applies gold before adjacent encounter resolution', () => {
    const state = seededState();
    let found = false;

    for (let step = 0; step < 80 && !found && !state.runOver; step += 1) {
      const nextRow = state.player.row + 1;
      let col = safestCol(state);
      for (let lane = 0; lane < 3; lane += 1) {
        if (
          state.isForwardTile(nextRow, lane) &&
          state.getTile(nextRow, lane)?.content.type === 'gold'
        ) {
          col = lane;
          break;
        }
      }

      const goldBefore = state.gold;
      const resolution = state.resolveCompletedMove(col);
      if (resolution.pickup?.kind === 'gold' && resolution.encounters.length > 0) {
        expect(state.gold).toBe(goldBefore + 1);
        expect(resolution.shop).toBeNull();
        expect(state.status).not.toMatch(/gold/i);
        found = true;
      }
      playEncounters(state, resolution.encounters);
      if (state.shopOpen) {
        state.leaveShop();
      }
    }

    expect(found).toBe(true);
  });
});

function scriptedRecipes(scripts: Record<number, LaneRecipe[]>): RowRecipeFactory {
  return (row) => scripts[row] ?? emptyRow();
}

function trapState(
  scripts: Record<number, LaneRecipe[]>,
  rollAvoidance: () => boolean = () => true,
): GameState {
  return new GameState({
    createRowRecipe: scriptedRecipes(scripts),
    rollAvoidance,
  });
}

describe('alarm trap triggering', () => {
  it('consumes a landed Alarm Trap once and reports no answer', () => {
    const state = trapState({
      8: [emptyRow()[0], alarmLane(8, 1), emptyRow()[2]],
    });
    walkTo(state, 7, 1);
    const trap = state.getTrapAt(8, 1);
    expect(trap?.kind).toBe('alarm');
    expect(trap?.triggered).toBe(false);

    const resolution = state.resolveCompletedMove(1);
    expect(resolution.trap?.kind).toBe('alarm');
    expect(resolution.trap?.enemyMove).toBeUndefined();
    expect(resolution.trap?.message).toBe(
      'You trigger an Alarm Trap… but nothing answers.',
    );
    expect(state.getTrapAt(8, 1)).toBeUndefined();
    expect(state.getTile(8, 1)?.content.type).toBe('empty');
    expect(trap?.triggered).toBe(true);
    expect(state.status).toMatch(/nothing answers/);

    expect(state.resolveCompletedMove(1).trap).toBeNull();
  });

  it('selects the closest visible unresolved enemy deterministically', () => {
    const state = trapState({
      8: [emptyRow()[0], alarmLane(8, 1), emptyRow()[2]],
      11: [emptyRow()[0], monsterLane('near-guard', 'cryptGuard'), emptyRow()[2]],
      14: [emptyRow()[0], monsterLane('far-brute', 'boneBrute'), emptyRow()[2]],
    });
    walkTo(state, 7, 1);

    const resolution = state.resolveCompletedMove(1);
    expect(resolution.trap?.enemyMove?.enemyId).toBe('near-guard');
    expect(resolution.trap?.enemyMove?.from).toEqual({ row: 11, col: 1 });
    expect(resolution.trap?.enemyMove?.to).toEqual({ row: 10, col: 1 });
    expect(state.getMonsterAt(10, 1)?.id).toBe('near-guard');
    expect(state.getMonsterAt(11, 1)).toBeUndefined();
    expect(state.getMonsterAt(14, 1)?.id).toBe('far-brute');
  });
});

describe('alarm enemy movement', () => {
  it('advances one cardinal tile and reduces Manhattan distance', () => {
    const state = trapState({
      8: [emptyRow()[0], alarmLane(8, 1), emptyRow()[2]],
      12: [monsterLane('rat-12', 'caveRat'), emptyRow()[1], emptyRow()[2]],
    });
    walkTo(state, 7, 1);
    const resolution = state.resolveCompletedMove(1);
    const move = resolution.trap?.enemyMove;
    expect(move).toEqual({
      enemyId: 'rat-12',
      from: { row: 12, col: 0 },
      to: { row: 11, col: 0 },
    });
    expect(
      Math.abs(move!.to.row - 8) + Math.abs(move!.to.col - 1),
    ).toBeLessThan(Math.abs(12 - 8) + Math.abs(0 - 1));
  });

  it('uses the vertical-toward-player step when that tile is open', () => {
    const state = trapState({
      8: [emptyRow()[0], alarmLane(8, 1), emptyRow()[2]],
      11: [monsterLane('guard-11', 'cryptGuard'), emptyRow()[1], emptyRow()[2]],
    });
    walkTo(state, 7, 1);
    expect(state.resolveCompletedMove(1).trap?.enemyMove?.to).toEqual({
      row: 10,
      col: 0,
    });
  });

  it('uses a horizontal fallback when the vertical tile is a Merchant', () => {
    const state = trapState({
      8: [emptyRow()[0], alarmLane(8, 1), emptyRow()[2]],
      10: [
        { kind: 'shop', entityId: 'shop-block' },
        emptyRow()[1],
        emptyRow()[2],
      ],
      11: [monsterLane('side-rat', 'caveRat'), emptyRow()[1], emptyRow()[2]],
    });
    walkTo(state, 7, 1);
    const move = state.resolveCompletedMove(1).trap?.enemyMove;
    expect(move?.from).toEqual({ row: 11, col: 0 });
    expect(move?.to).toEqual({ row: 11, col: 1 });
    expect(state.getTile(10, 0)?.content.type).toBe('shop');
  });

  it('does not move onto another enemy or a Merchant, and stays put if blocked', () => {
    const state = trapState({
      8: [emptyRow()[0], alarmLane(8, 1), emptyRow()[2]],
      10: [
        emptyRow()[0],
        { kind: 'shop', entityId: 'shop-block' },
        emptyRow()[2],
      ],
      11: [emptyRow()[0], monsterLane('blocked-rat', 'caveRat'), emptyRow()[2]],
      13: [emptyRow()[0], monsterLane('far-rat', 'caveRat'), emptyRow()[2]],
    });
    walkTo(state, 7, 1);
    const resolution = state.resolveCompletedMove(1);
    expect(resolution.trap?.enemyMove).toBeUndefined();
    expect(resolution.trap?.message).toMatch(/cannot close in/);
    expect(state.getMonsterAt(11, 1)?.id).toBe('blocked-rat');
    expect(state.getMonsterAt(13, 1)?.id).toBe('far-rat');
    expect(state.getTile(10, 1)?.content.type).toBe('shop');
  });
});

describe('alarm item consumption', () => {
  it('crushes gold without awarding it', () => {
    const state = trapState({
      8: [emptyRow()[0], alarmLane(8, 1), emptyRow()[2]],
      10: [
        emptyRow()[0],
        { kind: 'gold', entityId: collectibleId('gold', 10, 1) },
        emptyRow()[2],
      ],
      11: [emptyRow()[0], monsterLane('gold-eater', 'caveRat'), emptyRow()[2]],
    });
    walkTo(state, 7, 1);
    expect(state.getCollectibleAt(10, 1)?.kind).toBe('gold');

    const resolution = state.resolveCompletedMove(1);
    expect(resolution.trap?.enemyMove?.consumed).toBe('gold');
    expect(resolution.trap?.message).toMatch(/crushes the gold/);
    expect(state.gold).toBe(0);
    expect(state.getCollectibleAt(10, 1)).toBeUndefined();
    expect(state.getMonsterAt(10, 1)?.id).toBe('gold-eater');
    expect(state.getTile(10, 1)?.content.type).toBe('monster');
  });

  it('crushes a potion without healing the enemy or the player', () => {
    const state = trapState({
      8: [emptyRow()[0], alarmLane(8, 1), emptyRow()[2]],
      10: [
        emptyRow()[0],
        { kind: 'potion', entityId: collectibleId('potion', 10, 1) },
        emptyRow()[2],
      ],
      11: [emptyRow()[0], monsterLane('potion-eater', 'boneBrute'), emptyRow()[2]],
    });
    walkTo(state, 7, 1);
    const health = state.player.stats.health;
    const resolution = state.resolveCompletedMove(1);
    expect(resolution.trap?.enemyMove?.consumed).toBe('potion');
    expect(resolution.trap?.message).toMatch(/crushes a potion/);
    expect(state.player.stats.health).toBe(health);
    expect(state.getMonsterAt(10, 1)?.stats.health).toBe(20);
    expect(state.getCollectibleAt(10, 1)).toBeUndefined();
  });

  it('destroys a destination Alarm Trap without chaining another pull', () => {
    const state = trapState({
      8: [emptyRow()[0], alarmLane(8, 1), emptyRow()[2]],
      10: [emptyRow()[0], alarmLane(10, 1), emptyRow()[2]],
      11: [emptyRow()[0], monsterLane('trap-eater', 'cryptGuard'), emptyRow()[2]],
    });
    walkTo(state, 7, 1);
    const crushed = state.getTrapAt(10, 1);
    const resolution = state.resolveCompletedMove(1);
    expect(resolution.trap?.enemyMove?.consumed).toBe('trap');
    expect(resolution.trap?.enemyMove?.enemyId).toBe('trap-eater');
    expect(crushed?.triggered).toBe(true);
    expect(state.getTrapAt(10, 1)).toBeUndefined();
    expect(state.getMonsterAt(9, 1)).toBeUndefined();
    expect(state.getMonsterAt(10, 1)?.id).toBe('trap-eater');
  });

  it('leaves a Merchant intact and does not enter the shop tile', () => {
    const state = trapState({
      8: [emptyRow()[0], alarmLane(8, 1), emptyRow()[2]],
      10: [
        emptyRow()[0],
        { kind: 'shop', entityId: 'merchant-safe' },
        emptyRow()[2],
      ],
      11: [emptyRow()[0], monsterLane('shop-shy', 'caveRat'), emptyRow()[2]],
    });
    walkTo(state, 7, 1);
    const resolution = state.resolveCompletedMove(1);
    expect(resolution.trap?.enemyMove).toBeUndefined();
    expect(state.getTile(10, 1)?.content.type).toBe('shop');
    expect(state.getMonsterAt(11, 1)?.id).toBe('shop-shy');
    expect(state.shopOpen).toBe(false);
  });
});

describe('alarm encounters', () => {
  it('includes a trap-moved enemy in the same turn when it enters range', () => {
    const state = trapState({
      8: [emptyRow()[0], alarmLane(8, 1), emptyRow()[2]],
      10: [emptyRow()[0], monsterLane('closer', 'caveRat'), emptyRow()[2]],
    });
    walkTo(state, 7, 1);
    const resolution = state.resolveCompletedMove(1);
    expect(resolution.trap?.enemyMove?.to).toEqual({ row: 9, col: 1 });
    expect(resolution.encounters).toHaveLength(1);
    expect(resolution.encounters[0]).toMatchObject({
      kind: 'combat',
      approach: 'frontOn',
    });
    expect(state.status).toMatch(/blocks your path/);
  });

  it('keeps evade and Surprise Attack rules after an alarm pull', () => {
    const layout = {
      8: [emptyRow()[0], alarmLane(8, 1), emptyRow()[2]],
      9: [emptyRow()[0], emptyRow()[1], monsterLane('side-rat', 'caveRat')],
    };
    const evadeState = trapState(layout, () => true);
    walkTo(evadeState, 7, 1);
    const evade = evadeState.resolveCompletedMove(1);
    expect(evade.trap?.enemyMove?.to).toEqual({ row: 8, col: 2 });
    expect(evade.encounters).toEqual([
      expect.objectContaining({ kind: 'evade' }),
    ]);

    const surpriseState = trapState(layout, () => false);
    walkTo(surpriseState, 7, 1);
    const surprise = surpriseState.resolveCompletedMove(1);
    expect(surprise.encounters).toEqual([
      expect.objectContaining({ kind: 'combat', approach: 'surprise' }),
    ]);
  });
});

describe('alarm reset and pruning', () => {
  it('does not resurrect a triggered trap after the row is pruned', () => {
    const recipes: RowRecipeFactory = scriptedRecipes({
      8: [emptyRow()[0], alarmLane(8, 1), emptyRow()[2]],
    });
    const state = new GameState({ createRowRecipe: recipes });
    walkTo(state, 7, 1);
    state.resolveCompletedMove(1);
    expect(state.getTile(8, 1)?.content.type).toBe('empty');

    walkTo(state, 12, 1);
    expect(state.getTile(8, 1)).toBeUndefined();
    expect(state.getTrapAt(8, 1)).toBeUndefined();
  });

  it('does not resurrect gold crushed by an enemy', () => {
    const state = trapState({
      8: [emptyRow()[0], alarmLane(8, 1), emptyRow()[2]],
      10: [
        emptyRow()[0],
        { kind: 'gold', entityId: collectibleId('gold', 10, 1) },
        emptyRow()[2],
      ],
      11: [emptyRow()[0], monsterLane('gold-eater', 'caveRat'), emptyRow()[2]],
    });
    walkTo(state, 7, 1);
    state.resolveCompletedMove(1);
    expect(state.getTile(10, 1)?.content.type).toBe('monster');
    walkTo(state, 14, 1);
    expect(state.getTile(10, 1)).toBeUndefined();
    expect(state.getCollectibleAt(10, 1)).toBeUndefined();
  });

  it('restores untriggered traps after Restart Run with the same scripted layout', () => {
    const recipes = scriptedRecipes({
      8: [emptyRow()[0], alarmLane(8, 1), emptyRow()[2]],
    });
    const state = new GameState({ createRowRecipe: recipes });
    walkTo(state, 7, 1);
    state.resolveCompletedMove(1);
    expect(state.getTrapAt(8, 1)).toBeUndefined();

    state.reset();
    expect(state.getTrapAt(8, 1)?.triggered).toBe(false);
    expect(state.getTile(8, 1)?.content.type).toBe('trap');
  });
});

function alwaysDrop(value: number): () => () => number {
  return () => () => value;
}

function fightDemoRat(state: GameState): TurnResolution {
  walkTo(state, DEMO_MONSTER_ROW - 2, 1);
  const resolution = state.resolveCompletedMove(DEMO_MONSTER_COL);
  playEncounters(state, resolution.encounters);
  return resolution;
}

function rowContent(state: GameState, fromRow: number, toRow: number): string[][] {
  const rows: string[][] = [];
  for (let row = fromRow; row <= toRow; row += 1) {
    rows.push(
      [0, 1, 2].map((col) => state.getTile(row, col)?.content.type ?? 'missing'),
    );
  }
  return rows;
}

describe('enemy drops', () => {
  it('places gold on a defeated enemy tile and collects it by landing', () => {
    const state = new GameState({
      createDropRng: alwaysDrop(0.7),
      rollAvoidance: () => true,
    });
    fightDemoRat(state);

    expect(state.runOver).toBe(false);
    expect(state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)).toBeUndefined();
    const drop = state.getCollectibleAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL);
    expect(drop?.kind).toBe('gold');
    expect(drop?.id).toBe(enemyDropCollectibleId('gold', DEMO_MONSTER_ID));
    expect(state.getTile(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.content).toEqual({
      type: 'gold',
      id: drop?.id,
    });
    expect(state.status).toBe('You defeated the Cave Rat. It drops 1 gold.');
    expect(state.gold).toBe(0);

    const pickup = state.resolveCompletedMove(DEMO_MONSTER_COL);
    expect(pickup.pickup?.kind).toBe('gold');
    expect(state.gold).toBe(1);
    expect(state.getCollectibleAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)).toBeUndefined();
  });

  it('places a potion drop that heals through normal landing rules', () => {
    const state = new GameState({
      createDropRng: alwaysDrop(0.9),
      rollAvoidance: () => true,
    });
    fightDemoRat(state);
    state.player.takeDamage(6);
    const beforeHeal = state.player.stats.health;

    expect(state.getCollectibleAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.kind).toBe(
      'potion',
    );
    expect(state.status).toBe('You defeated the Cave Rat. It drops a potion.');

    const pickup = state.resolveCompletedMove(DEMO_MONSTER_COL);
    expect(pickup.pickup?.kind).toBe('potion');
    expect(pickup.pickup?.healthRestored).toBe(4);
    expect(state.player.stats.health).toBe(beforeHeal + 4);
  });

  it('leaves the tile empty when the drop roll is none', () => {
    const state = new GameState({
      createDropRng: alwaysDrop(0),
      rollAvoidance: () => true,
    });
    fightDemoRat(state);
    expect(state.getTile(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.content.type).toBe(
      'empty',
    );
    expect(state.getCollectibleAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)).toBeUndefined();
    expect(state.status).toBe('You defeated the Cave Rat.');
  });

  it('does not create a drop on evade', () => {
    const state = new GameState({
      createDropRng: alwaysDrop(0.7),
      rollAvoidance: () => true,
    });
    walkTo(state, DEMO_MONSTER_ROW - 1, 0);
    const resolution = state.resolveCompletedMove(0);
    playEncounters(state, resolution.encounters);

    expect(resolution.encounters[0]?.kind).toBe('evade');
    expect(state.getCollectibleAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)).toBeUndefined();
    expect(state.getTile(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.content.type).toBe(
      'empty',
    );
    expect(state.gold).toBe(0);
  });

  it('does not create a drop when the player dies', () => {
    const state = new GameState({
      createEnemyStats: enemyStatsFactoryFromSearch('?fatal=1'),
      createDropRng: alwaysDrop(0.7),
      rollAvoidance: () => true,
    });
    walkTo(state, DEMO_MONSTER_ROW - 2, 1);
    const resolution = state.resolveCompletedMove(DEMO_MONSTER_COL);
    playEncounters(state, resolution.encounters);

    expect(state.runOver).toBe(true);
    expect(state.getCollectibleAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)).toBeUndefined();
    expect(state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)).toBeDefined();
  });

  it('clears spawned drops on reset and does not resurrect them after pruning', () => {
    const state = new GameState({
      createDropRng: alwaysDrop(0.7),
      rollAvoidance: () => true,
    });
    fightDemoRat(state);
    expect(state.getCollectibleAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.kind).toBe(
      'gold',
    );

    walkTo(state, 12, 1);
    expect(state.getTile(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)).toBeUndefined();
    expect(state.getCollectibleAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)).toBeUndefined();

    state.reset();
    expect(state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.id).toBe(
      DEMO_MONSTER_ID,
    );
    expect(state.getCollectibleAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)).toBeUndefined();
  });

  it('keeps row generation unchanged when a separate drop stream rolls', () => {
    const goldState = new GameState({
      createRng: () => mulberry32(77),
      createDropRng: alwaysDrop(0.7),
      rollAvoidance: () => true,
    });
    const noneState = new GameState({
      createRng: () => mulberry32(77),
      createDropRng: alwaysDrop(0),
      rollAvoidance: () => true,
    });

    expect(rowContent(goldState, 5, 12)).toEqual(rowContent(noneState, 5, 12));
    fightDemoRat(goldState);
    fightDemoRat(noneState);
    expect(rowContent(goldState, 5, 12)).toEqual(rowContent(noneState, 5, 12));

    walkTo(goldState, 20, 1);
    walkTo(noneState, 20, 1);
    expect(rowContent(goldState, 16, 20)).toEqual(rowContent(noneState, 16, 20));
  });

  it('replays the same drop sequence after Restart Run with a fixed drop stream', () => {
    const state = new GameState({
      createDropRng: alwaysDrop(0.7),
      rollAvoidance: () => true,
    });
    fightDemoRat(state);
    const firstId = state.getCollectibleAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.id;
    expect(firstId).toBe(enemyDropCollectibleId('gold', DEMO_MONSTER_ID));

    state.reset();
    fightDemoRat(state);
    expect(state.getCollectibleAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.id).toBe(
      firstId,
    );
  });

  it('can drop after an Alarm Trap pulls an enemy into a fight', () => {
    const state = new GameState({
      createRowRecipe: scriptedRecipes({
        8: [emptyRow()[0], alarmLane(8, 1), emptyRow()[2]],
        10: [emptyRow()[0], monsterLane('closer', 'caveRat'), emptyRow()[2]],
      }),
      createDropRng: alwaysDrop(0.7),
      rollAvoidance: () => true,
    });
    walkTo(state, 7, 1);
    const resolution = state.resolveCompletedMove(1);
    expect(resolution.trap?.enemyMove?.to).toEqual({ row: 9, col: 1 });
    expect(resolution.encounters[0]).toMatchObject({
      kind: 'combat',
      approach: 'frontOn',
    });
    playEncounters(state, resolution.encounters);

    expect(state.getCollectibleAt(9, 1)?.kind).toBe('gold');
    expect(state.getCollectibleAt(9, 1)?.id).toBe(
      enemyDropCollectibleId('gold', 'closer'),
    );
    expect(state.getTile(10, 1)?.content.type).toBe('empty');
  });
});

