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
  interpolate,
  useAnimatedStyle,
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
  // Anchor as a fraction of the screen; negative / >1 sits the orb off-screen.
  x: number;
  y: number;
  // Two independent drift phases (A and B) with incommensurate periods.
  // Their sum traces a slow Lissajous-style wander with no visible
  // ping-pong reversal — the orb never appears to "bounce off" anything.
  ax: number; // phase-A amplitude, x (px)
  ay: number; // phase-A amplitude, y (px)
  bx: number; // phase-B amplitude, x (px)
  by: number; // phase-B amplitude, y (px)
  scaleA: number; // scale swing on phase A (e.g. 0.06 → ±6%)
  scaleB: number;
  durA: number;
  durB: number;
  opacity: number;
  /** How much the orb "breathes" — fraction of opacity that oscillates. */
  breathe: number;
  delay: number;
};

// Gold family only (accents.glow). The champagne `pulse` tone stays reserved
// for VENTII AI surfaces, so it is intentionally absent here.
const ORBS: OrbConfig[] = [
  {size: 460, core: '#FFF3D0', color: '#FFD56B', x: -0.28, y: -0.12, ax: 30, ay: 16, bx: 18, by: 26, scaleA: 0.07, scaleB: 0.05, durA: 17000, durB: 23000, opacity: 0.5, breathe: 0.18, delay: 0},
  {size: 360, core: '#FFEFC9', color: '#F4B860', x: 0.6, y: 0.0, ax: -24, ay: 30, bx: -14, by: 18, scaleA: 0.09, scaleB: 0.06, durA: 14000, durB: 19000, opacity: 0.4, breathe: 0.22, delay: 1200},
  {size: 520, core: '#FFF6DE', color: '#FFE3A3', x: 0.42, y: 0.64, ax: 22, ay: -26, bx: 16, by: -16, scaleA: 0.05, scaleB: 0.04, durA: 21000, durB: 27000, opacity: 0.45, breathe: 0.15, delay: 600},
  {size: 300, core: '#FFEFC4', color: '#FFCE73', x: -0.16, y: 0.55, ax: 30, ay: -18, bx: 20, by: -14, scaleA: 0.1, scaleB: 0.07, durA: 12000, durB: 16500, opacity: 0.38, breathe: 0.25, delay: 1800},
];

const sine = Easing.inOut(Easing.sin);

const Orb: React.FC<OrbConfig & {gid: string; dim: number}> = ({
  size,
  core,
  color,
  x,
  y,
  ax,
  ay,
  bx,
  by,
  scaleA,
  scaleB,
  durA,
  durB,
  opacity,
  breathe,
  delay,
  gid,
  dim,
}) => {
  const pA = useSharedValue(0);
  const pB = useSharedValue(0);

  useEffect(() => {
    pA.value = withDelay(
      delay,
      withRepeat(withTiming(1, {duration: durA, easing: sine}), -1, true),
    );
    pB.value = withDelay(
      delay,
      withRepeat(withTiming(1, {duration: durB, easing: sine}), -1, true),
    );
  }, [pA, pB, durA, durB, delay]);

  const animStyle = useAnimatedStyle(() => {
    const a = interpolate(pA.value, [0, 1], [-1, 1]);
    const b = interpolate(pB.value, [0, 1], [-1, 1]);
    return {
      transform: [
        {translateX: a * ax + b * bx},
        {translateY: a * ay + b * by},
        {scale: 1 + a * scaleA + b * scaleB},
      ],
      // Slow luminance breathing, driven by the longer phase so it stays
      // decoupled from positional drift.
      opacity: dim * opacity * (1 - breathe / 2 + breathe * pB.value),
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: SCREEN_W * x,
          top: SCREEN_H * y,
          width: size,
          height: size,
        },
        animStyle,
      ]}>
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
