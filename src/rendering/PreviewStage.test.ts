import { describe, expect, it } from 'vitest';
import classSource from './ClassSelectionPreview.ts?raw';
import equipmentSource from './EquipmentShopPreview.ts?raw';
import merchantSource from './MerchantShopPreview.ts?raw';
import stageSource from './PreviewStage.ts?raw';

describe('preview stage composition', () => {
  it('owns the shared transparent WebGL lifecycle', () => {
    expect(stageSource).toMatch(/new WebGLRenderer/);
    expect(stageSource).toMatch(/alpha: true/);
    expect(stageSource).toMatch(/PREVIEW_MAX_PIXEL_RATIO = 1\.5/);
    expect(stageSource).toMatch(/renderWhen\(/);
    expect(stageSource).toMatch(/resizeToCanvas\(/);
    expect(stageSource).toMatch(/this\.renderer\.dispose\(\)/);
  });

  it('leaves model, lighting, and load-token logic in each preview', () => {
    for (const source of [classSource, merchantSource, equipmentSource]) {
      expect(source).toMatch(/new PreviewStage\(/);
      expect(source).not.toMatch(/new WebGLRenderer/);
      expect(source).not.toMatch(/setPixelRatio/);
      expect(source).not.toMatch(/resizeToCanvas/);
    }

    expect(classSource).toMatch(/loadToken/);
    expect(classSource).toMatch(/loadPlayerTemplate/);
    expect(merchantSource).toMatch(/loadMerchantTemplate/);
    expect(merchantSource).toMatch(/isDisposed/);
    expect(equipmentSource).toMatch(/loadToken/);
    expect(equipmentSource).toMatch(/setWeaponOffer/);
    expect(equipmentSource).toMatch(/weaponCatalogEntry/);
  });
});
