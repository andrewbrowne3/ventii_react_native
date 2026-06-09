/**
 * Home feed — vertical timeline of event cards. A profile (e.g. a DJ) with
 * several events shows as ONE card with a horizontal IMAGE carousel inside:
 * the flyer images stack to the right (you see the borders of the next images),
 * and swiping the image flips through that profile's events. Every piece of
 * info in the card (host header, title, date, tags, heart, "1 of N") re-renders
 * for whichever event you're on — the card itself stays put.
 *
 * Top nav: For You / Following / Deals / Explore (neutral selected pill).
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  StatusBar,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  Dimensions,
  FlatList,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {GestureDetector, Gesture} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {Heart, Send, BarChart2, Calendar, Star, Ticket, ChevronRight, MoreHorizontal} from 'lucide-react-native';

import {useTheme} from '../hooks/useTheme';
import {RootState, AppDispatch} from '../store/store';
import {fetchEvents, toggleSaved} from '../store/slices/feedSlice';
import {Event} from '../types';
import {HostStack} from '../components/HostStack';
import AmbientBackground from '../components/AmbientBackground';
import GlassView from '../components/GlassView';

const {width: W} = Dimensions.get('window');
const CARD_W = W - 32;
const SWIPE_THRESHOLD = 55;
const LIKE_PINK = '#F472B6';

const TABS = ['For You', 'Following', 'Deals', 'Explore'] as const;
type Tab = (typeof TABS)[number];

// One deck per host (DJ). An event with several DJs appears in EACH of their
// decks — the feed is "hosts and their events aggregated." Events with no host
// fall back to their venue, then to the event itself, so nothing is dropped.
type Deck = {key: string; host: any | null; events: Event[]};

function groupByHost(events: Event[]): Deck[] {
  const decks: Record<string, Deck> = {};
  const order: string[] = [];
  const push = (key: string, host: any | null, e: Event) => {
    if (!decks[key]) {
      decks[key] = {key, host, events: []};
      order.push(key);
    }
    decks[key].events.push(e);
  };
  for (const e of events) {
    if (e.hosts?.length) {
      for (const h of e.hosts) push(h.id, h, e);
    } else if (e.venue) {
      push(e.venue.id, e.venue, e);
    } else {
      push(e.id, null, e);
    }
  }
  return order.map((k) => decks[k]);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'});
}

// ───── tag-rail pills ───────────────────────────────────────────────────────

const DealPill: React.FC<{t: any}> = ({t}) => (
  <View style={[styles.pill, {backgroundColor: t.accents.deal.bg, borderColor: t.accents.deal.base}]}>
    <Star size={11} color={t.accents.deal.base} fill={t.accents.deal.base} />
    <Text style={{color: t.accents.deal.base, fontSize: 11, fontWeight: '700'}}>Deal</Text>
    <ChevronRight size={12} color={t.accents.deal.base} />
  </View>
);

const TicketPill: React.FC<{t: any}> = ({t}) => (
  <View style={[styles.pill, {backgroundColor: t.bg.elevated, borderColor: t.border.subtle}]}>
    <Ticket size={12} color={t.text.primary} />
    <Text style={{color: t.text.primary, fontSize: 11, fontWeight: '700'}}>Ticket</Text>
    <ChevronRight size={12} color={t.text.secondary} />
  </View>
);

const TagPill: React.FC<{label: string; t: any}> = ({label, t}) => (
  <View style={[styles.pill, {backgroundColor: t.bg.secondary, borderColor: t.border.subtle}]}>
    <Text style={{color: t.text.secondary, fontSize: 11, fontWeight: '600'}}>{label}</Text>
  </View>
);

const ActionButton: React.FC<{children: React.ReactNode; active?: boolean; onPress?: () => void; t: any}> = ({
  children,
  active,
  onPress,
  t,
}) => (
  <Pressable
    onPress={onPress}
    hitSlop={6}
    style={{
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      backgroundColor: active ? 'rgba(244,114,182,0.16)' : t.bg.elevated,
      borderColor: active ? 'rgba(244,114,182,0.5)' : t.border.subtle,
    }}>
    {children}
  </Pressable>
);

// ───── one card = one profile's events, with a horizontal image carousel ───

const EventCard: React.FC<{
  events: Event[];
  host: any | null;
  onSave: (id: string) => void;
  onOpen: (e: Event) => void;
  t: any;
}> = React.memo(({events, host, onSave, onOpen, t}) => {
  const [idx, setIdx] = useState(0);
  const dragX = useSharedValue(0);
  // Which side the incoming flyer enters from on the next index change:
  // +1 = advanced (enters from the right), -1 = went back (enters from the left).
  const pendingDir = useRef(0);
  const multi = events.length > 1;
  // Clamp idx — if events shrinks (tab switch filters out the event we were on),
  // FlatList reuses this EventCard instance and idx may now be out of bounds.
  const safeIdx = Math.min(idx, Math.max(events.length - 1, 0));
  const active = events[safeIdx];
  // Only this card's active event subscribes to saved-state, so a heart tap
  // re-renders just the touched card, not the whole feed.
  const saved = useSelector((s: RootState) => s.feed.saved.includes(active.id));
  useEffect(() => {
    if (idx !== safeIdx) setIdx(safeIdx);
  }, [idx, safeIdx]);

  const advance = useCallback((nextIdx: number, dir: number) => {
    pendingDir.current = dir;
    setIdx(nextIdx);
  }, []);

  // Spring the incoming card in AFTER React has swapped to the new image, so the
  // entrance animates the new flyer. Doing this inline in the gesture callback
  // raced the async setIdx and briefly sprang the OLD image back in (the flash).
  useEffect(() => {
    if (pendingDir.current === 0) return;
    const from = pendingDir.current > 0 ? W : -W;
    pendingDir.current = 0;
    dragX.value = from;
    dragX.value = withSpring(0, {damping: 20, stiffness: 170});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // Header reflects THIS deck's host (the DJ the deck is grouped under), with the
  // active event's other hosts counted as "+N others hosting".
  const primary = host?.display_name ?? active.hosts?.[0]?.display_name ?? active.venue?.display_name ?? 'Host';
  const otherHosts = (active.hosts ?? []).filter((h) => h.id !== host?.id);
  const others = otherHosts.length;
  const orderedHosts = host && active.hosts?.some((h) => h.id === host.id) ? [host, ...otherHosts] : active.hosts ?? [];
  const hostLabel =
    others > 0 ? `${primary} + ${others} other${others > 1 ? 's' : ''} hosting` : `${primary} is hosting`;

  // Horizontal swipe ON THE IMAGE flips through the profile's events.
  // Advances on either distance OR a fast flick; the outgoing card animates
  // off-screen, the index swaps while hidden, and the new card springs in from
  // the opposite side — so it reads as a real carousel, not a snap-back.
  const gesture = Gesture.Pan()
    .enabled(multi)
    .activeOffsetX([-10, 10])
    .failOffsetY([-16, 16])
    .onChange((e) => {
      dragX.value = e.translationX;
    })
    .onEnd((e) => {
      const fling = Math.abs(e.velocityX) > 550;
      const goNext = (e.translationX < -SWIPE_THRESHOLD || (fling && e.velocityX < 0)) && safeIdx < events.length - 1;
      const goPrev = (e.translationX > SWIPE_THRESHOLD || (fling && e.velocityX > 0)) && safeIdx > 0;
      if (goNext) {
        dragX.value = withTiming(-W, {duration: 170}, (done) => {
          if (done) runOnJS(advance)(safeIdx + 1, 1);
        });
      } else if (goPrev) {
        dragX.value = withTiming(W, {duration: 170}, (done) => {
          if (done) runOnJS(advance)(safeIdx - 1, -1);
        });
      } else {
        // didn't cross — ease back with the finger's momentum
        dragX.value = withSpring(0, {damping: 22, stiffness: 220, velocity: e.velocityX});
      }
    });

  const activeImgStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: dragX.value},
      {rotate: `${interpolate(dragX.value, [-W, 0, W], [-4, 0, 4], Extrapolation.CLAMP)}deg`},
    ],
  }));

  return (
    <View style={styles.cardWrap}>
      <GlassView variant="card" radius={24} style={styles.card}>
        {/* Header — reads the active event */}
        <View style={styles.header}>
          {orderedHosts.length > 0 && <HostStack hosts={orderedHosts} size={28} showLabel={false} />}
          <Text style={{flex: 1, color: t.text.secondary, fontSize: 12.5, fontWeight: '500'}} numberOfLines={2}>
            {hostLabel}
          </Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            {multi && <Text style={{color: t.text.tertiary, fontSize: 12, fontWeight: '600'}}>{safeIdx + 1} of {events.length}</Text>}
            <MoreHorizontal size={18} color={t.text.tertiary} />
          </View>
        </View>

        {/* Image carousel — next flyers peek as borders on the RIGHT */}
        <View style={styles.flyerArea}>
          {multi &&
            events.slice(safeIdx + 1, safeIdx + 3).map((ev, i) => (
              <Image
                key={ev.id}
                source={{uri: ev.flyer_url}}
                resizeMode="cover"
                style={[
                  StyleSheet.absoluteFill,
                  styles.flyerImg,
                  {
                    backgroundColor: t.bg.elevated,
                    transform: [{translateX: (i + 1) * 12}, {scale: 1 - (i + 1) * 0.03}],
                    zIndex: -(i + 1),
                  },
                ]}
              />
            ))}
          <GestureDetector gesture={gesture}>
            <Animated.View style={[StyleSheet.absoluteFill, activeImgStyle]}>
              <Pressable onPress={() => onOpen(active)} style={{flex: 1}}>
                <Image source={{uri: active.flyer_url}} resizeMode="cover" style={[styles.flyerImg, {backgroundColor: t.bg.elevated}]} />
                <View style={styles.flyerFade} />
              </Pressable>
            </Animated.View>
          </GestureDetector>
        </View>

        {/* Footer — reads the active event */}
        <View style={styles.footer}>
          <Pressable onPress={() => onOpen(active)} style={{flex: 1, minWidth: 0}}>
            <Text style={[styles.title, {color: t.text.primary}]} numberOfLines={2}>
              {active.title}
            </Text>
            <View style={[styles.metaTile, {backgroundColor: t.bg.elevated, borderColor: t.border.subtle}]}>
              <Calendar size={12} color={t.text.secondary} />
              <Text style={{color: t.text.primary, fontSize: 11.5, fontWeight: '600'}} numberOfLines={1}>
                {[formatDate(active.date), active.start_time, active.venue?.display_name].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 6, alignItems: 'center'}}>
              {active.deals?.length > 0 && <DealPill t={t} />}
              {active.ticket_options?.length > 0 && <TicketPill t={t} />}
              {active.vibe_tags?.slice(0, 3).map((tag) => (
                <TagPill key={tag} label={tag} t={t} />
              ))}
            </ScrollView>
            {!!active.description && (
              <Text style={{color: t.text.tertiary, fontSize: 12.5, marginTop: 10}} numberOfLines={1}>
                {active.description}
              </Text>
            )}
          </Pressable>

          <View style={{gap: 10, alignItems: 'center'}}>
            <ActionButton active={saved} onPress={() => onSave(active.id)} t={t}>
              <Heart size={18} color={saved ? LIKE_PINK : t.text.secondary} fill={saved ? LIKE_PINK : 'transparent'} />
            </ActionButton>
            <ActionButton t={t}>
              <Send size={16} color={t.text.secondary} />
            </ActionButton>
            <ActionButton t={t}>
              <BarChart2 size={16} color={t.text.secondary} />
            </ActionButton>
          </View>
        </View>
      </GlassView>
    </View>
  );
});
EventCard.displayName = 'EventCard';

// ───── top nav ───────────────────────────────────────────────────────────────

const FeedTopNav: React.FC<{tab: Tab; setTab: (t: Tab) => void; t: any}> = ({tab, setTab, t}) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topNav}>
    {TABS.map((label) => {
      const active = tab === label;
      return (
        <Pressable
          key={label}
          onPress={() => setTab(label)}
          style={[
            styles.navPill,
            {backgroundColor: active ? t.bg.elevated : 'transparent', borderColor: active ? t.border.subtle : 'transparent'},
          ]}>
          <Text style={{color: active ? t.text.primary : t.text.tertiary, fontSize: 13.5, fontWeight: active ? '700' : '600'}}>
            {label}
          </Text>
        </Pressable>
      );
    })}
  </ScrollView>
);

// ───── screen ──────────────────────────────────────────────────────────────

export const HomeFeedScreen: React.FC = () => {
  const t = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const nav = useNavigation<any>();
  const events = useSelector((s: RootState) => s.feed.events);
  const [tab, setTab] = useState<Tab>('For You');

  useEffect(() => {
    dispatch(fetchEvents());
  }, [dispatch]);

  const groups = useMemo(() => {
    const base =
      tab === 'Deals'
        ? events.filter((e) => e.deals && e.deals.length > 0)
        : tab === 'Following'
        ? []
        : events;
    return groupByHost(base);
  }, [events, tab]);

  const onSave = useCallback((id: string) => dispatch(toggleSaved(id)), [dispatch]);
  const onOpen = useCallback(
    (e: Event) => nav.navigate('EventDetail', {event: e}),
    [nav],
  );

  return (
    <AmbientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle={t.mode === 'dark' ? 'light-content' : 'dark-content'} />

      <FeedTopNav tab={tab} setTab={setTab} t={t} />

      {tab === 'Following' ? (
        <View style={styles.empty}>
          <Text style={{color: t.text.primary, fontSize: 16, fontWeight: '700'}}>Nothing followed yet</Text>
          <Text style={{color: t.text.secondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 36}}>
            Follow venues, hosts, and DJs and their events will show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.key}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingTop: 6, paddingBottom: 28}}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={5}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{color: t.text.secondary}}>No events to show.</Text>
            </View>
          }
          renderItem={({item: group}) => (
            <EventCard
              events={group.events}
              host={group.host}
              onSave={onSave}
              onOpen={onOpen}
              t={t}
            />
          )}
        />
      )}
      </SafeAreaView>
    </AmbientBackground>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  topNav: {paddingHorizontal: 16, paddingBottom: 10, gap: 8},
  navPill: {paddingVertical: 7, paddingHorizontal: 16, borderRadius: 100, borderWidth: 1},

  cardWrap: {alignItems: 'center', marginBottom: 18, paddingHorizontal: 16},
  card: {
    width: CARD_W,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  // The flyer area does NOT clip, so the peeking images show on the right.
  flyerArea: {marginHorizontal: 12, aspectRatio: 3 / 4, position: 'relative'},
  flyerImg: {width: '100%', height: '100%', borderRadius: 18},
  flyerFade: {position: 'absolute', left: 0, right: 0, bottom: 0, height: '30%', backgroundColor: 'rgba(0,0,0,0.26)', borderBottomLeftRadius: 18, borderBottomRightRadius: 18},
  footer: {flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16},
  title: {fontSize: 18, fontWeight: '800', letterSpacing: -0.5, lineHeight: 22, marginBottom: 8},
  metaTile: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    maxWidth: '100%',
  },
  pill: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 50,
    borderWidth: 0.8,
  },
  empty: {paddingTop: 80, alignItems: 'center'},
});
