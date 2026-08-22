import { describe, expect, it } from 'vitest';
import {
  DEMO_MONSTER_COL,
  DEMO_MONSTER_ID,
  DEMO_MONSTER_ROW,
} from './config';
import {
  ENEMY_DEFINITIONS,
  createEnemyStats,
  enemyStatsFactoryFromSearch,
} from './definitions/enemies';
import { type EncounterEvent } from './encounters';
import { GameState, type TurnResolution } from './GameState';
import { mulberry32 } from './random';

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
    const here = state.getTile(nextRow, col)?.content.type;
    const ahead = state.getTile(nextRow + 1, col)?.content.type;
    if (here !== 'monster' && ahead !== 'monster') {
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
    const nextCol = nextRow === row ? col : safestCol(state);
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

    walkTo(state, DEMO_MONSTER_ROW - 1, 0);
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
    walkTo(state, DEMO_MONSTER_ROW - 1, 0);
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

  it('rejects invalid lanes', () => {
    const state = new GameState();
    expect(() => state.resolveCompletedMove(-1)).toThrow(/Invalid lane: -1/);
    expect(() => state.resolveCompletedMove(3)).toThrow(/Invalid lane: 3/);
    expect(state.player.row).toBe(0);
  });
});

describe('turn resolution order', () => {
  it('returns an empty TurnResolution for a safe opening move', () => {
    const state = new GameState();
    const resolution = state.resolveCompletedMove(1);

    expect(resolution).toEqual({
      pickup: null,
      shop: null,
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
        if (state.getTile(nextRow, lane)?.content.type === 'gold') {
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
