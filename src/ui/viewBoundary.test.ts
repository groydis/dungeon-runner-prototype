import { describe, expect, it } from 'vitest';
import classSource from './ClassSelectionView.ts?raw';
import gameOverSource from './GameOverView.ts?raw';
import hudSource from './HudView.ts?raw';
import landingSource from './LandingView.ts?raw';
import aboutSource from './AboutView.ts?raw';
import siteNavSource from './SiteNav.ts?raw';
import levelUpSource from './LevelUpOverlayView.ts?raw';
import loadingSource from './LoadingView.ts?raw';
import shopSource from './ShopOverlayView.ts?raw';

const viewSources = [
  classSource,
  gameOverSource,
  hudSource,
  landingSource,
  aboutSource,
  siteNavSource,
  levelUpSource,
  loadingSource,
  shopSource,
];

describe('UI view boundaries', () => {
  it('does not import Three.js or live game mutation types', () => {
    for (const source of viewSources) {
      expect(source).not.toMatch(/from ['"]three['"]/);
      expect(source).not.toMatch(
        /import \{(?![^}]*\btype\b)[^}]*\b(GameState|RunWorld|Player|Monster)\b/,
      );
      expect(source).not.toMatch(/from ['"][^'"]*\/(RunWorld|Player|Monster)['"]/);
    }
  });

  it('does not calculate shop prices, eligibility, or stat effects', () => {
    expect(shopSource).not.toMatch(/shopOfferPrice/);
    expect(shopSource).not.toMatch(/evaluateShopOffer/);
    expect(shopSource).not.toMatch(/evaluateSpecialEquipmentOffer/);
    expect(shopSource).not.toMatch(/applyShopPurchase/);
    expect(shopSource).not.toMatch(/applySpecialEquipmentPurchase/);
    expect(shopSource).not.toMatch(/increaseAttack|increaseDefence|trySpendGold/);
  });
});
