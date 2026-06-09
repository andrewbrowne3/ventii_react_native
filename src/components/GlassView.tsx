import React from 'react';
import {Platform, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {useTheme} from '../hooks/useTheme';

export type GlassVariant = 'card' | 'panel' | 'overlay';

interface Props {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: GlassVariant;
  radius?: number;
}

const RADIUS: Record<GlassVariant, number> = {card: 24, panel: 16, overlay: 0};

/**
 * Real "liquid glass" surface. Layered bottom-to-top:
 *   1. BlurView      — true backdrop blur of the gold orbs behind the card,
 *   2. tint          — a thin milky wash so content stays legible over the blur,
 *   3. specular SHEEN — bright at the top edge, fading down,
 *   4. RIM highlight  — a hairline catch-light along the top edge.
 * The soft drop shadow lives on an OUTER wrapper that never clips, while the
 * inner surface clips everything to the radius (iOS clips same-view shadows).
 */
const GlassView: React.FC<Props> = ({
  children,
  style,
  variant = 'card',
  radius,
}) => {
  const t = useTheme();
  const r = radius ?? RADIUS[variant];
  const tint = variant === 'card' ? t.glass.fill : t.glass.fillStrong;

  return (
    <View
      style={[
        styles.shadow,
        {borderRadius: r, shadowColor: t.glass.shadowColor},
        style,
      ]}>
      <View
        style={[
          styles.surface,
          {borderRadius: r, borderColor: t.glass.border},
        ]}>
        {Platform.OS === 'ios' ? (
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType={t.glass.blurType as any}
            blurAmount={t.glass.blurAmount}
            reducedTransparencyFallbackColor="#FFFFFF"
          />
        ) : null}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, {backgroundColor: tint}]}
        />
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id="glassSheen" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.6} />
              <Stop offset="0.42" stopColor="#FFFFFF" stopOpacity={0.08} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#glassSheen)" />
        </Svg>
        <View
          pointerEvents="none"
          style={[styles.rim, {borderTopLeftRadius: r, borderTopRightRadius: r}]}
        />
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shadow: {
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: 14},
    elevation: 8,
  },
  surface: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  rim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
});

export default GlassView;
