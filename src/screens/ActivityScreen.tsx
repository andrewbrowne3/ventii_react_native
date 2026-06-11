import React, {useState} from 'react';
import {View, Text, ScrollView, StyleSheet, Pressable, Image, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {Plus, Search} from 'lucide-react-native';
import {useTheme} from '../hooks/useTheme';
import {Pill} from '../components/Pill';
import {RootState} from '../store/store';
import {GhostIconButton, ScreenHeader} from '../components/nav/ScreenHeader';
import {FLOATING_BAR_CLEARANCE} from '../components/nav/FloatingTabBar';

type Tab = 'Notifications' | 'RSVPs' | 'Plans';

const MOCK_NOTIFS = [
  {id: 'n1', icon: '🎟️', title: 'Tickets confirmed', detail: 'Dreams & Nightmares — 1× VIP', time: '2h ago', kind: 'success'},
  {id: 'n2', icon: '👥', title: 'Jordan saved Afrobeats in the A', detail: 'You saved this too', time: '5h ago', kind: 'info'},
  {id: 'n3', icon: '✨', title: 'Deal unlocked at Cherry Lounge', detail: '$5 Vodka Sodas tonight only', time: '1d ago', kind: 'deal'},
  {id: 'n4', icon: '📍', title: 'Rooftop Sundowner starts in 2h', detail: 'Doors at 5:00 PM · Park Tavern', time: 'Today', kind: 'warning'},
];

const MOCK_RSVPS = [
  {id: 'r1', friend: 'Maya', event: 'Dreams & Nightmares', going: true, avatar: 'https://picsum.photos/seed/maya/100'},
  {id: 'r2', friend: 'Aiden', event: 'Neon Jungle Rave', going: true, avatar: 'https://picsum.photos/seed/aiden/100'},
  {id: 'r3', friend: 'Priya', event: 'Mindful Mocktails', going: true, avatar: 'https://picsum.photos/seed/priya/100'},
];

const MOCK_PLANS = [
  {id: 'p1', name: 'Saturday Squad', members: 5, eventCount: 2, lastActivity: '20 min ago'},
  {id: 'p2', name: 'Run Club After-Brunch', members: 8, eventCount: 1, lastActivity: '3h ago'},
];

export const ActivityScreen: React.FC = () => {
  const t = useTheme();
  const nav = useNavigation<any>();
  const [tab, setTab] = useState<Tab>('Notifications');
  const tabs: Tab[] = ['Notifications', 'RSVPs', 'Plans'];

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: t.bg.primary}]} edges={['top']}>
      {/* Nav spec Part C — Activity: ＋ new message · tabs below · 🔍 search.
          (Wallet moved to the Calendar header's left slot per the spec.) */}
      <ScreenHeader
        left={
          <GhostIconButton
            label="New message"
            onPress={() => Alert.alert('Messages', 'Direct messages are coming soon.')}>
            <Plus size={19} color={t.text.primary} />
          </GhostIconButton>
        }
        right={
          <GhostIconButton label="Search" onPress={() => nav.navigate('Search', {scope: 'activity'})}>
            <Search size={18} color={t.text.primary} />
          </GhostIconButton>
        }
      />

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

      <ScrollView contentContainerStyle={{padding: 20, gap: 10, paddingBottom: FLOATING_BAR_CLEARANCE}}>
        {tab === 'Notifications' && MOCK_NOTIFS.map((n) => (
          <View key={n.id} style={[styles.notifRow, {backgroundColor: t.bg.secondary, borderColor: t.border.subtle}]}>
            <Text style={{fontSize: 22}}>{n.icon}</Text>
            <View style={{flex: 1}}>
              <Text style={{color: t.text.primary, fontWeight: '700', fontSize: 14}}>{n.title}</Text>
              <Text style={{color: t.text.secondary, fontSize: 12.5, marginTop: 2}}>{n.detail}</Text>
              <Text style={{color: t.text.tertiary, fontSize: 11, marginTop: 4}}>{n.time}</Text>
            </View>
          </View>
        ))}

        {tab === 'RSVPs' && MOCK_RSVPS.map((r) => (
          <View key={r.id} style={[styles.notifRow, {backgroundColor: t.bg.secondary, borderColor: t.border.subtle}]}>
            <Image source={{uri: r.avatar}} style={{width: 38, height: 38, borderRadius: 19}} />
            <View style={{flex: 1}}>
              <Text style={{color: t.text.primary, fontSize: 14}}>
                <Text style={{fontWeight: '800'}}>{r.friend}</Text> is going to
              </Text>
              <Text style={{color: t.text.primary, fontWeight: '700', marginTop: 2, fontSize: 13}}>
                {r.event}
              </Text>
            </View>
            <Pill label="Going" accent="deal" size="sm" />
          </View>
        ))}

        {tab === 'Plans' && MOCK_PLANS.map((p) => (
          <View key={p.id} style={[styles.planCard, {backgroundColor: t.bg.secondary, borderColor: t.border.subtle}]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <View>
                <Text style={{color: t.text.primary, fontSize: 16, fontWeight: '700'}}>{p.name}</Text>
                <Text style={{color: t.text.secondary, fontSize: 12.5, marginTop: 4}}>
                  {p.members} members · {p.eventCount} {p.eventCount === 1 ? 'event' : 'events'} planned
                </Text>
              </View>
              <Text style={{color: t.text.tertiary, fontSize: 11}}>{p.lastActivity}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12,
  },
  walletBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, position: 'relative',
  },
  walletBadge: {
    position: 'absolute',
    top: -2, right: -2,
    minWidth: 18, height: 18, borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  tabStrip: {flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth},
  tab: {flex: 1, paddingVertical: 12, alignItems: 'center'},
  indicator: {
    position: 'absolute', bottom: -1, left: '30%', right: '30%',
    height: 2.4, borderRadius: 1,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  planCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
});
