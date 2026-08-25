import { describe, expect, it } from 'vitest';
import {
  derivedPickupSeed,
  pickPickupDenomination,
  pickupDiscriminatorForText,
} from './pickupDenominations';
import { PICKUP_POOLS, pickupPoolForRow } from './pickupPools';
import { potionHealAmount } from './pickupCatalog';

describe('PickupPools', () => {
  it('keeps opening rows small-only and unlocks greater only at 40+', () => {
    expect(pickupPoolForRow(0, 'potion').entries.map((e) => e.id)).toEqual([
      'potion',
    ]);
    expect(pickupPoolForRow(19, 'potion').entries.map((e) => e.id)).toEqual([
      'potion',
    ]);
    expect(pickupPoolForRow(20, 'potion').entries.map((e) => e.id)).toEqual([
      'potion',
      'potion_medium',
      'potion_large',
    ]);
    expect(pickupPoolForRow(39, 'potion').totalWeight).toBe(100);
    expect(pickupPoolForRow(40, 'potion').entries.map((e) => e.id)).toEqual([
      'potion',
      'potion_medium',
      'potion_large',
      'potion_greater',
    ]);
    expect(PICKUP_POOLS.potionRows40AndBeyond.entries.at(-1)).toMatchObject({
      id: 'potion_greater',
      weight: 8,
    });
  });

  it('matches catalog heal amounts', () => {
    expect(potionHealAmount('potion')).toBe(4);
    expect(potionHealAmount('potion_medium')).toBe(8);
    expect(potionHealAmount('potion_large')).toBe(12);
    expect(potionHealAmount('potion_greater')).toBe(16);
  });
});

describe('PickupDenominations', () => {
  it('is stable for the same seed/row/column and independent of call order', () => {
    const a = pickPickupDenomination('potion', 42, 909, 1);
    const b = pickPickupDenomination('potion', 42, 909, 1);
    expect(a).toBe(b);
    const otherCol = pickPickupDenomination('potion', 42, 909, 2);
    // May or may not differ; just ensure both are valid deep-band IDs.
    for (const id of [a, otherCol]) {
      expect([
        'potion',
        'potion_medium',
        'potion_large',
        'potion_greater',
      ]).toContain(id);
    }
  });

  it('does not change when gold and potion are interleaved', () => {
    const control = pickPickupDenomination('potion', 40, 4242, 0);
    pickPickupDenomination('gold', 40, 4242, 0);
    pickPickupDenomination('gold', 41, 4242, 1);
    expect(pickPickupDenomination('potion', 40, 4242, 0)).toBe(control);
  });

  it('derives distinct seeds across row, category, discriminator, and run seed', () => {
    expect(
      derivedPickupSeed(5, 41, 'gold', 1),
    ).not.toBe(derivedPickupSeed(5, 40, 'gold', 1));
    expect(
      derivedPickupSeed(5, 40, 'potion', 1),
    ).not.toBe(derivedPickupSeed(5, 40, 'gold', 1));
    expect(
      derivedPickupSeed(5, 40, 'gold', 2),
    ).not.toBe(derivedPickupSeed(5, 40, 'gold', 1));
    expect(
      derivedPickupSeed(6, 40, 'gold', 1),
    ).not.toBe(derivedPickupSeed(5, 40, 'gold', 1));
  });

  it('hashes monster ids with stable FNV-1a', () => {
    expect(pickupDiscriminatorForText('demo-skeleton-minion')).toBe(
      pickupDiscriminatorForText('demo-skeleton-minion'),
    );
    expect(pickupDiscriminatorForText('a')).not.toBe(
      pickupDiscriminatorForText('b'),
    );
  });
});
