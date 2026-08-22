import {
  SHOP_ATTACK_BONUS,
  SHOP_ATTACK_COST,
  SHOP_HEAL_AMOUNT,
  SHOP_HEAL_COST,
} from './config';
import { type Merchant } from './Merchant';
import { type CombatStats } from './Combatant';

export type ShopOfferId = 'heal' | 'attack';

export type ShopUnavailableReason =
  | 'noShop'
  | 'alreadyPurchased'
  | 'unaffordable'
  | 'alreadyFull';

export interface ShopOfferState {
  id: ShopOfferId;
  purchased: boolean;
}

export interface ActiveShop {
  merchantId: string;
  row: number;
  col: number;
  offers: ShopOfferState[];
}

export interface ShopOfferView {
  id: ShopOfferId;
  title: string;
  description: string;
  cost: number;
  available: boolean;
  reason?: ShopUnavailableReason;
  reasonText?: string;
}

export interface ShopView {
  gold: number;
  offers: ShopOfferView[];
}

export interface ShopPurchaseResult {
  success: boolean;
  offerId?: ShopOfferId;
  reason?: ShopUnavailableReason;
  goldRemaining: number;
  healthRestored: number;
  attackGained: number;
  status: string;
}

export const SHOP_OFFER_CATALOG: Record<
  ShopOfferId,
  { title: string; description: string; cost: number }
> = {
  heal: {
    title: 'Field dressing',
    description: `Restore ${SHOP_HEAL_AMOUNT} HP`,
    cost: SHOP_HEAL_COST,
  },
  attack: {
    title: 'Sharpen weapon',
    description: `+${SHOP_ATTACK_BONUS} attack for this run`,
    cost: SHOP_ATTACK_COST,
  },
};

export function createActiveShop(merchant: Merchant): ActiveShop {
  return {
    merchantId: merchant.id,
    row: merchant.row,
    col: merchant.col,
    offers: [
      { id: 'heal', purchased: false },
      { id: 'attack', purchased: false },
    ],
  };
}

export function evaluateShopOffer(
  shop: ActiveShop | null,
  offerId: ShopOfferId,
  gold: number,
  stats: CombatStats,
): { available: boolean; reason?: ShopUnavailableReason } {
  if (!shop) {
    return { available: false, reason: 'noShop' };
  }

  const offer = shop.offers.find((entry) => entry.id === offerId);
  if (!offer || offer.purchased) {
    return { available: false, reason: 'alreadyPurchased' };
  }

  if (offerId === 'heal' && stats.health >= stats.maxHealth) {
    return { available: false, reason: 'alreadyFull' };
  }

  const catalog = SHOP_OFFER_CATALOG[offerId];
  if (gold < catalog.cost) {
    return { available: false, reason: 'unaffordable' };
  }

  return { available: true };
}

export function buildShopView(
  shop: ActiveShop | null,
  gold: number,
  stats: CombatStats,
): ShopView | null {
  if (!shop) {
    return null;
  }

  return {
    gold,
    offers: (['heal', 'attack'] as const).map((id) => {
      const catalog = SHOP_OFFER_CATALOG[id];
      const evaluation = evaluateShopOffer(shop, id, gold, stats);
      return {
        id,
        title: catalog.title,
        description: catalog.description,
        cost: catalog.cost,
        available: evaluation.available,
        reason: evaluation.reason,
        reasonText: evaluation.reason
          ? unavailableReasonText(evaluation.reason)
          : undefined,
      };
    }),
  };
}

export function unavailableReasonText(reason: ShopUnavailableReason): string {
  if (reason === 'alreadyFull') {
    return 'Already at full health';
  }
  if (reason === 'unaffordable') {
    return 'Not enough gold';
  }
  if (reason === 'alreadyPurchased') {
    return 'Already purchased';
  }
  return 'Unavailable';
}

export function applyShopPurchase(
  shop: ActiveShop,
  offerId: ShopOfferId,
  gold: number,
  stats: CombatStats,
): ShopPurchaseResult {
  const evaluation = evaluateShopOffer(shop, offerId, gold, stats);
  if (!evaluation.available) {
    return {
      success: false,
      offerId,
      reason: evaluation.reason,
      goldRemaining: gold,
      healthRestored: 0,
      attackGained: 0,
      status: unavailableReasonText(evaluation.reason ?? 'noShop'),
    };
  }

  const catalog = SHOP_OFFER_CATALOG[offerId];
  const goldRemaining = gold - catalog.cost;
  const offer = shop.offers.find((entry) => entry.id === offerId);
  if (offer) {
    offer.purchased = true;
  }

  if (offerId === 'heal') {
    const missing = stats.maxHealth - stats.health;
    const restored = Math.min(SHOP_HEAL_AMOUNT, Math.max(0, missing));
    return {
      success: true,
      offerId,
      goldRemaining,
      healthRestored: restored,
      attackGained: 0,
      status: `You buy field dressing and restore ${restored} HP.`,
    };
  }

  return {
    success: true,
    offerId,
    goldRemaining,
    healthRestored: 0,
    attackGained: SHOP_ATTACK_BONUS,
    status: `You sharpen your weapon. Attack is now ${stats.attack + SHOP_ATTACK_BONUS}.`,
  };
}
