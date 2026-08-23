import { describe, expect, it } from 'vitest';
import { Box3, BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import {
  MERCHANT_MODEL_HEIGHT,
  MERCHANT_MODEL_URL,
  MERCHANT_MODEL_YAW,
  MERCHANT_REQUIRED_MESH_NAMES,
  fitMerchantModel,
} from './merchantAssets';
import source from './merchantAssets.ts?raw';

describe('merchant presentation assets', () => {
  it('registers the self-contained KayKit Hoarder GLB', () => {
    expect(MERCHANT_MODEL_URL).toBe(
      '/models/merchants/kaykit/Hoarder.glb',
    );
    expect(MERCHANT_REQUIRED_MESH_NAMES).toEqual([
      'Hoarder_Backpack',
      'Hoarder_FaceMask',
      'Hoarder_FrontPouch_Sword',
    ]);
    expect(source).not.toMatch(/from ['"][^'"]*\/(GameState|RunWorld)['"]/);
  });

  it('fits and grounds the equipped Hoarder while facing the player', () => {
    const root = new Group();
    const mesh = new Mesh(
      new BoxGeometry(2, 4, 1),
      new MeshBasicMaterial(),
    );
    mesh.position.set(2, 2, -3);
    root.add(mesh);
    for (const name of MERCHANT_REQUIRED_MESH_NAMES) {
      const required = new Group();
      required.name = name;
      required.visible = false;
      root.add(required);
    }

    fitMerchantModel(root);

    const bounds = new Box3().setFromObject(root);
    expect(bounds.max.y - bounds.min.y).toBeCloseTo(MERCHANT_MODEL_HEIGHT);
    expect(bounds.min.y).toBeCloseTo(0);
    expect((bounds.min.x + bounds.max.x) / 2).toBeCloseTo(0);
    expect((bounds.min.z + bounds.max.z) / 2).toBeCloseTo(0);
    expect(root.rotation.y).toBe(MERCHANT_MODEL_YAW);
    for (const name of MERCHANT_REQUIRED_MESH_NAMES) {
      expect(root.getObjectByName(name)?.visible).toBe(true);
    }
  });

  it('rejects a Hoarder variant without the required equipped meshes', () => {
    expect(() => fitMerchantModel(new Group())).toThrow(
      /Hoarder is missing required mesh/,
    );
  });
});
