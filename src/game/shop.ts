import {
  PLAYER_ATTACK_CAP,
  PLAYER_DEFENCE_CAP,
  PLAYER_EVADE_MAX,
  PLAYER_MAX_HEALTH_CAP,
} from './config';
import { type Merchant } from './Merchant';
import { type CombatStats } from './Combatant';

export const SHOP_OFFER_IDS = [
  'vitality',
  'sharpened',
  'armoured',
  'evasive',
] as const;

export type ShopOfferId = (typeof SHOP_OFFER_IDS)[number];

export type ShopUnavailableReason = 'noShop' | 'noClass' | 'unaffordable' | 'capped';

export type ShopStatKey = 'maxHealth' | 'attack' | 'defence' | 'evade';

export const SHOP_STAT_GAIN = 1;

export interface ShopOfferCatalogEntry {
  title: string;
  description: string;
  firstPrice: number;
  cap: number;
  stat: ShopStatKey;
}

export const SHOP_OFFER_CATALOG: Record<ShopOfferId, ShopOfferCatalogEntry> = {
  vitality: {
    title: 'Vitality',
    description: '+1 max HP',
    firstPrice: 2,
    cap: PLAYER_MAX_HEALTH_CAP,
    stat: 'maxHealth',
  },
  sharpened: {
    title: 'Sharpened',
    description: '+1 attack',
    firstPrice: 3,
    cap: PLAYER_ATTACK_CAP,
    stat: 'attack',
  },
  armoured: {
    title: 'Armoured',
    description: '+1 defence',
    firstPrice: 3,
    cap: PLAYER_DEFENCE_CAP,
    stat: 'defence',
  },
  evasive: {
    title: 'Evasive',
    description: '+1 Evade',
    firstPrice: 2,
    cap: PLAYER_EVADE_MAX,
    stat: 'evade',
  },
};

export type ShopProgress = Record<ShopOfferId, number>;

export interface ShopStatSnapshot {
  maxHealth: number;
  attack: number;
  defence: number;
  evade: number;
}

export interface ActiveShop {
  merchant: Merchant;
}

export interface ShopOfferView {
  id: ShopOfferId;
  title: string;
  description: string;
  currentValue: number;
  nextValue: number;
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
  maxHealthGained: number;
  attackGained: number;
  defenceGained: number;
  evadeGained: number;
  status: string;
}

export function createActiveShop(merchant: Merchant): ActiveShop {
  return { merchant };
}

export function createShopProgress(): ShopProgress {
  return {
    vitality: 0,
    sharpened: 0,
    armoured: 0,
    evasive: 0,
  };
}

export function shopStatSnapshot(player: {
  stats: CombatStats;
  evade: number;
}): ShopStatSnapshot {
  const stats = player.stats;
  return {
    maxHealth: stats.maxHealth,
    attack: stats.attack,
    defence: stats.defence,
    evade: player.evade,
  };
}

export function shopOfferPrice(offerId: ShopOfferId, progress: ShopProgress): number {
  return SHOP_OFFER_CATALOG[offerId].firstPrice + progress[offerId];
}

export function shopStatValue(
  offerId: ShopOfferId,
  stats: ShopStatSnapshot,
): number {
  return stats[SHOP_OFFER_CATALOG[offerId].stat];
}

export function evaluateShopOffer(
  merchant: Merchant | null,
  offerId: ShopOfferId,
  gold: number,
  stats: ShopStatSnapshot,
  progress: ShopProgress,
): { available: boolean; reason?: ShopUnavailableReason } {
  if (!merchant) {
    return { available: false, reason: 'noShop' };
  }

  if (shopStatValue(offerId, stats) >= SHOP_OFFER_CATALOG[offerId].cap) {
    return { available: false, reason: 'capped' };
  }

  if (gold < shopOfferPrice(offerId, progress)) {
    return { available: false, reason: 'unaffordable' };
  }

  return { available: true };
}

export function buildShopView(
  merchant: Merchant | null,
  gold: number,
  stats: ShopStatSnapshot,
  progress: ShopProgress,
): ShopView | null {
  if (!merchant) {
    return null;
  }

  return {
    gold,
    offers: SHOP_OFFER_IDS.map((id) => {
      const catalog = SHOP_OFFER_CATALOG[id];
      const currentValue = shopStatValue(id, stats);
      const evaluation = evaluateShopOffer(merchant, id, gold, stats, progress);
      return {
        id,
        title: catalog.title,
        description: catalog.description,
        currentValue,
        nextValue:
          currentValue >= catalog.cap ? currentValue : currentValue + SHOP_STAT_GAIN,
        cost: shopOfferPrice(id, progress),
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
  if (reason === 'capped') {
    return 'Already at maximum';
  }
  if (reason === 'unaffordable') {
    return 'Not enough gold';
  }
  if (reason === 'noClass') {
    return 'Choose a class first.';
  }
  return 'Unavailable';
}

export function applyShopPurchase(
  merchant: Merchant | null,
  offerId: ShopOfferId,
  gold: number,
  stats: ShopStatSnapshot,
  progress: ShopProgress,
): ShopPurchaseResult {
  const evaluation = evaluateShopOffer(merchant, offerId, gold, stats, progress);
  if (!evaluation.available) {
    return emptyPurchase(offerId, gold, evaluation.reason ?? 'noShop');
  }

  const cost = shopOfferPrice(offerId, progress);
  progress[offerId] += 1;
  const nextValue = shopStatValue(offerId, stats) + SHOP_STAT_GAIN;

  return {
    success: true,
    offerId,
    goldRemaining: gold - cost,
    goldSpent: cost,
    maxHealthGained: offerId === 'vitality' ? SHOP_STAT_GAIN : 0,
    attackGained: offerId === 'sharpened' ? SHOP_STAT_GAIN : 0,
    defenceGained: offerId === 'armoured' ? SHOP_STAT_GAIN : 0,
    evadeGained: offerId === 'evasive' ? SHOP_STAT_GAIN : 0,
    status: purchaseStatus(offerId, nextValue),
  };
}

function emptyPurchase(
  offerId: ShopOfferId,
  gold: number,
  reason: ShopUnavailableReason,
): ShopPurchaseResult {
  return {
    success: false,
    offerId,
    reason,
    goldRemaining: gold,
    goldSpent: 0,
    maxHealthGained: 0,
    attackGained: 0,
    defenceGained: 0,
    evadeGained: 0,
    status: unavailableReasonText(reason),
  };
}

function purchaseStatus(offerId: ShopOfferId, nextValue: number): string {
  if (offerId === 'vitality') {
    return `You buy Vitality. Max HP is now ${nextValue}.`;
  }
  if (offerId === 'sharpened') {
    return `You buy Sharpened. Attack is now ${nextValue}.`;
  }
  if (offerId === 'armoured') {
    return `You buy Armoured. Defence is now ${nextValue}.`;
  }
  return `You buy Evasive. Evade is now ${nextValue}.`;
}
