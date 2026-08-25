import { type Merchant } from './Merchant';
import {
  MERCHANT_POTION_CATALOG,
  potionUnavailableReasonText,
  type PotionOfferId,
} from './merchantPotions';
import { type Player } from './Player';
import {
  applyPotionPurchase,
  applySpecialEquipmentPurchase,
  buildShopView,
  createActiveShop,
  evaluateSpecialEquipmentOffer,
  shopStatSnapshot,
  type ActiveShop,
  type PotionPurchaseResult,
  type ShopPurchaseResult,
  type ShopView,
} from './shop';

/**
 * Run-owned Merchant session: open visit and one-time special-equipment
 * ownership. Pricing stays in `shop.ts`.
 */
export class ShopSession {
  private active: ActiveShop | null = null;
  private specialOwned = false;

  get isOpen(): boolean {
    return this.active !== null;
  }

  /** Live merchant for GameState leave/consume only. Not a public snapshot. */
  get merchant(): Merchant | null {
    return this.active?.merchant ?? null;
  }

  get hasSpecialEquipment(): boolean {
    return this.specialOwned;
  }

  open(merchant: Merchant): void {
    this.active = createActiveShop(merchant);
  }

  close(): void {
    this.active = null;
  }

  reset(): void {
    this.active = null;
    this.specialOwned = false;
  }

  getShopView(player: Player | null): ShopView | null {
    if (!this.active || !player) {
      return null;
    }
    return buildShopView(
      this.active.merchant,
      player.gold,
      shopStatSnapshot(player),
      player.classId,
      this.specialOwned,
      player.stats.health,
    );
  }

  canBuySpecialEquipment(player: Player | null): boolean {
    if (!player || !this.active) {
      return false;
    }
    return evaluateSpecialEquipmentOffer(
      this.active.merchant,
      player.classId,
      player.gold,
      shopStatSnapshot(player),
      this.specialOwned,
    ).available;
  }

  buySpecialEquipment(player: Player | null): ShopPurchaseResult {
    if (!player) {
      return rejectedPurchase(0, 'noClass', 'Choose a class first.');
    }
    if (!this.active) {
      return rejectedPurchase(
        player.gold,
        'noShop',
        'There is no merchant here.',
      );
    }
    const result = applySpecialEquipmentPurchase(
      this.active.merchant,
      player.classId,
      player.gold,
      shopStatSnapshot(player),
      this.specialOwned,
    );
    if (result.success) {
      applyPurchaseToPlayer(player, result);
      this.specialOwned = true;
    }
    return result;
  }

  buyPotion(
    player: Player | null,
    offerId: PotionOfferId,
  ): PotionPurchaseResult {
    if (!player) {
      return {
        success: false,
        offerId,
        reason: 'noShop',
        goldRemaining: 0,
        goldSpent: 0,
        healthRestored: 0,
        status: 'Choose a class first.',
      };
    }
    if (!this.active) {
      return {
        success: false,
        offerId,
        reason: 'noShop',
        goldRemaining: player.gold,
        goldSpent: 0,
        healthRestored: 0,
        status: potionUnavailableReasonText('noShop'),
      };
    }
    const result = applyPotionPurchase(
      this.active.merchant,
      offerId,
      player.gold,
      player.stats.health,
      player.stats.maxHealth,
    );
    if (!result.success) {
      return result;
    }
    if (!player.trySpendGold(result.goldSpent)) {
      return {
        success: false,
        offerId,
        reason: 'unaffordable',
        goldRemaining: player.gold,
        goldSpent: 0,
        healthRestored: 0,
        status: potionUnavailableReasonText(
          'unaffordable',
          MERCHANT_POTION_CATALOG[offerId].price,
        ),
      };
    }
    const restored = player.heal(MERCHANT_POTION_CATALOG[offerId].healAmount);
    return {
      ...result,
      goldRemaining: player.gold,
      healthRestored: restored,
      status: `Bought ${MERCHANT_POTION_CATALOG[offerId].name}. Restored ${restored} HP.`,
    };
  }
}

function applyPurchaseToPlayer(player: Player, result: ShopPurchaseResult): void {
  player.trySpendGold(result.goldSpent);
  applyMaxHealthGainViaAttributes(player, result.maxHealthGained);
  bumpDamageAttribute(player, result.attackGained);
  player.increaseDef(result.defenceGained);
  if (result.evadeGained > 0) {
    player.increaseDex(result.evadeGained);
  }
}

/** Exact HP raise via str (+1 HP) and con (+2 HP). */
function applyMaxHealthGainViaAttributes(player: Player, amount: number): void {
  let left = Math.max(0, Math.floor(amount));
  while (left >= 2) {
    player.increaseCon(1);
    left -= 2;
  }
  if (left > 0) {
    player.increaseStr(left);
  }
}

/** Prefer dex (no HP side effect), then def, then con, then str. */
function bumpDamageAttribute(player: Player, amount: number): void {
  if (amount <= 0) {
    return;
  }
  switch (player.classId) {
    case 'rogue':
    case 'ranger':
    case 'mage':
    case 'lorekeeper':
      player.increaseDex(amount);
      break;
    case 'knight':
      player.increaseDef(amount);
      break;
    case 'barbarian':
      player.increaseCon(amount);
      break;
  }
}

function rejectedPurchase(
  goldRemaining: number,
  reason: ShopPurchaseResult['reason'],
  status: string,
): ShopPurchaseResult {
  return {
    success: false,
    offerId: 'specialEquipment',
    reason,
    goldRemaining,
    goldSpent: 0,
    maxHealthGained: 0,
    attackGained: 0,
    defenceGained: 0,
    evadeGained: 0,
    status,
  };
}
