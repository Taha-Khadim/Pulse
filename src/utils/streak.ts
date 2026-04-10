import type { UserProgress } from '../types';

const dayKey = (iso: string) => iso.slice(0, 10);

export const applyDailyStreak = (p: UserProgress): UserProgress => {
  const today = dayKey(new Date().toISOString());
  if (dayKey(p.lastStreakDateIso) === today) return p;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (dayKey(p.lastStreakDateIso) === dayKey(y.toISOString())) {
    return { ...p, dailyStreak: p.dailyStreak + 1, lastStreakDateIso: new Date().toISOString() };
  }
  return { ...p, dailyStreak: 1, lastStreakDateIso: new Date().toISOString() };
};
