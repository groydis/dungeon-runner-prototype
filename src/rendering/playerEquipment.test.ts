import { describe, expect, it } from 'vitest';
import { getPlayerClassDefinition, PLAYER_RENDER_KEYS } from '../game/definitions/classes';
import { GameState } from '../game/GameState';
import {
  equipmentUpgradeLevelsFromAttributes,
  PLAYER_EQUIPMENT_LOADOUTS,
  PLAYER_EQUIPMENT_URLS,
  PLAYER_SPECIAL_EQUIPMENT_LOADOUTS,
  isPlayerEquipmentAssetKey,
  playerEquipmentLoadout,
  playerEquipmentMountNames,
  playerEquipmentUrl,
  playerRenderKeysWithoutEquipment,
} from './playerEquipment';
import source from './playerEquipment.ts?raw';

describe('player equipment registry', () => {
  it('maps every current class to self-contained KayKit GLBs', () => {
    expect(PLAYER_EQUIPMENT_LOADOUTS).toEqual({
      rogue: [expect.objectContaining({ assetKey: 'dagger', mount: 'handslot.r' })],
      ranger: [
        expect.objectContaining({ assetKey: 'bowWithString', mount: 'handslot.r' }),
      ],
      mage: [expect.objectContaining({ assetKey: 'staff', mount: 'handslot.r' })],
      knight: [
        expect.objectContaining({ assetKey: 'sword1H', mount: 'handslot.r' }),
        expect.objectContaining({ assetKey: 'shieldBadge', mount: 'handslot.l' }),
      ],
      barbarian: [
        expect.objectContaining({ assetKey: 'axe2H', mount: 'handslot.r' }),
      ],
      lorekeeper: [
        expect.objectContaining({ assetKey: 'staff', mount: 'handslot.r' }),
      ],
    });
    const referenced = new Set(
      Object.values(PLAYER_EQUIPMENT_LOADOUTS).flatMap((loadout) =>
        loadout.map((visual) => visual.assetKey),
      ),
    );
    expect(Object.keys(PLAYER_EQUIPMENT_URLS)).toEqual(
      expect.arrayContaining([...referenced]),
    );
    for (const assetKey of referenced) {
      expect(isPlayerEquipmentAssetKey(assetKey)).toBe(true);
      expect(playerEquipmentUrl(assetKey)).toBe(PLAYER_EQUIPMENT_URLS[assetKey]);
      expect(PLAYER_EQUIPMENT_URLS[assetKey]).toMatch(
        /^\/models\/players\/kaykit\/weapons\/.+\.glb$/,
      );
    }
    for (const url of Object.values(PLAYER_EQUIPMENT_URLS)) {
      expect(url).toMatch(/^\/models\/players\/kaykit\/weapons\/.+\.glb$/);
    }
  });

  it('maps attribute-growth upgrade levels to visible equipment tiers', () => {
    expect(
      playerEquipmentLoadout('rogue', { sharpened: 1, armoured: 0 }).map(
        (visual) => visual.assetKey,
      ),
    ).toEqual(['axe1H']);
    expect(
      playerEquipmentLoadout('ranger', { sharpened: 1, armoured: 0 })[0]
        ?.assetKey,
    ).toBe('crossbow1H');
    expect(
      playerEquipmentLoadout('ranger', { sharpened: 2, armoured: 0 })[0]
        ?.assetKey,
    ).toBe('crossbow2H');
    expect(
      playerEquipmentLoadout('mage', { sharpened: 2, armoured: 0 }).map(
        (visual) => visual.assetKey,
      ),
    ).toEqual(['wand', 'spellbookOpen']);
    expect(
      playerEquipmentLoadout('lorekeeper', { sharpened: 2, armoured: 0 }).map(
        (visual) => visual.assetKey,
      ),
    ).toEqual(['wand', 'spellbookOpen']);
    expect(
      playerEquipmentLoadout('barbarian', { sharpened: 2, armoured: 0 })[0]
        ?.assetKey,
    ).toBe('sword2HColor');
    expect(
      playerEquipmentLoadout('knight', { sharpened: 0, armoured: 8 }).map(
        (visual) => visual.assetKey,
      ),
    ).toEqual(['sword1H', 'shieldSpikesColor']);
  });

  it('derives upgrade tiers from primary-attr and DEF growth', () => {
    const rangerStart = getPlayerClassDefinition('ranger').startingStats;
    expect(
      equipmentUpgradeLevelsFromAttributes('ranger', rangerStart, rangerStart),
    ).toEqual({ sharpened: 0, armoured: 0 });
    expect(
      equipmentUpgradeLevelsFromAttributes(
        'ranger',
        { ...rangerStart, str: rangerStart.str + 3 },
        rangerStart,
      ),
    ).toEqual({ sharpened: 1, armoured: 0 });
    expect(
      equipmentUpgradeLevelsFromAttributes(
        'ranger',
        { ...rangerStart, str: rangerStart.str + 6 },
        rangerStart,
      ),
    ).toEqual({ sharpened: 2, armoured: 0 });
    expect(
      equipmentUpgradeLevelsFromAttributes(
        'ranger',
        { ...rangerStart, str: rangerStart.str + 9 },
        rangerStart,
      ),
    ).toEqual({ sharpened: 2, armoured: 0 });

    const mageStart = getPlayerClassDefinition('mage').startingStats;
    expect(
      equipmentUpgradeLevelsFromAttributes(
        'mage',
        { ...mageStart, dex: mageStart.dex + 6, str: mageStart.str + 9 },
        mageStart,
      ),
    ).toEqual({ sharpened: 2, armoured: 0 });

    const knightStart = getPlayerClassDefinition('knight').startingStats;
    expect(
      equipmentUpgradeLevelsFromAttributes(
        'knight',
        {
          ...knightStart,
          str: knightStart.str + 9,
          defence: knightStart.defence + 16,
        },
        knightStart,
      ),
    ).toEqual({ sharpened: 0, armoured: 8 });
  });

  it('replaces each class loadout with its purchased Fantasy Weapons Bits set', () => {
    expect(
      Object.fromEntries(
        PLAYER_RENDER_KEYS.map((key) => [
          key,
          playerEquipmentLoadout(
            key,
            { sharpened: 8, armoured: 8 },
            true,
          ).map((visual) => visual.assetKey),
        ]),
      ),
    ).toEqual({
      rogue: ['fantasyDaggerC'],
      ranger: ['fantasyBowAWithString'],
      mage: ['fantasyStaffD'],
      knight: ['fantasySwordG', 'fantasyShieldA'],
      barbarian: ['fantasyHammerD'],
      lorekeeper: ['fantasyStaffC'],
    });
    for (const visual of Object.values(PLAYER_SPECIAL_EQUIPMENT_LOADOUTS).flat()) {
      expect(PLAYER_EQUIPMENT_URLS[visual.assetKey]).toMatch(
        /^\/models\/players\/kaykit\/weapons\/fantasy_bits\/.+\.glb$/,
      );
    }
  });

  it('supports both authored hand slots and gives every class equipment', () => {
    expect(playerEquipmentMountNames('handslot.r')).toEqual([
      'handslot.r',
      'handslotr',
    ]);
    expect(playerEquipmentMountNames('handslot.l')).toEqual([
      'handslot.l',
      'handslotl',
    ]);
    expect(playerRenderKeysWithoutEquipment()).toEqual([]);
    for (const key of PLAYER_RENDER_KEYS) {
      const loadout = playerEquipmentLoadout(key);
      expect(loadout.length).toBeGreaterThan(0);
      for (const visual of loadout) {
        expect(visual.position).toHaveLength(3);
        expect(visual.rotation).toHaveLength(3);
      }
    }
    expect(playerEquipmentLoadout(null)).toEqual([]);
    expect(playerEquipmentLoadout(undefined)).toEqual([]);
  });

  it('keeps class-specific loadouts after reset and re-selection', () => {
    const state = new GameState({ playerClass: 'ranger' });
    expect(
      playerEquipmentLoadout(state.getBoardSnapshot().playerRenderKey)[0]?.assetKey,
    ).toBe('bowWithString');

    state.reset();
    expect(
      playerEquipmentLoadout(state.getPlayerSnapshot()?.renderKey)[0]?.assetKey,
    ).toBe('bowWithString');

    state.selectClass('knight');
    expect(
      playerEquipmentLoadout(state.getBoardSnapshot().playerRenderKey).map(
        (visual) => visual.assetKey,
      ),
    ).toEqual(['sword1H', 'shieldBadge']);

    state.clearSelectedClass();
    expect(playerEquipmentLoadout(state.getBoardSnapshot().playerRenderKey)).toEqual(
      [],
    );
  });

  it('reuses the shared GLTF scene cache and stays rendering-only', () => {
    expect(source).toMatch(/from '\.\/rigMediumAnimations'/);
    expect(source).toMatch(/loadGltfScene/);
    expect(source).not.toMatch(/new GLTFLoader/);
    expect(source).not.toMatch(/from ['"][^'"]*\/(GameState|Player|Monster|RunWorld)['"]/);
  });
});
