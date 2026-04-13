import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
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
import { DemoOverlay } from '../components/DemoOverlay';
import { LevelMap } from '../components/LevelMap';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const LEVELS = 1000;

export const HomeScreen = ({ navigation }: { navigation: Nav }) => {
  const insets = useSafeAreaInsets();
  const { progress, refresh } = useApp();
  const t = themeSurfaces[progress.settings.theme];
  const [demoOpen, setDemoOpen] = useState(false);

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

  const playLevel = Math.min(Math.max(progress.currentLevel, 1), LEVELS);

  const perfectPct = useMemo(() => {
    const c = progress.completedLevels.length;
    if (!c) return 0;
    return Math.round((progress.perfectLevels.length / c) * 100);
  }, [progress.completedLevels.length, progress.perfectLevels.length]);

  const onMapPlay = useCallback(
    (level: number) => navigation.navigate('Game', { levelId: level }),
    [navigation]
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

      <Pressable
        onPress={() => setDemoOpen(true)}
        style={[styles.demo, { borderColor: t.muted }]}
      >
        <Text style={[styles.demoText, { color: t.muted }]}>▶  Demo</Text>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate('Game', { levelId: 1, zenMode: true })}
        style={[styles.zen, { borderColor: t.muted }]}
      >
        <Text style={[styles.zenText, { color: t.muted }]}>Zen practice</Text>
      </Pressable>

      <DemoOverlay
        visible={demoOpen}
        onClose={() => setDemoOpen(false)}
        textColor={t.text}
        mutedColor={t.muted}
        bg={t.card}
      />

      <View style={styles.statsRow}>
        <Text style={[styles.stat, { color: t.muted }]}>
          cleared {progress.completedLevels.length} · perfect {perfectPct}%
        </Text>
      </View>

      <Text style={[styles.mapTitle, { color: t.muted }]}>Path</Text>
      <LevelMap
        totalLevels={LEVELS}
        currentLevel={progress.currentLevel}
        completedLevels={progress.completedLevels}
        perfectLevels={progress.perfectLevels}
        textColor={t.text}
        mutedColor={t.muted}
        onPlay={onMapPlay}
        bottomInset={insets.bottom + 100}
      />

      <View style={[styles.playCard, { borderColor: t.muted, backgroundColor: t.card, paddingBottom: insets.bottom + 14 }]}>
        <Text style={[styles.playLabel, { color: t.muted }]}>Continue</Text>
        <Text style={[styles.playLevel, { color: t.text }]}>Level {playLevel}</Text>
        <Pressable
          onPress={() => navigation.navigate('Game', { levelId: playLevel })}
          style={[styles.playBtn, { borderColor: t.text }]}
        >
          <Text style={[styles.playBtnText, { color: t.text }]}>PLAY</Text>
        </Pressable>
      </View>
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    elevation: 10,
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    alignItems: 'center',
  },
  playLabel: { fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' },
  playLevel: { fontSize: 32, fontWeight: '300', marginVertical: 12 },
  playBtn: { paddingHorizontal: 36, paddingVertical: 12, borderRadius: 999, borderWidth: 1 },
  playBtnText: { letterSpacing: 4, fontSize: 15 },
  statsRow: { marginTop: 12, alignItems: 'center' },
  stat: { fontSize: 13 },
  demo: { marginTop: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  demoText: { fontSize: 14, letterSpacing: 2 },
  zen: { marginTop: 10, paddingVertical: 10, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  zenText: { fontSize: 14, letterSpacing: 2 },
  mapTitle: { marginTop: 20, marginBottom: 8, fontSize: 12, letterSpacing: 2 },
});
