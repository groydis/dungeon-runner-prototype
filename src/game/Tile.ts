export type TileContentType =
  | 'empty'
  | 'monster'
  | 'gold'
  | 'potion'
  | 'loot'
  | 'trap'
  | 'door'
  | 'shop'
  | 'decoration';

export interface TileContent {
  type: TileContentType;
  id?: string;
}

export interface Tile {
  /** World row index. Increases as the dungeon extends forward. */
  row: number;
  /** Lane index: 0 left, 1 centre, 2 right. */
  col: number;
  content: TileContent;
}

export function createEmptyTile(row: number, col: number): Tile {
  return {
    row,
    col,
    content: { type: 'empty' },
  };
}

export function createTile(
  row: number,
  col: number,
  content: TileContent = { type: 'empty' },
): Tile {
  return { row, col, content };
}
