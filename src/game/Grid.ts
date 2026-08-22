import { LANE_COUNT } from './config';
import { type Tile } from './Tile';

export type TileFactory = (row: number, col: number) => Tile;

/**
 * Sliding window of logical tiles. Rows are generated on demand and
 * discarded behind the player so a long run does not grow without bound.
 */
export class Grid {
  readonly columns = LANE_COUNT;
  private readonly rows = new Map<number, Tile[]>();

  getTile(row: number, col: number): Tile | undefined {
    if (col < 0 || col >= this.columns) {
      return undefined;
    }
    return this.rows.get(row)?.[col];
  }

  getRow(row: number): Tile[] | undefined {
    return this.rows.get(row);
  }

  ensureRow(row: number, createTile: TileFactory): Tile[] {
    const existing = this.rows.get(row);
    if (existing) {
      return existing;
    }

    const created = Array.from({ length: this.columns }, (_, col) =>
      createTile(row, col),
    );
    this.rows.set(row, created);
    return created;
  }

  ensureRange(fromRow: number, toRow: number, createTile: TileFactory): void {
    for (let row = fromRow; row <= toRow; row += 1) {
      this.ensureRow(row, createTile);
    }
  }

  pruneBelow(minRow: number): void {
    for (const row of this.rows.keys()) {
      if (row < minRow) {
        this.rows.delete(row);
      }
    }
  }

  clear(): void {
    this.rows.clear();
  }
}
