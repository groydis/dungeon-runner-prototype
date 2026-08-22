export type CollectibleKind = 'gold' | 'potion';

export class Collectible {
  readonly id: string;
  readonly kind: CollectibleKind;
  readonly row: number;
  readonly col: number;
  private _collected = false;

  constructor(id: string, kind: CollectibleKind, row: number, col: number) {
    this.id = id;
    this.kind = kind;
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
): Collectible {
  return new Collectible(id, kind, row, col);
}

export function collectibleId(kind: CollectibleKind, row: number, col: number): string {
  return `${kind}-${row}-${col}`;
}
