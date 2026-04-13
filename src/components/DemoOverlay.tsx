import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Props = {
  visible: boolean;
  onClose: () => void;
  textColor: string;
  mutedColor: string;
  bg: string;
};

type Arrow = { angle: number };

type FlyingArrow = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fromTop: boolean;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const W = 280;
const H = 360;
const CX = W / 2;
const CY = H * 0.42;
const R = 60;
const R_IN = R * 0.36;
const SHAFT = R * 0.48;
const LAUNCH_BOT = H * 0.86;
const LAUNCH_TOP = H * 0.04;
const FLY_SPEED = 280;
const SPIN_DEG_SEC = 40;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const normDeg = (d: number) => ((d % 360) + 360) % 360;

const arrowHeadPath = (x1: number, y1: number, x2: number, y2: number) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const head = Math.max(4, Math.min(10, len * 0.15));
  const ang = Math.atan2(dy, dx);
  const a1 = ang + (2.6 * Math.PI) / 3;
  const a2 = ang - (2.6 * Math.PI) / 3;
  return `M${x2},${y2} L${x2 + head * Math.cos(a1)},${y2 + head * Math.sin(a1)} L${x2 + head * Math.cos(a2)},${y2 + head * Math.sin(a2)} Z`;
};

const circDiff = (a: number, b: number) => {
  const d = Math.abs(normDeg(a) - normDeg(b));
  return Math.min(d, 360 - d);
};

/* ------------------------------------------------------------------ */
/*  Scripted demo sequence                                             */
/* ------------------------------------------------------------------ */

type Step =
  | { kind: 'shoot'; aimX: number }
  | { kind: 'destroy'; aimX: number }
  | { kind: 'pause'; ms: number }
  | { kind: 'label'; text: string };

const SCRIPT: Step[] = [
  { kind: 'label', text: 'Tap bottom to shoot an arrow ↓' },
  { kind: 'pause', ms: 800 },
  { kind: 'shoot', aimX: CX },
  { kind: 'pause', ms: 900 },
  { kind: 'shoot', aimX: CX - 30 },
  { kind: 'pause', ms: 900 },
  { kind: 'shoot', aimX: CX + 30 },
  { kind: 'pause', ms: 1000 },
  { kind: 'label', text: 'Tap top to destroy an arrow ↑' },
  { kind: 'pause', ms: 800 },
  { kind: 'destroy', aimX: CX },
  { kind: 'pause', ms: 1200 },
  { kind: 'destroy', aimX: CX - 20 },
  { kind: 'pause', ms: 1200 },
  { kind: 'label', text: 'Tap "Got it" to start playing!' },
  { kind: 'pause', ms: 2000 },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const DemoOverlay = ({ visible, onClose, textColor, mutedColor, bg }: Props) => {
  const fade = useRef(new Animated.Value(0)).current;
  const [rotDeg, setRotDeg] = useState(0);
  const [stuck, setStuck] = useState<Arrow[]>([]);
  const [flying, setFlying] = useState<FlyingArrow[]>([]);
  const [label, setLabel] = useState('');
  const loopRef = useRef(0);
  const rotRef = useRef(0);
  const stuckRef = useRef<Arrow[]>([]);
  const flyRef = useRef<FlyingArrow[]>([]);
  const arrowId = useRef(0);
  const running = useRef(false);

  /* ---- Fade in/out ---- */
  useEffect(() => {
    Animated.timing(fade, {
      toValue: visible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible, fade]);

  /* ---- Reset on open ---- */
  useEffect(() => {
    if (visible) {
      rotRef.current = 0;
      stuckRef.current = [];
      flyRef.current = [];
      setRotDeg(0);
      setStuck([]);
      setFlying([]);
      setLabel('');
    }
  }, [visible]);

  /* ---- Animation loop (rotation + flying arrows) ---- */
  useEffect(() => {
    if (!visible) return;
    running.current = true;
    let prev = 0;
    const tick = (ts: number) => {
      if (!running.current) return;
      if (!prev) prev = ts;
      const dt = Math.min(32, ts - prev) / 1000;
      prev = ts;

      // Spin
      rotRef.current = normDeg(rotRef.current + SPIN_DEG_SEC * dt);

      // Move flying arrows
      const nextFlying: FlyingArrow[] = [];
      let changed = false;
      for (const f of flyRef.current) {
        const nx = f.x + f.vx * FLY_SPEED * dt;
        const ny = f.y + f.vy * FLY_SPEED * dt;
        const dist = Math.hypot(nx - CX, ny - CY);
        if (dist <= R) {
          // Hit the circle
          const angle = normDeg(
            (Math.atan2(ny - CY, nx - CX) * 180) / Math.PI - rotRef.current
          );
          if (f.fromTop) {
            // Destroy: remove closest stuck arrow
            let best = -1;
            let bestD = Infinity;
            for (let i = 0; i < stuckRef.current.length; i++) {
              const d = circDiff(angle, stuckRef.current[i].angle);
              if (d < 20 && d < bestD) {
                bestD = d;
                best = i;
              }
            }
            if (best >= 0) stuckRef.current.splice(best, 1);
          } else {
            // Stick
            stuckRef.current.push({ angle });
          }
          changed = true;
        } else {
          nextFlying.push({ ...f, x: nx, y: ny });
        }
      }
      flyRef.current = nextFlying;
      if (changed) setStuck([...stuckRef.current]);
      setFlying([...flyRef.current]);
      setRotDeg(rotRef.current);
      loopRef.current = requestAnimationFrame(tick);
    };
    loopRef.current = requestAnimationFrame(tick);
    return () => {
      running.current = false;
      cancelAnimationFrame(loopRef.current);
    };
  }, [visible]);

  /* ---- Run scripted sequence ---- */
  const spawnArrow = useCallback((aimX: number, fromTop: boolean) => {
    const startY = fromTop ? LAUNCH_TOP : LAUNCH_BOT;
    const dx = CX - aimX;
    const dy = CY - startY;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;
    const id = ++arrowId.current;
    flyRef.current.push({
      id,
      x: aimX,
      y: startY,
      vx: dx / len,
      vy: dy / len,
      fromTop,
    });
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let idx = 0;

    const runNext = () => {
      if (cancelled || idx >= SCRIPT.length) {
        // Loop the demo
        idx = 0;
        stuckRef.current = [];
        setStuck([]);
        setLabel('');
        if (!cancelled) setTimeout(runNext, 600);
        return;
      }
      const step = SCRIPT[idx++];
      switch (step.kind) {
        case 'shoot':
          spawnArrow(step.aimX, false);
          setTimeout(runNext, 100);
          break;
        case 'destroy':
          spawnArrow(step.aimX, true);
          setTimeout(runNext, 100);
          break;
        case 'pause':
          setTimeout(runNext, step.ms);
          break;
        case 'label':
          setLabel(step.text);
          setTimeout(runNext, 100);
          break;
      }
    };
    setTimeout(runNext, 400);
    return () => {
      cancelled = true;
    };
  }, [visible, spawnArrow]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <View style={[styles.card, { backgroundColor: bg }]}>
          <Text style={[styles.title, { color: textColor }]}>How to Play</Text>

          <View style={styles.svgWrap}>
            <Svg width={W} height={H}>
              <Defs>
                <LinearGradient id="demoRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#a78bfa" stopOpacity="1" />
                  <Stop offset="50%" stopColor="#e8eef8" stopOpacity="0.45" />
                  <Stop offset="100%" stopColor="#a78bfa" stopOpacity="1" />
                </LinearGradient>
              </Defs>

              {/* Rotating circle */}
              <G rotation={rotDeg} originX={CX} originY={CY}>
                <Circle cx={CX} cy={CY} r={R} stroke="url(#demoRingGrad)" strokeWidth={4} fill="none" />
              </G>

              {/* Stuck arrows */}
              <G rotation={rotDeg} originX={CX} originY={CY}>
                {stuck.map((a, i) => {
                  const rad = (a.angle * Math.PI) / 180;
                  const x1 = CX + R_IN * Math.cos(rad);
                  const y1 = CY + R_IN * Math.sin(rad);
                  const x2 = CX + R * Math.cos(rad);
                  const y2 = CY + R * Math.sin(rad);
                  return (
                    <G key={`s-${i}`}>
                      <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#7dd3fc" strokeWidth={2} strokeLinecap="round" />
                      <Path d={arrowHeadPath(x1, y1, x2, y2)} fill="#7dd3fc" />
                    </G>
                  );
                })}
              </G>

              {/* Flying arrows */}
              {flying.map((f) => {
                const tx = f.x - f.vx * SHAFT;
                const ty = f.y - f.vy * SHAFT;
                const color = f.fromTop ? '#ef4444' : '#a78bfa';
                return (
                  <G key={`f-${f.id}`}>
                    <Line x1={tx} y1={ty} x2={f.x} y2={f.y} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
                    <Path d={arrowHeadPath(tx, ty, f.x, f.y)} fill={color} />
                  </G>
                );
              })}

              {/* Launch indicators */}
              <Line
                x1={CX - 30}
                y1={LAUNCH_BOT}
                x2={CX + 30}
                y2={LAUNCH_BOT}
                stroke={mutedColor}
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.5}
              />
              <Line
                x1={CX - 30}
                y1={LAUNCH_TOP}
                x2={CX + 30}
                y2={LAUNCH_TOP}
                stroke="#ef4444"
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.5}
              />
            </Svg>
          </View>

          {/* Animated label */}
          <Text style={[styles.label, { color: mutedColor }]}>{label}</Text>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#a78bfa' }]} />
              <Text style={[styles.legendText, { color: mutedColor }]}>Bottom tap — place arrow</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
              <Text style={[styles.legendText, { color: mutedColor }]}>Top tap — destroy arrow</Text>
            </View>
          </View>

          <Pressable onPress={onClose} style={[styles.btn, { borderColor: textColor }]}>
            <Text style={[styles.btnText, { color: textColor }]}>Got it</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '300', letterSpacing: 4, marginBottom: 8 },
  svgWrap: { alignItems: 'center' },
  label: { fontSize: 14, textAlign: 'center', marginTop: 4, minHeight: 20 },
  legend: { marginTop: 14, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13 },
  btn: {
    marginTop: 20,
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  btnText: { fontSize: 15, letterSpacing: 3 },
});
