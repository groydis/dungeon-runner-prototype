import { potionHealAmount } from './definitions/pickupCatalog';
import { SHOP_ROW_INTERVAL } from './config';

/**
 * Merchant potion shelf. Prices and distance stock live here; heal amounts
 * come from `PickupCatalog` (same values as floor tiers).
 */
export const POTION_OFFER_IDS = [
  'small',
  'medium',
  'large',
  'greater',
] as const;

export type PotionOfferId = (typeof POTION_OFFER_IDS)[number];

export type PotionUnavailableReason =
  | 'noShop'
  | 'notInStock'
  | 'fullHealth'
  | 'unaffordable';

export interface MerchantPotionOfferDefinition {
  id: PotionOfferId;
  name: string;
  healAmount: number;
  price: number;
}

export const MERCHANT_POTION_CATALOG: Record<
  PotionOfferId,
  MerchantPotionOfferDefinition
> = {
  small: {
    id: 'small',
    name: 'Small Potion',
    healAmount: potionHealAmount('potion'),
    price: 2,
  },
  medium: {
    id: 'medium',
    name: 'Medium Potion',
    healAmount: potionHealAmount('potion_medium'),
    price: 4,
  },
  large: {
    id: 'large',
    name: 'Large Potion',
    healAmount: potionHealAmount('potion_large'),
    price: 6,
  },
  greater: {
    id: 'greater',
    name: 'Greater Potion',
    healAmount: potionHealAmount('potion_greater'),
    price: 9,
  },
};

export function potionEffectText(healAmount: number): string {
  return `Restore up to ${healAmount} HP`;
}

export function potionUnavailableReasonText(
  reason: PotionUnavailableReason,
  price?: number,
): string {
  if (reason === 'fullHealth') {
    return 'Already at full health';
  }
  if (reason === 'unaffordable') {
    return price !== undefined ? `Need ${price} gold` : 'Not enough gold';
  }
  if (reason === 'notInStock') {
    return 'Not sold at this Merchant';
  }
  return 'Unavailable';
}

/** Absolute Merchant row bands. Prices stay fixed; only stock changes. */
export function merchantPotionStock(
  merchantRow: number,
): MerchantPotionOfferDefinition[] {
  if (merchantRow < SHOP_ROW_INTERVAL) {
    return [];
  }
  if (merchantRow >= SHOP_ROW_INTERVAL * 3) {
    return POTION_OFFER_IDS.map((id) => MERCHANT_POTION_CATALOG[id]);
  }
  if (merchantRow >= SHOP_ROW_INTERVAL * 2) {
    return [MERCHANT_POTION_CATALOG.small, MERCHANT_POTION_CATALOG.medium];
  }
  return [MERCHANT_POTION_CATALOG.small];
}

export function merchantPotionInStock(
  offerId: PotionOfferId,
  merchantRow: number,
): boolean {
  return merchantPotionStock(merchantRow).some((offer) => offer.id === offerId);
}

export function evaluatePotionOffer(
  hasOpenShop: boolean,
  isInStock: boolean,
  gold: number,
  health: number,
  maxHealth: number,
  price: number,
): { available: boolean; reason?: PotionUnavailableReason } {
  if (!hasOpenShop) {
    return { available: false, reason: 'noShop' };
  }
  if (!isInStock) {
    return { available: false, reason: 'notInStock' };
  }
  if (health >= maxHealth) {
    return { available: false, reason: 'fullHealth' };
  }
  if (gold < price) {
    return { available: false, reason: 'unaffordable' };
  }
  return { available: true };
}
