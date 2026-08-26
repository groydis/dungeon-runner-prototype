import { describe, expect, it } from 'vitest';
import { Merchant } from './Merchant';
import {
  MERCHANT_POTION_CATALOG,
  POTION_OFFER_IDS,
  evaluatePotionOffer,
  merchantPotionInStock,
  merchantPotionStock,
  potionEffectText,
} from './merchantPotions';
import {
  applyPotionPurchase,
  buildShopView,
} from './shop';
import { Player } from './Player';

describe('Merchant potion catalog', () => {
  it('keeps fixed prices and pickup heal amounts', () => {
    expect(POTION_OFFER_IDS).toEqual(['small', 'medium', 'large', 'greater']);
    expect(MERCHANT_POTION_CATALOG.small).toMatchObject({
      price: 4,
      healAmount: 4,
      name: 'Small Potion',
    });
    expect(MERCHANT_POTION_CATALOG.medium).toMatchObject({
      price: 8,
      healAmount: 8,
    });
    expect(MERCHANT_POTION_CATALOG.large).toMatchObject({
      price: 12,
      healAmount: 12,
    });
    expect(MERCHANT_POTION_CATALOG.greater).toMatchObject({
      price: 18,
      healAmount: 16,
    });
    expect(potionEffectText(8)).toBe('Restore up to 8 HP');
  });

  it('stocks by absolute Merchant row bands', () => {
    expect(merchantPotionStock(13).map((offer) => offer.id)).toEqual([]);
    expect(merchantPotionStock(14).map((offer) => offer.id)).toEqual(['small']);
    expect(merchantPotionStock(27).map((offer) => offer.id)).toEqual(['small']);
    expect(merchantPotionStock(28).map((offer) => offer.id)).toEqual([
      'small',
      'medium',
    ]);
    expect(merchantPotionStock(41).map((offer) => offer.id)).toEqual([
      'small',
      'medium',
    ]);
    expect(merchantPotionStock(42).map((offer) => offer.id)).toEqual([
      'small',
      'medium',
      'large',
      'greater',
    ]);
    expect(merchantPotionInStock('medium', 14)).toBe(false);
    expect(merchantPotionInStock('medium', 28)).toBe(true);
    expect(merchantPotionInStock('greater', 42)).toBe(true);
  });

  it('disables full health and unaffordable purchases', () => {
    expect(
      evaluatePotionOffer(true, true, 10, 20, 20, 2).reason,
    ).toBe('fullHealth');
    expect(
      evaluatePotionOffer(true, true, 1, 10, 20, 2).reason,
    ).toBe('unaffordable');
    expect(evaluatePotionOffer(true, false, 10, 10, 20, 2).reason).toBe(
      'notInStock',
    );
    expect(evaluatePotionOffer(true, true, 10, 10, 20, 2).available).toBe(true);
  });
});

describe('Merchant potion purchases', () => {
  it('heals at a fixed price and clamps at max HP', () => {
    const merchant = new Merchant('m-28', 28, 1);
    const result = applyPotionPurchase(merchant, 'medium', 20, 14, 20);
    expect(result).toMatchObject({
      success: true,
      goldSpent: 8,
      goldRemaining: 12,
      healthRestored: 6,
      status: 'Bought Medium Potion. Restored 6 HP.',
    });
  });

  it('builds shop views with row-banded potion stock', () => {
    const player = new Player('rogue');
    player.addGold(20);
    player.takeDamage(8);
    const early = buildShopView(
      new Merchant('m-14', 14, 1),
      player.gold,
      player.classId,
      -1,
      -1,
      player.stats.health,
      player.stats.maxHealth,
    );
    expect(early?.potionOffers.map((offer) => offer.id)).toEqual(['small']);
    expect(early?.potionOffers[0]).toMatchObject({
      cost: 4,
      healAmount: 4,
      available: true,
    });

    const deep = buildShopView(
      new Merchant('m-42', 42, 1),
      player.gold,
      player.classId,
      -1,
      -1,
      player.stats.health,
      player.stats.maxHealth,
    );
    expect(deep?.potionOffers.map((offer) => offer.id)).toEqual([
      'small',
      'medium',
      'large',
      'greater',
    ]);
  });
});
