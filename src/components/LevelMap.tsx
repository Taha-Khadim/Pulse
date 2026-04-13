import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { mulberry32 } from '../game/mulberry';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Props = {
  totalLevels: number;
  currentLevel: number;
  completedLevels: number[];
  perfectLevels: number[];
  textColor: string;
  mutedColor: string;
  onPlay: (level: number) => void;
  bottomInset: number;
};

/* ------------------------------------------------------------------ */
/*  Layout constants                                                   */
/* ------------------------------------------------------------------ */

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const MAP_PAD_H = 24;
const MAP_W = SCREEN_W - MAP_PAD_H * 2;

const NODE_R = 22;
const BOSS_R = 28;
const ROW_H = 76;
const NODES_PER_ROW = 5;
const WAVE_AMP = 8;

/** Extra vertical buffer above/below viewport for rendering */
const OVERDRAW = 250;

/* ------------------------------------------------------------------ */
/*  Node positions (built once, deterministic)                         */
/* ------------------------------------------------------------------ */

type NodePos = {
  level: number;
  x: number;
  y: number;
  r: number;
  isBoss: boolean;
};

const buildNodes = (total: number): NodePos[] => {
  const rng = mulberry32(42);
  const nodes: NodePos[] = [];
  const usableW = MAP_W - NODE_R * 2;
  const spacing = usableW / (NODES_PER_ROW - 1);

  for (let i = 0; i < total; i++) {
    const row = Math.floor(i / NODES_PER_ROW);
    const col = i % NODES_PER_ROW;
    const goingRight = row % 2 === 0;
    const c = goingRight ? col : NODES_PER_ROW - 1 - col;

    const isBoss = (i + 1) % 10 === 0;
    const r = isBoss ? BOSS_R : NODE_R;

    const bx = NODE_R + c * spacing;
    const jx = (rng() - 0.5) * 14;
    const x = Math.max(r, Math.min(MAP_W - r, bx + jx));

    const by = r + 16 + row * ROW_H;
    const jy = Math.sin(i * 0.8) * WAVE_AMP + (rng() - 0.5) * 6;
    const y = by + jy;

    nodes.push({ level: i + 1, x, y, r, isBoss });
  }
  return nodes;
};

/* ------------------------------------------------------------------ */
/*  Curved connector                                                   */
/* ------------------------------------------------------------------ */

const connectorPath = (a: NodePos, b: NodePos) => {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const offX = (b.y - a.y) * 0.15;
  const offY = -(b.x - a.x) * 0.08;
  return `M${a.x},${a.y} Q${mx + offX},${my + offY} ${b.x},${b.y}`;
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const LevelMap = ({
  totalLevels,
  currentLevel,
  completedLevels,
  perfectLevels,
  textColor,
  mutedColor,
  onPlay,
  bottomInset,
}: Props) => {
  const scrollRef = useRef<ScrollView>(null);
  const [scrollY, setScrollY] = useState(0);

  const nodes = useMemo(() => buildNodes(totalLevels), [totalLevels]);
  const completedSet = useMemo(() => new Set(completedLevels), [completedLevels]);
  const perfectSet = useMemo(() => new Set(perfectLevels), [perfectLevels]);

  // Total height — loop instead of spread to avoid stack overflow
  const mapH = useMemo(() => {
    let maxY = 0;
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].y > maxY) maxY = nodes[i].y;
    }
    return maxY + BOSS_R + 32 + bottomInset;
  }, [nodes, bottomInset]);

  // Auto-scroll to current level on mount
  useEffect(() => {
    const idx = Math.max(0, currentLevel - 1);
    if (idx < nodes.length) {
      const target = Math.max(0, nodes[idx].y - 200);
      setTimeout(() => scrollRef.current?.scrollTo({ y: target, animated: true }), 350);
    }
  }, [currentLevel, nodes]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(e.nativeEvent.contentOffset.y);
  }, []);

  const handlePress = useCallback(
    (level: number) => {
      if (level <= currentLevel) onPlay(level);
    },
    [currentLevel, onPlay],
  );

  // Visible range
  const visTop = scrollY - OVERDRAW;
  const visBot = scrollY + SCREEN_H + OVERDRAW;

  // Only indices whose y falls in the visible band
  const visibleIndices = useMemo(() => {
    const result: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].y >= visTop && nodes[i].y <= visBot) {
        result.push(i);
      }
    }
    return result;
  }, [nodes, visTop, visBot]);

  // Connector indices: include connector FROM prev to each visible node
  const connectorIndices = useMemo(() => {
    const set = new Set<number>();
    for (const i of visibleIndices) {
      if (i > 0) set.add(i);
      if (i + 1 < nodes.length) set.add(i + 1);
    }
    return Array.from(set);
  }, [visibleIndices, nodes.length]);

  // SVG slice boundaries
  const svgTop = Math.max(0, visTop - 40);
  const svgBot = Math.min(mapH, visBot + 40);
  const svgH = Math.max(1, svgBot - svgTop);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={{ height: mapH }}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      {/* SVG layer: connectors + glow rings (only visible slice) */}
      <Svg
        width={MAP_W}
        height={svgH}
        viewBox={`0 ${svgTop} ${MAP_W} ${svgH}`}
        style={[styles.svg, { top: svgTop }]}
      >
        <Defs>
          <LinearGradient id="pathDone" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#34d399" stopOpacity="0.7" />
            <Stop offset="100%" stopColor="#34d399" stopOpacity="0.2" />
          </LinearGradient>
          <LinearGradient id="pathLocked" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={mutedColor} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={mutedColor} stopOpacity="0.08" />
          </LinearGradient>
        </Defs>

        {/* Connectors */}
        {connectorIndices.map((i) => {
          const n = nodes[i];
          const prev = nodes[i - 1];
          if (!prev) return null;
          const done = completedSet.has(prev.level) && n.level <= currentLevel;
          return (
            <Path
              key={`c-${i}`}
              d={connectorPath(prev, n)}
              stroke={done ? 'url(#pathDone)' : 'url(#pathLocked)'}
              strokeWidth={done ? 2.5 : 1.5}
              strokeLinecap="round"
              fill="none"
            />
          );
        })}

        {/* Milestone glow rings */}
        {visibleIndices
          .filter((i) => nodes[i].isBoss)
          .map((i) => {
            const n = nodes[i];
            return (
              <Circle
                key={`glow-${n.level}`}
                cx={n.x}
                cy={n.y}
                r={n.r + 6}
                fill="none"
                stroke={completedSet.has(n.level) ? '#34d399' : mutedColor}
                strokeWidth={1}
                strokeDasharray="4 6"
                opacity={0.35}
              />
            );
          })}
      </Svg>

      {/* Touchable nodes — only visible ones */}
      {visibleIndices.map((i) => {
        const n = nodes[i];
        const unlocked = n.level <= currentLevel;
        const done = completedSet.has(n.level);
        const perfect = perfectSet.has(n.level);
        const isCurrent = n.level === currentLevel;

        let bg = 'transparent';
        if (perfect) bg = 'rgba(52,211,153,0.18)';
        else if (done) bg = 'rgba(52,211,153,0.07)';

        let borderColor = mutedColor;
        if (isCurrent) borderColor = '#a78bfa';
        else if (done) borderColor = '#34d399';

        const size = n.r * 2;

        return (
          <Pressable
            key={n.level}
            disabled={!unlocked}
            onPress={() => handlePress(n.level)}
            style={[
              styles.nodeTouch,
              {
                left: MAP_PAD_H + n.x - n.r,
                top: n.y - n.r,
                width: size,
                height: size,
                borderRadius: n.r,
                opacity: unlocked ? 1 : 0.3,
              },
            ]}
          >
            <View
              style={[
                styles.nodeCircle,
                {
                  width: size,
                  height: size,
                  borderRadius: n.r,
                  borderColor,
                  borderWidth: isCurrent ? 2.5 : n.isBoss ? 2 : 1.5,
                  backgroundColor: bg,
                },
              ]}
            >
              {n.isBoss ? (
                <Text style={[styles.bossText, { color: done ? '#34d399' : textColor }]}>
                  {n.level}
                </Text>
              ) : (
                <Text
                  style={[
                    styles.nodeText,
                    { color: isCurrent ? '#a78bfa' : done ? '#34d399' : textColor },
                  ]}
                >
                  {n.level}
                </Text>
              )}
              {perfect && <Text style={styles.starBadge}>★</Text>}
              {isCurrent && <View style={styles.currentDot} />}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  svg: { position: 'absolute', left: MAP_PAD_H },
  nodeTouch: { position: 'absolute' },
  nodeCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeText: { fontSize: 11, fontWeight: '500' },
  bossText: { fontSize: 13, fontWeight: '700' },
  starBadge: {
    position: 'absolute',
    top: -6,
    right: -4,
    fontSize: 12,
    color: '#fbbf24',
  },
  currentDot: {
    position: 'absolute',
    bottom: -8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#a78bfa',
  },
});
