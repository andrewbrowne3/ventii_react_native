import React, {useMemo, useState} from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {Search, X} from 'lucide-react-native';

import {RootState} from '../store/store';
import {RootStackParamList} from '../types/navigation';
import {Event} from '../types';
import {useTheme} from '../hooks/useTheme';
import AmbientBackground from '../components/AmbientBackground';
import GlassView from '../components/GlassView';

/**
 * Search — opened from the 🔍 header button on Home, Calendar, AI, and
 * Activity (nav spec Part C right-slot rule). Searches the loaded events
 * across title, venue, neighborhoods, vibe/music tags, and host names.
 */
export const SearchScreen: React.FC = () => {
  const t = useTheme();
  const nav = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'Search'>>();
  const scope = route.params?.scope;
  const events = useSelector((s: RootState) => s.feed.events);
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return events.filter((e) => {
      const hay = [
        e.title,
        e.description,
        e.venue?.display_name,
        e.venue?.location?.neighborhood,
        ...(e.vibe_tags ?? []),
        ...(e.music_tags ?? []),
        ...(e.hosts ?? []).map((h) => h.display_name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [q, events]);

  return (
    <AmbientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Search field row */}
        <View style={styles.searchRow}>
          <View style={[styles.field, {backgroundColor: t.bg.secondary, borderColor: t.border.subtle}]}>
            <Search size={16} color={t.text.tertiary} />
            <TextInput
              autoFocus
              value={q}
              onChangeText={setQ}
              placeholder={scope ? `Search ${scope}…` : 'Search events, venues, vibes…'}
              placeholderTextColor={t.text.tertiary}
              style={{flex: 1, color: t.text.primary, fontSize: 15, paddingVertical: 0}}
            />
            {q.length > 0 && (
              <Pressable onPress={() => setQ('')} hitSlop={8}>
                <X size={16} color={t.text.tertiary} />
              </Pressable>
            )}
          </View>
          <Pressable onPress={() => nav.goBack()} hitSlop={6} style={{paddingHorizontal: 4}}>
            <Text style={{color: t.text.secondary, fontWeight: '600', fontSize: 14}}>Cancel</Text>
          </Pressable>
        </View>

        <FlatList
          data={results}
          keyExtractor={(e) => e.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{padding: 16, gap: 10, paddingBottom: 40}}
          ListEmptyComponent={
            <Text style={{color: t.text.secondary, textAlign: 'center', paddingVertical: 40}}>
              {q.trim() ? 'No matches. Try a venue, vibe, or DJ.' : 'Search events, venues, vibes, music, and hosts.'}
            </Text>
          }
          renderItem={({item: e}: {item: Event}) => (
            <Pressable onPress={() => nav.navigate('EventDetail', {event: e})}>
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
          )}
        />
      </SafeAreaView>
    </AmbientBackground>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 50,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  row: {flexDirection: 'row', padding: 8, paddingRight: 14},
  thumb: {width: 56, height: 56, borderRadius: 10},
});
