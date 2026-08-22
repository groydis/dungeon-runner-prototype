import { describe, expect, it } from 'vitest';
import {
  RESERVED_KAYKIT_ENEMY_URLS,
  RESERVED_KAYKIT_EQUIPMENT_URLS,
  RESERVED_KAYKIT_PLAYER_URLS,
} from './reservedKaykitAssets';

describe('reserved KayKit assets', () => {
  it('keeps future assets addressable without promoting render keys', () => {
    const urls = [
      ...Object.values(RESERVED_KAYKIT_PLAYER_URLS),
      ...Object.values(RESERVED_KAYKIT_ENEMY_URLS),
      ...Object.values(RESERVED_KAYKIT_EQUIPMENT_URLS),
    ];
    expect(urls.length).toBeGreaterThan(20);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(url).toMatch(/^\/models\/.+\.glb$/);
    }
  });
});
