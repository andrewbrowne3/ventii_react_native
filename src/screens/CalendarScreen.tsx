import React, {useState, useMemo} from 'react';
import {View, Text, ScrollView, Pressable, Image, StyleSheet, Dimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../hooks/useTheme';
import {RootState} from '../store/store';
import {Pill} from '../components/Pill';

const {width: W} = Dimensions.get('window');
const CELL = (W - 40 - 6 * 4) / 7;

export const CalendarScreen: React.FC = () => {
  const t = useTheme();
  const nav = useNavigation<any>();
  const events = useSelector((s: RootState) => s.feed.events);
  const savedIds = useSelector((s: RootState) => s.feed.saved);

  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const savedEvents = events.filter((e) => savedIds.includes(e.id));

  const eventsByDate = useMemo(() => {
    const m: Record<string, typeof events> = {};
    for (const e of savedEvents) {
      const key = e.date;
      if (!m[key]) m[key] = [];
      m[key].push(e);
    }
    return m;
  }, [savedEvents]);

  const grid = buildMonthGrid(month);
  const monthLabel = month.toLocaleString('en-US', {month: 'long', year: 'numeric'});

  const visibleEvents = selectedDate ? eventsByDate[selectedDate] || [] : savedEvents;

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: t.bg.primary}]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, {color: t.text.primary}]}>Calendar</Text>
        <Text style={[styles.subtitle, {color: t.text.secondary}]}>
          {savedIds.length} saved {savedIds.length === 1 ? 'event' : 'events'}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Month nav */}
        <View style={styles.monthNav}>
          <Pressable
            onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            style={[styles.monthBtn, {borderColor: t.border.subtle}]}>
            <Text style={{color: t.text.primary}}>‹</Text>
          </Pressable>
          <Text style={{color: t.text.primary, fontSize: 18, fontWeight: '700'}}>{monthLabel}</Text>
          <Pressable
            onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            style={[styles.monthBtn, {borderColor: t.border.subtle}]}>
            <Text style={{color: t.text.primary}}>›</Text>
          </Pressable>
        </View>

        {/* Weekday header */}
        <View style={styles.weekHeader}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => (
            <Text key={w} style={{
              width: CELL, textAlign: 'center', fontSize: 11, fontWeight: '700',
              color: t.text.tertiary, letterSpacing: 0.5,
            }}>
              {w.toUpperCase()}
            </Text>
          ))}
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {grid.map((d, i) => {
            const inMonth = d.getMonth() === month.getMonth();
            const dateKey = d.toISOString().slice(0, 10);
            const isToday = sameDay(d, today);
            const isSelected = selectedDate === dateKey;
            const hasEvents = !!eventsByDate[dateKey];
            return (
              <Pressable
                key={i}
                onPress={() => setSelectedDate(isSelected ? null : dateKey)}
                style={[styles.cell, {backgroundColor: isSelected ? t.accents.aurora.bg : 'transparent'}]}>
                <Text style={{
                  color: !inMonth ? t.text.tertiary : isToday ? t.accents.aurora.base : t.text.primary,
                  fontWeight: isToday || isSelected ? '800' : '500',
                  fontSize: 14,
                }}>
                  {d.getDate()}
                </Text>
                {hasEvents && <View style={[styles.dot, {backgroundColor: t.accents.aurora.base}]} />}
              </Pressable>
            );
          })}
        </View>

        {/* Saved events list */}
        <View style={{padding: 20, paddingTop: 10}}>
          <Text style={{color: t.text.tertiary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12}}>
            {selectedDate ? `SAVED — ${selectedDate}` : 'ALL SAVED'}
          </Text>
          {visibleEvents.length === 0 ? (
            <Text style={{color: t.text.secondary, paddingVertical: 20, textAlign: 'center'}}>
              {selectedDate ? 'Nothing saved for this day.' : 'Swipe up on events you like to save them here.'}
            </Text>
          ) : (
            <View style={{gap: 10}}>
              {visibleEvents.map((e) => (
                <Pressable
                  key={e.id}
                  onPress={() => nav.navigate('EventDetail', {event: e})}
                  style={[styles.savedRow, {backgroundColor: t.bg.secondary, borderColor: t.border.subtle}]}>
                  <Image source={{uri: e.flyer_url}} style={styles.savedImg} />
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
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

function buildMonthGrid(monthStart: Date): Date[] {
  const out: Date[] = [];
  const start = new Date(monthStart);
  start.setDate(1);
  start.setDate(1 - start.getDay()); // back to Sunday
  for (let i = 0; i < 42; i++) {
    out.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  return out;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12},
  title: {fontSize: 32, fontWeight: '800', letterSpacing: -0.5},
  subtitle: {fontSize: 14, marginTop: 4},
  monthNav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  monthBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  weekHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 6, gap: 4,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 20, gap: 4,
  },
  cell: {
    width: CELL, height: CELL,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: CELL / 2,
  },
  dot: {
    position: 'absolute', bottom: 6,
    width: 4, height: 4, borderRadius: 2,
  },
  savedRow: {
    flexDirection: 'row',
    borderRadius: 16, padding: 8, paddingRight: 14,
    borderWidth: 1,
  },
  savedImg: {width: 56, height: 56, borderRadius: 12},
});
