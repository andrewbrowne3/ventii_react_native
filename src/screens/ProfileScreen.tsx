import React, {useState} from 'react';
import {View, Text, Image, ScrollView, Pressable, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../hooks/useTheme';
import {RootState} from '../store/store';
import {logoutUser} from '../store/slices/authSlice';
import {Pill} from '../components/Pill';

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
    <SafeAreaView style={[styles.container, {backgroundColor: t.bg.primary}]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header strip */}
        <View style={styles.topRow}>
          <Text style={[styles.handle, {color: t.text.tertiary}]}>
            @{user?.username || 'you'}
          </Text>
          <Pressable
            onPress={() => nav.navigate('Settings')}
            style={[styles.iconBtn, {backgroundColor: t.bg.secondary, borderColor: t.border.subtle}]}>
            <Text style={{color: t.text.primary, fontSize: 16, fontWeight: '700'}}>⚙</Text>
          </Pressable>
        </View>

        {/* Avatar block */}
        <View style={styles.avatarBlock}>
          <Image
            source={{uri: user?.profile_picture || 'https://picsum.photos/seed/demo_user/200'}}
            style={styles.avatar}
          />
          <Text style={[styles.name, {color: t.text.primary}]}>
            {user?.full_name || 'Demo User'}
          </Text>
          <Text style={[styles.city, {color: t.text.secondary}]}>
            {user?.city || 'Atlanta'} · Member since 2026
          </Text>

          <View style={{flexDirection: 'row', gap: 8, marginTop: 12}}>
            <Pill label="Rooftop fan" accent="aurora" size="sm" />
            <Pill label="Afrobeats" accent="beam" size="sm" />
            <Pill label="Late nights" accent="glow" size="sm" />
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.stats}>
          <Stat n={saved.length} label="Saved" t={t} />
          <Stat n={going.length} label="Going" t={t} />
          <Stat n={3} label="Plans" t={t} />
          <Stat n={1} label="Hosted" t={t} />
        </View>

        {/* Tabs */}
        <View style={[styles.tabStrip, {borderBottomColor: t.border.subtle}]}>
          {tabs.map((label) => {
            const active = tab === label;
            return (
              <Pressable key={label} onPress={() => setTab(label)} style={styles.tab}>
                <Text style={{
                  color: active ? t.text.primary : t.text.tertiary,
                  fontWeight: active ? '700' : '500',
                  fontSize: 13.5,
                }}>{label}</Text>
                {active && <View style={[styles.indicator, {backgroundColor: t.text.primary}]} />}
              </Pressable>
            );
          })}
        </View>

        {/* Tab content */}
        <View style={{padding: 20, paddingBottom: 40}}>
          {tab === 'Saved' && (saved.length === 0 ? (
            <Text style={{color: t.text.secondary, textAlign: 'center', paddingVertical: 30}}>
              Nothing saved yet. Swipe up on events you like.
            </Text>
          ) : (
            <View style={{gap: 10}}>
              {saved.map((e) => (
                <Pressable key={e.id} onPress={() => nav.navigate('EventDetail', {event: e})}
                  style={[styles.row, {backgroundColor: t.bg.secondary, borderColor: t.border.subtle}]}>
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
                <Pressable key={e.id} onPress={() => nav.navigate('EventDetail', {event: e})}
                  style={[styles.row, {backgroundColor: t.bg.secondary, borderColor: t.border.subtle}]}>
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
  avatarBlock: {alignItems: 'center', paddingTop: 12, paddingBottom: 20, paddingHorizontal: 20},
  avatar: {width: 90, height: 90, borderRadius: 45, marginBottom: 14},
  name: {fontSize: 24, fontWeight: '800', letterSpacing: -0.3},
  city: {fontSize: 13, marginTop: 4},
  stats: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 4,
  },
  tabStrip: {flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth},
  tab: {flex: 1, paddingVertical: 12, alignItems: 'center'},
  indicator: {
    position: 'absolute', bottom: -1, left: '30%', right: '30%',
    height: 2.4, borderRadius: 1,
  },
  row: {
    flexDirection: 'row',
    borderRadius: 14, padding: 8, paddingRight: 14,
    borderWidth: 1,
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
