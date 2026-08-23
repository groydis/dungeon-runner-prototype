import {
  SHOP_OFFER_IDS,
  type ShopOfferId,
  type ShopOfferView,
  type ShopView,
} from '../game/shop';
import { requireElement } from './dom';

export class ShopOverlayView {
  private readonly overlayEl: HTMLElement;
  private readonly goldEl: HTMLElement;
  private readonly leaveButton: HTMLButtonElement;
  private readonly specialButton: HTMLButtonElement;
  private readonly specialClassEl: HTMLElement;
  private readonly specialTitleEl: HTMLElement;
  private readonly specialDescEl: HTMLElement;
  private readonly specialStatsEl: HTMLElement;
  private readonly specialCostEl: HTMLElement;
  private readonly specialReasonEl: HTMLElement;
  private readonly buttons: Record<ShopOfferId, HTMLButtonElement>;
  private readonly titles: Record<ShopOfferId, HTMLElement>;
  private readonly costs: Record<ShopOfferId, HTMLElement>;
  private readonly descs: Record<ShopOfferId, HTMLElement>;
  private readonly reasons: Record<ShopOfferId, HTMLElement>;
  private readonly handlers: Partial<Record<ShopOfferId, () => void>> = {};
  private leaveHandler: (() => void) | null = null;
  private specialHandler: (() => void) | null = null;

  constructor(root: ParentNode = document) {
    this.overlayEl = requireElement(root, '#shop');
    this.goldEl = requireElement(root, '#shop-gold');
    this.leaveButton = requireElement(root, '#shop-leave') as HTMLButtonElement;
    this.specialButton = requireElement(
      root,
      '#shop-special-equipment',
    ) as HTMLButtonElement;
    this.specialClassEl = requireElement(root, '#shop-special-class');
    this.specialTitleEl = requireElement(root, '#shop-special-title');
    this.specialDescEl = requireElement(root, '#shop-special-desc');
    this.specialStatsEl = requireElement(root, '#shop-special-stats');
    this.specialCostEl = requireElement(root, '#shop-special-cost');
    this.specialReasonEl = requireElement(root, '#shop-special-reason');
    this.buttons = {
      vitality: requireElement(root, '#shop-offer-vitality') as HTMLButtonElement,
      sharpened: requireElement(root, '#shop-offer-sharpened') as HTMLButtonElement,
      armoured: requireElement(root, '#shop-offer-armoured') as HTMLButtonElement,
      evasive: requireElement(root, '#shop-offer-evasive') as HTMLButtonElement,
    };
    this.titles = {
      vitality: requireElement(root, '#shop-vitality-title'),
      sharpened: requireElement(root, '#shop-sharpened-title'),
      armoured: requireElement(root, '#shop-armoured-title'),
      evasive: requireElement(root, '#shop-evasive-title'),
    };
    this.costs = {
      vitality: requireElement(root, '#shop-vitality-cost'),
      sharpened: requireElement(root, '#shop-sharpened-cost'),
      armoured: requireElement(root, '#shop-armoured-cost'),
      evasive: requireElement(root, '#shop-evasive-cost'),
    };
    this.descs = {
      vitality: requireElement(root, '#shop-vitality-desc'),
      sharpened: requireElement(root, '#shop-sharpened-desc'),
      armoured: requireElement(root, '#shop-armoured-desc'),
      evasive: requireElement(root, '#shop-evasive-desc'),
    };
    this.reasons = {
      vitality: requireElement(root, '#shop-vitality-reason'),
      sharpened: requireElement(root, '#shop-sharpened-reason'),
      armoured: requireElement(root, '#shop-armoured-reason'),
      evasive: requireElement(root, '#shop-evasive-reason'),
    };
    this.overlayEl.addEventListener('pointerdown', this.blockPointer);
  }

  onOffer(offerId: ShopOfferId, handler: () => void): void {
    this.detachOffer(offerId);
    this.handlers[offerId] = handler;
    this.buttons[offerId].addEventListener('click', handler);
  }

  onLeave(handler: () => void): void {
    this.detachLeave();
    this.leaveHandler = handler;
    this.leaveButton.addEventListener('click', handler);
  }

  onSpecialEquipment(handler: () => void): void {
    this.detachSpecialEquipment();
    this.specialHandler = handler;
    this.specialButton.addEventListener('click', handler);
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
    for (const id of SHOP_OFFER_IDS) {
      this.renderOffer(view.offers.find((offer) => offer.id === id));
    }
    const special = view.specialOffer;
    this.specialButton.hidden = special === null;
    if (special) {
      this.specialClassEl.textContent = `${special.classId.toUpperCase()} ONLY`;
      this.specialTitleEl.textContent = special.title;
      this.specialDescEl.textContent = special.description;
      this.specialStatsEl.textContent = special.statLine;
      this.specialCostEl.textContent = `${special.cost} G`;
      this.specialReasonEl.textContent = special.available
        ? ''
        : (special.reasonText ?? 'Unavailable');
      this.specialButton.disabled = !special.available;
      this.specialButton.setAttribute(
        'aria-label',
        `${special.title}, ${special.classId} only, ${special.cost} gold. ${special.statLine}. ${special.available ? special.description : (special.reasonText ?? 'Unavailable')}`,
      );
    }
  }

  dispose(): void {
    for (const id of SHOP_OFFER_IDS) {
      this.detachOffer(id);
    }
    this.detachLeave();
    this.detachSpecialEquipment();
    this.overlayEl.removeEventListener('pointerdown', this.blockPointer);
  }

  private renderOffer(offer: ShopOfferView | undefined): void {
    if (!offer) {
      return;
    }

    this.titles[offer.id].textContent = offer.title;
    this.costs[offer.id].textContent = `${offer.cost} G`;
    this.descs[offer.id].textContent =
      `${offer.description} (${offer.currentValue} → ${offer.nextValue})`;
    this.reasons[offer.id].textContent = offer.available
      ? ''
      : (offer.reasonText ?? '');
    this.buttons[offer.id].disabled = !offer.available;
    const reason = offer.available
      ? `${offer.description}. ${offer.currentValue} to ${offer.nextValue}`
      : (offer.reasonText ?? 'Unavailable');
    this.buttons[offer.id].setAttribute(
      'aria-label',
      `${offer.title}, ${offer.cost} gold. ${reason}`,
    );
  }

  private detachOffer(offerId: ShopOfferId): void {
    const handler = this.handlers[offerId];
    if (!handler) {
      return;
    }
    this.buttons[offerId].removeEventListener('click', handler);
    delete this.handlers[offerId];
  }

  private detachLeave(): void {
    if (!this.leaveHandler) {
      return;
    }
    this.leaveButton.removeEventListener('click', this.leaveHandler);
    this.leaveHandler = null;
  }

  private detachSpecialEquipment(): void {
    if (!this.specialHandler) {
      return;
    }
    this.specialButton.removeEventListener('click', this.specialHandler);
    this.specialHandler = null;
  }

  private readonly blockPointer = (event: PointerEvent): void => {
    event.stopPropagation();
  };
}
