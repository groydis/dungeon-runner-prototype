import { START_COL, START_ROW } from './config';
import { type CombatStats, createPlayerStats } from './Combatant';

/** Logical player position and combat stats. */
export class Player {
  row = START_ROW;
  col = START_COL;
  gold = 0;
  stats: CombatStats = createPlayerStats();

  reset(): void {
    this.row = START_ROW;
    this.col = START_COL;
    this.gold = 0;
    this.stats = createPlayerStats();
  }
}
