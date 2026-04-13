import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { GameCanvas, type GameCanvasHandle } from '../components/GameCanvas';
import { PauseOverlay } from '../components/PauseOverlay';
import { generateLevel } from '../game/levelGen';
import type { LevelConfig } from '../types';
import type { RootStackParamList } from '../navigation/types';
import { useApp } from '../context/AppContext';
import { loadProgress } from '../storage/progress';
import { themeSurfaces } from '../theme/palettes';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Game'>;
type Rt = RouteProp<RootStackParamList, 'Game'>;

export const GameScreen = ({ navigation, route }: { navigation: Nav; route: Rt }) => {
  const insets = useSafeAreaInsets();
  const { levelId, zenMode } = route.params;
  const { progress, replaceProgress } = useApp();
  const t = themeSurfaces[progress.settings.theme];

  const config = useMemo<LevelConfig>(() => {
    const base = generateLevel(zenMode ? Math.max(1, levelId % 400) : levelId);
    if (zenMode) {
      return {
        ...base,
        levelId: 0,
        arrowsToShoot: 10_000,
        rotationSpeed: base.rotationSpeed * 0.55,
        existingAngles: base.existingAngles.slice(0, Math.min(3, base.existingAngles.length)),
        bidirectional: false,
      };
    }
    return base;
  }, [levelId, zenMode]);

  const canvasRef = useRef<GameCanvasHandle>(null);
  const [layout, setLayout] = useState({ w: Dimensions.get('window').width, h: 400 });
  const [paused, setPaused] = useState(false);
  const [slow, setSlow] = useState(false);
  const [loseOpen, setLoseOpen] = useState(false);
  const [fails, setFails] = useState(0);
  const [remaining, setRemaining] = useState(config.arrowsToShoot);
  const [zenSticks, setZenSticks] = useState(0);
  const [sessionRetries, setSessionRetries] = useState(0);
  const [sessionShots, setSessionShots] = useState(0);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setFails(0);
    setRemaining(config.arrowsToShoot);
    setZenSticks(0);
    setSessionRetries(0);
    setSessionShots(0);
    setLoseOpen(false);
    setSlow(false);
  }, [levelId, zenMode, config.arrowsToShoot]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ w: width, h: height });
  }, []);

  const runShake = () => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const onWin = useCallback(async () => {
    const latest = await loadProgress();
    const perfect = sessionRetries === 0;
    const completed = [...new Set([...latest.completedLevels, levelId])];
    const perfectLevels = perfect
      ? [...new Set([...latest.perfectLevels, levelId])]
      : latest.perfectLevels;
    const next = {
      ...latest,
      completedLevels: completed,
      perfectLevels,
      currentLevel: Math.max(latest.currentLevel, levelId + 1),
      lastPlayedIso: new Date().toISOString(),
    };
    await replaceProgress(next);
    navigation.replace('LevelComplete', {
      levelId,
      perfect,
      retries: sessionRetries,
      arrowsShot: sessionShots,
    });
  }, [navigation, levelId, replaceProgress, sessionRetries, sessionShots]);

  const onLose = useCallback(() => {
    runShake();
    setFails((f) => f + 1);
    setLoseOpen(true);
    setSessionRetries((r) => r + 1);
  }, []);

  const onStick = useCallback(() => {
    if (zenMode) setZenSticks((z) => z + 1);
    else setRemaining((r) => Math.max(0, r - 1));
    setSessionShots((s) => s + 1);
  }, [zenMode]);

  return (
    <LinearGradient colors={[t.bg, t.card]} style={[styles.flex, { paddingTop: insets.top }]}>
        <View style={styles.hud}>
          <Text style={[styles.hudText, { color: t.muted }]}>
            {zenMode ? `Zen · ${zenSticks} placed` : `Lv ${levelId}`} · {!zenMode ? `${remaining} left` : ''}
          </Text>
          <View style={styles.hudRight}>
            <Pressable onPress={() => setPaused(true)} hitSlop={12}>
              <Text style={[styles.pauseBtn, { color: t.text }]}>‖</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={styles.gameTouch}
          onPress={(e) => {
            const nx = layout.w > 0 ? e.nativeEvent.locationX / layout.w : 0.5;
            const ny = layout.h > 0 ? e.nativeEvent.locationY / layout.h : 0.5;
            if (ny < 0.35) {
              canvasRef.current?.shootDestroy(nx);
            } else {
              canvasRef.current?.shoot(nx);
            }
          }}
        >
          <Animated.View style={{ flex: 1, transform: [{ translateX: shake }] }} onLayout={onLayout}>
            <GameCanvas
              ref={canvasRef}
              width={layout.w}
              height={layout.h}
              config={config}
              zenMode={!!zenMode}
              slowMode={slow}
              paused={paused || loseOpen}
              haptics={progress.settings.haptics}
              sfxMuted={progress.settings.sfxVolume <= 0}
              onWin={onWin}
              onLose={onLose}
              onStick={onStick}
            />
          </Animated.View>
        </Pressable>

        <View style={styles.shootHint}>
          <Text style={[styles.hint, { color: t.muted }]}>tap bottom — shoot · tap top — destroy</Text>
        </View>

        <PauseOverlay
          visible={paused}
          onResume={() => setPaused(false)}
          onHome={() => {
            setPaused(false);
            navigation.navigate('Home');
          }}
          textColor={t.text}
          mutedColor={t.muted}
        />

        <Modal visible={loseOpen} transparent animationType="fade">
          <View style={styles.loseWrap}>
            <Text style={[styles.loseTitle, { color: '#fecaca' }]}>Touching</Text>
            <Text style={[styles.loseSub, { color: '#e2e8f0' }]}>An arrow grazed another.</Text>
            {fails >= 3 && config.slowModeEligible ? (
              <Pressable
                onPress={() => {
                  setSlow(true);
                  setLoseOpen(false);
                  canvasRef.current?.reset();
                  if (!zenMode) setRemaining(config.arrowsToShoot);
                  else setZenSticks(0);
                }}
                style={styles.slowBtn}
              >
                <Text style={styles.slowText}>Slow mode (−50% spin)</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                setLoseOpen(false);
                canvasRef.current?.reset();
                if (!zenMode) setRemaining(config.arrowsToShoot);
                else setZenSticks(0);
              }}
              style={[styles.retry, { borderColor: '#e2e8f0' }]}
            >
              <Text style={{ color: '#f8fafc', letterSpacing: 3 }}>Retry</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Home')} style={{ marginTop: 18 }}>
              <Text style={{ color: '#94a3b8' }}>Home</Text>
            </Pressable>
          </View>
        </Modal>
      </LinearGradient>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  hudText: { fontSize: 14, letterSpacing: 1 },
  hudRight: { flexDirection: 'row', gap: 12 },
  pauseBtn: { fontSize: 22, fontWeight: '600' },
  launcher: { paddingBottom: 20, alignItems: 'center' },
  gameTouch: { flex: 1 },
  shootHint: { paddingBottom: 20, paddingTop: 6, alignItems: 'center' },
  hint: { fontSize: 12, letterSpacing: 2 },
  loseWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loseTitle: { fontSize: 28, fontWeight: '300' },
  loseSub: { marginTop: 8, marginBottom: 28, fontSize: 15, textAlign: 'center' },
  slowBtn: { marginBottom: 16, paddingVertical: 10, paddingHorizontal: 16 },
  slowText: { color: '#a5b4fc', fontSize: 14 },
  retry: { paddingHorizontal: 36, paddingVertical: 12, borderRadius: 999, borderWidth: 1 },
});
