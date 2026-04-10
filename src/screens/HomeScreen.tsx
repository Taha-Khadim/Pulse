import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import type { RootStackParamList } from '../navigation/types';
import { useApp } from '../context/AppContext';
import { loadProgress, saveProgress } from '../storage/progress';
import { applyDailyStreak } from '../utils/streak';
import { themeSurfaces } from '../theme/palettes';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const LEVELS = 1000;

export const HomeScreen = ({ navigation }: { navigation: Nav }) => {
  const insets = useSafeAreaInsets();
  const { progress, refresh } = useApp();
  const t = themeSurfaces[progress.settings.theme];

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        await refresh();
        const latest = await loadProgress();
        const bumped = applyDailyStreak(latest);
        if (!cancelled && bumped !== latest) {
          await saveProgress(bumped);
          await refresh();
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [refresh])
  );

  const data = useMemo(() => Array.from({ length: LEVELS }, (_, n) => n + 1), []);

  const playLevel = Math.min(Math.max(progress.currentLevel, 1), LEVELS);

  const perfectPct = useMemo(() => {
    const c = progress.completedLevels.length;
    if (!c) return 0;
    return Math.round((progress.perfectLevels.length / c) * 100);
  }, [progress.completedLevels.length, progress.perfectLevels.length]);

  const renderLevel = useCallback(
    ({ item }: { item: number }) => {
      const unlocked = item <= progress.currentLevel;
      const done = progress.completedLevels.includes(item);
      const perfect = progress.perfectLevels.includes(item);
      return (
        <Pressable
          disabled={!unlocked}
          onPress={() => navigation.navigate('Game', { levelId: item })}
          style={[styles.node, { opacity: unlocked ? 1 : 0.35 }]}
        >
          <View
            style={[
              styles.circle,
              {
                borderColor: done ? '#34d399' : t.text,
                backgroundColor: perfect ? 'rgba(52,211,153,0.15)' : 'transparent',
              },
            ]}
          >
            <Text style={[styles.nodeText, { color: t.text }]}>{item}</Text>
          </View>
        </Pressable>
      );
    },
    [navigation, progress.completedLevels, progress.currentLevel, progress.perfectLevels, t.text]
  );

  return (
    <LinearGradient colors={[t.bg, t.card]} style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.brand, { color: t.text }]}>Pulse</Text>
          <Text style={[styles.streak, { color: t.muted }]}>streak {progress.dailyStreak}</Text>
        </View>
        <View style={styles.headerIcons}>
          <Pressable onPress={() => navigation.navigate('Profile')} hitSlop={12}>
            <Text style={[styles.iconBtn, { color: t.muted }]}>◎</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={12}>
            <Text style={[styles.iconBtn, { color: t.muted }]}>☰</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.playCard, { borderColor: t.muted }]}>
        <Text style={[styles.playLabel, { color: t.muted }]}>Continue</Text>
        <Text style={[styles.playLevel, { color: t.text }]}>Level {playLevel}</Text>
        <Pressable
          onPress={() => navigation.navigate('Game', { levelId: playLevel })}
          style={[styles.playBtn, { borderColor: t.text }]}
        >
          <Text style={[styles.playBtnText, { color: t.text }]}>PLAY</Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <Text style={[styles.stat, { color: t.muted }]}>
          cleared {progress.completedLevels.length} · perfect {perfectPct}%
        </Text>
      </View>

      <Pressable
        onPress={() => navigation.navigate('Game', { levelId: 1, zenMode: true })}
        style={[styles.zen, { borderColor: t.muted }]}
      >
        <Text style={[styles.zenText, { color: t.muted }]}>Zen practice</Text>
      </Pressable>

      <Text style={[styles.mapTitle, { color: t.muted }]}>Path</Text>
      <FlatList
        data={data}
        keyExtractor={(x) => String(x)}
        renderItem={renderLevel}
        numColumns={5}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, gap: 10 }}
        columnWrapperStyle={{ gap: 10 }}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { fontSize: 28, fontWeight: '200', letterSpacing: 6 },
  streak: { marginTop: 4, fontSize: 13 },
  headerIcons: { flexDirection: 'row', gap: 16 },
  iconBtn: { fontSize: 22 },
  playCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  playLabel: { fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' },
  playLevel: { fontSize: 32, fontWeight: '300', marginVertical: 12 },
  playBtn: { paddingHorizontal: 36, paddingVertical: 12, borderRadius: 999, borderWidth: 1 },
  playBtnText: { letterSpacing: 4, fontSize: 15 },
  statsRow: { marginTop: 12, alignItems: 'center' },
  stat: { fontSize: 13 },
  zen: { marginTop: 12, paddingVertical: 10, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  zenText: { fontSize: 14, letterSpacing: 2 },
  mapTitle: { marginTop: 20, marginBottom: 8, fontSize: 12, letterSpacing: 2 },
  node: { flex: 1, alignItems: 'center' },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeText: { fontSize: 12 },
});
