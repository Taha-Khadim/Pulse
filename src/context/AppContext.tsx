import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { UserProgress } from '../types';
import { DEFAULT_PROGRESS } from '../types';
import * as progressStorage from '../storage/progress';

type Ctx = {
  progress: UserProgress;
  setProgress: (p: UserProgress) => void;
  replaceProgress: (p: UserProgress) => Promise<void>;
  resetProgress: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AppContext = createContext<Ctx | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [progress, setProgressState] = useState<UserProgress>(DEFAULT_PROGRESS);

  const refresh = useCallback(async () => {
    const p = await progressStorage.loadProgress();
    setProgressState(p);
  }, []);

  const setProgress = useCallback((p: UserProgress) => {
    setProgressState(p);
  }, []);

  const replaceProgress = useCallback(async (p: UserProgress) => {
    await progressStorage.saveProgress(p);
    setProgressState(p);
  }, []);

  const resetProgress = useCallback(async () => {
    await progressStorage.saveProgress({ ...DEFAULT_PROGRESS });
    setProgressState({ ...DEFAULT_PROGRESS });
  }, []);

  const value = useMemo(
    () => ({ progress, setProgress, replaceProgress, resetProgress, refresh }),
    [progress, setProgress, replaceProgress, resetProgress, refresh]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const v = useContext(AppContext);
  if (!v) throw new Error('useApp requires AppProvider');
  return v;
};
