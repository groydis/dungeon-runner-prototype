import {
  POTION_OFFER_IDS,
  type PotionOfferId,
  type PotionOfferView,
  type ShopShieldOfferView,
  type ShopView,
  type ShopWeaponOfferView,
} from '../game/shop';
import { requireElement } from './dom';

export class ShopOverlayView {
  private readonly overlayEl: HTMLElement;
  private readonly goldEl: HTMLElement;
  private readonly leaveButton: HTMLButtonElement;
  private readonly weaponButton: HTMLButtonElement;
  private readonly weaponClassEl: HTMLElement;
  private readonly weaponTitleEl: HTMLElement;
  private readonly weaponCurrentEl: HTMLElement;
  private readonly weaponDescEl: HTMLElement;
  private readonly weaponStatsEl: HTMLElement;
  private readonly weaponCostEl: HTMLElement;
  private readonly weaponReasonEl: HTMLElement;
  private readonly shieldButton: HTMLButtonElement;
  private readonly shieldTitleEl: HTMLElement;
  private readonly shieldCurrentEl: HTMLElement;
  private readonly shieldDescEl: HTMLElement;
  private readonly shieldStatsEl: HTMLElement;
  private readonly shieldCostEl: HTMLElement;
  private readonly shieldReasonEl: HTMLElement;
  private readonly potionSectionTitle: HTMLElement;
  private readonly potionShelf: HTMLElement;
  private readonly potionButtons: Record<PotionOfferId, HTMLButtonElement>;
  private readonly potionTitles: Record<PotionOfferId, HTMLElement>;
  private readonly potionCosts: Record<PotionOfferId, HTMLElement>;
  private readonly potionDescs: Record<PotionOfferId, HTMLElement>;
  private readonly potionReasons: Record<PotionOfferId, HTMLElement>;
  private readonly potionHandlers: Partial<Record<PotionOfferId, () => void>> =
    {};
  private leaveHandler: (() => void) | null = null;
  private weaponHandler: (() => void) | null = null;
  private shieldHandler: (() => void) | null = null;

  constructor(root: ParentNode = document) {
    this.overlayEl = requireElement(root, '#shop');
    this.goldEl = requireElement(root, '#shop-gold');
    this.leaveButton = requireElement(root, '#shop-leave') as HTMLButtonElement;
    this.weaponButton = requireElement(
      root,
      '#shop-weapon-upgrade',
    ) as HTMLButtonElement;
    this.weaponClassEl = requireElement(root, '#shop-weapon-class');
    this.weaponTitleEl = requireElement(root, '#shop-weapon-title');
    this.weaponCurrentEl = requireElement(root, '#shop-weapon-current');
    this.weaponDescEl = requireElement(root, '#shop-weapon-desc');
    this.weaponStatsEl = requireElement(root, '#shop-weapon-stats');
    this.weaponCostEl = requireElement(root, '#shop-weapon-cost');
    this.weaponReasonEl = requireElement(root, '#shop-weapon-reason');
    this.shieldButton = requireElement(
      root,
      '#shop-shield-upgrade',
    ) as HTMLButtonElement;
    this.shieldTitleEl = requireElement(root, '#shop-shield-title');
    this.shieldCurrentEl = requireElement(root, '#shop-shield-current');
    this.shieldDescEl = requireElement(root, '#shop-shield-desc');
    this.shieldStatsEl = requireElement(root, '#shop-shield-stats');
    this.shieldCostEl = requireElement(root, '#shop-shield-cost');
    this.shieldReasonEl = requireElement(root, '#shop-shield-reason');
    this.potionSectionTitle = requireElement(root, '#shop-potion-section-title');
    this.potionShelf = requireElement(root, '#shop-potion-shelf');
    this.potionButtons = {
      small: requireElement(root, '#shop-potion-small') as HTMLButtonElement,
      medium: requireElement(root, '#shop-potion-medium') as HTMLButtonElement,
      large: requireElement(root, '#shop-potion-large') as HTMLButtonElement,
      greater: requireElement(root, '#shop-potion-greater') as HTMLButtonElement,
    };
    this.potionTitles = {
      small: requireElement(root, '#shop-potion-small-title'),
      medium: requireElement(root, '#shop-potion-medium-title'),
      large: requireElement(root, '#shop-potion-large-title'),
      greater: requireElement(root, '#shop-potion-greater-title'),
    };
    this.potionCosts = {
      small: requireElement(root, '#shop-potion-small-cost'),
      medium: requireElement(root, '#shop-potion-medium-cost'),
      large: requireElement(root, '#shop-potion-large-cost'),
      greater: requireElement(root, '#shop-potion-greater-cost'),
    };
    this.potionDescs = {
      small: requireElement(root, '#shop-potion-small-desc'),
      medium: requireElement(root, '#shop-potion-medium-desc'),
      large: requireElement(root, '#shop-potion-large-desc'),
      greater: requireElement(root, '#shop-potion-greater-desc'),
    };
    this.potionReasons = {
      small: requireElement(root, '#shop-potion-small-reason'),
      medium: requireElement(root, '#shop-potion-medium-reason'),
      large: requireElement(root, '#shop-potion-large-reason'),
      greater: requireElement(root, '#shop-potion-greater-reason'),
    };
    this.overlayEl.addEventListener('pointerdown', this.blockPointer);
  }

  onPotion(offerId: PotionOfferId, handler: () => void): void {
    this.detachPotion(offerId);
    this.potionHandlers[offerId] = handler;
    this.potionButtons[offerId].addEventListener('click', handler);
  }

  onLeave(handler: () => void): void {
    this.detachLeave();
    this.leaveHandler = handler;
    this.leaveButton.addEventListener('click', handler);
  }

  onWeaponUpgrade(handler: () => void): void {
    this.detachWeapon();
    this.weaponHandler = handler;
    this.weaponButton.addEventListener('click', handler);
  }

  onShieldUpgrade(handler: () => void): void {
    this.detachShield();
    this.shieldHandler = handler;
    this.shieldButton.addEventListener('click', handler);
  }

  show(view: ShopView): void {
    this.render(view);
    this.overlayEl.hidden = false;
  }

  hide(): void {
    this.overlayEl.hidden = true;
  }

  render(view: ShopView): void {
    this.goldEl.textContent = String(view.gold);
    this.renderPotionShelf(view.potionOffers);
    this.renderWeaponOffer(view.weaponOffer);
    this.renderShieldOffer(view.shieldOffer);
  }

  dispose(): void {
    for (const id of POTION_OFFER_IDS) {
      this.detachPotion(id);
    }
    this.detachLeave();
    this.detachWeapon();
    this.detachShield();
    this.overlayEl.removeEventListener('pointerdown', this.blockPointer);
  }

  private renderWeaponOffer(offer: ShopWeaponOfferView | null): void {
    this.weaponButton.hidden = offer === null;
    if (!offer) {
      return;
    }
    this.weaponClassEl.textContent = `${offer.classId.toUpperCase()} WEAPON`;
    this.weaponTitleEl.textContent = offer.title;
    this.weaponCurrentEl.textContent = `Equipped: ${offer.currentTitle}`;
    this.weaponDescEl.textContent = offer.description;
    this.weaponStatsEl.textContent = offer.statLine;
    this.weaponCostEl.textContent = `${offer.cost} G`;
    this.weaponReasonEl.textContent = offer.available
      ? ''
      : (offer.reasonText ?? 'Unavailable');
    this.weaponButton.disabled = !offer.available;
    this.weaponButton.setAttribute(
      'aria-label',
      `${offer.title}, ${offer.classId} weapon upgrade, ${offer.cost} gold. ${offer.statLine}. ${offer.available ? offer.description : (offer.reasonText ?? 'Unavailable')}`,
    );
  }

  private renderShieldOffer(offer: ShopShieldOfferView | null): void {
    this.shieldButton.hidden = offer === null;
    if (!offer) {
      return;
    }
    this.shieldTitleEl.textContent = offer.title;
    this.shieldCurrentEl.textContent = `Equipped: ${offer.currentTitle}`;
    this.shieldDescEl.textContent = offer.description;
    this.shieldStatsEl.textContent = offer.statLine;
    this.shieldCostEl.textContent = `${offer.cost} G`;
    this.shieldReasonEl.textContent = offer.available
      ? ''
      : (offer.reasonText ?? 'Unavailable');
    this.shieldButton.disabled = !offer.available;
    this.shieldButton.setAttribute(
      'aria-label',
      `${offer.title}, shield upgrade, ${offer.cost} gold. ${offer.statLine}. ${offer.available ? offer.description : (offer.reasonText ?? 'Unavailable')}`,
    );
  }

  private renderPotionShelf(offers: PotionOfferView[]): void {
    const stocked = new Set(offers.map((offer) => offer.id));
    const hasStock = stocked.size > 0;
    this.potionSectionTitle.hidden = !hasStock;
    this.potionShelf.hidden = !hasStock;
    for (const id of POTION_OFFER_IDS) {
      const offer = offers.find((entry) => entry.id === id);
      const button = this.potionButtons[id];
      if (!offer) {
        button.hidden = true;
        continue;
      }
      button.hidden = false;
      this.potionTitles[id].textContent = offer.title;
      this.potionCosts[id].textContent = `${offer.cost} G`;
      this.potionDescs[id].textContent = offer.description;
      this.potionReasons[id].textContent = offer.available
        ? ''
        : (offer.reasonText ?? 'Unavailable');
      button.disabled = !offer.available;
      button.setAttribute(
        'aria-label',
        `${offer.title}, ${offer.cost} gold. ${offer.available ? offer.description : (offer.reasonText ?? 'Unavailable')}`,
      );
    }
  }

  private detachPotion(offerId: PotionOfferId): void {
    const handler = this.potionHandlers[offerId];
    if (!handler) {
      return;
    }
    this.potionButtons[offerId].removeEventListener('click', handler);
    delete this.potionHandlers[offerId];
  }

  private detachLeave(): void {
    if (!this.leaveHandler) {
      return;
    }
    this.leaveButton.removeEventListener('click', this.leaveHandler);
    this.leaveHandler = null;
  }

  private detachWeapon(): void {
    if (!this.weaponHandler) {
      return;
    }
    this.weaponButton.removeEventListener('click', this.weaponHandler);
    this.weaponHandler = null;
  }

  private detachShield(): void {
    if (!this.shieldHandler) {
      return;
    }
    this.shieldButton.removeEventListener('click', this.shieldHandler);
    this.shieldHandler = null;
  }

  private readonly blockPointer = (event: PointerEvent): void => {
    event.stopPropagation();
  };
}
