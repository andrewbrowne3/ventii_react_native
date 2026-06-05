import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  Image,
  SectionList,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useTheme} from '../hooks/useTheme';
import {RootState, AppDispatch} from '../store/store';
import {fetchEvents} from '../store/slices/feedSlice';
import {Event, Profile} from '../types';

type GroupMode = 'dj' | 'venue';

interface Group {
  profile: Profile;
  events: Event[];
}

export const LineupScreen: React.FC = () => {
  const t = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const nav = useNavigation<any>();
  const events = useSelector((s: RootState) => s.feed.events);
  const [mode, setMode] = useState<GroupMode>('dj');

  useEffect(() => {
    if (events.length === 0) dispatch(fetchEvents());
  }, [dispatch, events.length]);

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    if (mode === 'dj') {
      events.forEach(e => {
        e.hosts.forEach(h => {
          if (!map.has(h.id)) map.set(h.id, {profile: h, events: []});
          map.get(h.id)!.events.push(e);
        });
      });
    } else {
      events.forEach(e => {
        if (!e.venue) return;
        if (!map.has(e.venue.id)) map.set(e.venue.id, {profile: e.venue, events: []});
        map.get(e.venue.id)!.events.push(e);
      });
    }
    return Array.from(map.values()).sort(
      (a, b) => b.events.length - a.events.length,
    );
  }, [events, mode]);

  const sections = useMemo(
    () => groups.map(g => ({...g, data: g.events})),
    [groups],
  );

  const handleEventTap = (event: Event) => nav.navigate('EventDetail', {event});

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: t.bg.primary}]}
      edges={['top']}>
      <StatusBar barStyle={t.mode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.brand, {color: t.text.tertiary}]}>LINEUP</Text>
          <Text style={[styles.title, {color: t.text.primary}]}>
            {mode === 'dj' ? 'By Artist' : 'By Venue'}
          </Text>
        </View>
      </View>

      {/* Segmented control */}
      <View
        style={[
          styles.segmentWrap,
          {backgroundColor: t.bg.secondary, borderColor: t.border.subtle},
        ]}>
        <SegmentButton
          label="By DJ"
          active={mode === 'dj'}
          onPress={() => setMode('dj')}
          activeBg={t.accents.aurora.base}
          activeText={t.bg.primary}
          inactiveText={t.text.secondary}
        />
        <SegmentButton
          label="By Venue"
          active={mode === 'venue'}
          onPress={() => setMode('venue')}
          activeBg={t.accents.aurora.base}
          activeText={t.bg.primary}
          inactiveText={t.text.secondary}
        />
      </View>

      {groups.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, {color: t.text.tertiary}]}>
            {mode === 'dj'
              ? 'No artists with upcoming events yet.'
              : 'No venues with upcoming events yet.'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections as any}
          keyExtractor={(item, i) => `${item.id}-${i}`}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{paddingBottom: 24}}
          renderSectionHeader={({section}) => (
            <GroupHeader
              profile={(section as any).profile}
              count={(section as any).events.length}
              theme={t}
            />
          )}
          renderItem={({item, index, section}) => (
            <EventRow
              event={item as Event}
              theme={t}
              showVenue={mode === 'dj'}
              isLast={index === (section as any).events.length - 1}
              onPress={() => handleEventTap(item as Event)}
            />
          )}
          SectionSeparatorComponent={() => <View style={{height: 14}} />}
        />
      )}
    </SafeAreaView>
  );
};

const SegmentButton: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
  activeBg: string;
  activeText: string;
  inactiveText: string;
}> = ({label, active, onPress, activeBg, activeText, inactiveText}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    style={[
      styles.segBtn,
      active && {backgroundColor: activeBg},
    ]}>
    <Text
      style={{
        color: active ? activeText : inactiveText,
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
      }}>
      {label}
    </Text>
  </TouchableOpacity>
);

const GroupHeader: React.FC<{profile: Profile; count: number; theme: any}> = ({
  profile,
  count,
  theme: t,
}) => (
  <View style={styles.groupHeader}>
    {profile.avatar_url ? (
      <Image source={{uri: profile.avatar_url}} style={styles.avatar} />
    ) : (
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: t.bg.secondary,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}>
        <Text style={{color: t.text.tertiary, fontSize: 18}}>
          {profile.display_name.charAt(0)}
        </Text>
      </View>
    )}
    <View style={{flex: 1, marginLeft: 12}}>
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        <Text
          style={[styles.groupName, {color: t.text.primary}]}
          numberOfLines={1}>
          {profile.display_name}
        </Text>
        {profile.verified && (
          <Text style={{color: t.accents.beam.base, marginLeft: 6, fontSize: 14}}>
            ✓
          </Text>
        )}
      </View>
      {profile.tagline ? (
        <Text
          style={[styles.groupTagline, {color: t.text.tertiary}]}
          numberOfLines={1}>
          {profile.tagline}
        </Text>
      ) : null}
    </View>
    <View
      style={[
        styles.countPill,
        {backgroundColor: t.bg.secondary, borderColor: t.border.subtle},
      ]}>
      <Text style={{color: t.text.secondary, fontSize: 11, fontWeight: '700'}}>
        {count} {count === 1 ? 'show' : 'shows'}
      </Text>
    </View>
  </View>
);

const EventRow: React.FC<{
  event: Event;
  theme: any;
  showVenue: boolean;
  isLast: boolean;
  onPress: () => void;
}> = ({event, theme: t, showVenue, isLast, onPress}) => {
  const dateLabel = formatDate(event.date);
  const subline = showVenue
    ? event.venue?.display_name ?? ''
    : event.hosts.map(h => h.display_name).join(' · ');
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.eventRow,
        {
          backgroundColor: t.bg.secondary,
          borderColor: t.border.subtle,
          marginBottom: isLast ? 0 : 8,
        },
      ]}>
      {event.flyer_url ? (
        <Image source={{uri: event.flyer_url}} style={styles.flyerThumb} />
      ) : (
        <View
          style={[
            styles.flyerThumb,
            {backgroundColor: t.bg.primary, alignItems: 'center', justifyContent: 'center'},
          ]}>
          <Text style={{color: t.text.tertiary, fontSize: 18}}>♫</Text>
        </View>
      )}
      <View style={{flex: 1, marginLeft: 12}}>
        <Text style={[styles.eventTitle, {color: t.text.primary}]} numberOfLines={1}>
          {event.title}
        </Text>
        {subline ? (
          <Text style={[styles.eventSub, {color: t.text.tertiary}]} numberOfLines={1}>
            {subline}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={[styles.meta, {color: t.text.secondary}]}>{dateLabel}</Text>
          {event.start_time ? (
            <Text style={[styles.metaDot, {color: t.text.tertiary}]}> · </Text>
          ) : null}
          {event.start_time ? (
            <Text style={[styles.meta, {color: t.text.secondary}]}>
              {event.start_time}
            </Text>
          ) : null}
          {event.cover_charge != null ? (
            <>
              <Text style={[styles.metaDot, {color: t.text.tertiary}]}> · </Text>
              <Text style={[styles.meta, {color: t.accents.beam.base}]}>
                ${event.cover_charge}
              </Text>
            </>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const formatDate = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
  },
  brand: {fontSize: 11, fontWeight: '700', letterSpacing: 3},
  title: {fontSize: 22, fontWeight: '800', marginTop: 2},
  segmentWrap: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 7,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  groupName: {fontSize: 16, fontWeight: '700'},
  groupTagline: {fontSize: 12, marginTop: 1},
  countPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    marginLeft: 8,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  flyerThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  eventTitle: {fontSize: 14, fontWeight: '700'},
  eventSub: {fontSize: 12, marginTop: 1},
  metaRow: {flexDirection: 'row', alignItems: 'center', marginTop: 4},
  meta: {fontSize: 11, fontWeight: '600'},
  metaDot: {fontSize: 11},
  emptyWrap: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32},
  emptyText: {fontSize: 13, textAlign: 'center'},
});
