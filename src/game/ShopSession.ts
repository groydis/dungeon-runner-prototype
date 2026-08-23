import { freezeReadModel } from './BoardSnapshot';
import { type DeepReadonly } from './freeze';
import { type Merchant } from './Merchant';
import { type Player } from './Player';
import {
  applyShopPurchase,
  applySpecialEquipmentPurchase,
  buildShopView,
  createActiveShop,
  createShopProgress,
  evaluateShopOffer,
  evaluateSpecialEquipmentOffer,
  shopStatSnapshot,
  type ActiveShop,
  type ShopOfferId,
  type ShopProgress,
  type ShopPurchaseResult,
  type ShopView,
} from './shop';

/**
 * Run-owned Merchant session: open visit, upgrade price tracks, and
 * one-time special-equipment ownership. Pricing stays in `shop.ts`.
 */
export class ShopSession {
  private active: ActiveShop | null = null;
  private progress: ShopProgress = createShopProgress();
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
    this.progress = createShopProgress();
    this.specialOwned = false;
  }

  getProgressSnapshot(): DeepReadonly<ShopProgress> {
    return freezeReadModel({ ...this.progress });
  }

  getShopView(player: Player | null): ShopView | null {
    if (!this.active || !player) {
      return null;
    }
    return buildShopView(
      this.active.merchant,
      player.gold,
      shopStatSnapshot(player),
      this.progress,
      player.classId,
      this.specialOwned,
    );
  }

  canBuyOffer(player: Player | null, offerId: ShopOfferId): boolean {
    if (!player || !this.active) {
      return false;
    }
    return evaluateShopOffer(
      this.active.merchant,
      offerId,
      player.gold,
      shopStatSnapshot(player),
      this.progress,
    ).available;
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

  buyOffer(player: Player | null, offerId: ShopOfferId): ShopPurchaseResult {
    if (!player) {
      return rejectedPurchase(offerId, 0, 'noClass', 'Choose a class first.');
    }
    if (!this.active) {
      return rejectedPurchase(
        offerId,
        player.gold,
        'noShop',
        'There is no merchant here.',
      );
    }
    const result = applyShopPurchase(
      this.active.merchant,
      offerId,
      player.gold,
      shopStatSnapshot(player),
      this.progress,
    );
    if (result.success) {
      applyPurchaseToPlayer(player, result);
    }
    return result;
  }

  buySpecialEquipment(player: Player | null): ShopPurchaseResult {
    if (!player) {
      return rejectedPurchase(
        'specialEquipment',
        0,
        'noClass',
        'Choose a class first.',
      );
    }
    if (!this.active) {
      return rejectedPurchase(
        'specialEquipment',
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
}

function applyPurchaseToPlayer(player: Player, result: ShopPurchaseResult): void {
  player.trySpendGold(result.goldSpent);
  player.increaseMaxHealth(result.maxHealthGained);
  player.increaseAttack(result.attackGained);
  player.increaseDefence(result.defenceGained);
  player.increaseEvade(result.evadeGained);
}

function rejectedPurchase(
  offerId: ShopPurchaseResult['offerId'],
  goldRemaining: number,
  reason: ShopPurchaseResult['reason'],
  status: string,
): ShopPurchaseResult {
  return {
    success: false,
    offerId,
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
