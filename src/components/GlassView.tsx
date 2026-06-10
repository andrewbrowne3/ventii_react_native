import React, {useMemo, useState} from 'react';
import {
  LayoutChangeEvent,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import {useTheme} from '../hooks/useTheme';

export type GlassVariant = 'card' | 'panel' | 'overlay';

interface Props {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: GlassVariant;
  radius?: number;
}

const RADIUS: Record<GlassVariant, number> = {card: 24, panel: 16, overlay: 0};

let uidCounter = 0;

/**
 * "Liquid glass" surface — refined-luxury treatment. Layered bottom-to-top:
 *   1. BlurView      — native iOS material (blur + saturation boost), the
 *                      real frosted-glass backdrop of the gold orbs behind,
 *   2. tint          — a whisper of wash so content stays legible; kept low
 *                      so the background genuinely bleeds through,
 *   3. inner GLOW    — soft warm light pooling in from the top edge,
 *   4. specular SHEEN — bright at the top, falling away on a slight diagonal,
 *   5. EDGE light    — a gradient stroke: gold-white catch-light at the top,
 *                      cooling along the sides, with a faint gold bounce at
 *                      the bottom (light wrapping around the slab),
 *   6. RIM           — a tapered hairline highlight along the top edge.
 * Shadows live on TWO outer wrappers that never clip: a deep ambient drop
 * shadow plus a wide, faint warm halo so cards appear lit by the orbs.
 */
const GlassView: React.FC<Props> = ({
  children,
  style,
  variant = 'card',
  radius,
}) => {
  const t = useTheme();
  const dark = t.mode === 'dark';
  const r = radius ?? RADIUS[variant];
  const tint = variant === 'card' ? t.glass.fill : t.glass.fillStrong;
  const ids = useMemo(() => {
    uidCounter += 1;
    return {
      sheen: `gv${uidCounter}-sheen`,
      glow: `gv${uidCounter}-glow`,
      edge: `gv${uidCounter}-edge`,
      rim: `gv${uidCounter}-rim`,
    };
  }, []);
  const [box, setBox] = useState({w: 0, h: 0});
  const onLayout = (e: LayoutChangeEvent) => {
    const {width, height} = e.nativeEvent.layout;
    if (width !== box.w || height !== box.h) {
      setBox({w: width, h: height});
    }
  };

  return (
    <View
      style={[
        styles.halo,
        {borderRadius: r, shadowColor: dark ? '#FFC85C' : '#C2974A'},
        style,
      ]}>
      <View
        style={[
          styles.shadow,
          {borderRadius: r, shadowColor: t.glass.shadowColor},
        ]}>
        <View onLayout={onLayout} style={[styles.surface, {borderRadius: r}]}>
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
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor:
                  // No backdrop blur on Android — lean on a denser tint so
                  // content stays legible over the raw orbs.
                  Platform.OS === 'android'
                    ? dark
                      ? 'rgba(24, 24, 34, 0.82)'
                      : 'rgba(252, 252, 254, 0.85)'
                    : tint,
              },
            ]}
          />
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <RadialGradient
                id={ids.glow}
                cx="50%"
                cy="-12%"
                rx="85%"
                ry="62%">
                <Stop
                  offset="0"
                  stopColor="#FFEBC2"
                  stopOpacity={dark ? 0.12 : 0.14}
                />
                <Stop offset="0.55" stopColor="#FFEBC2" stopOpacity={0.04} />
                <Stop offset="1" stopColor="#FFEBC2" stopOpacity={0} />
              </RadialGradient>
              <LinearGradient id={ids.sheen} x1="0" y1="0" x2="0.16" y2="1">
                <Stop
                  offset="0"
                  stopColor="#FFFFFF"
                  stopOpacity={dark ? 0.26 : 0.34}
                />
                <Stop offset="0.34" stopColor="#FFFFFF" stopOpacity={0.06} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#${ids.glow})`} />
            <Rect width="100%" height="100%" fill={`url(#${ids.sheen})`} />
          </Svg>
          {box.w > 0 && box.h > 0 ? (
            <Svg
              width={box.w}
              height={box.h}
              style={StyleSheet.absoluteFill}
              pointerEvents="none">
              <Defs>
                <LinearGradient id={ids.edge} x1="0" y1="0" x2="0" y2="1">
                  <Stop
                    offset="0"
                    stopColor={dark ? '#FFEDC4' : '#FFFFFF'}
                    stopOpacity={dark ? 0.85 : 0.95}
                  />
                  <Stop
                    offset="0.28"
                    stopColor="#FFFFFF"
                    stopOpacity={dark ? 0.22 : 0.55}
                  />
                  <Stop
                    offset="0.72"
                    stopColor="#FFFFFF"
                    stopOpacity={dark ? 0.08 : 0.28}
                  />
                  <Stop
                    offset="1"
                    stopColor={dark ? '#E0B040' : '#D49A1F'}
                    stopOpacity={dark ? 0.28 : 0.35}
                  />
                </LinearGradient>
                <LinearGradient id={ids.rim} x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#FFF4D6" stopOpacity={0} />
                  <Stop offset="0.22" stopColor="#FFF4D6" stopOpacity={0.85} />
                  <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.95} />
                  <Stop offset="0.78" stopColor="#FFF4D6" stopOpacity={0.85} />
                  <Stop offset="1" stopColor="#FFF4D6" stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect
                x={0.6}
                y={0.6}
                width={box.w - 1.2}
                height={box.h - 1.2}
                rx={Math.max(r - 0.6, 0)}
                fill="none"
                stroke={`url(#${ids.edge})`}
                strokeWidth={1.2}
              />
              <Rect
                x={box.w * 0.1}
                y={0.4}
                width={box.w * 0.8}
                height={1.1}
                rx={0.55}
                fill={`url(#${ids.rim})`}
              />
            </Svg>
          ) : null}
          {children}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Wide, faint warm halo — the card reads as lit by the gold orbs behind it.
  halo: {
    shadowOpacity: 0.1,
    shadowRadius: 38,
    shadowOffset: {width: 0, height: 6},
  },
  // Deep ambient drop shadow for lift.
  shadow: {
    shadowOpacity: 0.26,
    shadowRadius: 30,
    shadowOffset: {width: 0, height: 16},
    elevation: 10,
  },
  surface: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});

export default GlassView;
