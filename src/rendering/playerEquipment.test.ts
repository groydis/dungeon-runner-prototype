import { describe, expect, it } from 'vitest';
import { PLAYER_RENDER_KEYS } from '../game/definitions/classes';
import { GameState } from '../game/GameState';
import {
  PLAYER_EQUIPMENT_LOADOUTS,
  PLAYER_EQUIPMENT_URLS,
  isPlayerEquipmentAssetKey,
  playerEquipmentLoadout,
  playerEquipmentMountNames,
  playerEquipmentUrl,
  playerRenderKeysWithoutEquipment,
} from './playerEquipment';
import source from './playerEquipment.ts?raw';

describe('player equipment registry', () => {
  it('maps Ranger to the KayKit dagger and every referenced asset has a URL', () => {
    const ranger = playerEquipmentLoadout('ranger');
    expect(ranger).toEqual({
      assetKey: 'dagger',
      mount: 'handslot.r',
      position: expect.any(Array),
      rotation: expect.any(Array),
      scale: expect.any(Number),
    });
    expect(ranger?.position).toHaveLength(3);
    expect(ranger?.rotation).toHaveLength(3);
    expect(playerEquipmentMountNames('handslot.r')).toEqual([
      'handslot.r',
      'handslotr',
    ]);
    expect(PLAYER_EQUIPMENT_LOADOUTS.ranger).toBe(ranger);

    const referenced = new Set(
      Object.values(PLAYER_EQUIPMENT_LOADOUTS).flatMap((loadout) =>
        loadout ? [loadout.assetKey] : [],
      ),
    );
    expect([...referenced].sort()).toEqual(['dagger']);
    for (const assetKey of referenced) {
      expect(isPlayerEquipmentAssetKey(assetKey)).toBe(true);
      expect(playerEquipmentUrl(assetKey)).toBe(PLAYER_EQUIPMENT_URLS[assetKey]);
      expect(PLAYER_EQUIPMENT_URLS[assetKey]).toBe(
        '/models/players/kaykit/weapons/dagger.gltf',
      );
    }
  });

  it('gives non-Ranger classes no weapon loadout', () => {
    expect(playerRenderKeysWithoutEquipment().sort()).toEqual(
      ['barbarian', 'knight', 'mage', 'rogue'].sort(),
    );
    for (const key of PLAYER_RENDER_KEYS) {
      if (key === 'ranger') {
        expect(playerEquipmentLoadout(key)?.assetKey).toBe('dagger');
        continue;
      }
      expect(playerEquipmentLoadout(key)).toBeUndefined();
      expect(PLAYER_EQUIPMENT_LOADOUTS[key]).toBeUndefined();
    }
    expect(playerEquipmentLoadout(null)).toBeUndefined();
    expect(playerEquipmentLoadout(undefined)).toBeUndefined();
  });

  it('keeps Ranger loadout selection after reset and class re-selection', () => {
    const state = new GameState({ playerClass: 'ranger' });
    expect(
      playerEquipmentLoadout(state.getBoardSnapshot().playerRenderKey)?.assetKey,
    ).toBe('dagger');
    expect(
      playerEquipmentLoadout(state.getPlayerSnapshot()?.renderKey)?.assetKey,
    ).toBe('dagger');

    state.reset();
    expect(state.getPlayerSnapshot()?.renderKey).toBe('ranger');
    expect(
      playerEquipmentLoadout(state.getPlayerSnapshot()?.renderKey)?.assetKey,
    ).toBe('dagger');

    state.selectClass('knight');
    expect(state.getBoardSnapshot().playerRenderKey).toBe('knight');
    expect(
      playerEquipmentLoadout(state.getBoardSnapshot().playerRenderKey),
    ).toBeUndefined();

    state.selectClass('ranger');
    expect(state.getPlayerSnapshot()?.renderKey).toBe('ranger');
    expect(
      playerEquipmentLoadout(state.getPlayerSnapshot()?.renderKey)?.assetKey,
    ).toBe('dagger');

    state.clearSelectedClass();
    expect(state.getBoardSnapshot().playerRenderKey).toBeNull();
    expect(
      playerEquipmentLoadout(state.getBoardSnapshot().playerRenderKey),
    ).toBeUndefined();
  });

  it('reuses the shared GLTF scene cache and stays rendering-only', () => {
    expect(source).toMatch(/from '\.\/rigMediumAnimations'/);
    expect(source).toMatch(/loadGltfScene/);
    expect(source).not.toMatch(/new GLTFLoader/);
    expect(source).not.toMatch(/from ['"][^'"]*\/GameState['"]/);
    expect(source).not.toMatch(/from ['"][^'"]*\/Player['"]/);
    expect(source).not.toMatch(/from ['"][^'"]*\/Monster['"]/);
    expect(source).not.toMatch(/from ['"][^'"]*\/RunWorld['"]/);
  });
});
