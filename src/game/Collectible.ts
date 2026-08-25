import {
  defaultPickupIdForCategory,
  pickupCategoryOf,
  type PickupId,
} from './definitions/pickupCatalog';

export type CollectibleKind = 'gold' | 'potion';

export class Collectible {
  readonly id: string;
  readonly kind: CollectibleKind;
  readonly pickupId: PickupId;
  readonly row: number;
  readonly col: number;
  private _collected = false;

  constructor(
    id: string,
    kind: CollectibleKind,
    row: number,
    col: number,
    pickupId: PickupId = defaultPickupIdForCategory(kind),
  ) {
    if (pickupCategoryOf(pickupId) !== kind) {
      throw new Error(
        `Pickup ${pickupId} does not match collectible kind ${kind}`,
      );
    }
    this.id = id;
    this.kind = kind;
    this.pickupId = pickupId;
    this.row = row;
    this.col = col;
  }

  get collected(): boolean {
    return this._collected;
  }

  /** Marks the item collected. Returns false if it was already taken. */
  collect(): boolean {
    if (this._collected) {
      return false;
    }
    this._collected = true;
    return true;
  }
}

export function createCollectible(
  id: string,
  kind: CollectibleKind,
  row: number,
  col: number,
  pickupId: PickupId = defaultPickupIdForCategory(kind),
): Collectible {
  return new Collectible(id, kind, row, col, pickupId);
}

export function collectibleId(
  pickupId: PickupId,
  row: number,
  col: number,
): string {
  return `${pickupId}-${row}-${col}`;
}
