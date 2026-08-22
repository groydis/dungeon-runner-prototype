import {
  SHOP_ATTACK_BONUS,
  SHOP_ATTACK_COST,
  SHOP_HEAL_AMOUNT,
  SHOP_HEAL_COST,
} from './config';
import { type Merchant, type MerchantOfferId } from './Merchant';
import { type CombatStats } from './Combatant';

export type ShopOfferId = MerchantOfferId;

export type ShopUnavailableReason =
  | 'noShop'
  | 'alreadyPurchased'
  | 'unaffordable'
  | 'alreadyFull';

export interface ActiveShop {
  merchant: Merchant;
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
  goldSpent: number;
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
  return { merchant };
}

export function evaluateShopOffer(
  merchant: Merchant | null,
  offerId: ShopOfferId,
  gold: number,
  stats: CombatStats,
): { available: boolean; reason?: ShopUnavailableReason } {
  if (!merchant) {
    return { available: false, reason: 'noShop' };
  }

  if (merchant.hasPurchased(offerId)) {
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
  merchant: Merchant | null,
  gold: number,
  stats: CombatStats,
): ShopView | null {
  if (!merchant) {
    return null;
  }

  return {
    gold,
    offers: (['heal', 'attack'] as const).map((id) => {
      const catalog = SHOP_OFFER_CATALOG[id];
      const evaluation = evaluateShopOffer(merchant, id, gold, stats);
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
  merchant: Merchant,
  offerId: ShopOfferId,
  gold: number,
  stats: CombatStats,
): ShopPurchaseResult {
  const evaluation = evaluateShopOffer(merchant, offerId, gold, stats);
  if (!evaluation.available) {
    return {
      success: false,
      offerId,
      reason: evaluation.reason,
      goldRemaining: gold,
      goldSpent: 0,
      healthRestored: 0,
      attackGained: 0,
      status: unavailableReasonText(evaluation.reason ?? 'noShop'),
    };
  }

  const catalog = SHOP_OFFER_CATALOG[offerId];
  merchant.markPurchased(offerId);

  if (offerId === 'heal') {
    const missing = stats.maxHealth - stats.health;
    const restored = Math.min(SHOP_HEAL_AMOUNT, Math.max(0, missing));
    return {
      success: true,
      offerId,
      goldRemaining: gold - catalog.cost,
      goldSpent: catalog.cost,
      healthRestored: restored,
      attackGained: 0,
      status: `You buy field dressing and restore ${restored} HP.`,
    };
  }

  return {
    success: true,
    offerId,
    goldRemaining: gold - catalog.cost,
    goldSpent: catalog.cost,
    healthRestored: 0,
    attackGained: SHOP_ATTACK_BONUS,
    status: `You sharpen your weapon. Attack is now ${stats.attack + SHOP_ATTACK_BONUS}.`,
  };
}
