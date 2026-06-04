import React, {useEffect} from 'react';
import {View, Text, StatusBar, StyleSheet, TouchableOpacity} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTheme} from '../hooks/useTheme';
import {SwipeDeck} from '../components/SwipeDeck';
import {RootState, AppDispatch} from '../store/store';
import {swipe, resetDeck, fetchEvents} from '../store/slices/feedSlice';
import {Event} from '../types';

export const HomeFeedScreen: React.FC = () => {
  const t = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const nav = useNavigation<any>();
  const events = useSelector((s: RootState) => s.feed.events);
  const topIndex = useSelector((s: RootState) => s.feed.topIndex);

  // Pull the live event deck from the backend when the feed opens.
  useEffect(() => {
    dispatch(fetchEvents());
  }, [dispatch]);

  const handleSwipe = (dir: 'left' | 'right' | 'up') => dispatch(swipe(dir));
  const handleTap = (event: Event) => nav.navigate('EventDetail', {event});

  const visible = events.slice(topIndex, topIndex + 2);
  const remaining = events.length - topIndex;

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: t.bg.primary}]} edges={['top']}>
      <StatusBar barStyle={t.mode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.brand, {color: t.text.tertiary}]}>VENTII</Text>
          <Text style={[styles.location, {color: t.text.primary}]}>Atlanta, GA</Text>
        </View>
        <TouchableOpacity
          onPress={() => dispatch(resetDeck())}
          style={[
            styles.locationBtn,
            {backgroundColor: t.bg.secondary, borderColor: t.border.subtle},
          ]}>
          <Text style={{color: t.text.secondary, fontSize: 12, fontWeight: '600'}}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Deck */}
      <View style={styles.deckWrap}>
        <SwipeDeck
          events={events}
          topIndex={topIndex}
          onSwipe={handleSwipe}
          onCardTap={handleTap}
        />
      </View>

      {/* Action row */}
      <View style={styles.actions}>
        <ActionButton color={t.status.danger} label="✕" onPress={() => handleSwipe('left')} />
        <ActionButton color={t.accents.glow.base} label="★" onPress={() => handleSwipe('up')} size={56} />
        <ActionButton color={t.accents.deal.base} label="✓" onPress={() => handleSwipe('right')} />
      </View>

      <Text style={[styles.footer, {color: t.text.tertiary}]}>
        {remaining > 0 ? `${remaining} more this week` : 'All caught up'}
      </Text>
    </SafeAreaView>
  );
};

const ActionButton: React.FC<{color: string; label: string; onPress: () => void; size?: number}> = ({
  color, label, onPress, size = 56,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.82}
    style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderWidth: 1.4, borderColor: color,
      alignItems: 'center', justifyContent: 'center',
    }}>
    <Text style={{color, fontSize: 22, fontWeight: '700'}}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  brand: {fontSize: 11, fontWeight: '700', letterSpacing: 3},
  location: {fontSize: 22, fontWeight: '800', marginTop: 2},
  locationBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  deckWrap: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    paddingVertical: 16,
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    paddingBottom: 8,
  },
});
