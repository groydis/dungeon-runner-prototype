import { describe, expect, it } from 'vitest';
import {
  PLAYER_CLASS_IDS,
  getPlayerClassDefinition,
} from './definitions/classes';
import {
  DEMO_MONSTER_COL,
  DEMO_MONSTER_ID,
  DEMO_MONSTER_ROW,
  PLAYER_ATTACK_CAP,
  PLAYER_DEFENCE_CAP,
  PLAYER_EVADE_MAX,
  PLAYER_MAX_HEALTH_CAP,
} from './config';
import {
  ENEMY_DEFINITIONS,
  createEnemyStats,
  enemyDropCollectibleId,
  enemyStatsFactoryFromSearch,
} from './definitions/enemies';
import { type EncounterEvent } from './encounters';
import { tileAt } from './BoardSnapshot';
import { GameState, type CombatFinishResult, type GameStateOptions, type TurnResolution } from './GameState';
import { mulberry32 } from './random';
import {
  alarmLane,
  collectibleLane,
  emptyRow,
  monsterLane,
  type LaneRecipe,
  type RowRecipeFactory,
} from './rowGeneration';
import { evadeHudText } from '../ui/HudView';


function playerOf(state: GameState) {
  const snapshot = state.getPlayerSnapshot();
  if (!snapshot) {
    throw new Error('No class selected');
  }
  return snapshot;
}

function createState(options: GameStateOptions = {}): GameState {
  return new GameState({ playerClass: 'ranger', ...options });
}

function seededState(): GameState {
  return createState({
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
  const nextRow = playerOf(state).row + 1;
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
  return playerOf(state).col;
}

function resolvePendingLevelUps(state: GameState): void {
  while (state.levelUpOpen) {
    state.chooseLevelUp('vitality');
  }
}

function playEncounters(state: GameState, encounters: EncounterEvent[]): void {
  for (const event of encounters) {
    if (event.kind === 'evade') {
      state.applyEvade(event.monster, event.evadeChance);
      continue;
    }
    const result = state.createCombatResult(event);
    for (const entry of result.log) {
      state.applyCombatLogEntry(entry, event.monster);
    }
    state.finishCombat(result, event.monster);
  }
  resolvePendingLevelUps(state);
}

function walkTo(state: GameState, row: number, col: number): TurnResolution | null {
  let last: TurnResolution | null = null;
  while (playerOf(state).row < row) {
    const nextRow = playerOf(state).row + 1;
    const nextCol =
      nextRow === row && state.isForwardTile(nextRow, col)
        ? col
        : safestCol(state);
    last = state.resolveCompletedMove(nextCol);
    playEncounters(state, last.encounters);
    if (state.runOver) {
      throw new Error(`Died while walking to row ${row}`);
    }
    if (state.shopOpen && playerOf(state).row < row) {
      state.leaveShop();
    }
  }
  return last;
}

describe('enemy definitions', () => {
  it('spawns the demo Skeleton Minion from the enemy definition', () => {
    const state = createState({
      createRng: () => mulberry32(1),
      rollAvoidance: () => true,
    });

    const monster = state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL);
    const definition = ENEMY_DEFINITIONS.skeletonMinion;

    expect(monster?.id).toBe(DEMO_MONSTER_ID);
    expect(monster?.type).toBe('skeletonMinion');
    expect(monster?.name).toBe(definition.name);
    expect(monster?.renderKey).toBe(definition.renderKey);
    expect(monster?.stats).toEqual(definition.startingStats);
    expect(monster?.stats).toEqual(createEnemyStats('skeletonMinion'));
  });

  it('does not need a separate Skeleton Minion stats factory for default spawning', () => {
    const state = createState();
    const monster = state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL);
    expect(monster?.stats).toEqual(ENEMY_DEFINITIONS.skeletonMinion.startingStats);
  });

  it('applies the fatal query-string override on top of the Skeleton Minion definition', () => {
    const state = createState({
      createEnemyStats: enemyStatsFactoryFromSearch('?fatal=1'),
      rollAvoidance: () => true,
    });

    walkTo(state, DEMO_MONSTER_ROW - 2, 1);
    const resolution = state.resolveCompletedMove(DEMO_MONSTER_COL);
    const combat = resolution.encounters.find((event) => event.kind === 'combat');
    expect(combat).toBeDefined();
    if (!combat || combat.kind !== 'combat') {
      throw new Error('Expected front-on combat with the demo minion');
    }

    expect(state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.stats.attack).toBe(
      99,
    );
    expect(state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.stats.maxHealth).toBe(
      ENEMY_DEFINITIONS.skeletonMinion.startingStats.maxHealth,
    );

    const result = state.createCombatResult(combat);
    for (const entry of result.log) {
      state.applyCombatLogEntry(entry, combat.monster);
    }
    state.finishCombat(result, combat.monster);

    expect(result.winner).toBe('monster');
    expect(state.runOver).toBe(true);
    expect(playerOf(state).stats.health).toBe(0);
  });
});

describe('turn action validity', () => {
  it('rejects movement after the run is over', () => {
    const state = createState({
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
    expect(playerOf(state).row).toBe(14);
  });

  it('rejects landing on a tile occupied by an enemy', () => {
    const state = createState();
    walkTo(state, DEMO_MONSTER_ROW - 1, 0);

    expect(state.isForwardTile(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)).toBe(false);
    const before = {
      row: playerOf(state).row,
      col: playerOf(state).col,
      distance: state.distance,
    };

    expect(() => state.resolveCompletedMove(DEMO_MONSTER_COL)).toThrow(
      /occupied enemy tile/,
    );
    expect(playerOf(state).row).toBe(before.row);
    expect(playerOf(state).col).toBe(before.col);
    expect(state.distance).toBe(before.distance);
    expect(state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)).toBeDefined();
  });

  it('rejects invalid lanes', () => {
    const state = createState();
    expect(() => state.resolveCompletedMove(-1)).toThrow(/Invalid lane: -1/);
    expect(() => state.resolveCompletedMove(3)).toThrow(/Invalid lane: 3/);
    expect(playerOf(state).row).toBe(0);
  });
});

describe('one-lane sideways movement', () => {
  it('from the centre lane, left, centre, and right are valid', () => {
    const state = createState();
    expect(playerOf(state).col).toBe(1);
    expect(state.isForwardTile(1, 0)).toBe(true);
    expect(state.isForwardTile(1, 1)).toBe(true);
    expect(state.isForwardTile(1, 2)).toBe(true);
  });

  it('from the left lane, left and centre are valid and right is invalid', () => {
    const state = createState();
    state.resolveCompletedMove(0);
    expect(playerOf(state).col).toBe(0);
    expect(state.isForwardTile(2, 0)).toBe(true);
    expect(state.isForwardTile(2, 1)).toBe(true);
    expect(state.isForwardTile(2, 2)).toBe(false);
  });

  it('from the right lane, centre and right are valid and left is invalid', () => {
    const state = createState();
    state.resolveCompletedMove(2);
    expect(playerOf(state).col).toBe(2);
    expect(state.isForwardTile(2, 0)).toBe(false);
    expect(state.isForwardTile(2, 1)).toBe(true);
    expect(state.isForwardTile(2, 2)).toBe(true);
  });

  it('does not advance the run when a two-lane jump is rejected', () => {
    const state = createState();
    state.resolveCompletedMove(0);
    const before = {
      row: playerOf(state).row,
      col: playerOf(state).col,
      distance: state.distance,
      gold: state.gold,
      status: state.status,
    };

    expect(() => state.resolveCompletedMove(2)).toThrow(/two lanes/);
    expect(playerOf(state).row).toBe(before.row);
    expect(playerOf(state).col).toBe(before.col);
    expect(state.distance).toBe(before.distance);
    expect(state.gold).toBe(before.gold);
    expect(state.status).toBe(before.status);
    expect(state.shopOpen).toBe(false);
  });
});

describe('turn resolution order', () => {
  it('returns an empty TurnResolution for a safe opening move', () => {
    const state = createState();
    const resolution = state.resolveCompletedMove(1);

    expect(resolution).toEqual({
      pickup: null,
      shop: null,
      trap: null,
      encounters: [],
    });
    expect(playerOf(state).row).toBe(1);
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
      const nextRow = playerOf(state).row + 1;
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
  return createState({
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
      12: [monsterLane('minion-12', 'skeletonMinion'), emptyRow()[1], emptyRow()[2]],
    });
    walkTo(state, 7, 1);
    const resolution = state.resolveCompletedMove(1);
    const move = resolution.trap?.enemyMove;
    expect(move).toEqual({
      enemyId: 'minion-12',
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
      11: [monsterLane('side-minion', 'skeletonMinion'), emptyRow()[1], emptyRow()[2]],
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
      11: [emptyRow()[0], monsterLane('blocked-minion', 'skeletonMinion'), emptyRow()[2]],
      13: [emptyRow()[0], monsterLane('far-minion', 'skeletonMinion'), emptyRow()[2]],
    });
    walkTo(state, 7, 1);
    const resolution = state.resolveCompletedMove(1);
    expect(resolution.trap?.enemyMove).toBeUndefined();
    expect(resolution.trap?.message).toMatch(/cannot close in/);
    expect(state.getMonsterAt(11, 1)?.id).toBe('blocked-minion');
    expect(state.getMonsterAt(13, 1)?.id).toBe('far-minion');
    expect(state.getTile(10, 1)?.content.type).toBe('shop');
  });
});

describe('alarm item consumption', () => {
  it('crushes gold without awarding it', () => {
    const state = trapState({
      8: [emptyRow()[0], alarmLane(8, 1), emptyRow()[2]],
      10: [
        emptyRow()[0],
        collectibleLane('gold', 10, 1),
        emptyRow()[2],
      ],
      11: [emptyRow()[0], monsterLane('gold-eater', 'skeletonMinion'), emptyRow()[2]],
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
        collectibleLane('potion', 10, 1),
        emptyRow()[2],
      ],
      11: [emptyRow()[0], monsterLane('potion-eater', 'boneBrute'), emptyRow()[2]],
    });
    walkTo(state, 7, 1);
    const health = playerOf(state).stats.health;
    const resolution = state.resolveCompletedMove(1);
    expect(resolution.trap?.enemyMove?.consumed).toBe('potion');
    expect(resolution.trap?.message).toMatch(/crushes a potion/);
    expect(playerOf(state).stats.health).toBe(health);
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
    expect(state.getTrapAt(10, 1)?.triggered).toBe(false);
    const resolution = state.resolveCompletedMove(1);
    expect(resolution.trap?.enemyMove?.consumed).toBe('trap');
    expect(resolution.trap?.enemyMove?.enemyId).toBe('trap-eater');
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
      11: [emptyRow()[0], monsterLane('shop-shy', 'skeletonMinion'), emptyRow()[2]],
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
  it('keeps an adjacent enemy off the player tile and starts a front-on encounter', () => {
    const state = trapState({
      8: [emptyRow()[0], alarmLane(8, 1), emptyRow()[2]],
      9: [emptyRow()[0], monsterLane('adjacent-guard', 'cryptGuard'), emptyRow()[2]],
    });
    walkTo(state, 7, 1);

    const resolution = state.resolveCompletedMove(1);

    expect(resolution.trap?.enemyMove).toBeUndefined();
    expect(state.getMonsterAt(8, 1)).toBeUndefined();
    expect(state.getMonsterAt(9, 1)?.id).toBe('adjacent-guard');
    expect(resolution.encounters).toEqual([
      expect.objectContaining({ kind: 'combat', approach: 'frontOn' }),
    ]);
  });

  it('includes a trap-moved enemy in the same turn when it enters range', () => {
    const state = trapState({
      8: [emptyRow()[0], alarmLane(8, 1), emptyRow()[2]],
      10: [emptyRow()[0], monsterLane('closer', 'skeletonMinion'), emptyRow()[2]],
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
      9: [emptyRow()[0], emptyRow()[1], monsterLane('side-minion', 'skeletonMinion')],
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
    const state = createState({ createRowRecipe: recipes });
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
        collectibleLane('gold', 10, 1),
        emptyRow()[2],
      ],
      11: [emptyRow()[0], monsterLane('gold-eater', 'skeletonMinion'), emptyRow()[2]],
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
    const state = createState({ createRowRecipe: recipes });
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

function fightDemoMinion(state: GameState): TurnResolution {
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
    const state = createState({
      createDropRng: alwaysDrop(0.7),
      rollAvoidance: () => true,
    });
    fightDemoMinion(state);

    expect(state.runOver).toBe(false);
    expect(state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)).toBeUndefined();
    const drop = state.getCollectibleAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL);
    expect(drop?.kind).toBe('gold');
    expect(drop?.id).toBe(enemyDropCollectibleId('gold', DEMO_MONSTER_ID));
    expect(state.getTile(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.content).toEqual({
      type: 'gold',
      id: drop?.id,
      pickupId: 'gold',
    });
    expect(state.status).toBe('You defeated the Skeleton Minion. It drops 1 gold.');
    expect(state.gold).toBe(0);

    const pickup = state.resolveCompletedMove(DEMO_MONSTER_COL);
    expect(pickup.pickup?.kind).toBe('gold');
    expect(state.gold).toBe(1);
    expect(state.getCollectibleAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)).toBeUndefined();
  });

  it('places a potion drop that heals through normal landing rules', () => {
    const state = createState({
      createDropRng: alwaysDrop(0.9),
      rollAvoidance: () => true,
    });
    fightDemoMinion(state);
    state.takeDamage(6);
    const beforeHeal = playerOf(state).stats.health;

    expect(state.getCollectibleAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.kind).toBe(
      'potion',
    );
    expect(state.status).toBe(
      'You defeated the Skeleton Minion. It drops a small potion.',
    );

    const pickup = state.resolveCompletedMove(DEMO_MONSTER_COL);
    expect(pickup.pickup?.kind).toBe('potion');
    expect(pickup.pickup?.healthRestored).toBe(4);
    expect(playerOf(state).stats.health).toBe(beforeHeal + 4);
  });

  it('leaves the tile empty when the drop roll is none', () => {
    const state = createState({
      createDropRng: alwaysDrop(0),
      rollAvoidance: () => true,
    });
    fightDemoMinion(state);
    expect(state.getTile(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.content.type).toBe(
      'empty',
    );
    expect(state.getCollectibleAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)).toBeUndefined();
    expect(state.status).toBe('You defeated the Skeleton Minion.');
  });

  it('does not create a drop on evade', () => {
    const state = createState({
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
    const state = createState({
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
    const state = createState({
      createDropRng: alwaysDrop(0.7),
      rollAvoidance: () => true,
    });
    fightDemoMinion(state);
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
    const goldState = createState({
      createRng: () => mulberry32(77),
      createDropRng: alwaysDrop(0.7),
      rollAvoidance: () => true,
    });
    const noneState = createState({
      createRng: () => mulberry32(77),
      createDropRng: alwaysDrop(0),
      rollAvoidance: () => true,
    });

    expect(rowContent(goldState, 5, 12)).toEqual(rowContent(noneState, 5, 12));
    fightDemoMinion(goldState);
    fightDemoMinion(noneState);
    expect(rowContent(goldState, 5, 12)).toEqual(rowContent(noneState, 5, 12));

    walkTo(goldState, 20, 1);
    walkTo(noneState, 20, 1);
    expect(rowContent(goldState, 16, 20)).toEqual(rowContent(noneState, 16, 20));
  });

  it('replays the same drop sequence after Restart Run with a fixed drop stream', () => {
    const state = createState({
      createDropRng: alwaysDrop(0.7),
      rollAvoidance: () => true,
    });
    fightDemoMinion(state);
    const firstId = state.getCollectibleAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.id;
    expect(firstId).toBe(enemyDropCollectibleId('gold', DEMO_MONSTER_ID));

    state.reset();
    fightDemoMinion(state);
    expect(state.getCollectibleAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.id).toBe(
      firstId,
    );
  });

  it('can drop after an Alarm Trap pulls an enemy into a fight', () => {
    const state = createState({
      createRowRecipe: scriptedRecipes({
        8: [emptyRow()[0], alarmLane(8, 1), emptyRow()[2]],
        10: [emptyRow()[0], monsterLane('closer', 'skeletonMinion'), emptyRow()[2]],
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

describe('evade and perception', () => {
  it('exposes base evade on the HUD snapshot and restores it on reset', () => {
    const state = createState();
    const ranger = getPlayerClassDefinition('ranger');
    expect(playerOf(state).evade).toBe(ranger.startingEvade);
    expect(state.getHudSnapshot().evade).toBe(ranger.startingEvade);
    expect(evadeHudText(state.getHudSnapshot().evade)).toBe(
      `EVA: ${ranger.startingEvade}`,
    );
    expect(state.getHudSnapshot().className).toBe(ranger.name);

    state.increaseEvade(5);
    expect(state.getHudSnapshot().evade).toBe(ranger.startingEvade + 5);
    expect(evadeHudText(state.getHudSnapshot().evade)).toBe(
      `EVA: ${ranger.startingEvade + 5}`,
    );

    state.reset();
    expect(playerOf(state).evade).toBe(ranger.startingEvade);
    expect(state.getHudSnapshot().evade).toBe(ranger.startingEvade);
  });

  it('uses Crypt Guard perception for a side pass', () => {
    let rolledChance: number | undefined;
    const state = createState({
      createRowRecipe: scriptedRecipes({
        5: [emptyRow()[0], emptyRow()[1], monsterLane('guard-5', 'cryptGuard')],
      }),
      rollAvoidance: (chance) => {
        rolledChance = chance;
        return true;
      },
    });
    walkTo(state, 4, 1);
    const resolution = state.resolveCompletedMove(1);
    expect(rolledChance).toBe(0);
    expect(resolution.encounters[0]).toMatchObject({
      kind: 'evade',
      evadeChance: 0,
    });
    expect(state.status).toMatch(/Evade chance: 0\./);
  });
});

function finishCombatEvent(
  state: GameState,
  event: EncounterEvent,
): CombatFinishResult | null {
  if (event.kind === 'evade') {
    state.applyEvade(event.monster, event.evadeChance);
    return null;
  }
  const result = state.createCombatResult(event);
  for (const entry of result.log) {
    state.applyCombatLogEntry(entry, event.monster);
  }
  return state.finishCombat(result, event.monster);
}

function fightDemoMinionPending(state: GameState): CombatFinishResult {
  walkTo(state, DEMO_MONSTER_ROW - 2, 1);
  const resolution = state.resolveCompletedMove(DEMO_MONSTER_COL);
  const combat = resolution.encounters.find((event) => event.kind === 'combat');
  if (!combat) {
    throw new Error('Expected a front-on Skeleton Minion fight');
  }
  const finish = finishCombatEvent(state, combat);
  if (!finish) {
    throw new Error('Expected a combat finish result');
  }
  return finish;
}

describe('XP and level-up', () => {
  it('starts a run at level 1, 0 XP, and next threshold 3', () => {
    const state = createState();
    const hud = state.getHudSnapshot();
    expect(hud.level).toBe(1);
    expect(hud.experience).toBe(0);
    expect(hud.nextLevelExperience).toBe(3);
    expect(state.levelUpOpen).toBe(false);
  });

  it('awards enemy XP exactly once on a combat win', () => {
    const state = createState({
      createDropRng: alwaysDrop(0),
      rollAvoidance: () => true,
    });
    walkTo(state, DEMO_MONSTER_ROW - 2, 1);
    const resolution = state.resolveCompletedMove(DEMO_MONSTER_COL);
    const combat = resolution.encounters.find((event) => event.kind === 'combat');
    if (!combat) {
      throw new Error('Expected a front-on Skeleton Minion fight');
    }
    const combatResult = state.createCombatResult(combat);
    for (const entry of combatResult.log) {
      state.applyCombatLogEntry(entry, combat.monster);
    }
    const first = state.finishCombat(combatResult, combat.monster);
    expect(first.experienceGained).toBe(1);
    expect(first.levelsReached).toEqual([]);
    expect(first.levelUp).toBeNull();
    expect(playerOf(state).experience).toBe(1);
    expect(playerOf(state).level).toBe(1);

    expect(() => state.finishCombat(combatResult, combat.monster)).toThrow(
      `No active combat for target: ${DEMO_MONSTER_ID}`,
    );
    expect(playerOf(state).experience).toBe(1);
    expect(() => state.createCombatResult(combat)).toThrow(
      /no longer active/,
    );
  });

  it('does not award XP for evade or a player defeat', () => {
    const evadeState = createState({
      createDropRng: alwaysDrop(0.7),
      rollAvoidance: () => true,
    });
    walkTo(evadeState, DEMO_MONSTER_ROW - 1, 0);
    const evadeResolution = evadeState.resolveCompletedMove(0);
    expect(evadeResolution.encounters[0]?.kind).toBe('evade');
    finishCombatEvent(evadeState, evadeResolution.encounters[0]!);
    expect(playerOf(evadeState).experience).toBe(0);
    expect(evadeState.levelUpOpen).toBe(false);

    const deathState = createState({
      createEnemyStats: enemyStatsFactoryFromSearch('?fatal=1'),
      createDropRng: alwaysDrop(0.7),
      rollAvoidance: () => true,
    });
    const death = fightDemoMinionPending(deathState);
    expect(deathState.runOver).toBe(true);
    expect(death.experienceGained).toBe(0);
    expect(death.levelUp).toBeNull();
    expect(playerOf(deathState).experience).toBe(0);
    expect(deathState.levelUpOpen).toBe(false);
  });

  it('queues a pending level-up that blocks movement until a choice is made', () => {
    const state = createState({
      createDropRng: alwaysDrop(0),
      rollAvoidance: () => true,
    });
    state.addExperience(2);
    const finish = fightDemoMinionPending(state);
    expect(finish.experienceGained).toBe(1);
    expect(finish.levelsReached).toEqual([2]);
    expect(finish.levelUp?.level).toBe(2);
    expect(state.levelUpOpen).toBe(true);
    expect(playerOf(state).level).toBe(2);

    expect(() => state.resolveCompletedMove(DEMO_MONSTER_COL)).toThrow(
      'Cannot move while a level-up choice is pending',
    );

    const first = state.chooseLevelUp('vitality');
    expect(first.success).toBe(true);
    expect(first.pendingRemaining).toBe(0);
    expect(state.chooseLevelUp('sharpened')).toMatchObject({
      success: false,
      reason: 'noLevelUp',
    });
    expect(state.levelUpOpen).toBe(false);
    expect(() => state.resolveCompletedMove(DEMO_MONSTER_COL)).not.toThrow();
  });

  it('applies each level-up choice through Player methods', () => {
    const vitality = createState({
      createDropRng: alwaysDrop(0),
      rollAvoidance: () => true,
    });
    vitality.addExperience(2);
    fightDemoMinionPending(vitality);
    vitality.takeDamage(5);
    const healthBefore = playerOf(vitality).stats.health;
    expect(vitality.chooseLevelUp('vitality')).toMatchObject({
      success: true,
      maxHealthGained: 1,
    });
    expect(playerOf(vitality).stats.maxHealth).toBe(21);
    expect(playerOf(vitality).stats.health).toBe(healthBefore);

    const sharpened = createState({
      createDropRng: alwaysDrop(0),
      rollAvoidance: () => true,
    });
    sharpened.addExperience(2);
    fightDemoMinionPending(sharpened);
    expect(sharpened.chooseLevelUp('sharpened')).toMatchObject({
      success: true,
      attackGained: 1,
    });
    expect(playerOf(sharpened).stats.attack).toBe(
      getPlayerClassDefinition('ranger').startingStats.attack + 1,
    );

    const armoured = createState({
      createDropRng: alwaysDrop(0),
      rollAvoidance: () => true,
    });
    armoured.addExperience(2);
    fightDemoMinionPending(armoured);
    expect(armoured.chooseLevelUp('armoured')).toMatchObject({
      success: true,
      defenceGained: 1,
    });
    expect(playerOf(armoured).stats.defence).toBe(2);

    const evasive = createState({
      createDropRng: alwaysDrop(0),
      rollAvoidance: () => true,
    });
    evasive.addExperience(2);
    fightDemoMinionPending(evasive);
    expect(evasive.chooseLevelUp('evasive')).toMatchObject({
      success: true,
      evadeGained: 5,
    });
    expect(playerOf(evasive).evade).toBe(
      getPlayerClassDefinition('ranger').startingEvade + 5,
    );

    const partial = createState({
      createDropRng: alwaysDrop(0),
      rollAvoidance: () => true,
    });
    partial.increaseEvade(13);
    expect(playerOf(partial).evade).toBe(16);
    partial.addExperience(2);
    fightDemoMinionPending(partial);
    expect(partial.getLevelUpView()?.choices.find((choice) => choice.id === 'evasive')?.available).toBe(
      true,
    );
    expect(partial.chooseLevelUp('evasive')).toMatchObject({
      success: true,
      evadeGained: 4,
    });
    expect(playerOf(partial).evade).toBe(PLAYER_EVADE_MAX);

    const atCap = createState({
      createDropRng: alwaysDrop(0),
      rollAvoidance: () => true,
    });
    atCap.increaseEvade(19);
    expect(playerOf(atCap).evade).toBe(PLAYER_EVADE_MAX);
    atCap.addExperience(2);
    fightDemoMinionPending(atCap);
    const view = atCap.getLevelUpView();
    expect(view?.choices.find((choice) => choice.id === 'evasive')).toMatchObject({
      available: false,
      reason: 'capped',
      disabledReason: 'Evade is already at maximum (20).',
    });
    expect(
      view?.choices.filter((choice) => choice.id !== 'evasive').every((choice) => choice.available),
    ).toBe(true);

    const statusBefore = atCap.status;
    const experienceBefore = playerOf(atCap).experience;
    const rejected = atCap.chooseLevelUp('evasive');
    expect(rejected).toMatchObject({
      success: false,
      reason: 'capped',
      evadeGained: 0,
      pendingRemaining: 1,
    });
    expect(atCap.levelUpOpen).toBe(true);
    expect(atCap.status).toBe(statusBefore);
    expect(playerOf(atCap).experience).toBe(experienceBefore);
    expect(playerOf(atCap).evade).toBe(PLAYER_EVADE_MAX);
    expect(atCap.chooseLevelUp('vitality').success).toBe(true);
    expect(atCap.levelUpOpen).toBe(false);
  });

  it('queues one choice at a time when a combat crosses several thresholds', () => {
    const state = createState({
      createDropRng: alwaysDrop(0),
      rollAvoidance: () => true,
      enemyExperience: (type) =>
        type === 'skeletonMinion' ? 12 : ENEMY_DEFINITIONS[type].experience,
    });
    const finish = fightDemoMinionPending(state);
    expect(finish.experienceGained).toBe(12);
    expect(finish.levelsReached).toEqual([2, 3, 4]);
    expect(finish.levelUp?.level).toBe(2);
    expect(state.chooseLevelUp('vitality').pendingRemaining).toBe(2);
    expect(state.getLevelUpView()?.level).toBe(3);
    expect(state.chooseLevelUp('sharpened').pendingRemaining).toBe(1);
    expect(state.getLevelUpView()?.level).toBe(4);
    expect(state.chooseLevelUp('armoured').pendingRemaining).toBe(0);
    expect(state.levelUpOpen).toBe(false);
  });

  it('returns typed drop and level-up results so playback can keep drop-then-choice order', () => {
    const state = createState({
      createDropRng: alwaysDrop(0.7),
      rollAvoidance: () => true,
    });
    state.addExperience(2);
    const finish = fightDemoMinionPending(state);
    expect(finish.drop?.kind).toBe('gold');
    expect(finish.experienceGained).toBe(1);
    expect(finish.levelsReached).toEqual([2]);
    expect(finish.levelUp).toMatchObject({
      level: 2,
      experience: 3,
      nextLevelExperience: 7,
    });
    expect(state.getCollectibleAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.kind).toBe(
      'gold',
    );
    expect(state.levelUpOpen).toBe(true);
  });

  it('restores level, XP, pending choices, and combat stats on reset', () => {
    const state = createState({
      createDropRng: alwaysDrop(0),
      rollAvoidance: () => true,
    });
    state.addExperience(2);
    fightDemoMinionPending(state);
    state.chooseLevelUp('sharpened');
    expect(playerOf(state).level).toBe(2);
    expect(playerOf(state).stats.attack).toBe(
      getPlayerClassDefinition('ranger').startingStats.attack + 1,
    );

    state.reset();
    expect(playerOf(state).level).toBe(1);
    expect(playerOf(state).experience).toBe(0);
    expect(playerOf(state).nextLevelExperience).toBe(3);
    expect(state.levelUpOpen).toBe(false);
    expect(state.getLevelUpView()).toBeNull();
    expect(playerOf(state).stats).toEqual(
      getPlayerClassDefinition('ranger').startingStats,
    );
    expect(playerOf(state).evade).toBe(
      getPlayerClassDefinition('ranger').startingEvade,
    );
    expect(state.getHudSnapshot()).toMatchObject({
      className: 'Ranger',
      level: 1,
      experience: 0,
      nextLevelExperience: 3,
      attack: getPlayerClassDefinition('ranger').startingStats.attack,
    });
  });

  it('disables every level-up choice at its universal cap', () => {
    const state = createState({
      createDropRng: alwaysDrop(0),
      rollAvoidance: () => true,
    });
    state.increaseMaxHealth(PLAYER_MAX_HEALTH_CAP);
    state.increaseAttack(PLAYER_ATTACK_CAP);
    state.increaseDefence(PLAYER_DEFENCE_CAP);
    state.increaseEvade(PLAYER_EVADE_MAX);
    state.addExperience(2);
    fightDemoMinionPending(state);

    const view = state.getLevelUpView();
    expect(view?.choices.every((choice) => !choice.available && choice.reason === 'capped')).toBe(
      true,
    );
    expect(state.chooseLevelUp('vitality')).toMatchObject({
      success: false,
      reason: 'capped',
      maxHealthGained: 0,
      pendingRemaining: 1,
    });
    expect(state.chooseLevelUp('sharpened')).toMatchObject({
      success: false,
      reason: 'capped',
      attackGained: 0,
    });
    expect(state.chooseLevelUp('armoured')).toMatchObject({
      success: false,
      reason: 'capped',
      defenceGained: 0,
    });
    expect(state.chooseLevelUp('evasive')).toMatchObject({
      success: false,
      reason: 'capped',
      evadeGained: 0,
      pendingRemaining: 1,
    });
    expect(state.levelUpOpen).toBe(true);
    expect(playerOf(state).stats.maxHealth).toBe(PLAYER_MAX_HEALTH_CAP);
    expect(playerOf(state).stats.attack).toBe(PLAYER_ATTACK_CAP);
    expect(playerOf(state).stats.defence).toBe(PLAYER_DEFENCE_CAP);
    expect(playerOf(state).evade).toBe(PLAYER_EVADE_MAX);
  });
});

describe('player class selection', () => {
  it('starts each selected class with its definition stats and HUD name', () => {
    for (const id of PLAYER_CLASS_IDS) {
      const definition = getPlayerClassDefinition(id);
      const state = new GameState({ playerClass: id });
      expect(state.hasSelectedClass).toBe(true);
      expect(state.selectedClassId).toBe(id);
      expect(playerOf(state).classId).toBe(id);
      expect(playerOf(state).renderKey).toBe(definition.renderKey);
      expect(state.getPlayerSnapshot()?.renderKey).toBe(definition.renderKey);
      expect(state.getBoardSnapshot().playerRenderKey).toBe(definition.renderKey);
      expect(playerOf(state).stats).toEqual(definition.startingStats);
      expect(playerOf(state).evade).toBe(definition.startingEvade);
      expect(state.getHudSnapshot()).toMatchObject({
        className: definition.name,
        attack: definition.startingStats.attack,
        evade: definition.startingEvade,
        health: definition.startingStats.health,
        maxHealth: definition.startingStats.maxHealth,
        gold: 0,
        level: 1,
        experience: 0,
      });
    }
  });

  it('rejects movement and board highlights before a class is selected', () => {
    const state = new GameState();
    expect(state.hasSelectedClass).toBe(false);
    expect(state.selectedClassId).toBeNull();
    expect(state.getPlayerSnapshot()).toBeNull();
    expect(state.getBoardSnapshot().playerRenderKey).toBeNull();
    expect(state.isForwardTile(1, 1)).toBe(false);
    expect(() => state.resolveCompletedMove(1)).toThrow(
      'Cannot move before a class is selected',
    );
    expect(state.getHudSnapshot()).toMatchObject({
      className: '',
      gold: 0,
      attack: 0,
      evade: 0,
      health: 0,
      maxHealth: 0,
    });
  });

  it('does not consume seeded row, drop, or evade streams when a class is chosen', () => {
    const rngOptions = {
      createRng: () => mulberry32(123),
      createDropRng: () => mulberry32(456),
      createEvadeRng: () => mulberry32(789),
    };
    const injected = new GameState({ playerClass: 'ranger', ...rngOptions });
    const selected = new GameState(rngOptions);
    selected.selectClass('ranger');

    expect(rowWindow(selected)).toEqual(rowWindow(injected));

    const injectedDrop = fightDemoMinionPending(injected);
    const selectedDrop = fightDemoMinionPending(selected);
    expect(selectedDrop.drop).toEqual(injectedDrop.drop);

    const injectedEvade = new GameState({ playerClass: 'ranger', ...rngOptions });
    const selectedEvade = new GameState(rngOptions);
    selectedEvade.selectClass('ranger');
    walkTo(injectedEvade, 3, 0);
    walkTo(selectedEvade, 3, 0);
    expect(summarizeEncounters(selectedEvade.resolveCompletedMove(0).encounters)).toEqual(
      summarizeEncounters(injectedEvade.resolveCompletedMove(0).encounters),
    );
  });

  it('reset restores the selected class’s original base stats', () => {
    const mage = getPlayerClassDefinition('mage');
    const state = new GameState({ playerClass: 'mage' });
    state.addGold(6);
    state.addExperience(9);
    state.increaseAttack(2);
    state.increaseEvade(4);
    state.reset();
    expect(state.selectedClassId).toBe('mage');
    expect(playerOf(state).stats).toEqual(mage.startingStats);
    expect(playerOf(state).evade).toBe(mage.startingEvade);
    expect(playerOf(state).gold).toBe(0);
    expect(playerOf(state).experience).toBe(0);
    expect(playerOf(state).level).toBe(1);
    expect(state.distance).toBe(0);
    expect(state.levelUpOpen).toBe(false);
  });

  it('selecting a different class starts a fully clean run', () => {
    const state = createState({
      createRng: () => mulberry32(123),
      createDropRng: alwaysDrop(0),
      rollAvoidance: () => true,
    });
    state.addGold(10);
    state.addExperience(2);
    fightDemoMinionPending(state);
    expect(state.levelUpOpen).toBe(true);
    expect(playerOf(state).gold).toBe(10);
    expect(state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)).toBeUndefined();
    resolvePendingLevelUps(state);

    walkTo(state, 13, 1);
    state.resolveCompletedMove(shopColAt(state, 14));
    expect(state.buyShopOffer('sharpened').success).toBe(true);
    expect(playerOf(state).stats.attack).toBe(
      getPlayerClassDefinition('ranger').startingStats.attack + 1,
    );

    const knight = getPlayerClassDefinition('knight');
    state.selectClass('knight');
    expect(state.selectedClassId).toBe('knight');
    expect(playerOf(state).stats).toEqual(knight.startingStats);
    expect(playerOf(state).evade).toBe(knight.startingEvade);
    expect(playerOf(state).gold).toBe(0);
    expect(playerOf(state).experience).toBe(0);
    expect(playerOf(state).level).toBe(1);
    expect(state.levelUpOpen).toBe(false);
    expect(state.shopOpen).toBe(false);
    expect(state.distance).toBe(0);
    expect(playerOf(state).row).toBe(0);
    expect(state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.type).toBe('skeletonMinion');
    expect(state.getHudSnapshot()).toMatchObject({
      className: knight.name,
      gold: 0,
      attack: knight.startingStats.attack,
    });

    walkTo(state, 13, 1);
    state.resolveCompletedMove(shopColAt(state, 14));
    expect(state.getShopView()?.offers.map((offer) => offer.cost)).toEqual([2, 3, 3, 2]);
    expect(playerOf(state).gold).toBe(0);
  });

  it('clears the prior run so Restart can return to class selection', () => {
    const state = createState({
      createRng: () => mulberry32(123),
      rollAvoidance: () => true,
    });
    state.addGold(5);
    state.addExperience(4);
    state.clearSelectedClass();

    expect(state.hasSelectedClass).toBe(false);
    expect(state.selectedClassId).toBeNull();
    expect(state.getPlayerSnapshot()).toBeNull();
    expect(state.getBoardSnapshot().playerRenderKey).toBeNull();
    expect(() => state.resolveCompletedMove(1)).toThrow(
      'Cannot move before a class is selected',
    );
    expect(state.getHudSnapshot()).toMatchObject({
      className: '',
      gold: 0,
      attack: 0,
    });
    expect(state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)).toBeUndefined();

    const rogue = getPlayerClassDefinition('rogue');
    state.selectClass('rogue');
    expect(playerOf(state).renderKey).toBe('rogue');
    expect(state.getBoardSnapshot().playerRenderKey).toBe('rogue');
    expect(playerOf(state).stats).toEqual(rogue.startingStats);
    expect(playerOf(state).gold).toBe(0);
    expect(playerOf(state).experience).toBe(0);
    expect(state.distance).toBe(0);
  });
});

describe('board snapshots and no-class APIs', () => {
  it('returns read-only board views that cannot mutate the live run', () => {
    const state = createState();
    const snapshot = state.getBoardSnapshot();
    const tile = state.getTile(DEMO_MONSTER_ROW, DEMO_MONSTER_COL);
    expect(tile?.content.type).toBe('monster');
    expect(tile?.monster?.renderKey).toBe('skeletonMinion');

    expect(() => {
      (snapshot.rows as unknown as { row: number }[]).push({ row: 99 });
    }).toThrow(TypeError);
    expect(() => {
      (tile!.content as unknown as { type: string }).type = 'gold';
    }).toThrow(TypeError);

    const copy = { ...tile!.content, type: 'gold' as const };
    expect(copy.type).toBe('gold');
    expect(state.getTile(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.content.type).toBe(
      'monster',
    );
    expect(state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.id).toBe(
      DEMO_MONSTER_ID,
    );
  });

  it('does not consume seeded streams or change run state when a snapshot is taken', () => {
    const rngOptions = {
      createRng: () => mulberry32(123),
      createDropRng: () => mulberry32(456),
      createEvadeRng: () => mulberry32(789),
    };
    const snapshotted = new GameState({ playerClass: 'ranger', ...rngOptions });
    const untouched = new GameState({ playerClass: 'ranger', ...rngOptions });

    const before = {
      distance: snapshotted.distance,
      gold: snapshotted.gold,
      stats: playerOf(snapshotted).stats,
      evade: playerOf(snapshotted).evade,
      rows: rowWindow(snapshotted),
    };
    snapshotted.getBoardSnapshot();
    snapshotted.getBoardSnapshot();
    snapshotted.getTile(4, 1);
    snapshotted.getMonsterAt(4, 1);

    expect(snapshotted.distance).toBe(before.distance);
    expect(snapshotted.gold).toBe(before.gold);
    expect(playerOf(snapshotted).stats).toEqual(before.stats);
    expect(playerOf(snapshotted).evade).toBe(before.evade);
    expect(rowWindow(snapshotted)).toEqual(before.rows);
    expect(rowWindow(snapshotted)).toEqual(rowWindow(untouched));

    expect(fightDemoMinionPending(snapshotted).drop).toEqual(
      fightDemoMinionPending(untouched).drop,
    );
  });

  it('includes enough render data for every current tile and enemy variant', () => {
    const state = createState({
      createRowRecipe: scriptedRecipes({
        5: [
          monsterLane('minion-5', 'skeletonMinion'),
          monsterLane('guard-5', 'cryptGuard'),
          collectibleLane('gold', 5, 2),
        ],
        6: [
          monsterLane('brute-6', 'boneBrute'),
          collectibleLane('potion', 6, 1),
          alarmLane(6, 2),
        ],
        7: [
          { kind: 'shop', entityId: 'shop-7' },
          emptyRow()[1],
          emptyRow()[2],
        ],
      }),
    });
    const snapshot = state.getBoardSnapshot();

    expect(tileAt(snapshot, 5, 0)?.monster).toMatchObject({
      id: 'minion-5',
      type: 'skeletonMinion',
      renderKey: 'skeletonMinion',
    });
    expect(tileAt(snapshot, 5, 1)?.monster).toMatchObject({
      type: 'cryptGuard',
      renderKey: 'cryptGuard',
    });
    expect(tileAt(snapshot, 5, 2)?.content.type).toBe('gold');
    expect(tileAt(snapshot, 6, 0)?.monster).toMatchObject({
      type: 'boneBrute',
      renderKey: 'boneBrute',
    });
    expect(tileAt(snapshot, 6, 1)?.content.type).toBe('potion');
    expect(tileAt(snapshot, 6, 2)?.content.type).toBe('trap');
    expect(tileAt(snapshot, 7, 0)?.content.type).toBe('shop');
    expect(snapshot.legalMoveCols.length).toBeGreaterThan(0);
    expect(snapshot.hasSelectedClass).toBe(true);
    expect(snapshot.playerRenderKey).toBe('ranger');
  });

  it('keeps one trailing row behind the player in the board snapshot', () => {
    const state = createState();
    const before = state.getBoardSnapshot();
    expect(before.originRow).toBe(0);
    expect(before.rows.map((row) => row.row)).toEqual([
      -1, 0, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(tileAt(before, -1, 1)?.content.type).toBe('empty');

    walkTo(state, 1, 1);
    const after = state.getBoardSnapshot();
    expect(after.originRow).toBe(1);
    expect(after.rows.map((row) => row.row)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(after.rows.filter((row) => row.row < after.playerRow)).toHaveLength(1);
    expect(after.rows.filter((row) => row.row > after.playerRow)).toHaveLength(8);
  });

  it('clears stale world entities when a class is reselected', () => {
    const state = createState({
      createRng: () => mulberry32(11),
      rollAvoidance: () => true,
    });
    expect(state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)).toBeDefined();
    walkTo(state, 3, 1);
    expect(state.distance).toBeGreaterThan(0);

    state.selectClass('mage');
    expect(state.distance).toBe(0);
    expect(playerOf(state).renderKey).toBe('mage');
    expect(state.getBoardSnapshot().playerRenderKey).toBe('mage');
    expect(playerOf(state).row).toBe(0);
    expect(state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.type).toBe(
      'skeletonMinion',
    );
    expect(state.getCollectibleAt(5, 0)).toBeUndefined();
    expect(state.getTrapAt(8, 1)).toBeUndefined();
    expect(state.getBoardSnapshot().originRow).toBe(0);
  });

  it('keeps shop read/purchase APIs safe before a class is selected', () => {
    const state = new GameState();
    expect(state.getShopView()).toBeNull();
    expect(state.canBuyShopOffer('sharpened')).toBe(false);
    expect(state.canBuySpecialEquipment()).toBe(false);
    expect(state.buyShopOffer('sharpened')).toMatchObject({
      success: false,
      reason: 'noClass',
      goldRemaining: 0,
      goldSpent: 0,
    });
    expect(state.buySpecialEquipment()).toMatchObject({
      success: false,
      reason: 'noClass',
      goldRemaining: 0,
    });
    expect(state.leaveShop()).toBeNull();
    expect(state.gold).toBe(0);
    expect(state.getPlayerSnapshot()).toBeNull();
    expect(state.getLevelUpView()).toBeNull();
    expect(state.chooseLevelUp('vitality').reason).toBe('noLevelUp');
    expect(state.getBoardSnapshot().hasSelectedClass).toBe(false);
    expect(state.getBoardSnapshot().playerRenderKey).toBeNull();
    expect(state.isForwardTile(1, 1)).toBe(false);
    expect(() => state.resolveCompletedMove(1)).toThrow(
      'Cannot move before a class is selected',
    );
    expect(state.getPlayerSnapshot()).toBeNull();
  });
});

describe('immutable encounter and player boundaries', () => {
  it('exposes a frozen encounter monster view, not a live Monster', () => {
    const state = createState({ rollAvoidance: () => true });
    walkTo(state, DEMO_MONSTER_ROW - 1, 0);
    const [event] = state.resolveCompletedMove(0).encounters;
    expect(event?.monster).toMatchObject({
      id: DEMO_MONSTER_ID,
      type: 'skeletonMinion',
      name: 'Skeleton Minion',
      renderKey: 'skeletonMinion',
    });
    expect(event?.monster).not.toHaveProperty('takeDamage');
    expect(event?.monster).not.toHaveProperty('applyHealth');
    expect(() => {
      (event!.monster as unknown as { row: number }).row = 99;
    }).toThrow(TypeError);

    const before = state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL);
    expect(before?.row).toBe(DEMO_MONSTER_ROW);
    expect(state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.row).toBe(
      DEMO_MONSTER_ROW,
    );
  });

  it('applies combat log hits only to the encounter’s internal monster', () => {
    const state = createState({
      createDropRng: alwaysDrop(0),
      rollAvoidance: () => true,
    });
    walkTo(state, DEMO_MONSTER_ROW - 2, 1);
    const combat = state
      .resolveCompletedMove(DEMO_MONSTER_COL)
      .encounters.find((event) => event.kind === 'combat');
    if (!combat || combat.kind !== 'combat') {
      throw new Error('Expected a front-on Skeleton Minion fight');
    }
    const result = state.createCombatResult(combat);
    const monsterHit = result.log.find((entry) => entry.target === 'monster');
    if (!monsterHit) {
      throw new Error('Expected a player hit on the Skeleton Minion');
    }
    state.applyCombatLogEntry(monsterHit, combat.monster);
    expect(state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.stats.health).toBe(
      monsterHit.targetHealthAfter,
    );
  });

  it('rejects a stale or unknown encounter target and cannot award a second drop', () => {
    const state = createState({
      createDropRng: alwaysDrop(0.7),
      rollAvoidance: () => true,
    });
    expect(() => state.applyEvade({ id: 'missing-minion' })).toThrow(
      'Unknown encounter target: missing-minion',
    );
    const finish = fightDemoMinionPending(state);
    expect(finish.drop?.kind).toBe('gold');
    expect(playerOf(state).experience).toBe(1);

    expect(() => state.applyEvade({ id: DEMO_MONSTER_ID })).toThrow(
      /no longer active|Unknown encounter target/,
    );
    expect(() =>
      state.applyCombatLogEntry(
        {
          attacker: 'player',
          target: 'monster',
          damage: 6,
          isSurpriseStrike: false,
          targetHealthAfter: 0,
        },
        { id: DEMO_MONSTER_ID },
      ),
    ).toThrow(`No active combat for target: ${DEMO_MONSTER_ID}`);
    expect(playerOf(state).experience).toBe(1);
    expect(state.getCollectibleAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.kind).toBe(
      'gold',
    );
  });

  it('evades only the targeted monster', () => {
    const state = createState({
      createRowRecipe: scriptedRecipes({
        4: [
          emptyRow()[0],
          monsterLane(DEMO_MONSTER_ID, 'skeletonMinion'),
          monsterLane('right-minion', 'skeletonMinion'),
        ],
      }),
      rollAvoidance: () => true,
    });
    walkTo(state, 3, 0);
    const resolution = state.resolveCompletedMove(0);
    const evade = resolution.encounters.find((event) => event.kind === 'evade');
    expect(evade?.monster.id).toBe(DEMO_MONSTER_ID);
    state.applyEvade(evade!.monster, evade?.evadeChance);
    expect(state.getMonsterAt(4, 1)).toBeUndefined();
    expect(state.getMonsterAt(4, 2)?.id).toBe('right-minion');
  });

  it('returns a frozen player snapshot that is null before class selection', () => {
    expect(new GameState().getPlayerSnapshot()).toBeNull();

    const state = createState();
    const snapshot = state.getPlayerSnapshot();
    expect(snapshot?.className).toBe('Ranger');
    expect(snapshot?.renderKey).toBe('ranger');
    expect(() => {
      (snapshot as unknown as { gold: number }).gold = 99;
    }).toThrow(TypeError);
    expect(() => {
      (snapshot!.stats as { attack: number }).attack = 99;
    }).toThrow(TypeError);
    const copy = { ...snapshot!.stats, attack: 99 };
    expect(copy.attack).toBe(99);
    expect(playerOf(state).stats.attack).toBe(
      getPlayerClassDefinition('ranger').startingStats.attack,
    );
    expect(playerOf(state).gold).toBe(0);
  });

  it('does not keep a stale player render key after class switch or clear', () => {
    const state = new GameState({ playerClass: 'ranger' });
    expect(state.getPlayerSnapshot()?.renderKey).toBe('ranger');
    expect(state.getBoardSnapshot().playerRenderKey).toBe('ranger');

    state.selectClass('knight');
    expect(state.getPlayerSnapshot()?.renderKey).toBe('knight');
    expect(state.getBoardSnapshot().playerRenderKey).toBe('knight');

    state.reset();
    expect(state.getPlayerSnapshot()?.renderKey).toBe('knight');
    expect(state.getBoardSnapshot().playerRenderKey).toBe('knight');

    state.clearSelectedClass();
    expect(state.getPlayerSnapshot()).toBeNull();
    expect(state.getBoardSnapshot().playerRenderKey).toBeNull();
    expect(state.getBoardSnapshot().hasSelectedClass).toBe(false);
  });

  it('rejects a combat result paired with a different encounter target', () => {
    const state = createState({
      createDropRng: alwaysDrop(0),
      rollAvoidance: () => true,
    });
    walkTo(state, DEMO_MONSTER_ROW - 2, 1);
    const combat = state
      .resolveCompletedMove(DEMO_MONSTER_COL)
      .encounters.find((event) => event.kind === 'combat');
    if (!combat || combat.kind !== 'combat') {
      throw new Error('Expected a front-on Skeleton Minion fight');
    }
    const result = state.createCombatResult(combat);
    const healthBefore = playerOf(state).stats.health;

    expect(() => state.finishCombat(result, { id: 'other-minion' })).toThrow(
      `Combat result target mismatch: expected ${result.monsterId}, got other-minion`,
    );
    expect(playerOf(state).stats.health).toBe(healthBefore);
    expect(playerOf(state).experience).toBe(0);
    expect(state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.id).toBe(
      DEMO_MONSTER_ID,
    );
    expect(state.getCollectibleAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)).toBeUndefined();

    const monsterHit = result.log.find((entry) => entry.target === 'monster');
    if (!monsterHit) {
      throw new Error('Expected a player hit on the Skeleton Minion');
    }
    expect(() => state.applyCombatLogEntry(monsterHit, { id: 'other-minion' })).toThrow(
      `Active combat target mismatch: expected ${DEMO_MONSTER_ID}, got other-minion`,
    );
    expect(
      state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.stats.health,
    ).toBe(ENEMY_DEFINITIONS.skeletonMinion.startingStats.health);
  });

  it('allows only one active combat session at a time', () => {
    const state = createState({
      createDropRng: alwaysDrop(0),
      createRowRecipe: scriptedRecipes({
        4: [
          emptyRow()[0],
          monsterLane(DEMO_MONSTER_ID, 'skeletonMinion'),
          emptyRow()[2],
        ],
        5: [
          emptyRow()[0],
          monsterLane('second-minion', 'skeletonMinion'),
          emptyRow()[2],
        ],
      }),
      rollAvoidance: () => true,
    });
    walkTo(state, DEMO_MONSTER_ROW - 2, 1);
    const firstCombat = state
      .resolveCompletedMove(DEMO_MONSTER_COL)
      .encounters.find((event) => event.kind === 'combat');
    if (!firstCombat || firstCombat.kind !== 'combat') {
      throw new Error('Expected a front-on Skeleton Minion fight');
    }
    const first = state.createCombatResult(firstCombat);
    const secondCombat: EncounterEvent = {
      kind: 'combat',
      approach: 'frontOn',
      monster: {
        id: 'second-minion',
        type: 'skeletonMinion',
        name: 'Skeleton Minion',
        row: 5,
        col: 1,
        renderKey: 'skeletonMinion',
      },
    };

    expect(() => state.createCombatResult(secondCombat)).toThrow(
      `Cannot start combat while target ${DEMO_MONSTER_ID} is still active`,
    );
    expect(() => state.createCombatResult(firstCombat)).toThrow(
      `Cannot start combat while target ${DEMO_MONSTER_ID} is still active`,
    );
    expect(state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)?.id).toBe(
      DEMO_MONSTER_ID,
    );
    expect(state.getMonsterAt(5, 1)?.id).toBe('second-minion');
    expect(playerOf(state).experience).toBe(0);

    for (const entry of first.log) {
      state.applyCombatLogEntry(entry, firstCombat.monster);
    }
    const finish = state.finishCombat(first, firstCombat.monster);
    expect(finish.experienceGained).toBe(1);
    expect(state.getMonsterAt(DEMO_MONSTER_ROW, DEMO_MONSTER_COL)).toBeUndefined();
    expect(state.getMonsterAt(5, 1)?.id).toBe('second-minion');
    expect(playerOf(state).experience).toBe(1);
  });
});

function rowWindow(state: GameState): Array<Array<string | undefined>> {
  const rows: Array<Array<string | undefined>> = [];
  for (let row = 0; row <= 8; row += 1) {
    rows.push([0, 1, 2].map((col) => state.getTile(row, col)?.content.type));
  }
  return rows;
}

function summarizeEncounters(encounters: EncounterEvent[]) {
  return encounters.map((event) =>
    event.kind === 'evade'
      ? { kind: event.kind, evadeChance: event.evadeChance, monsterId: event.monster.id }
      : { kind: event.kind, approach: event.approach, monsterId: event.monster.id },
  );
}

