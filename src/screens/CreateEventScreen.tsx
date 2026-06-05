/**
 * Create Event — in-app event posting for a logged-in profile. Posts to
 * POST /api/events/ (the creator's profile is added as host server-side),
 * then refreshes the feed. No registration here — accounts are created in
 * Django admin; this just lets an onboarded profile post its own events.
 */
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useDispatch} from 'react-redux';

import {useTheme} from '../hooks/useTheme';
import {AppDispatch} from '../store/store';
import {api, unwrapList} from '../services/api';
import {API_CONFIG} from '../constants/config';
import {fetchEvents} from '../store/slices/feedSlice';
import {Profile} from '../types';

export const CreateEventScreen: React.FC = () => {
  const t = useTheme();
  const nav = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();

  const [venues, setVenues] = useState<Profile[]>([]);
  const [title, setTitle] = useState('');
  const [flyerUrl, setFlyerUrl] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [cover, setCover] = useState('');
  const [age, setAge] = useState('');
  const [venueId, setVenueId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get(API_CONFIG.ENDPOINTS.PROFILES)
      .then((r) => setVenues(unwrapList<Profile>(r.data).filter((p) => p.type === 'place')))
      .catch(() => setVenues([]));
  }, []);

  const canSubmit = title.trim() && date.trim() && startTime.trim() && venueId && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(API_CONFIG.ENDPOINTS.EVENTS, {
        title: title.trim(),
        flyer_url: flyerUrl.trim() || `https://picsum.photos/seed/${encodeURIComponent(title.trim())}/800/1200`,
        date: date.trim(),
        start_time: startTime.trim(),
        description: description.trim(),
        vibe_tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
        music_tags: [],
        venue: venueId,
        cover_charge: cover.trim() ? Number(cover) : null,
        age_restriction: age.trim(),
      });
      dispatch(fetchEvents());
      nav.goBack();
    } catch (e: any) {
      setError(
        e?.response?.data
          ? JSON.stringify(e.response.data)
          : 'Could not post the event. Check the fields and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const input = (label: string, value: string, onChange: (s: string) => void, opts?: {placeholder?: string; multiline?: boolean; keyboardType?: any}) => (
    <View style={{marginBottom: 14}}>
      <Text style={[styles.label, {color: t.text.tertiary}]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={opts?.placeholder}
        placeholderTextColor={t.text.tertiary}
        multiline={opts?.multiline}
        keyboardType={opts?.keyboardType}
        style={[
          styles.input,
          {
            color: t.text.primary,
            backgroundColor: t.bg.secondary,
            borderColor: t.border.subtle,
            height: opts?.multiline ? 88 : undefined,
            textAlignVertical: opts?.multiline ? 'top' : 'center',
          },
        ]}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: t.bg.primary}]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} hitSlop={10}>
          <Text style={{color: t.text.secondary, fontSize: 16}}>← Cancel</Text>
        </Pressable>
        <Text style={[styles.headerTitle, {color: t.text.primary}]}>New Event</Text>
        <View style={{width: 54}} />
      </View>

      <ScrollView contentContainerStyle={{padding: 20, paddingBottom: 40}} keyboardShouldPersistTaps="handled">
        {input('TITLE', title, setTitle, {placeholder: 'Pulse Rooftop Session'})}
        {input('DATE', date, setDate, {placeholder: 'YYYY-MM-DD (e.g. 2026-07-04)'})}
        {input('START TIME', startTime, setStartTime, {placeholder: '9:00 PM'})}

        <Text style={[styles.label, {color: t.text.tertiary}]}>VENUE</Text>
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14}}>
          {venues.length === 0 ? (
            <Text style={{color: t.text.tertiary, fontSize: 13}}>Loading venues…</Text>
          ) : (
            venues.map((v) => {
              const sel = venueId === v.id;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => setVenueId(v.id)}
                  style={[
                    styles.venuePill,
                    {
                      backgroundColor: sel ? t.accents.aurora.base : t.bg.secondary,
                      borderColor: sel ? t.accents.aurora.base : t.border.subtle,
                    },
                  ]}>
                  <Text style={{color: sel ? t.text.inverse : t.text.secondary, fontSize: 13, fontWeight: '600'}}>
                    {v.display_name}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>

        {input('DESCRIPTION', description, setDescription, {placeholder: 'What’s the vibe?', multiline: true})}
        {input('VIBE TAGS (comma separated)', tags, setTags, {placeholder: 'Rooftop, House, Late Night'})}
        {input('FLYER IMAGE URL (optional)', flyerUrl, setFlyerUrl, {placeholder: 'https://…'})}
        {input('COVER CHARGE (optional)', cover, setCover, {placeholder: '0', keyboardType: 'numeric'})}
        {input('AGE (optional)', age, setAge, {placeholder: '21+'})}

        {error && <Text style={{color: t.status.danger, fontSize: 13, marginBottom: 12}}>{error}</Text>}

        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={[styles.cta, {backgroundColor: canSubmit ? t.accents.aurora.base : t.bg.elevated}]}>
          {submitting ? (
            <ActivityIndicator color={t.text.inverse} />
          ) : (
            <Text style={{color: canSubmit ? t.text.inverse : t.text.tertiary, fontWeight: '700', fontSize: 15}}>
              Post Event
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {fontSize: 17, fontWeight: '800'},
  label: {fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6},
  input: {borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15},
  venuePill: {paddingVertical: 8, paddingHorizontal: 14, borderRadius: 100, borderWidth: 1},
  cta: {marginTop: 8, paddingVertical: 16, borderRadius: 100, alignItems: 'center'},
});
