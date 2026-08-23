import {
  type EnemyMoveResult,
  type PickupResult,
  type TileSnapshot,
} from './BoardSnapshot';
import { type EnemyDropResult } from './definitions/enemies';
import { type EncounterEvent } from './encounters';
import { type LevelUpView } from './levelUp';
import { type ShopView } from './shop';
import { type TrapKind } from './Trap';

export interface MoveResult {
  fromCol: number;
  toCol: number;
  fromRow: number;
  toRow: number;
  destination: TileSnapshot;
}

export interface TrapResolution {
  trapId: string;
  kind: TrapKind;
  enemyMove?: EnemyMoveResult;
  message: string;
}

export interface TurnResolution {
  pickup: PickupResult | null;
  shop: ShopView | null;
  trap: TrapResolution | null;
  encounters: EncounterEvent[];
}

export interface CombatFinishResult {
  drop: EnemyDropResult | null;
  experienceGained: number;
  levelsReached: number[];
  levelUp: LevelUpView | null;
}
