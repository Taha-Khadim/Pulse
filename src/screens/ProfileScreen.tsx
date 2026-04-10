import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import type { RootStackParamList } from '../navigation/types';
import { useApp } from '../context/AppContext';
import { themeSurfaces } from '../theme/palettes';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

export const ProfileScreen = ({ navigation }: { navigation: Nav }) => {
  const insets = useSafeAreaInsets();
  const { progress } = useApp();
  const t = themeSurfaces[progress.settings.theme];

  const perfectPct = useMemo(() => {
    const c = progress.completedLevels.length;
    if (!c) return 0;
    return Math.round((progress.perfectLevels.length / c) * 100);
  }, [progress.completedLevels.length, progress.perfectLevels.length]);

  const minutes = Math.floor(progress.totalPlayTimeSec / 60);

  return (
    <LinearGradient colors={[t.bg, t.card]} style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={{ color: t.muted }}>← Back</Text>
      </Pressable>
      <Text style={[styles.title, { color: t.text }]}>Profile</Text>
      <View style={[styles.card, { borderColor: t.muted }]}>
        <Row label="Highest unlocked" value={String(progress.currentLevel)} t={t} />
        <Row label="Levels cleared" value={String(progress.completedLevels.length)} t={t} />
        <Row label="Perfect rate" value={`${perfectPct}%`} t={t} />
        <Row label="Play time" value={`${minutes} min`} t={t} />
        <Row label="Daily streak" value={String(progress.dailyStreak)} t={t} />
      </View>
      <Text style={[styles.note, { color: t.muted }]}>
        Achievements and deeper analytics can layer on this local profile store.
      </Text>
    </LinearGradient>
  );
};

function Row({ label, value, t }: { label: string; value: string; t: { muted: string; text: string } }) {
  return (
    <View style={styles.row}>
      <Text style={{ color: t.muted }}>{label}</Text>
      <Text style={{ color: t.text, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '300', marginVertical: 16 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  note: { marginTop: 24, fontSize: 13, lineHeight: 20 },
});
