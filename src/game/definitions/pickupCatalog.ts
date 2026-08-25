/**
 * Pickup identity and effects. Pattern/drop tables choose a category;
 * `PickupDenominations` picks the tier so layout and drop-category streams
 * stay stable when tiers are added.
 */
export const PICKUP_IDS = [
  'gold',
  'gold_stack',
  'gold_hoard',
  'potion',
  'potion_medium',
  'potion_large',
  'potion_greater',
] as const;

export type PickupId = (typeof PICKUP_IDS)[number];

export type PickupCategory = 'gold' | 'potion';

export type PickupRenderKey =
  | 'coin'
  | 'coinStackSmall'
  | 'coinStackLarge'
  | 'potionSmall'
  | 'potionMedium'
  | 'potionLarge'
  | 'potionGreater';

export type PickupEffect =
  | { kind: 'grantGold'; amount: number }
  | { kind: 'restoreHealth'; amount: number };

export interface PickupDefinition {
  id: PickupId;
  name: string;
  category: PickupCategory;
  effect: PickupEffect;
  renderKey: PickupRenderKey;
}

export const PICKUP_CATALOG: Record<PickupId, PickupDefinition> = {
  gold: {
    id: 'gold',
    name: 'Gold Coin',
    category: 'gold',
    effect: { kind: 'grantGold', amount: 1 },
    renderKey: 'coin',
  },
  gold_stack: {
    id: 'gold_stack',
    name: 'Small Gold Stack',
    category: 'gold',
    effect: { kind: 'grantGold', amount: 5 },
    renderKey: 'coinStackSmall',
  },
  gold_hoard: {
    id: 'gold_hoard',
    name: 'Large Gold Hoard',
    category: 'gold',
    effect: { kind: 'grantGold', amount: 10 },
    renderKey: 'coinStackLarge',
  },
  potion: {
    id: 'potion',
    name: 'Small Potion',
    category: 'potion',
    effect: { kind: 'restoreHealth', amount: 4 },
    renderKey: 'potionSmall',
  },
  potion_medium: {
    id: 'potion_medium',
    name: 'Medium Potion',
    category: 'potion',
    effect: { kind: 'restoreHealth', amount: 8 },
    renderKey: 'potionMedium',
  },
  potion_large: {
    id: 'potion_large',
    name: 'Large Potion',
    category: 'potion',
    effect: { kind: 'restoreHealth', amount: 12 },
    renderKey: 'potionLarge',
  },
  potion_greater: {
    id: 'potion_greater',
    name: 'Greater Potion',
    category: 'potion',
    effect: { kind: 'restoreHealth', amount: 16 },
    renderKey: 'potionGreater',
  },
};

export function pickupDefinition(id: PickupId): PickupDefinition {
  return PICKUP_CATALOG[id];
}

export function pickupCategoryOf(id: PickupId): PickupCategory {
  return PICKUP_CATALOG[id].category;
}

export function potionHealAmount(id: PickupId): number {
  const effect = PICKUP_CATALOG[id].effect;
  if (effect.kind !== 'restoreHealth') {
    throw new Error(`Pickup ${id} is not a healing potion`);
  }
  return effect.amount;
}

export function goldGrantAmount(id: PickupId): number {
  const effect = PICKUP_CATALOG[id].effect;
  if (effect.kind !== 'grantGold') {
    throw new Error(`Pickup ${id} is not gold`);
  }
  return effect.amount;
}

/** Map potion pickup IDs to KayKit model sizes. */
export function potionModelSizeForPickup(
  id: PickupId,
): 'small' | 'medium' | 'large' | 'greater' {
  switch (id) {
    case 'potion_medium':
      return 'medium';
    case 'potion_large':
      return 'large';
    case 'potion_greater':
      return 'greater';
    default:
      return 'small';
  }
}

export function defaultPickupIdForCategory(category: PickupCategory): PickupId {
  return category === 'gold' ? 'gold' : 'potion';
}
