import {
  PLAYER_ATTACK_CAP,
  PLAYER_DEFENCE_CAP,
  PLAYER_EVADE_MAX,
  PLAYER_MAX_HEALTH_CAP,
} from './config';
import { type Merchant } from './Merchant';
import { type CombatStats } from './Combatant';
import { type PlayerClassId } from './definitions/classes';
import {
  MERCHANT_POTION_CATALOG,
  evaluatePotionOffer,
  merchantPotionInStock,
  merchantPotionStock,
  potionEffectText,
  potionUnavailableReasonText,
  type PotionOfferId,
  type PotionUnavailableReason,
} from './merchantPotions';
import {
  applicableSpecialEquipmentGains,
  hasSpecialEquipmentGain,
  specialEquipmentForClass,
  specialEquipmentStatLine,
  type SpecialEquipmentId,
} from './specialEquipment';

export type {
  PotionOfferId,
  PotionUnavailableReason,
} from './merchantPotions';
export {
  MERCHANT_POTION_CATALOG,
  POTION_OFFER_IDS,
  merchantPotionStock,
} from './merchantPotions';

export const SHOP_OFFER_IDS = [
  'vitality',
  'sharpened',
  'armoured',
  'evasive',
] as const;

export type ShopOfferId = (typeof SHOP_OFFER_IDS)[number];

export type ShopUnavailableReason =
  | 'noShop'
  | 'noClass'
  | 'unaffordable'
  | 'capped'
  | 'owned';

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

export interface ShopSpecialOfferView {
  id: 'specialEquipment';
  equipmentId: SpecialEquipmentId;
  title: string;
  description: string;
  statLine: string;
  classId: PlayerClassId;
  cost: number;
  available: boolean;
  reason?: ShopUnavailableReason;
  reasonText?: string;
}

export interface PotionOfferView {
  id: PotionOfferId;
  title: string;
  description: string;
  healAmount: number;
  cost: number;
  available: boolean;
  reason?: PotionUnavailableReason;
  reasonText?: string;
}

export interface ShopView {
  gold: number;
  potionOffers: PotionOfferView[];
  offers: ShopOfferView[];
  specialOffer: ShopSpecialOfferView | null;
}

export interface ShopPurchaseResult {
  success: boolean;
  offerId?: ShopOfferId | 'specialEquipment';
  specialEquipmentId?: SpecialEquipmentId;
  reason?: ShopUnavailableReason;
  goldRemaining: number;
  goldSpent: number;
  maxHealthGained: number;
  attackGained: number;
  defenceGained: number;
  evadeGained: number;
  status: string;
}

export interface PotionPurchaseResult {
  success: boolean;
  offerId?: PotionOfferId;
  reason?: PotionUnavailableReason;
  goldRemaining: number;
  goldSpent: number;
  healthRestored: number;
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
  playerClassId?: PlayerClassId,
  specialEquipmentOwned = false,
  health = stats.maxHealth,
): ShopView | null {
  if (!merchant) {
    return null;
  }

  return {
    gold,
    potionOffers: merchantPotionStock(merchant.row).map((definition) =>
      buildPotionOfferView(merchant, definition.id, gold, health, stats.maxHealth),
    ),
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
    specialOffer: playerClassId
      ? buildSpecialEquipmentOfferView(
          merchant,
          playerClassId,
          gold,
          stats,
          specialEquipmentOwned,
        )
      : null,
  };
}

export function unavailableReasonText(reason: ShopUnavailableReason): string {
  if (reason === 'capped') {
    return 'Already at maximum';
  }
  if (reason === 'unaffordable') {
    return 'Not enough gold';
  }
  if (reason === 'owned') {
    return 'Already equipped';
  }
  if (reason === 'noClass') {
    return 'Choose a class first.';
  }
  return 'Unavailable';
}

export function evaluateSpecialEquipmentOffer(
  merchant: Merchant | null,
  classId: PlayerClassId,
  gold: number,
  stats: ShopStatSnapshot,
  owned: boolean,
): { available: boolean; reason?: ShopUnavailableReason } {
  if (!merchant) {
    return { available: false, reason: 'noShop' };
  }
  if (owned) {
    return { available: false, reason: 'owned' };
  }
  const definition = specialEquipmentForClass(classId);
  const gains = applicableSpecialEquipmentGains(definition.gains, stats);
  if (!hasSpecialEquipmentGain(gains)) {
    return { available: false, reason: 'capped' };
  }
  if (gold < definition.cost) {
    return { available: false, reason: 'unaffordable' };
  }
  return { available: true };
}

export function applySpecialEquipmentPurchase(
  merchant: Merchant | null,
  classId: PlayerClassId,
  gold: number,
  stats: ShopStatSnapshot,
  owned: boolean,
): ShopPurchaseResult {
  const definition = specialEquipmentForClass(classId);
  const evaluation = evaluateSpecialEquipmentOffer(
    merchant,
    classId,
    gold,
    stats,
    owned,
  );
  if (!evaluation.available) {
    return emptyPurchase(
      'specialEquipment',
      gold,
      evaluation.reason ?? 'noShop',
    );
  }
  const gains = applicableSpecialEquipmentGains(definition.gains, stats);
  return {
    success: true,
    offerId: 'specialEquipment',
    specialEquipmentId: definition.id,
    goldRemaining: gold - definition.cost,
    goldSpent: definition.cost,
    maxHealthGained: gains.maxHealth,
    attackGained: gains.attack,
    defenceGained: gains.defence,
    evadeGained: gains.evade,
    status: `You equip ${definition.name}. ${specialEquipmentStatLine(gains)}.`,
  };
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

/** Immediate-use potion: spend gold and report heal amount; caller applies heal. */
export function applyPotionPurchase(
  merchant: Merchant | null,
  offerId: PotionOfferId,
  gold: number,
  health: number,
  maxHealth: number,
): PotionPurchaseResult {
  const definition = MERCHANT_POTION_CATALOG[offerId];
  const evaluation = evaluatePotionOffer(
    merchant !== null,
    merchant !== null && merchantPotionInStock(offerId, merchant.row),
    gold,
    health,
    maxHealth,
    definition.price,
  );
  if (!evaluation.available) {
    return emptyPotionPurchase(
      offerId,
      gold,
      evaluation.reason ?? 'noShop',
      definition.price,
    );
  }

  const restored = Math.min(definition.healAmount, maxHealth - health);
  return {
    success: true,
    offerId,
    goldRemaining: gold - definition.price,
    goldSpent: definition.price,
    healthRestored: restored,
    status: `Bought ${definition.name}. Restored ${restored} HP.`,
  };
}

function emptyPurchase(
  offerId: ShopOfferId | 'specialEquipment',
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

function emptyPotionPurchase(
  offerId: PotionOfferId,
  gold: number,
  reason: PotionUnavailableReason,
  price: number,
): PotionPurchaseResult {
  return {
    success: false,
    offerId,
    reason,
    goldRemaining: gold,
    goldSpent: 0,
    healthRestored: 0,
    status: potionUnavailableReasonText(reason, price),
  };
}

function buildPotionOfferView(
  merchant: Merchant,
  offerId: PotionOfferId,
  gold: number,
  health: number,
  maxHealth: number,
): PotionOfferView {
  const definition = MERCHANT_POTION_CATALOG[offerId];
  const evaluation = evaluatePotionOffer(
    true,
    merchantPotionInStock(offerId, merchant.row),
    gold,
    health,
    maxHealth,
    definition.price,
  );
  return {
    id: offerId,
    title: definition.name,
    description: potionEffectText(definition.healAmount),
    healAmount: definition.healAmount,
    cost: definition.price,
    available: evaluation.available,
    reason: evaluation.reason,
    reasonText: evaluation.reason
      ? potionUnavailableReasonText(evaluation.reason, definition.price)
      : undefined,
  };
}

function buildSpecialEquipmentOfferView(
  merchant: Merchant,
  classId: PlayerClassId,
  gold: number,
  stats: ShopStatSnapshot,
  owned: boolean,
): ShopSpecialOfferView {
  const definition = specialEquipmentForClass(classId);
  const displayedGains = owned
    ? definition.gains
    : applicableSpecialEquipmentGains(definition.gains, stats);
  const evaluation = evaluateSpecialEquipmentOffer(
    merchant,
    classId,
    gold,
    stats,
    owned,
  );
  return {
    id: 'specialEquipment',
    equipmentId: definition.id,
    title: definition.name,
    description: definition.flavour,
    statLine: specialEquipmentStatLine(displayedGains),
    classId,
    cost: definition.cost,
    available: evaluation.available,
    reason: evaluation.reason,
    reasonText: evaluation.reason
      ? unavailableReasonText(evaluation.reason)
      : undefined,
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
