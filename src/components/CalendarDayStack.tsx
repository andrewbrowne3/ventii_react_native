/**
 * CalendarDayStack — the Calendar "wallet stack" interaction, ported from
 * VENTII_HANDOFF_COMPLETE/03_COMPONENTS_AND_SPECS/CalendarDayStack.native.jsx.
 *
 * Saved events are grouped by day. A day with multiple saved events renders
 * as a COLLAPSED STACK (Apple-Wallet style: front card flat, cards behind
 * peek up + inset). Tapping the stack EXPANDS it into a vertical list;
 * tapping the day header (chevron) collapses it back. Single-event days are
 * plain cards. This is the vertical sibling of the Home feed's horizontal
 * deck — same "multiple things in one slot" idea, opposite axis.
 */
import React, {useCallback, useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Polyline} from 'react-native-svg';

import {Event} from '../types';
import {useTheme} from '../hooks/useTheme';

// Constants verbatim from the prototype spec.
const CARD_HEIGHT = 102;
const GAP = 10;
const PEEK_Y = 7;
const PEEK_X = 8;
const MAX_PEEK_LAYERS = 2;
const EASE = Easing.bezier(0.22, 1, 0.36, 1);

export interface DayGroup {
  sortKey: string; // ISO date — stable per-day key
  dayOfWeekFull: string; // "Friday"
  month: string; // "Oct"
  day: number; // 31
  events: Event[];
}

/** Group saved events by their ISO `date`, ordered soonest-first. */
export function groupSavedEventsByDay(savedEvents: Event[]): DayGroup[] {
  const map: Record<string, DayGroup> = {};
  const order: string[] = [];
  [...savedEvents]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .forEach((ev) => {
      const key = ev.date;
      if (!map[key]) {
        const [y, m, d] = key.split('-').map(Number);
        const dt = new Date(y, (m || 1) - 1, d || 1);
        map[key] = {
          sortKey: key,
          dayOfWeekFull: dt.toLocaleDateString('en-US', {weekday: 'long'}),
          month: dt.toLocaleDateString('en-US', {month: 'short'}),
          day: dt.getDate(),
          events: [],
        };
        order.push(key);
      }
      map[key].events.push(ev);
    });
  return order.map((k) => map[k]);
}

// ───── one animated card in a stack ─────────────────────────────────────────

const StackCard: React.FC<{
  ev: Event;
  index: number;
  count: number;
  isExpanded: boolean;
  onPressCard: (ev: Event) => void;
}> = ({ev, index, count, isExpanded, onPressCard}) => {
  const t = useTheme();
  const layerIdx = Math.min(index, MAX_PEEK_LAYERS + 1);
  const isHidden = !isExpanded && layerIdx > MAX_PEEK_LAYERS;
  // Stagger: expanding fans top→down; collapsing tucks bottom→up.
  const delayMs = isExpanded ? index * 40 : (count - 1 - index) * 30;

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = isExpanded
      ? index * (CARD_HEIGHT + GAP) // own row
      : -layerIdx * PEEK_Y; // peek up behind the front
    const inset = isExpanded ? 0 : layerIdx * PEEK_X;
    const opacity = isExpanded ? 1 : isHidden ? 0 : 1;
    return {
      transform: [
        {translateY: withDelay(delayMs, withTiming(translateY, {duration: 500, easing: EASE}))},
      ],
      left: withDelay(delayMs, withTiming(inset, {duration: 500, easing: EASE})),
      right: withDelay(delayMs, withTiming(inset, {duration: 500, easing: EASE})),
      opacity: withTiming(opacity, {duration: 400}),
    };
  }, [isExpanded, index, count]);

  return (
    <Animated.View
      style={[styles.stackCard, {zIndex: count - index, height: CARD_HEIGHT}, animatedStyle]}
      pointerEvents={isHidden ? 'none' : 'auto'}>
      <Pressable
        onPress={() => onPressCard(ev)}
        style={[styles.compact, {backgroundColor: t.bg.secondary, borderColor: t.border.subtle}]}>
        <Image source={{uri: ev.flyer_url}} style={styles.compactThumb} resizeMode="cover" />
        <View style={{flex: 1, marginLeft: 12, justifyContent: 'center'}}>
          <Text
            numberOfLines={1}
            style={{color: t.text.primary, fontSize: 15, fontWeight: '700', letterSpacing: -0.2}}>
            {ev.title}
          </Text>
          <Text numberOfLines={1} style={{color: t.text.secondary, fontSize: 12.5, marginTop: 3}}>
            {ev.start_time} · {ev.venue?.display_name}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

// ───── one day section: header + stack ──────────────────────────────────────

const DaySection: React.FC<{
  group: DayGroup;
  isExpanded: boolean;
  onToggle: (key: string) => void;
  onOpenEvent: (ev: Event) => void;
}> = ({group, isExpanded, onToggle, onOpenEvent}) => {
  const t = useTheme();
  const count = group.events.length;
  const multiple = count > 1;

  const visiblePeeks = Math.min(count - 1, MAX_PEEK_LAYERS);
  const expandedHeight = count * CARD_HEIGHT + Math.max(0, count - 1) * GAP;

  const containerStyle = useAnimatedStyle(
    () => ({
      height: withTiming(isExpanded ? expandedHeight : CARD_HEIGHT, {duration: 500, easing: EASE}),
      marginTop: withTiming(isExpanded ? 10 : 10 + visiblePeeks * PEEK_Y, {duration: 450, easing: EASE}),
    }),
    [isExpanded, count],
  );

  // Hoisted (the reference inlined this hook conditionally — a hooks-rule bug).
  const chevronStyle = useAnimatedStyle(
    () => ({
      transform: [{rotate: withTiming(isExpanded ? '0deg' : '-90deg', {duration: 320, easing: EASE})}],
    }),
    [isExpanded],
  );

  const handleCardPress = useCallback(
    (ev: Event) => {
      // First tap on a collapsed multi-event stack = reveal, not open.
      if (multiple && !isExpanded) {
        onToggle(group.sortKey);
      } else {
        onOpenEvent(ev);
      }
    },
    [multiple, isExpanded, group.sortKey, onToggle, onOpenEvent],
  );

  return (
    <View style={{marginBottom: 26}}>
      <Pressable
        onPress={multiple ? () => onToggle(group.sortKey) : undefined}
        style={styles.header}>
        <Text style={{fontSize: 16, fontWeight: '700', color: t.text.primary, letterSpacing: -0.3}}>
          {group.dayOfWeekFull}
          <Text style={{color: t.text.secondary, fontWeight: '500'}}>{`, ${group.month} ${group.day}`}</Text>
          <Text style={{color: t.text.secondary, fontWeight: '500'}}>{`  ·  ${count} saved`}</Text>
        </Text>
        {multiple && (
          <Animated.View style={chevronStyle}>
            <Svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke={t.text.secondary}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round">
              <Polyline points="6 9 12 15 18 9" />
            </Svg>
          </Animated.View>
        )}
      </Pressable>

      <Animated.View style={[styles.stackContainer, containerStyle]}>
        {group.events.map((ev, i) => (
          <StackCard
            key={ev.id}
            ev={ev}
            index={i}
            count={count}
            isExpanded={isExpanded}
            onPressCard={handleCardPress}
          />
        ))}
      </Animated.View>
    </View>
  );
};

// ───── the whole calendar body — owns per-day expanded state ───────────────

export const CalendarDayStacks: React.FC<{
  groups: DayGroup[];
  onOpenEvent: (ev: Event) => void;
}> = ({groups, onOpenEvent}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = useCallback((sortKey: string) => {
    setExpanded((prev) => ({...prev, [sortKey]: !prev[sortKey]}));
  }, []);

  return (
    <View>
      {groups.map((group) => (
        <DaySection
          key={group.sortKey}
          group={group}
          isExpanded={!!expanded[group.sortKey]}
          onToggle={toggle}
          onOpenEvent={onOpenEvent}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  stackContainer: {position: 'relative', width: '100%'},
  stackCard: {position: 'absolute', top: 0, left: 0, right: 0},
  compact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 11,
  },
  compactThumb: {width: 80, height: 80, borderRadius: 14, backgroundColor: '#222'},
});
