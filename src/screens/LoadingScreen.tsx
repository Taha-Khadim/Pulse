import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import type { RootStackParamList } from '../navigation/types';
import { initDatabase, verifySaveIntegrity } from '../storage/db';
import { getOnboardingDone } from '../storage/progress';
import { useApp } from '../context/AppContext';
type Nav = NativeStackNavigationProp<RootStackParamList, 'Loading'>;

export const LoadingScreen = ({ navigation }: { navigation: Nav }) => {
  const { refresh } = useApp();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initDatabase();
      const ok = await verifySaveIntegrity();
      if (!ok) {
        // Corrupt save: keep defaults; user can restore from backup in settings
      }
      await refresh();
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
      } catch {
        // ignore
      }
      if (cancelled) return;
      const onboarded = await getOnboardingDone();
      navigation.reset({
        index: 0,
        routes: [{ name: onboarded ? 'Home' : 'Onboarding' }],
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigation, refresh]);

  return (
    <LinearGradient colors={['#0b1220', '#111827']} style={styles.root}>
      <Text style={[styles.logo, { color: '#f1f5f9' }]}>Pulse</Text>
      <Text style={[styles.sub, { color: '#94a3b8' }]}>orbit · focus · calm</Text>
      <ActivityIndicator size="large" color="#94a3b8" style={styles.spin} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 44, fontWeight: '200', letterSpacing: 8 },
  sub: { marginTop: 8, fontSize: 14, letterSpacing: 2 },
  spin: { marginTop: 40 },
});
