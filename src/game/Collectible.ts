export type CollectibleKind = 'gold' | 'potion';

export interface Collectible {
  id: string;
  kind: CollectibleKind;
  row: number;
  col: number;
  collected: boolean;
}

export function createCollectible(
  id: string,
  kind: CollectibleKind,
  row: number,
  col: number,
): Collectible {
  return {
    id,
    kind,
    row,
    col,
    collected: false,
  };
}

export function collectibleId(kind: CollectibleKind, row: number, col: number): string {
  return `${kind}-${row}-${col}`;
}
