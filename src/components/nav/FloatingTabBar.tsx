import React from 'react';
import {Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {Bell, Calendar, Home, Sparkles, User} from 'lucide-react-native';
import {useSelector} from 'react-redux';

import {RootState} from '../../store/store';
import {useTheme} from '../../hooks/useTheme';

/**
 * Navigation spec Part A: a persistent FLOATING bottom bar — pinned near the
 * bottom with side insets (bottom 22 / sides 14 / height 62), large radius,
 * hairline border, blur-glass background. Active state = full text colour +
 * a small dot under the icon (quiet, Apple-Maps style — no neon). The
 * Activity tab wears a red unread badge when count > 0.
 */
const ICONS: Record<string, React.ComponentType<{size?: number; color?: string; strokeWidth?: number}>> = {
  HomeTab: Home,
  CalendarTab: Calendar,
  AITab: Sparkles,
  ActivityTab: Bell,
  ProfileTab: User,
};

export const FloatingTabBar: React.FC<BottomTabBarProps> = ({state, navigation}) => {
  const t = useTheme();
  const dark = t.mode === 'dark';
  // Unread = tickets minted recently is a placeholder until notifications are
  // real; 0 hides the badge entirely.
  const unread = useSelector((s: RootState) => (s as any).inbox?.unread ?? 0);

  return (
    <View
      style={[
        styles.bar,
        {
          borderColor: t.glass.border,
          backgroundColor: dark ? 'rgba(18, 18, 28, 0.72)' : 'rgba(253, 251, 255, 0.8)',
        },
      ]}>
      {Platform.OS === 'ios' ? (
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType={t.glass.blurType as any}
          blurAmount={30}
          reducedTransparencyFallbackColor="#FFFFFF"
        />
      ) : null}
      {state.routes.map((route, index) => {
        const isActive = state.index === index;
        const color = isActive ? t.text.primary : t.text.tertiary;
        const Icon = ICONS[route.name] ?? Home;
        const isAI = route.name === 'AITab';
        const showBadge = route.name === 'ActivityTab' && unread > 0;
        return (
          <Pressable
            key={route.key}
            hitSlop={6}
            onPress={() => {
              const event = navigation.emit({type: 'tabPress', target: route.key, canPreventDefault: true});
              if (!isActive && !event.defaultPrevented) {
                navigation.navigate(route.name as never);
              }
            }}
            style={styles.tab}>
            <View>
              <Icon
                size={24}
                color={isAI ? t.accents.pulse.base : color}
                strokeWidth={isActive ? 2.3 : 1.9}
              />
              {showBadge && (
                <View style={[styles.badge, {borderColor: dark ? '#14141c' : '#ffffff'}]}>
                  <Text style={styles.badgeText}>{unread > 99 ? '99+' : String(unread)}</Text>
                </View>
              )}
            </View>
            <View
              style={[
                styles.dot,
                {backgroundColor: isActive ? (isAI ? t.accents.pulse.base : t.text.primary) : 'transparent'},
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
};

/** Scroll views behind the floating bar need this much bottom padding. */
export const FLOATING_BAR_CLEARANCE = 110;

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 22,
    left: 14,
    right: 14,
    height: 62,
    borderRadius: 30,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 10},
    elevation: 12,
  },
  tab: {flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 4},
  dot: {width: 4, height: 4, borderRadius: 2, marginTop: 1},
  badge: {
    position: 'absolute',
    top: -4,
    right: -7,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#ff453a',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {color: '#fff', fontSize: 10, fontWeight: '700'},
});
