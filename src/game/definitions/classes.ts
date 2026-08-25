import { type CombatStats, createCombatStats } from '../Combatant';
import { deepFreeze, type DeepReadonly } from '../freeze';

export type PlayerClassId =
  | 'rogue'
  | 'ranger'
  | 'mage'
  | 'knight'
  | 'barbarian'
  | 'lorekeeper';

export type PlayerRenderKey =
  | 'rogue'
  | 'ranger'
  | 'mage'
  | 'knight'
  | 'barbarian'
  | 'lorekeeper';

export const PLAYER_CLASS_IDS: readonly PlayerClassId[] = [
  'rogue',
  'ranger',
  'mage',
  'knight',
  'barbarian',
  'lorekeeper',
];

export const PLAYER_RENDER_KEYS: readonly PlayerRenderKey[] = [
  'rogue',
  'ranger',
  'mage',
  'knight',
  'barbarian',
  'lorekeeper',
];

export interface PlayerClassDefinition {
  readonly id: PlayerClassId;
  readonly name: string;
  readonly description: string;
  readonly startingStats: Readonly<CombatStats>;
  readonly renderKey: PlayerRenderKey;
}

export interface ClassOptionView {
  id: PlayerClassId;
  name: string;
  description: string;
  maxHealth: number;
  attack: number;
  defence: number;
  dex: number;
}

export interface ClassSelectionView {
  classes: ClassOptionView[];
}

export interface ClassAttributePool {
  str: number;
  con: number;
  def: number;
  dex: number;
}

/** Universal max HP from attributes (every class, including lorekeeper). */
export function computeMaxHealth(str: number, con: number): number {
  return str + con * 2;
}

/** Fixed damage pairs; lorekeeper always sums its two highest attributes. */
export function computeClassDamage(
  classId: PlayerClassId,
  pool: Readonly<ClassAttributePool>,
): number {
  switch (classId) {
    case 'rogue':
    case 'ranger':
      return pool.str + pool.dex;
    case 'mage':
      return pool.dex + pool.con;
    case 'knight':
      return pool.str + pool.def;
    case 'barbarian':
      return pool.str + pool.con;
    case 'lorekeeper': {
      const ranked = [pool.str, pool.con, pool.def, pool.dex].sort(
        (a, b) => b - a,
      );
      return ranked[0] + ranked[1];
    }
  }
}

function classStats(
  classId: PlayerClassId,
  str: number,
  con: number,
  def: number,
  dex: number,
): CombatStats {
  const pool = { str, con, def, dex };
  const maxHealth = computeMaxHealth(str, con);
  return createCombatStats({
    maxHealth,
    health: maxHealth,
    attack: computeClassDamage(classId, pool),
    defence: def,
    str,
    con,
    dex,
  });
}

export const PLAYER_CLASS_DEFINITIONS: DeepReadonly<
  Record<PlayerClassId, PlayerClassDefinition>
> = deepFreeze({
  rogue: {
    id: 'rogue',
    name: 'Rogue',
    description: 'Nimble survivor with the best chance to slip past threats.',
    startingStats: classStats('rogue', 6, 5, 2, 7),
    renderKey: 'rogue',
  },
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    description: 'Flexible fighter with reliable early damage.',
    startingStats: classStats('ranger', 5, 5, 2, 8),
    renderKey: 'ranger',
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    description: 'Fragile but devastating without needing magic abilities yet.',
    startingStats: classStats('mage', 3, 5, 4, 8),
    renderKey: 'mage',
  },
  knight: {
    id: 'knight',
    name: 'Knight',
    description: 'Armoured and dependable under sustained damage.',
    startingStats: classStats('knight', 8, 5, 5, 2),
    renderKey: 'knight',
  },
  barbarian: {
    id: 'barbarian',
    name: 'Barbarian',
    description: 'Huge health and damage, with no defensive tricks.',
    startingStats: classStats('barbarian', 10, 8, 1, 1),
    renderKey: 'barbarian',
  },
  lorekeeper: {
    id: 'lorekeeper',
    name: 'Lorekeeper',
    description: 'A seasoned scholar balancing resilience, armour, and magic.',
    startingStats: classStats('lorekeeper', 5, 5, 5, 5),
    renderKey: 'lorekeeper',
  },
});

export function getPlayerClassDefinition(
  classId: PlayerClassId,
): DeepReadonly<PlayerClassDefinition> {
  return PLAYER_CLASS_DEFINITIONS[classId];
}

export function buildClassSelectionView(): ClassSelectionView {
  return {
    classes: PLAYER_CLASS_IDS.map((id) => {
      const definition = getPlayerClassDefinition(id);
      return {
        id,
        name: definition.name,
        description: definition.description,
        maxHealth: definition.startingStats.maxHealth,
        attack: definition.startingStats.attack,
        defence: definition.startingStats.defence,
        dex: definition.startingStats.dex,
      };
    }),
  };
}

export function classStatLine(option: ClassOptionView): string {
  return `HP ${option.maxHealth} · ATK ${option.attack} · DEF ${option.defence} · DEX ${option.dex}`;
}
