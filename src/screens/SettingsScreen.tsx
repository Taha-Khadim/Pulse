import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Slider from '@react-native-community/slider';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import type { RootStackParamList } from '../navigation/types';
import type { GameSettings, HapticStrength, ThemeId } from '../types';
import { useApp } from '../context/AppContext';
import { exportProgressToFile, importProgressFromUri, loadProgress, saveProgress } from '../storage/progress';
import { themeSurfaces } from '../theme/palettes';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

const hapticOptions: HapticStrength[] = ['off', 'light', 'medium', 'strong'];
const themes: ThemeId[] = ['dark', 'light', 'amoled'];

export const SettingsScreen = ({ navigation }: { navigation: Nav }) => {
  const insets = useSafeAreaInsets();
  const { progress, resetProgress, refresh } = useApp();
  const [s, setS] = useState(progress.settings);
  const t = themeSurfaces[s.theme];

  useEffect(() => {
    setS(progress.settings);
  }, [progress.settings.bgmVolume, progress.settings.sfxVolume, progress.settings.haptics, progress.settings.theme]);

  const persist = async (next: GameSettings) => {
    const latest = await loadProgress();
    await saveProgress({ ...latest, settings: next });
    setS(next);
    await refresh();
  };

  const restoreFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
    if (res.canceled) return;
    const uri = res.assets[0]?.uri;
    if (!uri) return;
    await importProgressFromUri(uri);
    await refresh();
    navigation.navigate('Home');
  };

  return (
    <LinearGradient colors={[t.bg, t.card]} style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: t.muted, fontSize: 16 }}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: t.text }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <Text style={[styles.label, { color: t.muted }]}>Ambient (BGM)</Text>
        <Slider
          minimumValue={0}
          maximumValue={1}
          value={s.bgmVolume}
          onSlidingComplete={(v) => void persist({ ...s, bgmVolume: v })}
          minimumTrackTintColor={t.text}
          maximumTrackTintColor={t.muted}
          thumbTintColor={t.text}
        />

        <Text style={[styles.label, { color: t.muted, marginTop: 16 }]}>SFX</Text>
        <Slider
          minimumValue={0}
          maximumValue={1}
          value={s.sfxVolume}
          onSlidingComplete={(v) => void persist({ ...s, sfxVolume: v })}
          minimumTrackTintColor={t.text}
          maximumTrackTintColor={t.muted}
          thumbTintColor={t.text}
        />

        <Text style={[styles.label, { color: t.muted, marginTop: 20 }]}>Haptics</Text>
        <View style={styles.row}>
          {hapticOptions.map((h) => (
            <Pressable
              key={h}
              onPress={() => void persist({ ...s, haptics: h })}
              style={[styles.chip, s.haptics === h && styles.chipOn, { borderColor: t.muted }]}
            >
              <Text style={{ color: t.text, fontSize: 12 }}>{h}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: t.muted, marginTop: 20 }]}>Theme</Text>
        <View style={styles.row}>
          {themes.map((th) => (
            <Pressable
              key={th}
              onPress={() => void persist({ ...s, theme: th })}
              style={[styles.chip, s.theme === th && styles.chipOn, { borderColor: t.muted }]}
            >
              <Text style={{ color: t.text, fontSize: 12 }}>{th}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: t.muted, marginTop: 28 }]}>Data</Text>
        <Pressable
          onPress={() => void exportProgressToFile(progress)}
          style={[styles.btn, { borderColor: t.text }]}
        >
          <Text style={{ color: t.text }}>Export backup (JSON)</Text>
        </Pressable>
        <Pressable onPress={restoreFile} style={[styles.btn, { borderColor: t.muted, marginTop: 10 }]}>
          <Text style={{ color: t.muted }}>Restore from file</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Alert.alert('Reset all progress?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Reset',
                style: 'destructive',
                onPress: () => {
                  void resetProgress();
                  navigation.navigate('Home');
                },
              },
            ]);
          }}
          style={{ marginTop: 28 }}
        >
          <Text style={{ color: '#f87171' }}>Reset progress</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '300', marginTop: 8 },
  label: { fontSize: 12, letterSpacing: 2, marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  chipOn: { backgroundColor: 'rgba(148,163,184,0.15)' },
  btn: { marginTop: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
});
