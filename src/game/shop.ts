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

export type ShopUnavailableReason =
  | 'noShop'
  | 'noClass'
  | 'unaffordable'
  | 'owned';

/** Snapshot used when evaluating special-equipment gains. */
export interface ShopStatSnapshot {
  maxHealth: number;
  attack: number;
  defence: number;
  evade: number;
}

export interface ActiveShop {
  merchant: Merchant;
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
  specialOffer: ShopSpecialOfferView | null;
}

export interface ShopPurchaseResult {
  success: boolean;
  offerId?: 'specialEquipment';
  specialEquipmentId?: SpecialEquipmentId;
  reason?: ShopUnavailableReason;
  goldRemaining: number;
  goldSpent: number;
  strGained: number;
  conGained: number;
  defGained: number;
  dexGained: number;
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

export function shopStatSnapshot(player: {
  stats: CombatStats;
}): ShopStatSnapshot {
  const stats = player.stats;
  return {
    maxHealth: stats.maxHealth,
    attack: stats.attack,
    defence: stats.defence,
    evade: stats.dex,
  };
}

export function buildShopView(
  merchant: Merchant | null,
  gold: number,
  stats: ShopStatSnapshot,
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
    specialOffer: playerClassId
      ? buildSpecialEquipmentOfferView(
          merchant,
          playerClassId,
          gold,
          specialEquipmentOwned,
        )
      : null,
  };
}

export function unavailableReasonText(reason: ShopUnavailableReason): string {
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
  owned: boolean,
): { available: boolean; reason?: ShopUnavailableReason } {
  if (!merchant) {
    return { available: false, reason: 'noShop' };
  }
  if (owned) {
    return { available: false, reason: 'owned' };
  }
  const definition = specialEquipmentForClass(classId);
  const gains = applicableSpecialEquipmentGains(definition.gains);
  if (!hasSpecialEquipmentGain(gains)) {
    return { available: false, reason: 'owned' };
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
  owned: boolean,
): ShopPurchaseResult {
  const definition = specialEquipmentForClass(classId);
  const evaluation = evaluateSpecialEquipmentOffer(
    merchant,
    classId,
    gold,
    owned,
  );
  if (!evaluation.available) {
    return emptyPurchase(gold, evaluation.reason ?? 'noShop');
  }
  const gains = applicableSpecialEquipmentGains(definition.gains);
  return {
    success: true,
    offerId: 'specialEquipment',
    specialEquipmentId: definition.id,
    goldRemaining: gold - definition.cost,
    goldSpent: definition.cost,
    strGained: gains.str,
    conGained: gains.con,
    defGained: gains.def,
    dexGained: gains.dex,
    status: `You equip ${definition.name}. ${specialEquipmentStatLine(gains)}.`,
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
  gold: number,
  reason: ShopUnavailableReason,
): ShopPurchaseResult {
  return {
    success: false,
    offerId: 'specialEquipment',
    reason,
    goldRemaining: gold,
    goldSpent: 0,
    strGained: 0,
    conGained: 0,
    defGained: 0,
    dexGained: 0,
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
  owned: boolean,
): ShopSpecialOfferView {
  const definition = specialEquipmentForClass(classId);
  const displayedGains = owned
    ? definition.gains
    : applicableSpecialEquipmentGains(definition.gains);
  const evaluation = evaluateSpecialEquipmentOffer(
    merchant,
    classId,
    gold,
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
