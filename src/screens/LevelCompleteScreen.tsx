import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import type { RootStackParamList } from '../navigation/types';
import { useApp } from '../context/AppContext';
import { loadProgress, saveProgress } from '../storage/progress';
import { themeSurfaces } from '../theme/palettes';

type Nav = NativeStackNavigationProp<RootStackParamList, 'LevelComplete'>;
type Rt = RouteProp<RootStackParamList, 'LevelComplete'>;

export const LevelCompleteScreen = ({ navigation, route }: { navigation: Nav; route: Rt }) => {
  const insets = useSafeAreaInsets();
  const { levelId, perfect, retries, arrowsShot } = route.params;
  const { progress, refresh } = useApp();
  const t = themeSurfaces[progress.settings.theme];
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }).start();
    (async () => {
      const latest = await loadProgress();
      await saveProgress({ ...latest, totalPlayTimeSec: latest.totalPlayTimeSec + 4 });
      await refresh();
    })();
  }, [refresh, scale]);

  const nextLevel = levelId + 1;

  return (
    <LinearGradient colors={[t.bg, t.card]} style={[styles.root, { paddingTop: insets.top + 20 }]}>
      <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
        <Text style={[styles.title, { color: t.text }]}>Clear</Text>
        <Text style={[styles.level, { color: t.muted }]}>Level {levelId}</Text>
        {perfect ? <Text style={styles.perfect}>Perfect run</Text> : null}
        <Text style={[styles.meta, { color: t.muted }]}>
          shots {arrowsShot} · retries {retries}
        </Text>
      </Animated.View>

      <View style={{ flex: 1 }} />

      <Pressable
        onPress={() => {
          if (nextLevel > 1000) navigation.navigate('Home');
          else navigation.replace('Game', { levelId: nextLevel });
        }}
        style={[styles.primary, { borderColor: t.text }]}
      >
        <Text style={[styles.primaryText, { color: t.text }]}>
          {nextLevel > 1000 ? 'Home' : `Next · ${nextLevel}`}
        </Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Home')} style={{ marginTop: 16, marginBottom: insets.bottom + 16 }}>
        <Text style={{ color: t.muted }}>Map</Text>
      </Pressable>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  title: { fontSize: 40, fontWeight: '200', letterSpacing: 6 },
  level: { marginTop: 8, fontSize: 16 },
  perfect: { marginTop: 16, color: '#6ee7b7', letterSpacing: 3, fontSize: 14 },
  meta: { marginTop: 12, fontSize: 14 },
  primary: { paddingVertical: 14, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  primaryText: { letterSpacing: 2, fontSize: 16 },
});
