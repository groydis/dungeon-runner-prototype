export type Rng = () => number;

/** Mulberry32: small deterministic [0, 1) generator for seeded streams (rows, drops). */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromSearch(search: string): number | undefined {
  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  );
  const raw = params.get('seed');
  if (raw === null || raw === '') {
    return undefined;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed >>> 0;
}

/**
 * Factory so Restart Run can rewind generation to the same seed.
 * Unseeded play returns `Math.random` and is not deterministic.
 */
export function rngFactoryFromSearch(search: string): () => Rng {
  const seed = seedFromSearch(search);
  if (seed === undefined) {
    return () => Math.random;
  }
  return () => mulberry32(seed);
}

/**
 * XOR salt so enemy-drop rolls never share the row-generation Mulberry32
 * stream. `?seed=123` still drives both, but drop rolls cannot change
 * later recipes, Merchant lanes, or enemy types.
 */
export const DROP_RNG_SEED_SALT = 0x9e3779b9;

export function dropRngFactoryFromSearch(search: string): () => Rng {
  const seed = seedFromSearch(search);
  if (seed === undefined) {
    return () => Math.random;
  }
  return () => mulberry32((seed ^ DROP_RNG_SEED_SALT) >>> 0);
}

export function randomInt(rng: Rng, maxExclusive: number): number {
  if (maxExclusive <= 0) {
    return 0;
  }
  return Math.min(maxExclusive - 1, Math.floor(rng() * maxExclusive));
}

export function pickWeighted<T>(
  entries: readonly { item: T; weight: number }[],
  rng: Rng,
): T {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll < 0) {
      return entry.item;
    }
  }
  return entries[entries.length - 1].item;
}
