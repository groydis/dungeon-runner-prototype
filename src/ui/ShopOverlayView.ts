import {
  type ShopOfferId,
  type ShopOfferView,
  type ShopView,
} from '../game/shop';
import { requireElement } from './dom';

export class ShopOverlayView {
  private readonly overlayEl: HTMLElement;
  private readonly goldEl: HTMLElement;
  private readonly healButton: HTMLButtonElement;
  private readonly attackButton: HTMLButtonElement;
  private readonly leaveButton: HTMLButtonElement;
  private readonly healTitleEl: HTMLElement;
  private readonly healDescEl: HTMLElement;
  private readonly healReasonEl: HTMLElement;
  private readonly attackTitleEl: HTMLElement;
  private readonly attackDescEl: HTMLElement;
  private readonly attackReasonEl: HTMLElement;
  private healHandler: (() => void) | null = null;
  private attackHandler: (() => void) | null = null;
  private leaveHandler: (() => void) | null = null;

  constructor(root: ParentNode = document) {
    this.overlayEl = requireElement(root, '#shop');
    this.goldEl = requireElement(root, '#shop-gold');
    this.healButton = requireElement(root, '#shop-offer-heal') as HTMLButtonElement;
    this.attackButton = requireElement(root, '#shop-offer-attack') as HTMLButtonElement;
    this.leaveButton = requireElement(root, '#shop-leave') as HTMLButtonElement;
    this.healTitleEl = requireElement(root, '#shop-heal-title');
    this.healDescEl = requireElement(root, '#shop-heal-desc');
    this.healReasonEl = requireElement(root, '#shop-heal-reason');
    this.attackTitleEl = requireElement(root, '#shop-attack-title');
    this.attackDescEl = requireElement(root, '#shop-attack-desc');
    this.attackReasonEl = requireElement(root, '#shop-attack-reason');
    this.overlayEl.addEventListener('pointerdown', this.blockPointer);
  }

  onHeal(handler: () => void): void {
    this.detach('heal');
    this.healHandler = handler;
    this.healButton.addEventListener('click', handler);
  }

  onAttack(handler: () => void): void {
    this.detach('attack');
    this.attackHandler = handler;
    this.attackButton.addEventListener('click', handler);
  }

  onLeave(handler: () => void): void {
    this.detach('leave');
    this.leaveHandler = handler;
    this.leaveButton.addEventListener('click', handler);
  }

  show(view: ShopView): void {
    this.render(view);
    this.overlayEl.hidden = false;
  }

  hide(): void {
    this.overlayEl.hidden = true;
  }

  render(view: ShopView): void {
    this.goldEl.textContent = `Gold: ${view.gold}`;
    this.renderOffer(
      this.healButton,
      this.healTitleEl,
      this.healDescEl,
      this.healReasonEl,
      view.offers.find((offer) => offer.id === 'heal'),
    );
    this.renderOffer(
      this.attackButton,
      this.attackTitleEl,
      this.attackDescEl,
      this.attackReasonEl,
      view.offers.find((offer) => offer.id === 'attack'),
    );
  }

  dispose(): void {
    this.detach('heal');
    this.detach('attack');
    this.detach('leave');
    this.overlayEl.removeEventListener('pointerdown', this.blockPointer);
  }

  private renderOffer(
    button: HTMLButtonElement,
    titleEl: HTMLElement,
    descEl: HTMLElement,
    reasonEl: HTMLElement,
    offer: ShopOfferView | undefined,
  ): void {
    if (!offer) {
      return;
    }

    titleEl.textContent = `${offer.title} — ${offer.cost} gold`;
    descEl.textContent = offer.description;
    reasonEl.textContent = offer.available ? '' : (offer.reasonText ?? '');
    button.disabled = !offer.available;
    const reason = offer.available
      ? offer.description
      : (offer.reasonText ?? 'Unavailable');
    button.setAttribute(
      'aria-label',
      `${offer.title}, ${offer.cost} gold. ${reason}`,
    );
  }

  private detach(kind: ShopOfferId | 'leave'): void {
    if (kind === 'heal' && this.healHandler) {
      this.healButton.removeEventListener('click', this.healHandler);
      this.healHandler = null;
    }
    if (kind === 'attack' && this.attackHandler) {
      this.attackButton.removeEventListener('click', this.attackHandler);
      this.attackHandler = null;
    }
    if (kind === 'leave' && this.leaveHandler) {
      this.leaveButton.removeEventListener('click', this.leaveHandler);
      this.leaveHandler = null;
    }
  }

  private readonly blockPointer = (event: PointerEvent): void => {
    event.stopPropagation();
  };
}
