import React, {useEffect} from 'react';
import {
  Dimensions,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Circle, Defs, RadialGradient, Stop} from 'react-native-svg';
import {useTheme} from '../hooks/useTheme';

const {width: SCREEN_W, height: SCREEN_H} = Dimensions.get('window');

type OrbConfig = {
  size: number;
  /** Hot centre of the orb — a near-white warm tone. */
  core: string;
  /** Body colour — the gold that bleeds into the background. */
  color: string;
  // Starting position as a fraction of the screen (orb centre).
  x: number;
  y: number;
  // DVD-screensaver velocity, px per second. Each orb gets its own angle and
  // speed so they never sync up.
  vx: number;
  vy: number;
  /** Slow size pulse, ±fraction (e.g. 0.06 → ±6%). */
  scaleAmp: number;
  pulseDur: number;
  opacity: number;
  /** How much the orb "breathes" — fraction of opacity that oscillates. */
  breathe: number;
  delay: number;
};

// Gold family only (accents.glow). The champagne `pulse` tone stays reserved
// for VENTII AI surfaces, so it is intentionally absent here.
const ORBS: OrbConfig[] = [
  {size: 460, core: '#FFF3D0', color: '#FFD56B', x: 0.1, y: 0.05, vx: 14, vy: 10, scaleAmp: 0.06, pulseDur: 9000, opacity: 0.5, breathe: 0.18, delay: 0},
  {size: 360, core: '#FFEFC9', color: '#F4B860', x: 0.75, y: 0.2, vx: -11, vy: 16, scaleAmp: 0.08, pulseDur: 7400, opacity: 0.4, breathe: 0.22, delay: 1200},
  {size: 520, core: '#FFF6DE', color: '#FFE3A3', x: 0.5, y: 0.75, vx: 9, vy: -12, scaleAmp: 0.05, pulseDur: 11000, opacity: 0.45, breathe: 0.15, delay: 600},
  {size: 300, core: '#FFEFC4', color: '#FFCE73', x: 0.2, y: 0.55, vx: 18, vy: -8, scaleAmp: 0.09, pulseDur: 6400, opacity: 0.38, breathe: 0.25, delay: 1800},
];

const sine = Easing.inOut(Easing.sin);

/**
 * One drifting orb — classic DVD-screensaver motion: constant slow velocity,
 * reflecting off the screen edges. The bounce bounds let roughly half the orb
 * slide off-screen before reflecting, so the glow always stays partly visible
 * and the bounce reads as the glow "kissing" the edge, not a hard hit.
 * A slow sine pulse (scale) and opacity breathing keep it feeling alive.
 */
const Orb: React.FC<OrbConfig & {gid: string; dim: number}> = ({
  size,
  core,
  color,
  x,
  y,
  vx,
  vy,
  scaleAmp,
  pulseDur,
  opacity,
  breathe,
  delay,
  gid,
  dim,
}) => {
  // Positions are the orb's top-left corner.
  const posX = useSharedValue(SCREEN_W * x - size / 2);
  const posY = useSharedValue(SCREEN_H * y - size / 2);
  const velX = useSharedValue(vx);
  const velY = useSharedValue(vy);
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withDelay(
      delay,
      withRepeat(withTiming(1, {duration: pulseDur, easing: sine}), -1, true),
    );
  }, [pulse, pulseDur, delay]);

  useFrameCallback((frame) => {
    const dt = Math.min(frame.timeSincePreviousFrame ?? 16, 64) / 1000;
    let nx = posX.value + velX.value * dt;
    let ny = posY.value + velY.value * dt;
    // Allow ~55% of the orb past each edge before bouncing back.
    const minX = -size * 0.55;
    const maxX = SCREEN_W - size * 0.45;
    const minY = -size * 0.55;
    const maxY = SCREEN_H - size * 0.45;
    if (nx < minX) {
      nx = minX;
      velX.value = Math.abs(velX.value);
    } else if (nx > maxX) {
      nx = maxX;
      velX.value = -Math.abs(velX.value);
    }
    if (ny < minY) {
      ny = minY;
      velY.value = Math.abs(velY.value);
    } else if (ny > maxY) {
      ny = maxY;
      velY.value = -Math.abs(velY.value);
    }
    posX.value = nx;
    posY.value = ny;
  });

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: posX.value},
      {translateY: posY.value},
      {scale: 1 - scaleAmp + 2 * scaleAmp * pulse.value},
    ],
    opacity: dim * opacity * (1 - breathe / 2 + breathe * pulse.value),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{position: 'absolute', left: 0, top: 0, width: size, height: size}, animStyle]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={gid} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={core} stopOpacity={0.95} />
            <Stop offset="16%" stopColor={color} stopOpacity={0.8} />
            <Stop offset="42%" stopColor={color} stopOpacity={0.42} />
            <Stop offset="70%" stopColor={color} stopOpacity={0.16} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${gid})`} />
      </Svg>
    </Animated.View>
  );
};

interface Props {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const AmbientBackground: React.FC<Props> = ({children, style}) => {
  const t = useTheme();
  // Near-full strength in both modes — the frosted glass needs visible warm
  // colour behind it to read as glass at all.
  const dim = t.mode === 'dark' ? 1 : 0.95;
  return (
    <View style={[styles.root, {backgroundColor: t.bg.primary}, style]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {ORBS.map((o, i) => (
          <Orb key={i} gid={`orb-${i}`} dim={dim} {...o} />
        ))}
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, overflow: 'hidden'},
});

export default AmbientBackground;
