import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';

import {RootStackParamList} from '../types/navigation';
import {Deal, Event, Profile} from '../types';
import {RootState} from '../store/store';
import {toggleFollow} from '../store/slices/socialSlice';
import {fetchProfileEvents, followProfile, requestBooking} from '../services/api';
import {useTheme} from '../hooks/useTheme';
import {Pill} from '../components/Pill';
import AmbientBackground from '../components/AmbientBackground';
import GlassView from '../components/GlassView';
import ProfileHero from '../components/profile/ProfileHero';
import ProfileTabStrip from '../components/profile/ProfileTabStrip';

/**
 * Every profile that isn't the logged-in user: places (venues/restaurants),
 * talent (DJs/performers), communities, and brands. Per the profile spec's
 * #1 rule it shares the exact visual shell with ProfileScreen (ProfileHero +
 * ProfileTabStrip + the same glass row cards); only the tab CONTENT and the
 * CTA differ by profile type.
 */

// Tab sets per profile type (spec §4); capability flags trim them further.
const resolveTabs = (p: Profile, hasDeals: boolean): string[] => {
  switch (p.type) {
    case 'place':
      return ['Events', ...(hasDeals ? ['Deals'] : []), 'Info', 'Links'];
    case 'talent':
      return ['Vibe', 'Events', 'Links'];
    case 'community':
      return ['Events', 'Vibe', 'Links'];
    case 'brand':
    default:
      return ['Events', 'Info', 'Links'];
  }
};

const formatFollowers = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`;

export const PublicProfileScreen: React.FC = () => {
  const t = useTheme();
  const nav = useNavigation<any>();
  const dispatch = useDispatch();
  const route = useRoute<RouteProp<RootStackParamList, 'PublicProfile'>>();
  const {profile} = route.params;

  const feedEvents = useSelector((s: RootState) => s.feed.events);
  const following = useSelector((s: RootState) =>
    s.social.following.includes(profile.id),
  );

  const [events, setEvents] = useState<Event[] | null>(null);
  const [booking, setBooking] = useState(false);

  // Server first; fall back to events already in the feed that this profile
  // hosts or hosts-at, so the screen works offline / pre-deploy too.
  useEffect(() => {
    let alive = true;
    fetchProfileEvents(profile.id)
      .then((evs) => alive && setEvents(evs as Event[]))
      .catch(() => {
        if (!alive) return;
        setEvents(
          feedEvents.filter(
            (e) =>
              e.venue?.id === profile.id ||
              e.hosts?.some((h) => h.id === profile.id),
          ),
        );
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  const deals = useMemo(() => {
    const out: {deal: Deal; event: Event}[] = [];
    (events ?? []).forEach((e) =>
      (e.deals ?? []).forEach((deal) => out.push({deal, event: e})),
    );
    return out;
  }, [events]);

  const vibeTags = useMemo(() => {
    const set = new Set<string>();
    (events ?? []).forEach((e) => (e.vibe_tags ?? []).forEach((v) => set.add(v)));
    return [...set].slice(0, 6);
  }, [events]);

  const tabs = useMemo(
    () => resolveTabs(profile, deals.length > 0),
    [profile, deals.length],
  );
  const [tab, setTab] = useState(tabs[0]);
  useEffect(() => {
    if (!tabs.includes(tab)) setTab(tabs[0]);
  }, [tabs, tab]);

  const onFollow = () => {
    dispatch(toggleFollow(profile.id));
    // Best-effort server sync; local optimistic state is the UI truth.
    followProfile(profile.id, !following).catch(() => {});
  };

  const subtitleBits = [
    `${formatFollowers(profile.follower_count + (following ? 1 : 0))} followers`,
    profile.location?.neighborhood || profile.location?.city,
  ].filter(Boolean);

  return (
    <AmbientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header strip — same metrics as ProfileScreen's topRow */}
          <View style={styles.topRow}>
            <Pressable
              onPress={() => nav.goBack()}
              style={[styles.iconBtn, {backgroundColor: t.bg.secondary, borderColor: t.border.subtle}]}>
              <Text style={{color: t.text.primary, fontSize: 20, fontWeight: '700'}}>‹</Text>
            </Pressable>
            <Text style={[styles.handle, {color: t.text.tertiary}]}>@{profile.handle}</Text>
            {/* ⋯ menu (share) — nav spec: back · name/handle · kebab */}
            <Pressable
              onPress={() =>
                Share.share({message: `${profile.display_name} on VENTII — @${profile.handle}`}).catch(() => {})
              }
              style={[styles.iconBtn, {backgroundColor: t.bg.secondary, borderColor: t.border.subtle}]}>
              <Text style={{color: t.text.primary, fontSize: 16, fontWeight: '700'}}>⋯</Text>
            </Pressable>
          </View>

          <ProfileHero
            avatarUrl={profile.avatar_url}
            coverUrl={profile.cover_url}
            name={profile.display_name}
            verified={profile.verified}
            tagline={profile.tagline}
            subtitle={subtitleBits.join(' · ')}>
            {/* CTA row — Follow always (capability-gated), Book for talent */}
            <View style={{flexDirection: 'row', gap: 10, marginTop: 14}}>
              {profile.capabilities?.has_follow_cta !== false && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={onFollow}
                  style={[
                    styles.cta,
                    following
                      ? {backgroundColor: 'transparent', borderWidth: 1.4, borderColor: t.border.strong}
                      : {backgroundColor: t.accents.aurora.base},
                  ]}>
                  <Text
                    style={{
                      color: following ? t.text.primary : t.text.inverse,
                      fontWeight: '700',
                      fontSize: 14,
                    }}>
                    {following ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
              )}
              {profile.capabilities?.has_book_cta && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setBooking(true)}
                  style={[styles.cta, {borderWidth: 1.4, borderColor: t.accents.glow.deep}]}>
                  <Text style={{color: t.accents.glow.deep, fontWeight: '700', fontSize: 14}}>
                    Request to book
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ProfileHero>

          <ProfileTabStrip tabs={tabs} active={tab} onChange={setTab} />

          <View style={{padding: 20, paddingBottom: 40}}>
            {tab === 'Events' && <EventsTab events={events} t={t} nav={nav} />}
            {tab === 'Deals' && <DealsTab deals={deals} t={t} nav={nav} />}
            {tab === 'Vibe' && <VibeTab profile={profile} vibeTags={vibeTags} t={t} />}
            {tab === 'Info' && <InfoTab profile={profile} t={t} />}
            {tab === 'Links' && <LinksTab profile={profile} t={t} />}
          </View>
        </ScrollView>
      </SafeAreaView>

      <BookingRequestSheet
        visible={booking}
        profile={profile}
        t={t}
        onClose={() => setBooking(false)}
      />
    </AmbientBackground>
  );
};

// ───── tabs ──────────────────────────────────────────────────────────────

const EventsTab: React.FC<{events: Event[] | null; t: any; nav: any}> = ({events, t, nav}) => {
  if (events === null) {
    return <ActivityIndicator style={{paddingVertical: 30}} color={t.text.tertiary} />;
  }
  if (events.length === 0) {
    return <EmptyNote t={t} text="No upcoming events." />;
  }
  return (
    <View style={{gap: 10}}>
      {events.map((e) => (
        <Pressable key={e.id} onPress={() => nav.navigate('EventDetail', {event: e})}>
          <GlassView variant="panel" radius={14}>
            <View style={styles.row}>
              <Image source={{uri: e.flyer_url}} style={styles.thumb} />
              <View style={{flex: 1, marginLeft: 12, justifyContent: 'center'}}>
                <Text style={{color: t.text.tertiary, fontSize: 11, fontWeight: '700', letterSpacing: 1}}>
                  {e.date} · {e.start_time}
                </Text>
                <Text style={{color: t.text.primary, fontSize: 15, fontWeight: '700', marginTop: 3}} numberOfLines={1}>
                  {e.title}
                </Text>
                <Text style={{color: t.text.secondary, fontSize: 12, marginTop: 2}} numberOfLines={1}>
                  {e.venue?.display_name}
                </Text>
              </View>
            </View>
          </GlassView>
        </Pressable>
      ))}
    </View>
  );
};

const DealsTab: React.FC<{deals: {deal: Deal; event: Event}[]; t: any; nav: any}> = ({deals, t, nav}) => (
  <View style={{gap: 10}}>
    {deals.length === 0 ? (
      <EmptyNote t={t} text="No deals right now." />
    ) : (
      deals.map(({deal, event}) => (
        <Pressable key={deal.id} onPress={() => nav.navigate('EventDetail', {event})}>
          <View
            style={{
              backgroundColor: t.accents.deal.bg,
              borderColor: t.accents.deal.base,
              borderWidth: 1,
              borderRadius: 14,
              padding: 14,
            }}>
            <Text style={{color: t.accents.deal.base, fontSize: 11, fontWeight: '700', letterSpacing: 1.2}}>
              DEAL
            </Text>
            <Text style={{color: t.text.primary, fontSize: 15, fontWeight: '700', marginTop: 4}}>
              {deal.title}
            </Text>
            <Text style={{color: t.text.secondary, fontSize: 12.5, marginTop: 2}} numberOfLines={2}>
              {deal.description}
            </Text>
          </View>
        </Pressable>
      ))
    )}
  </View>
);

const VibeTab: React.FC<{profile: Profile; vibeTags: string[]; t: any}> = ({profile, vibeTags, t}) => (
  <View style={{gap: 16}}>
    {!!profile.bio && (
      <Text style={{color: t.text.secondary, fontSize: 15, lineHeight: 22}}>{profile.bio}</Text>
    )}
    {vibeTags.length > 0 && (
      <View>
        <Text style={{color: t.text.tertiary, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10}}>
          VIBE
        </Text>
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
          {vibeTags.map((tag) => (
            <Pill key={tag} label={tag} accent="aurora" />
          ))}
        </View>
      </View>
    )}
    {!profile.bio && vibeTags.length === 0 && <EmptyNote t={t} text="Nothing here yet." />}
  </View>
);

const InfoTab: React.FC<{profile: Profile; t: any}> = ({profile, t}) => (
  <View style={{gap: 4}}>
    {!!profile.bio && (
      <Text style={{color: t.text.secondary, fontSize: 14.5, lineHeight: 21, marginBottom: 12}}>
        {profile.bio}
      </Text>
    )}
    <InfoRow label="Type" value={profile.type} t={t} />
    <InfoRow label="City" value={profile.location?.city || '—'} t={t} />
    <InfoRow label="Neighborhood" value={profile.location?.neighborhood || '—'} t={t} />
    <InfoRow label="Followers" value={formatFollowers(profile.follower_count)} t={t} />
  </View>
);

const LinksTab: React.FC<{profile: Profile; t: any}> = ({profile, t}) => {
  const links = [
    profile.social?.instagram
      ? {label: 'Instagram', sub: `@${profile.social.instagram.replace(/^@/, '')}`, url: `https://instagram.com/${profile.social.instagram.replace(/^@/, '')}`}
      : null,
    profile.social?.website
      ? {label: 'Website', sub: profile.social.website.replace(/^https?:\/\//, ''), url: profile.social.website}
      : null,
  ].filter(Boolean) as {label: string; sub: string; url: string}[];

  if (links.length === 0) return <EmptyNote t={t} text="No links yet." />;
  return (
    <View style={{gap: 10}}>
      {links.map((l) => (
        <Pressable key={l.label} onPress={() => Linking.openURL(l.url).catch(() => {})}>
          <GlassView variant="panel" radius={14}>
            <View style={[styles.row, {alignItems: 'center', padding: 14}]}>
              <View style={{flex: 1}}>
                <Text style={{color: t.text.primary, fontSize: 14.5, fontWeight: '700'}}>{l.label}</Text>
                <Text style={{color: t.text.secondary, fontSize: 12.5, marginTop: 2}}>{l.sub}</Text>
              </View>
              <Text style={{color: t.text.tertiary, fontSize: 16}}>↗</Text>
            </View>
          </GlassView>
        </Pressable>
      ))}
    </View>
  );
};

const InfoRow: React.FC<{label: string; value: string; t: any}> = ({label, value, t}) => (
  <View
    style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: t.border.subtle,
    }}>
    <Text style={{color: t.text.tertiary, fontSize: 13, fontWeight: '600'}}>{label}</Text>
    <Text style={{color: t.text.primary, fontSize: 14, fontWeight: '600', textTransform: label === 'Type' ? 'capitalize' : 'none'}}>
      {value}
    </Text>
  </View>
);

const EmptyNote: React.FC<{t: any; text: string}> = ({t, text}) => (
  <Text style={{color: t.text.secondary, textAlign: 'center', paddingVertical: 30}}>{text}</Text>
);

// ───── booking request sheet (spec §4 — talent/place book CTA) ────────────

const BookingRequestSheet: React.FC<{
  visible: boolean;
  profile: Profile;
  t: any;
  onClose: () => void;
}> = ({visible, profile, t, onClose}) => {
  const [date, setDate] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await requestBooking(profile.id, {date: date.trim() || undefined, message: message.trim()});
      onClose();
      Alert.alert('Request sent', `${profile.display_name} will get back to you.`);
      setDate('');
      setMessage('');
    } catch {
      Alert.alert('Couldn’t send', 'Booking requests aren’t available yet — try again soon.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.modalCard, {backgroundColor: t.bg.elevated, borderColor: t.border.subtle}]}
          onPress={() => {}}>
          <Text style={{color: t.text.primary, fontSize: 18, fontWeight: '800'}}>
            Book {profile.display_name}
          </Text>
          <Text style={{color: t.text.secondary, marginTop: 4, fontSize: 13}}>
            Share the date and details — they’ll reply in your inbox.
          </Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="Date (e.g. Fri, Jul 10)"
            placeholderTextColor={t.text.tertiary}
            style={[styles.input, {color: t.text.primary, backgroundColor: t.bg.secondary, borderColor: t.border.subtle}]}
          />
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Event type, budget, party size…"
            placeholderTextColor={t.text.tertiary}
            multiline
            style={[
              styles.input,
              {color: t.text.primary, backgroundColor: t.bg.secondary, borderColor: t.border.subtle, height: 90, textAlignVertical: 'top'},
            ]}
          />
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={busy || !message.trim()}
            onPress={submit}
            style={{
              marginTop: 14,
              paddingVertical: 13,
              borderRadius: 100,
              alignItems: 'center',
              backgroundColor: message.trim() ? t.accents.aurora.base : t.bg.secondary,
            }}>
            {busy ? (
              <ActivityIndicator color={t.text.inverse} />
            ) : (
              <Text style={{color: message.trim() ? t.text.inverse : t.text.tertiary, fontWeight: '700'}}>
                Send request
              </Text>
            )}
          </TouchableOpacity>
          <Pressable onPress={onClose} style={{marginTop: 10, alignItems: 'center'}}>
            <Text style={{color: t.text.tertiary, fontWeight: '600'}}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 6,
  },
  handle: {fontSize: 13, fontWeight: '600'},
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cta: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 100,
    alignItems: 'center',
    minWidth: 120,
  },
  row: {flexDirection: 'row', padding: 8, paddingRight: 14},
  thumb: {width: 56, height: 56, borderRadius: 10},
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 22,
    paddingBottom: 34,
  },
  input: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
  },
});
