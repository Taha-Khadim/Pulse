import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { metaGet, metaSet } from './db';
import type { UserProgress } from '../types';
import { DEFAULT_PROGRESS } from '../types';

const PROGRESS_KEY = 'progress_json';
const ONBOARDING_KEY = 'onboarding_done';

export const loadProgress = async (): Promise<UserProgress> => {
  const raw = await metaGet(PROGRESS_KEY);
  if (!raw) return { ...DEFAULT_PROGRESS };
  try {
    const p = JSON.parse(raw) as UserProgress;
    return {
      ...DEFAULT_PROGRESS,
      ...p,
      settings: { ...DEFAULT_PROGRESS.settings, ...p.settings },
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
};

export const saveProgress = async (p: UserProgress) => {
  await metaSet(PROGRESS_KEY, JSON.stringify(p));
};

export const getOnboardingDone = async () => (await metaGet(ONBOARDING_KEY)) === '1';

export const setOnboardingDone = async () => {
  await metaSet(ONBOARDING_KEY, '1');
};

export const exportProgressToFile = async (p: UserProgress): Promise<string> => {
  const path = `${FileSystem.cacheDirectory}pulse-backup.json`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(p, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Pulse backup' });
  }
  return path;
};

export const importProgressFromUri = async (uri: string): Promise<UserProgress> => {
  const raw = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  const p = JSON.parse(raw) as UserProgress;
  await saveProgress({ ...DEFAULT_PROGRESS, ...p, settings: { ...DEFAULT_PROGRESS.settings, ...p.settings } });
  return loadProgress();
};
