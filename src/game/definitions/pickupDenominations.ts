import { mulberry32, randomInt } from '../random';
import { type PickupCategory, type PickupId } from './pickupCatalog';
import { pickFromPickupPool, pickupPoolForRow } from './pickupPools';

/**
 * Tier selection for a category that has already been decided.
 * Uses a throwaway Mulberry32 from the run seed + discriminator so picking a
 * tier never advances the generation or drop streams (iOS parity).
 */
export const PICKUP_DENOMINATION_SEED_SALT = 0x27d4eb2f;

const PRIME_MULTIPLIER = 0x01000193;
const OFFSET_BASIS = 0x811c9dc5;

const CATEGORY_SALT: Record<PickupCategory, number> = {
  gold: 0x9e3779b1,
  potion: 0x85ebca6b,
};

export function pickPickupDenomination(
  category: PickupCategory,
  generatedRow: number,
  runSeed: number,
  discriminator: number,
): PickupId {
  const pool = pickupPoolForRow(generatedRow, category);
  const rng = mulberry32(
    derivedPickupSeed(runSeed, generatedRow, category, discriminator),
  );
  return pickFromPickupPool(pool, randomInt(rng, pool.totalWeight));
}

/** Stable FNV-1a over UTF-8 bytes — never use JS string hash for seeded replay. */
export function pickupDiscriminatorForText(text: string): number {
  let hash = OFFSET_BASIS >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i) & 0xff;
    hash = Math.imul(hash, PRIME_MULTIPLIER) >>> 0;
  }
  return hash >>> 0;
}

export function derivedPickupSeed(
  runSeed: number,
  row: number,
  category: PickupCategory,
  discriminator: number,
): number {
  let value = (runSeed ^ PICKUP_DENOMINATION_SEED_SALT) >>> 0;
  for (const component of [
    row | 0,
    CATEGORY_SALT[category],
    discriminator >>> 0,
  ]) {
    value = Math.imul(value ^ (component >>> 0), PRIME_MULTIPLIER) >>> 0;
  }
  return value >>> 0;
}
