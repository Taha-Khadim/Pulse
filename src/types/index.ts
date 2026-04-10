export type GameState =
  | 'idle'
  | 'rotating'
  | 'shooting'
  | 'hit'
  | 'miss'
  | 'complete'
  | 'paused';

export type HapticStrength = 'off' | 'light' | 'medium' | 'strong';

export type ThemeId = 'light' | 'dark' | 'amoled';

/** Persisted preferences */
export interface GameSettings {
  bgmVolume: number;
  sfxVolume: number;
  haptics: HapticStrength;
  theme: ThemeId;
}

export interface UserProgress {
  currentLevel: number;
  completedLevels: number[];
  perfectLevels: number[];
  totalPlayTimeSec: number;
  lastPlayedIso: string;
  dailyStreak: number;
  lastStreakDateIso: string;
  settings: GameSettings;
}

export interface LevelConfig {
  levelId: number;
  shapeSides: number;
  rotationSpeed: number;
  arrowsToShoot: number;
  existingAngles: number[];
  bidirectional: boolean;
  flipIntervalMs: number;
  dualLayer: boolean;
  innerSpeedRatio: number;
  colorSchemeIndex: number;
  difficultyTier: number;
  slowModeEligible: boolean;
}

export interface SessionStats {
  arrowsShot: number;
  hits: number;
  misses: number;
  retries: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  bgmVolume: 0.35,
  sfxVolume: 0.6,
  haptics: 'medium',
  theme: 'dark',
};

export const DEFAULT_PROGRESS: UserProgress = {
  currentLevel: 1,
  completedLevels: [],
  perfectLevels: [],
  totalPlayTimeSec: 0,
  lastPlayedIso: new Date(0).toISOString(),
  dailyStreak: 0,
  lastStreakDateIso: new Date(0).toISOString(),
  settings: DEFAULT_SETTINGS,
};
