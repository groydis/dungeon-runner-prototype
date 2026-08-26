import { describe, expect, it } from 'vitest';
import { evadeHudText } from '../ui/HudView';
import gameStateSource from './GameState.ts?raw';
import {
  DEMO_MONSTER_COL,
  DEMO_MONSTER_ROW,
} from './config';
import {
  PLAYER_CLASS_IDS,
  getPlayerClassDefinition,
} from './definitions/classes';
import {
  PLAYER_WEAPON_PROGRESSION,
  weaponCatalogEntry,
  weaponTierBonus,
  weaponTierCost,
  weaponTierDisplayName,
} from './definitions/playerWeaponProgression';
import { GameState, type GameStateOptions } from './GameState';
import { Merchant } from './Merchant';
import { Player } from './Player';
import { mulberry32 } from './random';
import {
  applyWeaponTierPurchase,
  buildShopView,
  evaluateWeaponOffer,
} from './shop';
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
    while (state.levelUpOpen) {
      state.chooseLevelUp({ str: 2, con: 0, def: 0, dex: 0 });
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

describe('Player', () => {
  it('cannot heal above max HP', () => {
    const player = new Player('ranger');
    expect(player.heal(5)).toBe(0);
    expect(player.stats.health).toBe(player.stats.maxHealth);

    player.takeDamage(3);
    expect(player.heal(5)).toBe(3);
    expect(player.stats.health).toBe(15);
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
    player.increaseDex(1);
    expect(player.stats.attack).toBe(rangerClass().startingStats.attack + 1);
    player.reset();
    expect(player.stats).toEqual(rangerClass().startingStats);
    expect(player.gold).toBe(0);
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
    expect(player.increaseStr(1)).toBe(1);
    expect(player.stats.maxHealth).toBe(rangerClass().startingStats.maxHealth + 1);
    expect(player.stats.health).toBe(rangerClass().startingStats.health - 5);
  });

  it('raises defence through a focused Player method', () => {
    const player = new Player('ranger');
    expect(player.increaseDef(1)).toBe(1);
    expect(player.stats.defence).toBe(rangerClass().startingStats.defence + 1);
  });

  it('grows DEX without a hard max and restores class DEX on reset', () => {
    const player = new Player('ranger');
    const startDex = rangerClass().startingStats.dex;
    expect(player.stats.dex).toBe(startDex);
    expect(player.increaseDex(5)).toBe(5);
    expect(player.stats.dex).toBe(startDex + 5);
    expect(player.increaseDex(100)).toBe(100);
    expect(player.stats.dex).toBe(startDex + 105);
    player.reset();
    expect(player.stats.dex).toBe(startDex);
  });
});

describe('shop inventory', () => {
  it('exposes potions and class weapon upgrades without run-upgrade offers', () => {
    const merchant = new Merchant('merchant-14', 14, 1);
    const view = buildShopView(merchant, 50, 'ranger', 0, 0, 15, 20);
    expect(view).not.toBeNull();
    expect(view!.potionOffers.map((offer) => offer.id)).toEqual(['small']);
    expect(view!.weaponOffer).toMatchObject({
      classId: 'ranger',
      available: true,
      cost: 15,
      weaponId: 'bowAWithString',
      tierIndex: 1,
    });
    expect(view!.shieldOffer).toBeNull();
    expect(view).not.toHaveProperty('offers');
  });
});

describe('GameState shop flow', () => {
  it('stocks healing potions by Merchant row and drinks them immediately', () => {
    const early = openSeededShop();
    expect(early.getShopView()?.potionOffers.map((offer) => offer.id)).toEqual([
      'small',
    ]);
    early.takeDamage(6);
    early.addGold(4);
    const damaged = early.getHudSnapshot().health;
    expect(early.buyPotionOffer('small')).toMatchObject({
      success: true,
      goldSpent: 4,
      healthRestored: 4,
      status: 'Bought Small Potion. Restored 4 HP.',
    });
    expect(early.getHudSnapshot().health).toBe(damaged + 4);
    expect(early.getShopView()?.weaponOffer?.available).toBe(false);
    expect(early.buyPotionOffer('medium').reason).toBe('notInStock');

    const deep = createState({
      playerClass: 'ranger',
      createRng: () => mulberry32(123),
      rollAvoidance: () => true,
    });
    walkTo(deep, 41, 1);
    deep.resolveCompletedMove(shopColAt(deep, 42));
    expect(deep.shopOpen).toBe(true);
    expect(deep.getShopView()?.potionOffers.map((offer) => offer.id)).toEqual([
      'small',
      'medium',
      'large',
      'greater',
    ]);
    deep.takeDamage(1);
    expect(deep.buyPotionOffer('greater').reason).toBe('unaffordable');
    deep.addGold(18);
    expect(deep.buyPotionOffer('greater')).toMatchObject({
      success: true,
      goldSpent: 18,
      healthRestored: 1,
    });
    expect(deep.buyPotionOffer('small').reason).toBe('fullHealth');
  });

  it('offers and equips the first purchasable weapon tier for each class', () => {
    for (const classId of PLAYER_CLASS_IDS) {
      const state = openSeededShop(
        createState({
          playerClass: classId,
          createRng: () => mulberry32(123),
          rollAvoidance: () => true,
        }),
      );
      expect(state.weaponTierIndex).toBe(0);
      const weaponId = PLAYER_WEAPON_PROGRESSION[classId][1]!;
      weaponCatalogEntry(weaponId);
      const cost = weaponTierCost(1);
      const bonus = weaponTierBonus(1);
      expect(state.getShopView()?.weaponOffer).toMatchObject({
        weaponId,
        classId,
        title: weaponTierDisplayName(classId, 1),
        cost,
        tierIndex: 1,
        available: false,
        reason: 'unaffordable',
      });

      state.addGold(cost);
      const beforeAttack = playerOf(state).stats.attack;
      expect(state.canBuyWeaponTier()).toBe(true);
      expect(state.buyWeaponTier()).toMatchObject({
        success: true,
        offerId: 'weaponUpgrade',
        weaponId,
        goldSpent: cost,
        attackBonus: bonus,
      });
      expect(playerOf(state).stats.attack).toBe(beforeAttack + bonus);
      expect(playerOf(state).weaponAttackBonus).toBe(bonus);
      expect(state.weaponTierIndex).toBe(1);

      expect(state.getShopView()?.weaponOffer).toMatchObject({
        available: false,
        reason: 'unaffordable',
        tierIndex: 2,
      });

      state.reset();
      expect(state.weaponTierIndex).toBe(0);
      expect(playerOf(state).weaponAttackBonus).toBe(0);
    }
  });

  it('keeps weapon purchases unavailable without a merchant', () => {
    expect(evaluateWeaponOffer(null, 'knight', 15, 0).reason).toBe('noShop');
    const merchant = new Merchant('merchant-special', 14, 1);
    expect(evaluateWeaponOffer(merchant, 'knight', 15, 0).available).toBe(true);
    expect(applyWeaponTierPurchase(merchant, 'knight', 15, 0)).toMatchObject({
      success: true,
      attackBonus: 1,
      defenceBonus: 0,
      weaponId: 'swordA',
    });
  });

  it('buys knight shield tiers separately from weapons', () => {
    const state = openSeededShop(
      createState({
        playerClass: 'knight',
        createRng: () => mulberry32(123),
        rollAvoidance: () => true,
      }),
    );
    expect(state.shieldTierIndex).toBe(0);
    expect(state.getShopView()?.shieldOffer).toMatchObject({
      shieldId: 'shieldBadgeColor',
      cost: 15,
      tierIndex: 1,
      available: false,
      reason: 'unaffordable',
    });
    state.addGold(15);
    const beforeDef = playerOf(state).stats.defence;
    expect(state.buyShieldTier()).toMatchObject({
      success: true,
      offerId: 'shieldUpgrade',
      defenceBonus: 1,
    });
    expect(playerOf(state).stats.defence).toBe(beforeDef + 1);
    expect(state.shieldTierIndex).toBe(1);
  });

  it('equips a weapon tier and resets ownership on run reset', () => {
    const state = openSeededShop();
    expect(state.shopOpen).toBe(true);
    expect(state.getShopView()?.weaponOffer?.available).toBe(false);
    expect(state.canBuyWeaponTier()).toBe(false);
    expect(state.weaponTierIndex).toBe(0);

    state.addGold(15);
    expect(state.canBuyWeaponTier()).toBe(true);
    expect(state.buyWeaponTier().success).toBe(true);
    expect(state.weaponTierIndex).toBe(1);
    expect(state.gold).toBe(0);
    expect(state.canBuyWeaponTier()).toBe(false);

    state.reset();
    expect(playerOf(state).stats).toEqual(rangerClass().startingStats);
    expect(state.weaponTierIndex).toBe(0);
    expect(state.gold).toBe(0);
    expect(state.shopOpen).toBe(false);
  });

  it('lets level-up allocation raise DEX by auto +1 plus free points', () => {
    const state = createState({
      createDropRng: () => () => 0,
      rollAvoidance: () => true,
    });
    const startDex = playerOf(state).stats.dex;
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

    expect(state.chooseLevelUp({ str: 0, con: 0, def: 0, dex: 2 })).toMatchObject({
      success: true,
      dexGained: 3,
    });
    expect(playerOf(state).stats.dex).toBe(startDex + 3);
  });

  it('leaves a Merchant and restores inventory on Restart Run', () => {
    const state = seededState();
    walkTo(state, 13, 1);
    const col = shopColAt(state, 14);
    state.resolveCompletedMove(col);
    state.addGold(15);
    expect(state.buyWeaponTier().success).toBe(true);
    expect(state.leaveShop()).toEqual({ row: 14, col });
    expect(state.shopOpen).toBe(false);
    expect(state.status).toBe('You leave the merchant behind.');

    state.reset();
    expect(playerOf(state).stats).toEqual(rangerClass().startingStats);
    expect(state.gold).toBe(0);
    expect(state.shopOpen).toBe(false);
    expect(state.weaponTierIndex).toBe(0);

    const restored = openSeededShop(state);
    expect(restored.shopOpen).toBe(true);
    expect(restored.getShopView()?.weaponOffer).toMatchObject({
      available: false,
      reason: 'unaffordable',
      tierIndex: 1,
    });
    restored.addGold(15);
    expect(restored.canBuyWeaponTier()).toBe(true);
  });

  it('rejects shop actions before a class is selected', () => {
    const state = new GameState();
    expect(state.shopOpen).toBe(false);
    expect(state.weaponTierIndex).toBe(0);
    expect(state.getShopView()).toBeNull();
    expect(state.canBuyWeaponTier()).toBe(false);
    expect(state.buyWeaponTier()).toMatchObject({
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
    expect(state.buyWeaponTier()).toMatchObject({
      success: false,
      reason: 'noShop',
      status: 'There is no merchant here.',
    });
    expect(state.status).toBe('A travelling merchant beckons.');
    expect(state.getTile(row, col)?.content.type).toBe('shop');
  });

  it('marks the Merchant used when leaving; weapon tier persists for the run', () => {
    const state = openSeededShop();
    const firstCol = playerOf(state).col;
    state.addGold(15);
    expect(state.buyWeaponTier().success).toBe(true);
    expect(state.weaponTierIndex).toBe(1);

    expect(state.leaveShop()).toEqual({ row: 14, col: firstCol });
    expect(state.shopOpen).toBe(false);
    expect(state.getShopView()).toBeNull();
    expect(state.status).toBe('You leave the merchant behind.');
    expect(state.getTile(14, firstCol)?.content.type).toBe('empty');

    walkTo(state, 27, 1);
    const secondCol = shopColAt(state, 28);
    state.resolveCompletedMove(secondCol);
    expect(state.shopOpen).toBe(true);
    expect(state.weaponTierIndex).toBe(1);
    expect(state.getShopView()?.weaponOffer).toMatchObject({
      available: false,
      reason: 'unaffordable',
      tierIndex: 2,
    });
  });

  it('clears weapon tiers on class reselection', () => {
    const state = openSeededShop();
    state.addGold(15);
    expect(state.buyWeaponTier().success).toBe(true);
    expect(state.weaponTierIndex).toBe(1);

    state.clearSelectedClass();
    expect(state.hasSelectedClass).toBe(false);
    expect(state.shopOpen).toBe(false);
    expect(state.weaponTierIndex).toBe(0);

    state.selectClass('ranger');
    const again = openSeededShop(state);
    expect(again.weaponTierIndex).toBe(0);
    expect(again.canBuyWeaponTier()).toBe(false);
    again.addGold(15);
    expect(again.canBuyWeaponTier()).toBe(true);
    expect(again.buyWeaponTier().success).toBe(true);
    expect(again.weaponTierIndex).toBe(1);
  });
});

describe('GameState shop ownership', () => {
  it('delegates run shop session state without exposing the live object', () => {
    expect(gameStateSource).toMatch(/new ShopSession/);
    expect(gameStateSource).not.toMatch(/private activeShop/);
    expect(gameStateSource).not.toMatch(/private shopProgress/);
    expect(gameStateSource).not.toMatch(/private weaponTierIndex/);
    expect(gameStateSource).toMatch(/this\.shopSession\.weaponTierIndexValue/);
    expect(gameStateSource).not.toMatch(/get shopSession/);
    expect(gameStateSource).not.toMatch(/export \{ ShopSession/);
  });
});

describe('dex HUD', () => {
  it('displays DEX without a percent sign', () => {
    expect(evadeHudText(1)).toBe('DEX: 1');
    expect(evadeHudText(6)).toBe('DEX: 6');
  });
});
