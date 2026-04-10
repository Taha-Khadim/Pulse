import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import type { RootStackParamList } from '../navigation/types';
import { setOnboardingDone } from '../storage/progress';
import { useApp } from '../context/AppContext';
import { themeSurfaces } from '../theme/palettes';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

const slides = [
  'A quiet target spins at the center.',
  'Tap the lower half to send an arrow inward.',
  'Avoid touching arrows already on the ring. Finish the quota to advance.',
];

export const OnboardingScreen = ({ navigation }: { navigation: Nav }) => {
  const [i, setI] = useState(0);
  const { progress } = useApp();
  const t = themeSurfaces[progress.settings.theme];

  const next = async () => {
    if (i < slides.length - 1) setI(i + 1);
    else {
      await setOnboardingDone();
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    }
  };

  return (
    <LinearGradient colors={[t.bg, t.card]} style={styles.root}>
      <Text style={[styles.title, { color: t.text }]}>Welcome</Text>
      <Text style={[styles.body, { color: t.muted }]}>{slides[i]}</Text>
      <View style={styles.dots}>
        {slides.map((_, k) => (
          <View key={k} style={[styles.dot, { backgroundColor: k === i ? t.text : t.muted }]} />
        ))}
      </View>
      <Pressable onPress={next} style={[styles.btn, { borderColor: t.text }]}>
        <Text style={[styles.btnText, { color: t.text }]}>{i < slides.length - 1 ? 'Next' : 'Begin'}</Text>
      </Pressable>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, padding: 28, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '300', marginBottom: 24 },
  body: { fontSize: 17, lineHeight: 26 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, opacity: 0.5 },
  btn: { marginTop: 48, paddingVertical: 14, borderWidth: 1, borderRadius: 999, alignItems: 'center' },
  btnText: { fontSize: 16, letterSpacing: 2 },
});
