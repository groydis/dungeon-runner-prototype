import { describe, expect, it } from 'vitest';
import { evadeHudText } from '../ui/HudView';
import gameStateSource from './GameState.ts?raw';
import {
  DEMO_MONSTER_COL,
  DEMO_MONSTER_ROW,
  PLAYER_EVADE_MAX,
} from './config';
import {
  PLAYER_CLASS_IDS,
  getPlayerClassDefinition,
} from './definitions/classes';
import { GameState, type GameStateOptions } from './GameState';
import { Merchant } from './Merchant';
import { Player } from './Player';
import { mulberry32 } from './random';
import {
  SHOP_OFFER_CATALOG,
  applyShopPurchase,
  applySpecialEquipmentPurchase,
  buildShopView,
  createShopProgress,
  evaluateShopOffer,
  evaluateSpecialEquipmentOffer,
  shopOfferPrice,
  shopStatSnapshot,
  type ShopOfferId,
  type ShopStatSnapshot,
  type ShopView,
} from './shop';
import { specialEquipmentForClass } from './specialEquipment';


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

function rangerClass() {
  return getPlayerClassDefinition('ranger');
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

function walkTo(state: GameState, row: number, col: number): void {
  while (playerOf(state).row < row) {
    const nextRow = playerOf(state).row + 1;
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
    if (state.shopOpen && playerOf(state).row < row) {
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
  return shopStatSnapshot(new Player('ranger'));
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
    const player = new Player('ranger');
    expect(player.heal(5)).toBe(0);
    expect(player.stats.health).toBe(player.stats.maxHealth);

    player.takeDamage(3);
    expect(player.heal(5)).toBe(3);
    expect(player.stats.health).toBe(20);
  });

  it('never lets gold become negative', () => {
    const player = new Player('ranger');
    expect(player.trySpendGold(1)).toBe(false);
    expect(player.gold).toBe(0);

    player.addGold(2);
    expect(player.trySpendGold(3)).toBe(false);
    expect(player.gold).toBe(2);
    expect(player.trySpendGold(2)).toBe(true);
    expect(player.gold).toBe(0);
  });

  it('resets attack upgrades with the rest of the run', () => {
    const player = new Player('ranger');
    player.increaseAttack(1);
    expect(player.stats.attack).toBe(rangerClass().startingStats.attack + 1);
    player.reset();
    expect(player.stats).toEqual(rangerClass().startingStats);
    expect(player.gold).toBe(0);
    expect(player.evade).toBe(rangerClass().startingEvade);
  });

  it('starts at level 1 with 0 XP and the first threshold at 3', () => {
    const player = new Player('ranger');
    expect(player.level).toBe(1);
    expect(player.experience).toBe(0);
    expect(player.nextLevelExperience).toBe(3);
  });

  it('raises max HP without healing current HP', () => {
    const player = new Player('ranger');
    player.takeDamage(5);
    expect(player.increaseMaxHealth(1)).toBe(1);
    expect(player.stats.maxHealth).toBe(rangerClass().startingStats.maxHealth + 1);
    expect(player.stats.health).toBe(rangerClass().startingStats.health - 5);
  });

  it('raises defence through a focused Player method', () => {
    const player = new Player('ranger');
    expect(player.increaseDefence(1)).toBe(1);
    expect(player.stats.defence).toBe(rangerClass().startingStats.defence + 1);
  });

  it('starts at the class evade, never exceeds 20, and restores that class evade on reset', () => {
    const player = new Player('ranger');
    const startEvade = rangerClass().startingEvade;
    expect(player.evade).toBe(startEvade);
    expect(player.increaseEvade(5)).toBe(5);
    expect(player.evade).toBe(startEvade + 5);
    expect(player.increaseEvade(100)).toBe(PLAYER_EVADE_MAX - (startEvade + 5));
    expect(player.evade).toBe(PLAYER_EVADE_MAX);
    expect(player.increaseEvade(5)).toBe(0);
    player.reset();
    expect(player.evade).toBe(startEvade);
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

    const atAttackCap = { ...full, attack: SHOP_OFFER_CATALOG.sharpened.cap };
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

    const view = buildShopView(
      merchant,
      10,
      { ...stats, attack: rangerClass().startingStats.attack + 1 },
      progress,
    );
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
  it('offers and equips only the selected class special equipment', () => {
    for (const classId of PLAYER_CLASS_IDS) {
      const state = openSeededShop(
        createState({
          playerClass: classId,
          createRng: () => mulberry32(123),
          rollAvoidance: () => true,
        }),
      );
      const definition = specialEquipmentForClass(classId);
      expect(state.getShopView()?.specialOffer).toMatchObject({
        equipmentId: definition.id,
        classId,
        title: definition.name,
        cost: definition.cost,
        available: false,
        reason: 'unaffordable',
      });

      state.addGold(definition.cost);
      const before = playerOf(state);
      expect(state.canBuySpecialEquipment()).toBe(true);
      expect(state.buySpecialEquipment()).toMatchObject({
        success: true,
        offerId: 'specialEquipment',
        specialEquipmentId: definition.id,
        goldSpent: definition.cost,
        maxHealthGained: definition.gains.maxHealth,
        attackGained: definition.gains.attack,
        defenceGained: definition.gains.defence,
        evadeGained: definition.gains.evade,
      });
      const after = playerOf(state);
      expect(after.stats.maxHealth).toBe(
        before.stats.maxHealth + definition.gains.maxHealth,
      );
      expect(after.stats.attack).toBe(
        before.stats.attack + definition.gains.attack,
      );
      expect(after.stats.defence).toBe(
        before.stats.defence + definition.gains.defence,
      );
      expect(after.evade).toBe(before.evade + definition.gains.evade);
      expect(state.hasSpecialEquipment).toBe(true);
      expect(state.getShopView()?.specialOffer).toMatchObject({
        available: false,
        reason: 'owned',
        reasonText: 'Already equipped',
      });
      expect(state.buySpecialEquipment()).toMatchObject({
        success: false,
        reason: 'owned',
      });

      state.reset();
      expect(state.hasSpecialEquipment).toBe(false);
    }
  });

  it('keeps the special purchase unavailable without a merchant or at every relevant cap', () => {
    const player = new Player('knight');
    const definition = specialEquipmentForClass('knight');
    expect(
      evaluateSpecialEquipmentOffer(
        null,
        'knight',
        definition.cost,
        shopStatSnapshot(player),
        false,
      ).reason,
    ).toBe('noShop');

    player.increaseAttack(100);
    player.increaseDefence(100);
    const merchant = new Merchant('merchant-special', 14, 1);
    expect(
      evaluateSpecialEquipmentOffer(
        merchant,
        'knight',
        definition.cost,
        shopStatSnapshot(player),
        false,
      ).reason,
    ).toBe('capped');
    expect(
      applySpecialEquipmentPurchase(
        merchant,
        'knight',
        definition.cost,
        shopStatSnapshot(player),
        false,
      ),
    ).toMatchObject({ success: false, reason: 'capped' });
  });

  it('applies a Merchant attack upgrade and resets prices on run reset', () => {
    const state = openSeededShop();
    expect(state.shopOpen).toBe(true);
    expect(state.getShopView()?.offers.map((offer) => offer.cost)).toEqual([
      2, 3, 3, 2,
    ]);
    expect(state.canBuyShopOffer('sharpened')).toBe(false);

    state.addGold(3);
    expect(state.canBuyShopOffer('sharpened')).toBe(true);
    expect(state.buyShopOffer('sharpened').success).toBe(true);
    expect(playerOf(state).stats.attack).toBe(rangerClass().startingStats.attack + 1);
    expect(state.gold).toBe(0);
    expect(state.canBuyShopOffer('sharpened')).toBe(false);
    expect(state.buyShopOffer('sharpened').reason).toBe('unaffordable');
    expect(offerOf(state.getShopView(), 'sharpened').cost).toBe(4);
    expect(offerOf(state.getShopView(), 'vitality').cost).toBe(2);

    state.reset();
    expect(playerOf(state).stats).toEqual(rangerClass().startingStats);
    expect(playerOf(state).evade).toBe(rangerClass().startingEvade);
    expect(state.gold).toBe(0);
    expect(state.shopOpen).toBe(false);
  });

  it('buys each stat for +1 and refuses capped or unaffordable offers', () => {
    const state = openSeededShop();
    state.addGold(20);
    state.takeDamage(4);
    const before = shopStatSnapshot(playerOf(state));
    const healthBefore = playerOf(state).stats.health;

    expect(state.buyShopOffer('vitality')).toMatchObject({
      success: true,
      maxHealthGained: 1,
      goldSpent: 2,
    });
    expect(playerOf(state).stats.maxHealth).toBe(before.maxHealth + 1);
    expect(playerOf(state).stats.health).toBe(healthBefore);

    expect(state.buyShopOffer('sharpened')).toMatchObject({
      success: true,
      attackGained: 1,
      goldSpent: 3,
    });
    expect(playerOf(state).stats.attack).toBe(before.attack + 1);

    expect(state.buyShopOffer('armoured')).toMatchObject({
      success: true,
      defenceGained: 1,
      goldSpent: 3,
    });
    expect(playerOf(state).stats.defence).toBe(before.defence + 1);

    expect(state.buyShopOffer('evasive')).toMatchObject({
      success: true,
      evadeGained: 1,
      goldSpent: 2,
    });
    expect(playerOf(state).evade).toBe(before.evade + 1);

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

    state.increaseAttack(SHOP_OFFER_CATALOG.sharpened.cap - playerOf(state).stats.attack);
    expect(playerOf(state).stats.attack).toBe(SHOP_OFFER_CATALOG.sharpened.cap);
    expect(state.canBuyShopOffer('sharpened')).toBe(false);
    expect(state.buyShopOffer('sharpened').reason).toBe('capped');
    expect(playerOf(state).stats.attack).toBe(SHOP_OFFER_CATALOG.sharpened.cap);
    expect(state.gold).toBe(10);
    expect(state.canBuyShopOffer('vitality')).toBe(true);
  });

  it('stops Merchant Evade purchases at 20', () => {
    const state = openSeededShop();
    state.increaseEvade(SHOP_OFFER_CATALOG.evasive.cap - playerOf(state).evade);
    expect(playerOf(state).evade).toBe(20);
    state.addGold(10);
    expect(state.canBuyShopOffer('evasive')).toBe(false);
    expect(state.buyShopOffer('evasive').reason).toBe('capped');
    expect(playerOf(state).evade).toBe(20);
    expect(state.gold).toBe(10);
  });

  it('never lets Merchant Evade purchases exceed 20', () => {
    const state = openSeededShop();
    state.addGold(300);
    while (state.canBuyShopOffer('evasive')) {
      expect(state.buyShopOffer('evasive').success).toBe(true);
      expect(playerOf(state).evade).toBeLessThanOrEqual(PLAYER_EVADE_MAX);
    }
    expect(playerOf(state).evade).toBe(PLAYER_EVADE_MAX);
    expect(state.buyShopOffer('evasive').reason).toBe('capped');
    expect(playerOf(state).evade).toBe(PLAYER_EVADE_MAX);
  });

  it('never lets level-up Evasive raise Evade above 20', () => {
    const state = createState({
      createDropRng: () => () => 0,
      rollAvoidance: () => true,
    });
    state.increaseEvade(13);
    expect(playerOf(state).evade).toBe(16);
    state.addExperience(2);

    walkTo(state, DEMO_MONSTER_ROW - 2, 1);
    const resolution = state.resolveCompletedMove(DEMO_MONSTER_COL);
    const combat = resolution.encounters.find((event) => event.kind === 'combat');
    if (!combat) {
      throw new Error('Expected a front-on Skeleton Minion fight');
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
    expect(playerOf(state).evade).toBe(PLAYER_EVADE_MAX);
  });

  it('leaves a Merchant and restores prices, stats, and availability on Restart Run', () => {
    const state = seededState();
    walkTo(state, 13, 1);
    const col = shopColAt(state, 14);
    state.resolveCompletedMove(col);
    state.addGold(3);
    expect(state.buyShopOffer('sharpened').success).toBe(true);
    expect(state.leaveShop()).toEqual({ row: 14, col });
    expect(state.shopOpen).toBe(false);
    expect(state.status).toBe('You leave the merchant behind.');

    state.reset();
    expect(playerOf(state).stats).toEqual(rangerClass().startingStats);
    expect(playerOf(state).evade).toBe(rangerClass().startingEvade);
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
    restored.addGold(3);
    expect(restored.canBuyShopOffer('sharpened')).toBe(true);
  });

  it('rejects shop actions before a class is selected', () => {
    const state = new GameState();
    expect(state.shopOpen).toBe(false);
    expect(state.hasSpecialEquipment).toBe(false);
    expect(state.getShopView()).toBeNull();
    expect(state.canBuyShopOffer('sharpened')).toBe(false);
    expect(state.canBuySpecialEquipment()).toBe(false);
    expect(state.buyShopOffer('sharpened')).toMatchObject({
      success: false,
      reason: 'noClass',
      goldRemaining: 0,
      status: 'Choose a class first.',
    });
    expect(state.buySpecialEquipment()).toMatchObject({
      success: false,
      reason: 'noClass',
      goldRemaining: 0,
      status: 'Choose a class first.',
    });
    expect(state.leaveShop()).toBeNull();
    expect(state.status).toBe('');
  });

  it('closes a shop without consuming the Merchant', () => {
    const state = openSeededShop();
    const { row, col } = playerOf(state);
    expect(state.getTile(row, col)?.content.type).toBe('shop');
    state.dismissOpenShop();
    expect(state.shopOpen).toBe(false);
    expect(state.getShopView()).toBeNull();
    expect(state.buyShopOffer('vitality')).toMatchObject({
      success: false,
      reason: 'noShop',
      status: 'There is no merchant here.',
    });
    expect(state.status).toBe('A travelling merchant beckons.');
    expect(state.getTile(row, col)?.content.type).toBe('shop');
  });

  it('marks the Merchant used when leaving and keeps upgrade prices for the next visit', () => {
    const state = openSeededShop();
    const firstCol = playerOf(state).col;
    state.addGold(3);
    expect(state.buyShopOffer('sharpened').success).toBe(true);
    expect(offerOf(state.getShopView(), 'sharpened').cost).toBe(4);
    expect(state.getShopProgressSnapshot().sharpened).toBe(1);
    expect(() => {
      (state.getShopProgressSnapshot() as { sharpened: number }).sharpened = 9;
    }).toThrow(TypeError);
    expect(state.getShopProgressSnapshot().sharpened).toBe(1);

    expect(state.leaveShop()).toEqual({ row: 14, col: firstCol });
    expect(state.shopOpen).toBe(false);
    expect(state.getShopView()).toBeNull();
    expect(state.status).toBe('You leave the merchant behind.');
    expect(state.getTile(14, firstCol)?.content.type).toBe('empty');

    walkTo(state, 27, 1);
    const secondCol = shopColAt(state, 28);
    state.resolveCompletedMove(secondCol);
    expect(state.shopOpen).toBe(true);
    expect(offerOf(state.getShopView(), 'sharpened').cost).toBe(4);
    expect(offerOf(state.getShopView(), 'vitality').cost).toBe(2);
    expect(state.getShopProgressSnapshot()).toMatchObject({
      sharpened: 1,
      vitality: 0,
      armoured: 0,
      evasive: 0,
    });
  });

  it('clears shop progress and special ownership on class reselection', () => {
    const state = openSeededShop();
    const special = specialEquipmentForClass('ranger');
    state.addGold(special.cost + 3);
    expect(state.buyShopOffer('sharpened').success).toBe(true);
    expect(state.buySpecialEquipment().success).toBe(true);
    expect(state.hasSpecialEquipment).toBe(true);

    state.clearSelectedClass();
    expect(state.hasSelectedClass).toBe(false);
    expect(state.shopOpen).toBe(false);
    expect(state.hasSpecialEquipment).toBe(false);
    expect(state.getShopProgressSnapshot()).toEqual({
      vitality: 0,
      sharpened: 0,
      armoured: 0,
      evasive: 0,
    });

    state.selectClass('ranger');
    const again = openSeededShop(state);
    expect(again.hasSpecialEquipment).toBe(false);
    expect(again.canBuySpecialEquipment()).toBe(false);
    expect(offerOf(again.getShopView(), 'sharpened').cost).toBe(3);
    again.addGold(special.cost);
    expect(again.canBuySpecialEquipment()).toBe(true);
    expect(again.buySpecialEquipment().success).toBe(true);
    expect(again.hasSpecialEquipment).toBe(true);
  });
});

describe('GameState shop ownership', () => {
  it('delegates run shop session state without exposing the live object', () => {
    expect(gameStateSource).toMatch(/new ShopSession/);
    expect(gameStateSource).not.toMatch(/private activeShop/);
    expect(gameStateSource).not.toMatch(/private shopProgress/);
    expect(gameStateSource).not.toMatch(/private specialEquipmentOwned/);
    expect(gameStateSource).not.toMatch(/get shopSession/);
    expect(gameStateSource).not.toMatch(/export \{ ShopSession/);
  });
});

describe('evade HUD', () => {
  it('displays EVA without a percent sign', () => {
    expect(evadeHudText(1)).toBe('EVA: 1');
    expect(evadeHudText(16)).toBe('EVA: 16');
    expect(evadeHudText(1)).not.toContain('%');
  });
});
