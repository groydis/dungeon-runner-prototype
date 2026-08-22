export interface Monster {
  id: string;
  name: string;
  row: number;
  col: number;
  encounterResolved: boolean;
}

export function createMonster(
  id: string,
  name: string,
  row: number,
  col: number,
): Monster {
  return {
    id,
    name,
    row,
    col,
    encounterResolved: false,
  };
}
