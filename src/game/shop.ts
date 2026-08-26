import { type Merchant } from './Merchant';
import { type PlayerClassId } from './definitions/classes';
import {
  KNIGHT_SHIELD_PROGRESSION,
  PLAYER_WEAPON_PROGRESSION,
  isShieldLadderComplete,
  isWeaponLadderComplete,
  nextWeaponTierIndex,
  shieldCatalogEntry,
  shieldTierBonus,
  shieldTierCost,
  shieldTierDisplayName,
  shieldTierFlavour,
  weaponCatalogEntry,
  weaponTierBonus,
  weaponTierCost,
  weaponTierDisplayName,
  weaponTierFlavour,
} from './definitions/playerWeaponProgression';
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

export interface ActiveShop {
  merchant: Merchant;
}

export interface ShopWeaponOfferView {
  id: 'weaponUpgrade';
  weaponId: string;
  title: string;
  description: string;
  currentTitle: string;
  statLine: string;
  classId: PlayerClassId;
  cost: number;
  tierIndex: number;
  available: boolean;
  reason?: ShopUnavailableReason;
  reasonText?: string;
}

export interface ShopShieldOfferView {
  id: 'shieldUpgrade';
  shieldId: string;
  title: string;
  description: string;
  currentTitle: string;
  statLine: string;
  cost: number;
  tierIndex: number;
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
  weaponOffer: ShopWeaponOfferView | null;
  shieldOffer: ShopShieldOfferView | null;
}

export interface ShopPurchaseResult {
  success: boolean;
  offerId?: 'weaponUpgrade' | 'shieldUpgrade';
  weaponId?: string;
  shieldId?: string;
  reason?: ShopUnavailableReason;
  goldRemaining: number;
  goldSpent: number;
  attackBonus: number;
  defenceBonus: number;
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

export function buildShopView(
  merchant: Merchant | null,
  gold: number,
  playerClassId: PlayerClassId | undefined,
  weaponTierIndex: number,
  shieldTierIndex: number,
  health: number,
  maxHealth: number,
): ShopView | null {
  if (!merchant) {
    return null;
  }

  return {
    gold,
    potionOffers: merchantPotionStock(merchant.row).map((definition) =>
      buildPotionOfferView(merchant, definition.id, gold, health, maxHealth),
    ),
    weaponOffer: playerClassId
      ? buildWeaponOfferView(merchant, playerClassId, gold, weaponTierIndex)
      : null,
    shieldOffer:
      playerClassId === 'knight'
        ? buildShieldOfferView(merchant, gold, shieldTierIndex)
        : null,
  };
}

export function unavailableReasonText(reason: ShopUnavailableReason): string {
  if (reason === 'unaffordable') {
    return 'Not enough gold';
  }
  if (reason === 'owned') {
    return 'Fully upgraded.';
  }
  if (reason === 'noClass') {
    return 'Choose a class first.';
  }
  return 'Unavailable';
}

export function evaluateWeaponOffer(
  merchant: Merchant | null,
  classId: PlayerClassId,
  gold: number,
  weaponTierIndex: number,
): { available: boolean; reason?: ShopUnavailableReason } {
  if (!merchant) {
    return { available: false, reason: 'noShop' };
  }
  if (isWeaponLadderComplete(classId, weaponTierIndex)) {
    return { available: false, reason: 'owned' };
  }
  const nextIndex = nextWeaponTierIndex(weaponTierIndex);
  if (gold < weaponTierCost(nextIndex)) {
    return { available: false, reason: 'unaffordable' };
  }
  return { available: true };
}

export function evaluateShieldOffer(
  merchant: Merchant | null,
  gold: number,
  shieldTierIndex: number,
): { available: boolean; reason?: ShopUnavailableReason } {
  if (!merchant) {
    return { available: false, reason: 'noShop' };
  }
  if (isShieldLadderComplete(shieldTierIndex)) {
    return { available: false, reason: 'owned' };
  }
  const nextIndex = nextWeaponTierIndex(shieldTierIndex);
  if (gold < shieldTierCost(nextIndex)) {
    return { available: false, reason: 'unaffordable' };
  }
  return { available: true };
}

export function applyWeaponTierPurchase(
  merchant: Merchant | null,
  classId: PlayerClassId,
  gold: number,
  weaponTierIndex: number,
): ShopPurchaseResult {
  const evaluation = evaluateWeaponOffer(
    merchant,
    classId,
    gold,
    weaponTierIndex,
  );
  if (!evaluation.available) {
    return emptyPurchase(gold, evaluation.reason ?? 'noShop', 'weaponUpgrade');
  }
  const nextIndex = nextWeaponTierIndex(weaponTierIndex);
  const weaponId = PLAYER_WEAPON_PROGRESSION[classId][nextIndex]!;
  weaponCatalogEntry(weaponId); // validate catalog id / asset exists
  const cost = weaponTierCost(nextIndex);
  const bonus = weaponTierBonus(nextIndex);
  const title = weaponTierDisplayName(classId, nextIndex);
  return {
    success: true,
    offerId: 'weaponUpgrade',
    weaponId,
    goldRemaining: gold - cost,
    goldSpent: cost,
    attackBonus: bonus,
    defenceBonus: 0,
    status: `You equip ${title}. +${bonus} ATK.`,
  };
}

export function applyShieldTierPurchase(
  merchant: Merchant | null,
  gold: number,
  shieldTierIndex: number,
): ShopPurchaseResult {
  const evaluation = evaluateShieldOffer(merchant, gold, shieldTierIndex);
  if (!evaluation.available) {
    return emptyPurchase(gold, evaluation.reason ?? 'noShop', 'shieldUpgrade');
  }
  const nextIndex = nextWeaponTierIndex(shieldTierIndex);
  const shieldId = KNIGHT_SHIELD_PROGRESSION[nextIndex]!;
  shieldCatalogEntry(shieldId); // validate catalog id / asset exists
  const cost = shieldTierCost(nextIndex);
  const bonus = shieldTierBonus(nextIndex);
  const title = shieldTierDisplayName(nextIndex);
  return {
    success: true,
    offerId: 'shieldUpgrade',
    shieldId,
    goldRemaining: gold - cost,
    goldSpent: cost,
    attackBonus: 0,
    defenceBonus: bonus,
    status: `You equip ${title}. +${bonus} DEF.`,
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
  offerId: 'weaponUpgrade' | 'shieldUpgrade',
): ShopPurchaseResult {
  return {
    success: false,
    offerId,
    reason,
    goldRemaining: gold,
    goldSpent: 0,
    attackBonus: 0,
    defenceBonus: 0,
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

function attackDeltaLine(currentBonus: number, nextBonus: number): string {
  const delta = nextBonus - currentBonus;
  if (delta === 0) {
    return `+${nextBonus} ATK`;
  }
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta} ATK → +${nextBonus}`;
}

function defenceDeltaLine(currentBonus: number, nextBonus: number): string {
  const delta = nextBonus - currentBonus;
  if (delta === 0) {
    return `+${nextBonus} DEF`;
  }
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta} DEF → +${nextBonus}`;
}

function buildWeaponOfferView(
  merchant: Merchant,
  classId: PlayerClassId,
  gold: number,
  weaponTierIndex: number,
): ShopWeaponOfferView {
  const ladder = PLAYER_WEAPON_PROGRESSION[classId];
  const currentIndex = Math.max(0, Math.min(weaponTierIndex, ladder.length - 1));
  const complete = isWeaponLadderComplete(classId, weaponTierIndex);
  const displayIndex = complete
    ? ladder.length - 1
    : nextWeaponTierIndex(weaponTierIndex);
  const weaponId = ladder[displayIndex]!;
  weaponCatalogEntry(weaponId);
  const evaluation = evaluateWeaponOffer(
    merchant,
    classId,
    gold,
    weaponTierIndex,
  );
  return {
    id: 'weaponUpgrade',
    weaponId,
    title: weaponTierDisplayName(classId, displayIndex),
    description: weaponTierFlavour(classId, displayIndex),
    currentTitle: weaponTierDisplayName(classId, currentIndex),
    statLine: attackDeltaLine(
      weaponTierBonus(currentIndex),
      weaponTierBonus(displayIndex),
    ),
    classId,
    cost: weaponTierCost(displayIndex),
    tierIndex: displayIndex,
    available: evaluation.available,
    reason: evaluation.reason,
    reasonText: evaluation.reason
      ? unavailableReasonText(evaluation.reason)
      : undefined,
  };
}

function buildShieldOfferView(
  merchant: Merchant,
  gold: number,
  shieldTierIndex: number,
): ShopShieldOfferView {
  const currentIndex = Math.max(
    0,
    Math.min(shieldTierIndex, KNIGHT_SHIELD_PROGRESSION.length - 1),
  );
  const complete = isShieldLadderComplete(shieldTierIndex);
  const displayIndex = complete
    ? KNIGHT_SHIELD_PROGRESSION.length - 1
    : nextWeaponTierIndex(shieldTierIndex);
  const shieldId = KNIGHT_SHIELD_PROGRESSION[displayIndex]!;
  shieldCatalogEntry(shieldId);
  const evaluation = evaluateShieldOffer(merchant, gold, shieldTierIndex);
  return {
    id: 'shieldUpgrade',
    shieldId,
    title: shieldTierDisplayName(displayIndex),
    description: shieldTierFlavour(displayIndex),
    currentTitle: shieldTierDisplayName(currentIndex),
    statLine: defenceDeltaLine(
      shieldTierBonus(currentIndex),
      shieldTierBonus(displayIndex),
    ),
    cost: shieldTierCost(displayIndex),
    tierIndex: displayIndex,
    available: evaluation.available,
    reason: evaluation.reason,
    reasonText: evaluation.reason
      ? unavailableReasonText(evaluation.reason)
      : undefined,
  };
}
