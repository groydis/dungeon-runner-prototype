import { type Merchant } from './Merchant';
import {
  MERCHANT_POTION_CATALOG,
  potionUnavailableReasonText,
  type PotionOfferId,
} from './merchantPotions';
import { type Player } from './Player';
import {
  applyPotionPurchase,
  applyShieldTierPurchase,
  applyWeaponTierPurchase,
  buildShopView,
  createActiveShop,
  evaluateShieldOffer,
  evaluateWeaponOffer,
  type ActiveShop,
  type PotionPurchaseResult,
  type ShopPurchaseResult,
  type ShopView,
} from './shop';

/**
 * Run-owned Merchant session: open visit and in-run weapon/shield upgrade
 * ladders. Pricing stays in `shop.ts`.
 */
export class ShopSession {
  private active: ActiveShop | null = null;
  private weaponTierIndex = 0;
  private shieldTierIndex = 0;

  get isOpen(): boolean {
    return this.active !== null;
  }

  /** Live merchant for GameState leave/consume only. Not a public snapshot. */
  get merchant(): Merchant | null {
    return this.active?.merchant ?? null;
  }

  get weaponTierIndexValue(): number {
    return this.weaponTierIndex;
  }

  get shieldTierIndexValue(): number {
    return this.shieldTierIndex;
  }

  open(merchant: Merchant): void {
    this.active = createActiveShop(merchant);
  }

  close(): void {
    this.active = null;
  }

  reset(): void {
    this.active = null;
    this.weaponTierIndex = 0;
    this.shieldTierIndex = 0;
  }

  getShopView(player: Player | null): ShopView | null {
    if (!this.active || !player) {
      return null;
    }
    return buildShopView(
      this.active.merchant,
      player.gold,
      player.classId,
      this.weaponTierIndex,
      this.shieldTierIndex,
      player.stats.health,
      player.stats.maxHealth,
    );
  }

  canBuyWeaponTier(player: Player | null): boolean {
    if (!player || !this.active) {
      return false;
    }
    return evaluateWeaponOffer(
      this.active.merchant,
      player.classId,
      player.gold,
      this.weaponTierIndex,
    ).available;
  }

  canBuyShieldTier(player: Player | null): boolean {
    if (!player || !this.active || player.classId !== 'knight') {
      return false;
    }
    return evaluateShieldOffer(
      this.active.merchant,
      player.gold,
      this.shieldTierIndex,
    ).available;
  }

  buyWeaponTier(player: Player | null): ShopPurchaseResult {
    if (!player) {
      return rejectedPurchase(0, 'noClass', 'Choose a class first.', 'weaponUpgrade');
    }
    if (!this.active) {
      return rejectedPurchase(
        player.gold,
        'noShop',
        'There is no merchant here.',
        'weaponUpgrade',
      );
    }
    const result = applyWeaponTierPurchase(
      this.active.merchant,
      player.classId,
      player.gold,
      this.weaponTierIndex,
    );
    if (!result.success) {
      return result;
    }
    if (!player.trySpendGold(result.goldSpent)) {
      return rejectedPurchase(
        player.gold,
        'unaffordable',
        'Not enough gold',
        'weaponUpgrade',
      );
    }
    player.setWeaponAttackBonus(result.attackBonus);
    this.weaponTierIndex += 1;
    return {
      ...result,
      goldRemaining: player.gold,
    };
  }

  buyShieldTier(player: Player | null): ShopPurchaseResult {
    if (!player) {
      return rejectedPurchase(0, 'noClass', 'Choose a class first.', 'shieldUpgrade');
    }
    if (!this.active) {
      return rejectedPurchase(
        player.gold,
        'noShop',
        'There is no merchant here.',
        'shieldUpgrade',
      );
    }
    if (player.classId !== 'knight') {
      return rejectedPurchase(
        player.gold,
        'noClass',
        'Shield upgrades are for knights only.',
        'shieldUpgrade',
      );
    }
    const result = applyShieldTierPurchase(
      this.active.merchant,
      player.gold,
      this.shieldTierIndex,
    );
    if (!result.success) {
      return result;
    }
    if (!player.trySpendGold(result.goldSpent)) {
      return rejectedPurchase(
        player.gold,
        'unaffordable',
        'Not enough gold',
        'shieldUpgrade',
      );
    }
    player.setShieldDefenceBonus(result.defenceBonus);
    this.shieldTierIndex += 1;
    return {
      ...result,
      goldRemaining: player.gold,
    };
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

function rejectedPurchase(
  goldRemaining: number,
  reason: ShopPurchaseResult['reason'],
  status: string,
  offerId: 'weaponUpgrade' | 'shieldUpgrade',
): ShopPurchaseResult {
  return {
    success: false,
    offerId,
    reason,
    goldRemaining,
    goldSpent: 0,
    attackBonus: 0,
    defenceBonus: 0,
    status,
  };
}
