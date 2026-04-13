import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Polygon, Path, Stop } from 'react-native-svg';
import type { LevelConfig } from '../types';
import { checkAngularCollision, normalizeDeg } from '../game/collision';
import { COLLISION_SEPARATION_DEG, ROTATION_SPEED_SCALE } from '../game/constants';
import { getColorPalette } from '../theme/palettes';
import { hitHaptic, missHaptic } from '../utils/haptics';
import type { HapticStrength } from '../types';

type Props = {
  width: number;
  height: number;
  config: LevelConfig;
  zenMode: boolean;
  slowMode: boolean;
  paused: boolean;
  haptics: HapticStrength;
  sfxMuted: boolean;
  onWin: () => void;
  onLose: () => void;
  onStick: () => void;
};

export type GameCanvasHandle = {
  shoot: (aimNormX?: number) => void;
  shootDestroy: (aimNormX?: number) => void;
  reset: () => void;
};

const deg = (r: number) => (r * 180) / Math.PI;

type SegmentHit = { x: number; y: number; t: number };

/**
 * First intersection of segment P(t)=P0+t(P1-P0), t∈[0,1], with circle |P-C|=R.
 * Uses a·t² + B·t + c = 0 with B = 2(f·v) — the common bug is omitting the factor 2.
 */
const segmentCircleHit = (
  cx: number,
  cy: number,
  R: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): SegmentHit | null => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const a = dx * dx + dy * dy;
  if (a < 1e-12) return null;
  const fx = x0 - cx;
  const fy = y0 - cy;
  const B = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - R * R;
  const disc = B * B - 4 * a * c;
  if (disc < 0) return null;
  const sD = Math.sqrt(Math.max(0, disc));
  const t0 = (-B - sD) / (2 * a);
  const t1 = (-B + sD) / (2 * a);
  const inSeg = (t: number) => t >= -1e-4 && t <= 1 + 1e-4;
  const candidates = [t0, t1].filter(inSeg).map((t) => Math.max(0, Math.min(1, t)));
  if (candidates.length === 0) return null;
  const t = Math.min(...candidates);
  const x = x0 + t * dx;
  const y = y0 + t * dy;
  const ux = x - cx;
  const uy = y - cy;
  const hl = Math.hypot(ux, uy);
  if (hl < 1e-8) return null;
  return {
    t,
    x: cx + (R * ux) / hl,
    y: cy + (R * uy) / hl,
  };
};

/**
 * World rim direction (unit from center toward hit) expressed as body-local angle (deg)
 * for a group that rotates clockwise by `rotDeg` (react-native-svg `rotation` convention).
 * Same as storing atan2 after applying inverse rotation to the world unit vector.
 */
const worldRimToLocalBodyDeg = (hitX: number, hitY: number, cx: number, cy: number, rotDeg: number) => {
  const dwx = hitX - cx;
  const dwy = hitY - cy;
  const len = Math.hypot(dwx, dwy);
  if (len < 1e-6) return 0;
  const wx = dwx / len;
  const wy = dwy / len;
  const ph = (rotDeg * Math.PI) / 180;
  // Inverse rotation: subtract rotDeg to go from world → local body frame
  const lx = wx * Math.cos(ph) + wy * Math.sin(ph);
  const ly = -wx * Math.sin(ph) + wy * Math.cos(ph);
  return normalizeDeg((Math.atan2(ly, lx) * 180) / Math.PI);
};

const polygonPoints = (cx: number, cy: number, R: number, sides: number) => {
  if (sides < 3) return '';
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / sides;
    pts.push(`${cx + R * Math.cos(a)},${cy + R * Math.sin(a)}`);
  }
  return pts.join(' ');
};

const arrowHeadPath = (x1: number, y1: number, x2: number, y2: number) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const head = Math.max(4, Math.min(12, len * 0.15)); // Scale head 15% of arrow length
  const ang = Math.atan2(dy, dx);
  const a1 = ang + (2.6 * Math.PI) / 3;
  const a2 = ang - (2.6 * Math.PI) / 3;
  const x3 = x2 + head * Math.cos(a1);
  const y3 = y2 + head * Math.sin(a1);
  const x4 = x2 + head * Math.cos(a2);
  const y4 = y2 + head * Math.sin(a2);
  return `M${x2},${y2} L${x3},${y3} L${x4},${y4} Z`;
};

export const GameCanvas = forwardRef<GameCanvasHandle, Props>(function GameCanvas(
  {
    width,
    height,
    config,
    zenMode,
    slowMode,
    paused,
    haptics,
    sfxMuted: _sfxMuted,
    onWin,
    onLose,
    onStick,
  },
  ref
) {
  const palette = useMemo(() => getColorPalette(config.colorSchemeIndex), [config.colorSchemeIndex]);
  const cx = width / 2;
  const cy = height * 0.42;
  const R = Math.min(width, height) * 0.24;
  const innerR = R * 0.52;
  const launchY = height * 0.86;
  const aimMargin = Math.max(24, width * 0.06);
  const speedMul = slowMode ? 0.5 : 1;
  const spinDegPerSec = config.rotationSpeed * ROTATION_SPEED_SCALE * speedMul;
  /** Same radii used for stuck arrows and collision rim (tip sits on playable circle). */
  const R_OUT = R;
  const R_IN = R * 0.36;

  const launchTopY = height * 0.02;

  const state = useRef({
    rotationDeg: 0,
    innerRotationDeg: 0,
    direction: Math.sign(spinDegPerSec) || 1,
    flipTimer: 0,
    stuckLocal: [...config.existingAngles],
    playerLanded: 0,
    projX: cx,
    projY: launchY,
    flying: false,
    lastTs: 0,
    ended: false,
    vx: 0,
    vy: 0,
    // destroy arrow state
    dProjX: cx,
    dProjY: launchTopY,
    dFlying: false,
    dVx: 0,
    dVy: 0,
  });

  const onWinRef = useRef(onWin);
  const onLoseRef = useRef(onLose);
  const onStickRef = useRef(onStick);
  useEffect(() => {
    onWinRef.current = onWin;
    onLoseRef.current = onLose;
    onStickRef.current = onStick;
  }, [onWin, onLose, onStick]);

  const [, force] = React.useReducer((x) => x + 1, 0);

  const resetRound = useCallback(() => {
    state.current = {
      rotationDeg: 0,
      innerRotationDeg: 0,
      direction: Math.sign(spinDegPerSec) || 1,
      flipTimer: 0,
      stuckLocal: [...config.existingAngles],
      playerLanded: 0,
      projX: cx,
      projY: launchY,
      flying: false,
      lastTs: 0,
      ended: false,
      vx: 0,
      vy: 0,
      dProjX: cx,
      dProjY: launchTopY,
      dFlying: false,
      dVx: 0,
      dVy: 0,
    };
    force();
  }, [config.existingAngles, spinDegPerSec, cx, launchY, launchTopY]);

  useEffect(() => {
    resetRound();
  }, [config.levelId, resetRound]);

  const shoot = useCallback(
    (aimNormX = 0.5) => {
      if (paused) return;
      const s = state.current;
      if (s.ended) return;
      if (s.flying) return;
      if (s.playerLanded >= config.arrowsToShoot) return;
      const t = Math.max(0, Math.min(1, aimNormX));
      const sx = aimMargin + t * (width - 2 * aimMargin);
      const dx = cx - sx;
      const dy = cy - launchY;
      const len = Math.hypot(dx, dy);
      if (len < 1e-4) return;
      s.projX = sx;
      s.projY = launchY;
      s.vx = dx / len;
      s.vy = dy / len;
      s.flying = true;
      force();
    },
    [paused, config.arrowsToShoot, aimMargin, width, cx, cy, launchY]
  );

  const shootDestroy = useCallback(
    (aimNormX = 0.5) => {
      if (paused) return;
      const s = state.current;
      if (s.ended) return;
      if (s.dFlying) return;
      const t = Math.max(0, Math.min(1, aimNormX));
      const sx = aimMargin + t * (width - 2 * aimMargin);
      const dx = cx - sx;
      const dy = cy - launchTopY;
      const len = Math.hypot(dx, dy);
      if (len < 1e-4) return;
      s.dProjX = sx;
      s.dProjY = launchTopY;
      s.dVx = dx / len;
      s.dVy = dy / len;
      s.dFlying = true;
      force();
    },
    [paused, aimMargin, width, cx, cy, launchTopY]
  );

  useImperativeHandle(ref, () => ({ shoot, shootDestroy, reset: resetRound }), [shoot, shootDestroy, resetRound]);

  useEffect(() => {
    if (paused) return;
    let id = 0;
    const flySpeed = Math.min(width, height) * 1.12;
    const loop = (ts: number) => {
      const s = state.current;
      if (s.ended) return;
      if (!s.lastTs) s.lastTs = ts;
      const dt = Math.min(32, ts - s.lastTs) / 1000;
      s.lastTs = ts;

      const rotAtFrameStart = s.rotationDeg;
      const spd = Math.abs(spinDegPerSec) * s.direction;
      s.rotationDeg = normalizeDeg(rotAtFrameStart + spd * dt);
      if (config.dualLayer) {
        s.innerRotationDeg = normalizeDeg(s.innerRotationDeg + spd * config.innerSpeedRatio * dt);
      }

      if (config.bidirectional && config.flipIntervalMs > 0) {
        s.flipTimer += dt * 1000;
        if (s.flipTimer >= config.flipIntervalMs) {
          s.flipTimer = 0;
          s.direction *= -1;
        }
      }

      let dirty = true;
      if (s.flying) {
        const px0 = s.projX;
        const py0 = s.projY;
        const travel = flySpeed * dt;
        const nSub = Math.max(1, Math.ceil(travel / (R * 0.14)));
        let x = px0;
        let y = py0;
        let hitRes: SegmentHit | null = null;
        let rotFrac = 0;
        const subDt = dt / nSub;
        for (let k = 0; k < nSub; k++) {
          const nx = x + s.vx * flySpeed * subDt;
          const ny = y + s.vy * flySpeed * subDt;
          const h = segmentCircleHit(cx, cy, R, x, y, nx, ny);
          if (h) {
            hitRes = h;
            rotFrac = (k + h.t) / nSub;
            break;
          }
          x = nx;
          y = ny;
        }

        if (hitRes) {
          const hx = hitRes.x;
          const hy = hitRes.y;
          const rotImpact = normalizeDeg(rotAtFrameStart + spd * dt * rotFrac);
          const localStick = worldRimToLocalBodyDeg(hx, hy, cx, cy, rotImpact);

          const collides = checkAngularCollision(localStick, s.stuckLocal, COLLISION_SEPARATION_DEG);
          s.flying = false;
          s.projX = cx;
          s.projY = launchY;
          s.vx = 0;
          s.vy = 0;
          if (collides) {
            void missHaptic(haptics);
            if (zenMode) {
              dirty = true;
            } else {
              s.ended = true;
              onLoseRef.current();
            }
          } else {
            s.stuckLocal.push(localStick);
            s.playerLanded += 1;
            void hitHaptic(haptics);
            onStickRef.current();
            if (!zenMode && s.playerLanded >= config.arrowsToShoot) {
              s.ended = true;
              onWinRef.current();
            }
          }
        } else {
          s.projX = x;
          s.projY = y;
        }
      }

      // --- Destroy arrow physics ---
      if (s.dFlying) {
        const dpx0 = s.dProjX;
        const dpy0 = s.dProjY;
        const travel = flySpeed * dt;
        const nSub = Math.max(1, Math.ceil(travel / (R * 0.14)));
        let dx = dpx0;
        let dy = dpy0;
        let dHitRes: SegmentHit | null = null;
        let dRotFrac = 0;
        const subDt = dt / nSub;
        for (let k = 0; k < nSub; k++) {
          const ndx = dx + s.dVx * flySpeed * subDt;
          const ndy = dy + s.dVy * flySpeed * subDt;
          const h = segmentCircleHit(cx, cy, R, dx, dy, ndx, ndy);
          if (h) {
            dHitRes = h;
            dRotFrac = (k + h.t) / nSub;
            break;
          }
          dx = ndx;
          dy = ndy;
        }

        if (dHitRes) {
          const dhx = dHitRes.x;
          const dhy = dHitRes.y;
          const rotImpact = normalizeDeg(rotAtFrameStart + spd * dt * dRotFrac);
          const localAngle = worldRimToLocalBodyDeg(dhx, dhy, cx, cy, rotImpact);

          // Find the closest stuck arrow within removal threshold
          const REMOVE_THRESH_DEG = COLLISION_SEPARATION_DEG * 2;
          let closestIdx = -1;
          let closestDiff = Infinity;
          for (let i = 0; i < s.stuckLocal.length; i++) {
            const diff = Math.min(
              Math.abs(normalizeDeg(localAngle) - normalizeDeg(s.stuckLocal[i])),
              360 - Math.abs(normalizeDeg(localAngle) - normalizeDeg(s.stuckLocal[i]))
            );
            if (diff < REMOVE_THRESH_DEG && diff < closestDiff) {
              closestDiff = diff;
              closestIdx = i;
            }
          }

          s.dFlying = false;
          s.dProjX = cx;
          s.dProjY = launchTopY;
          s.dVx = 0;
          s.dVy = 0;

          if (closestIdx >= 0) {
            s.stuckLocal.splice(closestIdx, 1);
            void hitHaptic(haptics);
          } else {
            void missHaptic(haptics);
          }
          dirty = true;
        } else {
          s.dProjX = dx;
          s.dProjY = dy;
          // Cancel only if it flew past the circle and is heading away
          if (dy > height + 50 || dy < -50 || dx < -50 || dx > width + 50) {
            s.dFlying = false;
            s.dProjX = cx;
            s.dProjY = launchTopY;
            s.dVx = 0;
            s.dVy = 0;
          }
        }
      }

      if (dirty) force();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [
    paused,
    spinDegPerSec,
    config.arrowsToShoot,
    config.bidirectional,
    config.dualLayer,
    config.flipIntervalMs,
    config.innerSpeedRatio,
    cx,
    cy,
    R,
    width,
    height,
    launchY,
    launchTopY,
    haptics,
    zenMode,
  ]);

  const s = state.current;
  const shapeSides = config.shapeSides < 3 ? 0 : config.shapeSides;
  const shaft = R * 0.48;
  const tailX = s.flying ? s.projX - s.vx * shaft : cx;
  const tailY = s.flying ? s.projY - s.vy * shaft : launchY;
  const dTailX = s.dFlying ? s.dProjX - s.dVx * shaft : cx;
  const dTailY = s.dFlying ? s.dProjY - s.dVy * shaft : launchTopY;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={palette.accent} stopOpacity="1" />
            <Stop offset="50%" stopColor={palette.targetStroke} stopOpacity="0.45" />
            <Stop offset="100%" stopColor={palette.accent} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <G rotation={s.rotationDeg} originX={cx} originY={cy}>
          {shapeSides === 0 ? (
            <Circle cx={cx} cy={cy} r={R} stroke="url(#ringGrad)" strokeWidth={5} fill="none" />
          ) : (
            <Polygon
              points={polygonPoints(cx, cy, R, shapeSides)}
              stroke="url(#ringGrad)"
              strokeWidth={5}
              fill="none"
            />
          )}
        </G>
        {config.dualLayer ? (
          <G rotation={s.innerRotationDeg} originX={cx} originY={cy}>
            {shapeSides === 0 ? (
              <Circle
                cx={cx}
                cy={cy}
                r={innerR}
                stroke={palette.hud}
                strokeWidth={1}
                strokeDasharray="6 8"
                fill="none"
                opacity={0.55}
              />
            ) : (
              <Polygon
                points={polygonPoints(cx, cy, innerR, shapeSides)}
                stroke={palette.hud}
                strokeWidth={1}
                strokeDasharray="6 8"
                fill="none"
                opacity={0.55}
              />
            )}
          </G>
        ) : null}
        <G rotation={s.rotationDeg} originX={cx} originY={cy}>
          {s.stuckLocal.map((a, i) => {
            const rad = (a * Math.PI) / 180;
            const x1 = cx + R_IN * Math.cos(rad);
            const y1 = cy + R_IN * Math.sin(rad);
            const x2 = cx + R_OUT * Math.cos(rad);
            const y2 = cy + R_OUT * Math.sin(rad);
            return (
              <G key={`${i}-${a.toFixed(3)}`}>
                <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={palette.arrow} strokeWidth={2} strokeLinecap="round" />
                <Path d={arrowHeadPath(x1, y1, x2, y2)} fill={palette.arrow} />
              </G>
            );
          })}
        </G>
        {s.flying ? (
          <G>
            <Line
              x1={tailX}
              y1={tailY}
              x2={s.projX}
              y2={s.projY}
              stroke={palette.accent}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <Path d={arrowHeadPath(tailX, tailY, s.projX, s.projY)} fill={palette.accent} />
          </G>
        ) : null}
        {s.dFlying ? (
          <G>
            <Line
              x1={dTailX}
              y1={dTailY}
              x2={s.dProjX}
              y2={s.dProjY}
              stroke="#ef4444"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <Path d={arrowHeadPath(dTailX, dTailY, s.dProjX, s.dProjY)} fill="#ef4444" />
          </G>
        ) : null}
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1 },
});
