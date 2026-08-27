import { type CharacterSheetView } from '../game/characterSheet';
import { requireElement } from './dom';

export class CharacterSheetOverlayView {
  private readonly overlayEl: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly featureEl: HTMLElement;
  private readonly equipmentEl: HTMLElement;
  private readonly attributesEl: HTMLElement;
  private readonly combatEl: HTMLElement;
  private readonly progressionEl: HTMLElement;
  private readonly closeButton: HTMLButtonElement;
  private closeHandler: (() => void) | null = null;

  constructor(root: ParentNode = document) {
    this.overlayEl = requireElement(root, '#character-sheet');
    this.titleEl = requireElement(root, '#character-sheet-title');
    this.featureEl = requireElement(root, '#character-sheet-feature');
    this.equipmentEl = requireElement(root, '#character-sheet-equipment');
    this.attributesEl = requireElement(root, '#character-sheet-attributes');
    this.combatEl = requireElement(root, '#character-sheet-combat');
    this.progressionEl = requireElement(root, '#character-sheet-progression');
    this.closeButton = requireElement(root, '#character-sheet-close') as HTMLButtonElement;
    this.closeButton.addEventListener('click', this.onCloseClick);
    this.overlayEl.addEventListener('pointerdown', this.blockPointer);
    document.addEventListener('keydown', this.onKeyDown);
  }

  onClose(handler: () => void): void { this.closeHandler = handler; }

  show(view: CharacterSheetView): void {
    this.titleEl.textContent = `${view.className} · Level ${view.level}`;
    this.featureEl.textContent = view.featureText;
    this.equipmentEl.replaceChildren(
      row('Weapon', `${view.weaponName} · ${capitalize(view.damageChannel)}`),
      ...(view.shieldName ? [row('Shield', view.shieldName)] : []),
    );
    this.attributesEl.replaceChildren(...view.attributes.map((attribute) => {
      const modifier = attribute.modifier >= 0 ? `+${attribute.modifier}` : String(attribute.modifier);
      return attributeTile(attribute.id, attribute.label, `${attribute.score} (${modifier})`);
    }));
    this.combatEl.replaceChildren(...view.combat.map((metric) => tile(metric.label, metric.value)));
    const progression = [
      row('Specialization', view.specialization ?? 'Not chosen'),
      row('Capstone', view.capstone ?? 'Not chosen'),
      ...view.techniques.map((technique) => row(technique.label, `Rank ${technique.rank}`)),
    ];
    this.progressionEl.replaceChildren(...progression);
    this.overlayEl.hidden = false;
    this.closeButton.focus();
  }

  hide(): void { this.overlayEl.hidden = true; }

  dispose(): void {
    this.closeButton.removeEventListener('click', this.onCloseClick);
    this.overlayEl.removeEventListener('pointerdown', this.blockPointer);
    document.removeEventListener('keydown', this.onKeyDown);
    this.closeHandler = null;
  }

  private readonly onCloseClick = (): void => { this.closeHandler?.(); };
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && !this.overlayEl.hidden) this.closeHandler?.();
  };
  private readonly blockPointer = (event: PointerEvent): void => { event.stopPropagation(); };
}

function tile(label: string, value: string): HTMLElement {
  const element = document.createElement('div');
  element.className = 'character-sheet-tile';
  element.append(labelElement(label), valueElement(value));
  return element;
}
function attributeTile(id: string, label: string, value: string): HTMLElement {
  const element = tile(label, value);
  element.classList.add('character-sheet-attribute');
  const icon = document.createElement('img');
  icon.className = 'character-sheet-attribute-icon';
  icon.src = `/images/hud/${id}.png`;
  icon.alt = '';
  icon.width = 28;
  icon.height = 28;
  icon.draggable = false;
  element.prepend(icon);
  return element;
}
function row(label: string, value: string): HTMLElement {
  const element = document.createElement('div');
  element.className = 'character-sheet-row';
  element.append(labelElement(label), valueElement(value));
  return element;
}
function labelElement(value: string): HTMLElement {
  const element = document.createElement('span');
  element.className = 'character-sheet-label';
  element.textContent = value;
  return element;
}
function valueElement(value: string): HTMLElement {
  const element = document.createElement('strong');
  element.textContent = value;
  return element;
}
function capitalize(value: string): string { return value.charAt(0).toUpperCase() + value.slice(1); }
