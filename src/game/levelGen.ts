import { mulberry32 } from './mulberry';
import type { LevelConfig } from '../types';
import { COLLISION_SEPARATION_DEG, MIN_ARROW_GAP_DEG, ROTATION_SPEED_SCALE } from './constants';

/** Kept for older imports; gameplay uses `COLLISION_SEPARATION_DEG`. */
export const COLLISION_THRESHOLD = COLLISION_SEPARATION_DEG;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Leave a gap around local 90° (first shot from default aim) so starter arrows are not stacked on impact. */
const placeAngles = (count: number, rng: () => number, minGap: number): number[] => {
  const angles: number[] = [];
  const avoidBottom = 16;
  for (let i = 0; i < count; i++) {
    let placed = false;
    for (let tries = 0; tries < 100 && !placed; tries++) {
      const a = rng() * 360;
      const okPeers = angles.every((x) => circularMinDiff(x, a) >= minGap);
      const okFirstShot = circularMinDiff(a, 90) >= avoidBottom;
      if (okPeers && okFirstShot) {
        angles.push(a);
        placed = true;
      }
    }
    if (!placed) {
      const fallback = (i * 137.5 + 180) % 360;
      angles.push(fallback);
    }
  }
  return angles;
};

const circularMinDiff = (a: number, b: number) => {
  const d = Math.abs(((a % 360) + 360) % 360 - ((b % 360) + 360) % 360);
  return Math.min(d, 360 - d);
};

const tierForLevel = (levelId: number) => Math.floor((levelId - 1) / 100);

const shapeSidesFor = (levelId: number, rng: () => number) => {
  const tier = tierForLevel(levelId);
  if (tier === 0) return 0;
  const minS = tier === 0 ? 3 : 3 + Math.min(tier, 4);
  const maxS = clamp(3 + Math.floor(levelId / 50), 3, 10);
  const lo = Math.max(3, Math.min(minS, maxS));
  const hi = Math.max(lo, maxS);
  return Math.floor(rng() * (hi - lo + 1)) + lo;
};

const rotationSpeedFor = (levelId: number, rng: () => number) => {
  const tier = tierForLevel(levelId);
  const base = 0.45 + levelId * 0.018;
  const caps = [2.2, 3.6, 5.2, 6.8, 8.5, 9.2, 9.5, 9.8, 10, 10.2];
  const cap = caps[Math.min(tier, caps.length - 1)] ?? 10;
  const signed = (rng() > 0.5 ? 1 : -1) * clamp(base, 0.35, cap);
  return signed;
};

const arrowsToShootFor = (levelId: number) => {
  const raw = Math.floor(5 + levelId * 0.35);
  return clamp(raw, 5, 38);
};

const existingCountFor = (levelId: number, rng: () => number) => {
  const cap = clamp(Math.floor(levelId / 12), 0, 8);
  return Math.floor(rng() * Math.min(cap + 1, 6));
};

export const validateLevel = (cfg: Pick<LevelConfig, 'rotationSpeed' | 'arrowsToShoot' | 'existingAngles'>) => {
  const totalSlots = cfg.arrowsToShoot + cfg.existingAngles.length;
  const minGap = 360 / Math.max(totalSlots, 1);
  const effDegPerSec = Math.abs(cfg.rotationSpeed) * ROTATION_SPEED_SCALE;
  const reactionMs = (minGap / Math.max(effDegPerSec, 0.01)) * 1000;
  return reactionMs > 95;
};

export const generateLevel = (levelId: number): LevelConfig => {
  const rng = mulberry32(levelId * 977 + 1337);
  const tier = tierForLevel(levelId);

  const shapeSides = levelId <= 100 ? 0 : shapeSidesFor(levelId, rng);
  let rotationSpeed = rotationSpeedFor(levelId, rng);
  let arrowsToShoot = arrowsToShootFor(levelId);
  let existingAngles = placeAngles(existingCountFor(levelId, rng), rng, MIN_ARROW_GAP_DEG);

  const bidirectional = levelId > 100 && rng() > 0.72;
  const flipIntervalMs = bidirectional ? 2800 + Math.floor(rng() * 4200) : 0;
  const dualLayer = levelId > 600 && rng() > 0.35;
  const innerSpeedRatio = dualLayer ? 1.35 + rng() * 0.9 : 1;

  let cfg: LevelConfig = {
    levelId,
    shapeSides,
    rotationSpeed,
    arrowsToShoot,
    existingAngles,
    bidirectional,
    flipIntervalMs,
    dualLayer,
    innerSpeedRatio,
    colorSchemeIndex: Math.floor(rng() * 10),
    difficultyTier: tier,
    slowModeEligible: true,
  };

  let guard = 0;
  while (!validateLevel(cfg) && guard++ < 24) {
    rotationSpeed *= 0.88;
    if (cfg.existingAngles.length > 0) cfg.existingAngles.pop();
    arrowsToShoot = Math.max(5, arrowsToShoot - 1);
    cfg = { ...cfg, rotationSpeed, arrowsToShoot, existingAngles: [...cfg.existingAngles] };
  }

  return cfg;
};
