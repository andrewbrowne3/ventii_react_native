import React, {useState} from 'react';
import {View, Text, Image, ScrollView, Pressable, Share, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {MoreHorizontal, Settings} from 'lucide-react-native';
import {useTheme} from '../hooks/useTheme';
import {RootState} from '../store/store';
import {logoutUser} from '../store/slices/authSlice';
import {Pill} from '../components/Pill';
import AmbientBackground from '../components/AmbientBackground';
import GlassView from '../components/GlassView';
import ProfileHero from '../components/profile/ProfileHero';
import ProfileTabStrip from '../components/profile/ProfileTabStrip';
import {GhostIconButton, ScreenHeader} from '../components/nav/ScreenHeader';
import {FLOATING_BAR_CLEARANCE} from '../components/nav/FloatingTabBar';

type Tab = 'Saved' | 'Going' | 'Communities' | 'About';

export const ProfileScreen: React.FC = () => {
  const t = useTheme();
  const nav = useNavigation<any>();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const events = useSelector((s: RootState) => s.feed.events);
  const savedIds = useSelector((s: RootState) => s.feed.saved);
  const tickets = useSelector((s: RootState) => s.wallet.tickets);
  const [tab, setTab] = useState<Tab>('Saved');

  const tabs: Tab[] = ['Saved', 'Going', 'Communities', 'About'];
  const saved = events.filter((e) => savedIds.includes(e.id));
  const going = events.filter((e) => tickets.some((tk) => tk.event.id === e.id));

  return (
    <AmbientBackground>
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Nav spec Part C — Profile: ⚙ settings · name/handle · ⋯ menu.
            (No search on the profile, per the right-slot rule.) */}
        <ScreenHeader
          left={
            <GhostIconButton label="Settings" onPress={() => nav.navigate('Settings')}>
              <Settings size={19} color={t.text.primary} />
            </GhostIconButton>
          }
          center={
            <Text
              style={{color: t.text.tertiary, fontSize: 13, fontWeight: '600', textAlign: 'center'}}
              numberOfLines={1}>
              @{user?.username || 'you'}
            </Text>
          }
          right={
            <GhostIconButton
              label="Menu"
              onPress={() =>
                Share.share({message: `Find me on VENTII — @${user?.username || 'ventii'}`}).catch(() => {})
              }>
              <MoreHorizontal size={19} color={t.text.primary} />
            </GhostIconButton>
          }
        />

        {/* Hero — the canonical shared block (public profiles use it too) */}
        <ProfileHero
          avatarUrl={user?.profile_picture || 'https://picsum.photos/seed/demo_user/200'}
          name={user?.full_name || 'Demo User'}
          subtitle={`${user?.city || 'Atlanta'} · Member since 2026`}>
          <View style={{flexDirection: 'row', gap: 8, marginTop: 12}}>
            <Pill label="Rooftop fan" accent="aurora" size="sm" />
            <Pill label="Afrobeats" accent="beam" size="sm" />
            <Pill label="Late nights" accent="glow" size="sm" />
          </View>
        </ProfileHero>

        {/* Stats row */}
        <View style={styles.stats}>
          <Stat n={saved.length} label="Saved" t={t} />
          <Stat n={going.length} label="Going" t={t} />
          <Stat n={3} label="Plans" t={t} />
          <Stat n={1} label="Hosted" t={t} />
        </View>

        {/* Tabs — shared strip */}
        <ProfileTabStrip
          tabs={tabs}
          active={tab}
          onChange={(label) => setTab(label as Tab)}
        />

        {/* Tab content */}
        <View style={{padding: 20, paddingBottom: FLOATING_BAR_CLEARANCE}}>
          {tab === 'Saved' && (saved.length === 0 ? (
            <Text style={{color: t.text.secondary, textAlign: 'center', paddingVertical: 30}}>
              Nothing saved yet. Swipe up on events you like.
            </Text>
          ) : (
            <View style={{gap: 10}}>
              {saved.map((e) => (
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
                        {e.venue.display_name}
                      </Text>
                    </View>
                  </View>
                  </GlassView>
                </Pressable>
              ))}
            </View>
          ))}

          {tab === 'Going' && (going.length === 0 ? (
            <Text style={{color: t.text.secondary, textAlign: 'center', paddingVertical: 30}}>
              Not going to anything yet. Grab tickets and they'll show up here.
            </Text>
          ) : (
            <View style={{gap: 10}}>
              {going.map((e) => (
                <Pressable key={e.id} onPress={() => nav.navigate('EventDetail', {event: e})}>
                  <GlassView variant="panel" radius={14}>
                  <View style={styles.row}>
                    <Image source={{uri: e.flyer_url}} style={styles.thumb} />
                    <View style={{flex: 1, marginLeft: 12, justifyContent: 'center'}}>
                      <Text style={{color: t.accents.deal.base, fontSize: 11, fontWeight: '800', letterSpacing: 1}}>
                        CONFIRMED
                      </Text>
                      <Text style={{color: t.text.primary, fontSize: 15, fontWeight: '700', marginTop: 3}} numberOfLines={1}>
                        {e.title}
                      </Text>
                      <Text style={{color: t.text.secondary, fontSize: 12, marginTop: 2}} numberOfLines={1}>
                        {e.date} · {e.venue.display_name}
                      </Text>
                    </View>
                  </View>
                  </GlassView>
                </Pressable>
              ))}
            </View>
          ))}

          {tab === 'Communities' && (
            <Text style={{color: t.text.secondary, textAlign: 'center', paddingVertical: 30}}>
              Join communities to see them here.
            </Text>
          )}

          {tab === 'About' && (
            <View style={{gap: 14}}>
              <View>
                <Text style={{color: t.text.tertiary, fontSize: 11, fontWeight: '700', letterSpacing: 1.2}}>
                  EMAIL
                </Text>
                <Text style={{color: t.text.primary, fontSize: 14, marginTop: 4}}>
                  {user?.email || 'demo@ventii.app'}
                </Text>
              </View>
              <View>
                <Text style={{color: t.text.tertiary, fontSize: 11, fontWeight: '700', letterSpacing: 1.2}}>
                  CITY
                </Text>
                <Text style={{color: t.text.primary, fontSize: 14, marginTop: 4}}>
                  {user?.city || 'Atlanta'}
                </Text>
              </View>
              <Pressable
                onPress={() => nav.navigate('HostScan')}
                style={[styles.logoutBtn, {borderColor: t.border.strong}]}>
                <Text style={{color: t.text.primary, fontWeight: '700'}}>Scan Tickets (Host)</Text>
              </Pressable>
              <Pressable
                onPress={() => dispatch(logoutUser())}
                style={[styles.logoutBtn, {borderColor: t.status.danger}]}>
                <Text style={{color: t.status.danger, fontWeight: '700'}}>Sign Out</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
    </AmbientBackground>
  );
};

const Stat: React.FC<{n: number; label: string; t: any}> = ({n, label, t}) => (
  <View style={{flex: 1, alignItems: 'center'}}>
    <Text style={{color: t.text.primary, fontSize: 22, fontWeight: '800'}}>{n}</Text>
    <Text style={{color: t.text.tertiary, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 2}}>
      {label.toUpperCase()}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1},
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4, paddingBottom: 6,
  },
  handle: {fontSize: 13, fontWeight: '600'},
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  stats: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
    padding: 8, paddingRight: 14,
  },
  thumb: {width: 56, height: 56, borderRadius: 10},
  logoutBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    borderWidth: 1.4,
  },
});
