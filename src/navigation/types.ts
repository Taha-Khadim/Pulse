import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Loading: undefined;
  Onboarding: undefined;
  Home: undefined;
  Game: { levelId: number; zenMode?: boolean };
  LevelComplete: { levelId: number; perfect: boolean; retries: number; arrowsShot: number };
  Settings: undefined;
  Profile: undefined;
};

export type RootNavProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
