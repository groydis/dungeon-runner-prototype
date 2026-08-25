import {
  POTION_OFFER_IDS,
  type PotionOfferId,
  type PotionOfferView,
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
    this.renderPotionShelf(view.potionOffers);
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
    for (const id of POTION_OFFER_IDS) {
      this.detachPotion(id);
    }
    this.detachLeave();
    this.detachSpecialEquipment();
    this.overlayEl.removeEventListener('pointerdown', this.blockPointer);
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
