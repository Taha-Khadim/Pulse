import * as Haptics from 'expo-haptics';
import type { HapticStrength } from '../types';

export const hitHaptic = async (strength: HapticStrength) => {
  if (strength === 'off') return;
  const map = {
    light: Haptics.ImpactFeedbackStyle.Light,
    medium: Haptics.ImpactFeedbackStyle.Medium,
    strong: Haptics.ImpactFeedbackStyle.Heavy,
  } as const;
  await Haptics.impactAsync(map[strength]);
};

export const missHaptic = async (strength: HapticStrength) => {
  if (strength === 'off') return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};
