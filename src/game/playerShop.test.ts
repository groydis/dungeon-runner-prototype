import { describe, expect, it } from 'vitest';
import { evadeHudText } from '../ui/HudView';
import { createPlayerStats } from './Combatant';
import {
  DEMO_MONSTER_COL,
  DEMO_MONSTER_ROW,
  PLAYER_BASE_EVADE,
  PLAYER_EVADE_MAX,
} from './config';
import { GameState } from './GameState';
import { Merchant } from './Merchant';
import { Player } from './Player';
import { mulberry32 } from './random';
import {
  SHOP_OFFER_CATALOG,
  applyShopPurchase,
  buildShopView,
  createShopProgress,
  evaluateShopOffer,
  shopOfferPrice,
  shopStatSnapshot,
  type ShopOfferId,
  type ShopStatSnapshot,
  type ShopView,
} from './shop';

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

function walkTo(state: GameState, row: number, col: number): void {
  while (state.player.row < row) {
    const nextRow = state.player.row + 1;
    const nextCol =
      nextRow === row && state.isForwardTile(nextRow, col)
        ? col
        : safestCol(state);
    const resolution = state.resolveCompletedMove(nextCol);

    for (const event of resolution.encounters) {
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

    if (state.runOver) {
      throw new Error(`Died while walking to row ${row}`);
    }
    while (state.levelUpOpen) {
      state.chooseLevelUp('vitality');
    }
    if (state.shopOpen && state.player.row < row) {
      state.leaveShop();
    }
  }
}

function openSeededShop(state: GameState = seededState()): GameState {
  walkTo(state, 13, 1);
  state.resolveCompletedMove(shopColAt(state, 14));
  return state;
}

function baseStats(): ShopStatSnapshot {
  return shopStatSnapshot(new Player());
}

function offerOf(view: ShopView | null, id: ShopOfferId) {
  const offer = view?.offers.find((item) => item.id === id);
  if (!offer) {
    throw new Error(`Missing shop offer ${id}`);
  }
  return offer;
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

  it('starts at level 1 with 0 XP and the first threshold at 3', () => {
    const player = new Player();
    expect(player.level).toBe(1);
    expect(player.experience).toBe(0);
    expect(player.nextLevelExperience).toBe(3);
  });

  it('raises max HP without healing current HP', () => {
    const player = new Player();
    player.takeDamage(5);
    expect(player.increaseMaxHealth(1)).toBe(1);
    expect(player.stats.maxHealth).toBe(21);
    expect(player.stats.health).toBe(15);
  });

  it('raises defence through a focused Player method', () => {
    const player = new Player();
    expect(player.increaseDefence(1)).toBe(1);
    expect(player.stats.defence).toBe(2);
  });

  it('starts at 1 evade, never exceeds 20, and restores 1 on reset', () => {
    const player = new Player();
    expect(player.evade).toBe(PLAYER_BASE_EVADE);
    expect(player.increaseEvade(5)).toBe(5);
    expect(player.evade).toBe(6);
    expect(player.increaseEvade(100)).toBe(PLAYER_EVADE_MAX - 6);
    expect(player.evade).toBe(PLAYER_EVADE_MAX);
    expect(player.increaseEvade(5)).toBe(0);
    player.reset();
    expect(player.evade).toBe(PLAYER_BASE_EVADE);
  });
});

describe('shop offers', () => {
  it('uses first prices 2 / 3 / 3 / 2', () => {
    const progress = createShopProgress();
    expect(shopOfferPrice('vitality', progress)).toBe(2);
    expect(shopOfferPrice('sharpened', progress)).toBe(3);
    expect(shopOfferPrice('armoured', progress)).toBe(3);
    expect(shopOfferPrice('evasive', progress)).toBe(2);
    expect(SHOP_OFFER_CATALOG.vitality.firstPrice).toBe(2);
    expect(SHOP_OFFER_CATALOG.sharpened.firstPrice).toBe(3);
    expect(SHOP_OFFER_CATALOG.armoured.firstPrice).toBe(3);
    expect(SHOP_OFFER_CATALOG.evasive.firstPrice).toBe(2);
  });

  it('keeps unaffordable and capped purchases unavailable', () => {
    const merchant = new Merchant('merchant-14', 14, 1);
    const progress = createShopProgress();
    const full = baseStats();

    expect(evaluateShopOffer(merchant, 'vitality', 1, full, progress).reason).toBe(
      'unaffordable',
    );
    expect(evaluateShopOffer(merchant, 'sharpened', 2, full, progress).reason).toBe(
      'unaffordable',
    );
    expect(applyShopPurchase(merchant, 'sharpened', 2, full, progress).success).toBe(
      false,
    );

    const atAttackCap = { ...full, attack: 12 };
    expect(
      evaluateShopOffer(merchant, 'sharpened', 99, atAttackCap, progress).reason,
    ).toBe('capped');
    expect(
      applyShopPurchase(merchant, 'sharpened', 99, atAttackCap, progress).success,
    ).toBe(false);
  });

  it('raises each stat by exactly 1 and only that stat’s next price', () => {
    const merchant = new Merchant('merchant-14', 14, 1);
    const progress = createShopProgress();
    const stats = baseStats();

    const attack = applyShopPurchase(merchant, 'sharpened', 10, stats, progress);
    expect(attack.success).toBe(true);
    expect(attack.attackGained).toBe(1);
    expect(attack.maxHealthGained).toBe(0);
    expect(attack.defenceGained).toBe(0);
    expect(attack.evadeGained).toBe(0);
    expect(attack.goldSpent).toBe(3);
    expect(shopOfferPrice('sharpened', progress)).toBe(4);
    expect(shopOfferPrice('vitality', progress)).toBe(2);
    expect(shopOfferPrice('armoured', progress)).toBe(3);
    expect(shopOfferPrice('evasive', progress)).toBe(2);

    const view = buildShopView(merchant, 10, { ...stats, attack: 6 }, progress);
    expect(offerOf(view, 'sharpened').cost).toBe(4);
    expect(offerOf(view, 'vitality').cost).toBe(2);
    expect(offerOf(view, 'armoured').cost).toBe(3);
    expect(offerOf(view, 'evasive').cost).toBe(2);
  });

  it('returns a Vitality gain that raises max HP without healing', () => {
    const merchant = new Merchant('merchant-14', 14, 1);
    const progress = createShopProgress();
    const result = applyShopPurchase(merchant, 'vitality', 2, baseStats(), progress);
    expect(result.success).toBe(true);
    expect(result.maxHealthGained).toBe(1);
    expect(result.goldSpent).toBe(2);
  });
});

describe('GameState shop flow', () => {
  it('applies a Merchant attack upgrade and resets prices on run reset', () => {
    const state = openSeededShop();
    expect(state.shopOpen).toBe(true);
    expect(state.getShopView()?.offers.map((offer) => offer.cost)).toEqual([
      2, 3, 3, 2,
    ]);
    expect(state.canBuyShopOffer('sharpened')).toBe(false);

    state.player.addGold(3);
    expect(state.canBuyShopOffer('sharpened')).toBe(true);
    expect(state.buyShopOffer('sharpened').success).toBe(true);
    expect(state.playerStats.attack).toBe(6);
    expect(state.gold).toBe(0);
    expect(state.canBuyShopOffer('sharpened')).toBe(false);
    expect(state.buyShopOffer('sharpened').reason).toBe('unaffordable');
    expect(offerOf(state.getShopView(), 'sharpened').cost).toBe(4);
    expect(offerOf(state.getShopView(), 'vitality').cost).toBe(2);

    state.reset();
    expect(state.playerStats).toEqual(createPlayerStats());
    expect(state.player.evade).toBe(PLAYER_BASE_EVADE);
    expect(state.gold).toBe(0);
    expect(state.shopOpen).toBe(false);
  });

  it('buys each stat for +1 and refuses capped or unaffordable offers', () => {
    const state = openSeededShop();
    state.player.addGold(20);
    state.player.takeDamage(4);
    const before = shopStatSnapshot(state.player);
    const healthBefore = state.player.stats.health;

    expect(state.buyShopOffer('vitality')).toMatchObject({
      success: true,
      maxHealthGained: 1,
      goldSpent: 2,
    });
    expect(state.player.stats.maxHealth).toBe(before.maxHealth + 1);
    expect(state.player.stats.health).toBe(healthBefore);

    expect(state.buyShopOffer('sharpened')).toMatchObject({
      success: true,
      attackGained: 1,
      goldSpent: 3,
    });
    expect(state.player.stats.attack).toBe(before.attack + 1);

    expect(state.buyShopOffer('armoured')).toMatchObject({
      success: true,
      defenceGained: 1,
      goldSpent: 3,
    });
    expect(state.player.stats.defence).toBe(before.defence + 1);

    expect(state.buyShopOffer('evasive')).toMatchObject({
      success: true,
      evadeGained: 1,
      goldSpent: 2,
    });
    expect(state.player.evade).toBe(before.evade + 1);

    expect(
      Object.fromEntries(
        (state.getShopView()?.offers ?? []).map((offer) => [offer.id, offer.cost]),
      ),
    ).toEqual({
      vitality: 3,
      sharpened: 4,
      armoured: 4,
      evasive: 3,
    });

    state.player.increaseAttack(SHOP_OFFER_CATALOG.sharpened.cap - state.player.stats.attack);
    expect(state.player.stats.attack).toBe(12);
    expect(state.canBuyShopOffer('sharpened')).toBe(false);
    expect(state.buyShopOffer('sharpened').reason).toBe('capped');
    expect(state.player.stats.attack).toBe(12);
    expect(state.gold).toBe(10);
    expect(state.canBuyShopOffer('vitality')).toBe(true);
  });

  it('stops Merchant Evade purchases at 20', () => {
    const state = openSeededShop();
    state.player.increaseEvade(SHOP_OFFER_CATALOG.evasive.cap - state.player.evade);
    expect(state.player.evade).toBe(20);
    state.player.addGold(10);
    expect(state.canBuyShopOffer('evasive')).toBe(false);
    expect(state.buyShopOffer('evasive').reason).toBe('capped');
    expect(state.player.evade).toBe(20);
    expect(state.gold).toBe(10);
  });

  it('never lets Merchant Evade purchases exceed 20', () => {
    const state = openSeededShop();
    state.player.addGold(300);
    while (state.canBuyShopOffer('evasive')) {
      expect(state.buyShopOffer('evasive').success).toBe(true);
      expect(state.player.evade).toBeLessThanOrEqual(PLAYER_EVADE_MAX);
    }
    expect(state.player.evade).toBe(PLAYER_EVADE_MAX);
    expect(state.buyShopOffer('evasive').reason).toBe('capped');
    expect(state.player.evade).toBe(PLAYER_EVADE_MAX);
  });

  it('never lets level-up Evasive raise Evade above 20', () => {
    const state = new GameState({
      createDropRng: () => () => 0,
      rollAvoidance: () => true,
    });
    state.player.increaseEvade(15);
    expect(state.player.evade).toBe(16);
    state.player.addExperience(2);

    walkTo(state, DEMO_MONSTER_ROW - 2, 1);
    const resolution = state.resolveCompletedMove(DEMO_MONSTER_COL);
    const combat = resolution.encounters.find((event) => event.kind === 'combat');
    if (!combat) {
      throw new Error('Expected a front-on Cave Rat fight');
    }
    const result = state.createCombatResult(combat);
    for (const entry of result.log) {
      state.applyCombatLogEntry(entry, combat.monster);
    }
    state.finishCombat(result, combat.monster);

    expect(state.chooseLevelUp('evasive')).toMatchObject({
      success: true,
      evadeGained: 4,
    });
    expect(state.player.evade).toBe(PLAYER_EVADE_MAX);
  });

  it('leaves a Merchant and restores prices, stats, and availability on Restart Run', () => {
    const state = seededState();
    walkTo(state, 13, 1);
    const col = shopColAt(state, 14);
    state.resolveCompletedMove(col);
    state.player.addGold(3);
    expect(state.buyShopOffer('sharpened').success).toBe(true);
    expect(state.leaveShop()).toEqual({ row: 14, col });
    expect(state.shopOpen).toBe(false);
    expect(state.status).toBe('You leave the merchant behind.');

    state.reset();
    expect(state.player.stats).toEqual(createPlayerStats());
    expect(state.player.evade).toBe(PLAYER_BASE_EVADE);
    expect(state.gold).toBe(0);
    expect(state.shopOpen).toBe(false);

    const restored = openSeededShop(state);
    expect(restored.shopOpen).toBe(true);
    expect(restored.getShopView()?.offers.map((offer) => [
      offer.id,
      offer.cost,
      offer.available,
    ])).toEqual([
      ['vitality', 2, false],
      ['sharpened', 3, false],
      ['armoured', 3, false],
      ['evasive', 2, false],
    ]);
    restored.player.addGold(3);
    expect(restored.canBuyShopOffer('sharpened')).toBe(true);
  });
});

describe('evade HUD', () => {
  it('displays EVA without a percent sign', () => {
    expect(evadeHudText(1)).toBe('EVA: 1');
    expect(evadeHudText(16)).toBe('EVA: 16');
    expect(evadeHudText(1)).not.toContain('%');
  });
});
