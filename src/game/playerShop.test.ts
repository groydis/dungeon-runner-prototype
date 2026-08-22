import { describe, expect, it } from 'vitest';
import { createPlayerStats } from './Combatant';
import { GameState } from './GameState';
import { Merchant } from './Merchant';
import { Player } from './Player';
import { mulberry32 } from './random';
import { applyShopPurchase, evaluateShopOffer } from './shop';

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

function walkTo(state: GameState, row: number, col: number): void {
  while (state.player.row < row) {
    const nextRow = state.player.row + 1;
    const nextCol = nextRow === row ? col : safestCol(state);
    const resolution = state.resolveCompletedMove(nextCol);

    for (const event of resolution.encounters) {
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

    if (state.runOver) {
      throw new Error(`Died while walking to row ${row}`);
    }
    if (state.shopOpen && state.player.row < row) {
      state.leaveShop();
    }
  }
}

describe('Player', () => {
  it('cannot heal above max HP', () => {
    const player = new Player();
    expect(player.heal(5)).toBe(0);
    expect(player.stats.health).toBe(player.stats.maxHealth);

    player.takeDamage(3);
    expect(player.heal(5)).toBe(3);
    expect(player.stats.health).toBe(20);
  });

  it('never lets gold become negative', () => {
    const player = new Player();
    expect(player.trySpendGold(1)).toBe(false);
    expect(player.gold).toBe(0);

    player.addGold(2);
    expect(player.trySpendGold(3)).toBe(false);
    expect(player.gold).toBe(2);
    expect(player.trySpendGold(2)).toBe(true);
    expect(player.gold).toBe(0);
  });

  it('resets attack upgrades with the rest of the run', () => {
    const player = new Player();
    player.increaseAttack(1);
    expect(player.stats.attack).toBe(6);
    player.reset();
    expect(player.stats).toEqual(createPlayerStats());
    expect(player.gold).toBe(0);
  });
});

describe('shop offers', () => {
  it('keeps unaffordable and full-health purchases unavailable', () => {
    const merchant = new Merchant('merchant-14', 14, 1);
    const full = createPlayerStats();

    expect(evaluateShopOffer(merchant, 'heal', 5, full).reason).toBe('alreadyFull');
    expect(evaluateShopOffer(merchant, 'attack', 2, full).reason).toBe('unaffordable');

    const hurt = { ...full, health: 12 };
    const heal = applyShopPurchase(merchant, 'heal', 1, hurt);
    expect(heal.success).toBe(true);
    expect(heal.healthRestored).toBe(5);
    expect(applyShopPurchase(merchant, 'heal', 1, hurt).reason).toBe('alreadyPurchased');
  });
});

describe('GameState shop flow', () => {
  it('applies a Merchant attack upgrade once and resets it on run reset', () => {
    const state = seededState();
    walkTo(state, 13, 1);
    const col = shopColAt(state, 14);
    const resolution = state.resolveCompletedMove(col);

    expect(resolution.shop).not.toBeNull();
    expect(state.shopOpen).toBe(true);
    expect(state.canBuyShopOffer('attack')).toBe(false);

    state.player.addGold(3);
    expect(state.canBuyShopOffer('attack')).toBe(true);
    expect(state.buyShopOffer('attack').success).toBe(true);
    expect(state.playerStats.attack).toBe(6);
    expect(state.gold).toBe(0);
    expect(state.canBuyShopOffer('attack')).toBe(false);
    expect(state.buyShopOffer('attack').reason).toBe('alreadyPurchased');

    state.reset();
    expect(state.playerStats.attack).toBe(5);
    expect(state.gold).toBe(0);
    expect(state.shopOpen).toBe(false);
  });
});
