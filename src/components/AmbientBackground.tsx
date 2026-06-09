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
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Circle, Defs, RadialGradient, Stop} from 'react-native-svg';
import {useTheme} from '../hooks/useTheme';

const {width: SCREEN_W, height: SCREEN_H} = Dimensions.get('window');

type OrbConfig = {
  size: number;
  color: string;
  // Anchor as a fraction of the screen; negative / >1 sits the orb off-screen.
  x: number;
  y: number;
  driftX: number;
  driftY: number;
  scaleTo: number;
  duration: number;
  opacity: number;
};

// Gold family only (accents.glow). The champagne `pulse` tone stays reserved
// for VENTII AI surfaces, so it is intentionally absent here.
const ORBS: OrbConfig[] = [
  {size: 460, color: '#FFD56B', x: -0.28, y: -0.12, driftX: 40, driftY: 30, scaleTo: 1.12, duration: 13000, opacity: 0.5},
  {size: 360, color: '#F4B860', x: 0.6, y: 0.0, driftX: -34, driftY: 46, scaleTo: 1.18, duration: 11000, opacity: 0.4},
  {size: 520, color: '#FFE3A3', x: 0.42, y: 0.64, driftX: 30, driftY: -40, scaleTo: 1.1, duration: 16000, opacity: 0.45},
  {size: 300, color: '#FFCE73', x: -0.16, y: 0.55, driftX: 44, driftY: -28, scaleTo: 1.2, duration: 9500, opacity: 0.38},
];

const Orb: React.FC<OrbConfig & {gid: string}> = ({
  size,
  color,
  x,
  y,
  driftX,
  driftY,
  scaleTo,
  duration,
  opacity,
  gid,
}) => {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withRepeat(
      withTiming(1, {duration, easing: Easing.inOut(Easing.sin)}),
      -1,
      true,
    );
  }, [p, duration]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: interpolate(p.value, [0, 1], [0, driftX])},
      {translateY: interpolate(p.value, [0, 1], [0, driftY])},
      {scale: interpolate(p.value, [0, 1], [1, scaleTo])},
    ],
  }));

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
          opacity,
        },
        animStyle,
      ]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={gid} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.85} />
            <Stop offset="55%" stopColor={color} stopOpacity={0.35} />
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
  return (
    <View style={[styles.root, {backgroundColor: t.bg.primary}, style]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {ORBS.map((o, i) => (
          <Orb key={i} gid={`orb-${i}`} {...o} />
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
