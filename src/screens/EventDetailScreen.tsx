import React, {useState} from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, Dimensions, TouchableOpacity, Pressable,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../types/navigation';
import {useTheme} from '../hooks/useTheme';
import {Pill} from '../components/Pill';
import {HostStack} from '../components/HostStack';

const {width: W} = Dimensions.get('window');
const HERO_H = 380;

type Tab = 'Details' | 'Vibe' | 'Ticket' | 'Deal' | 'Info';
const TABS: Tab[] = ['Details', 'Vibe', 'Ticket', 'Deal', 'Info'];

export const EventDetailScreen: React.FC = () => {
  const t = useTheme();
  const nav = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'EventDetail'>>();
  const {event} = route.params;
  const [tab, setTab] = useState<Tab>('Details');

  return (
    <View style={[styles.container, {backgroundColor: t.bg.primary}]}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* Cinematic hero */}
        <View style={styles.heroContainer}>
          <Image source={{uri: event.flyer_url}} style={styles.hero} />
          <View style={styles.heroGradient} />
          <View style={styles.heroDarkOverlay} />
          <SafeAreaView edges={['top']} style={styles.heroNav}>
            <Pressable
              onPress={() => nav.goBack()}
              style={[styles.navBtn, {backgroundColor: 'rgba(0,0,0,0.4)'}]}>
              <Text style={{color: '#fff', fontSize: 20, fontWeight: '700'}}>‹</Text>
            </Pressable>
            <View style={{flexDirection: 'row', gap: 10}}>
              <Pressable
                style={[styles.navBtn, {backgroundColor: 'rgba(0,0,0,0.4)'}]}>
                <Text style={{color: '#fff', fontSize: 14}}>♡</Text>
              </Pressable>
              <Pressable
                style={[styles.navBtn, {backgroundColor: 'rgba(0,0,0,0.4)'}]}>
                <Text style={{color: '#fff', fontSize: 14}}>↗</Text>
              </Pressable>
            </View>
          </SafeAreaView>

          <View style={styles.heroBottom}>
            <View style={{flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap'}}>
              {event.age_restriction && (
                <Pill label={event.age_restriction} accent="aurora" size="sm" />
              )}
              {event.cover_charge === 0 && (
                <Pill label="Free Entry" accent="glow" size="sm" />
              )}
              {event.deals.length > 0 && (
                <Pill label={`${event.deals.length} Deal${event.deals.length > 1 ? 's' : ''}`} accent="deal" size="sm" />
              )}
            </View>
            <Text style={styles.heroTitle}>{event.title}</Text>
            <Text style={styles.heroSubtitle}>
              {event.venue.display_name} · {event.start_time}
            </Text>
          </View>
        </View>

        {/* Tab strip */}
        <View style={[styles.tabStrip, {backgroundColor: t.bg.primary, borderBottomColor: t.border.subtle}]}>
          {TABS.map((label) => {
            const active = tab === label;
            return (
              <Pressable
                key={label}
                onPress={() => setTab(label)}
                style={styles.tab}>
                <Text style={{
                  color: active ? t.text.primary : t.text.tertiary,
                  fontWeight: active ? '700' : '500',
                  fontSize: 14,
                }}>
                  {label}
                </Text>
                {active && (
                  <View style={[styles.tabIndicator, {backgroundColor: t.text.primary}]} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Tab content */}
        <View style={{padding: 20, paddingBottom: 120}}>
          {tab === 'Details' && <DetailsTab event={event} t={t} />}
          {tab === 'Vibe' && <VibeTab event={event} t={t} />}
          {tab === 'Ticket' && <TicketTab event={event} t={t} />}
          {tab === 'Deal' && <DealTab event={event} t={t} />}
          {tab === 'Info' && <InfoTab event={event} t={t} />}
        </View>
      </ScrollView>

      {/* Bottom CTA bar */}
      <SafeAreaView edges={['bottom']} style={[styles.ctaBar, {backgroundColor: t.bg.elevated, borderTopColor: t.border.subtle}]}>
        <View style={{flex: 1}}>
          {event.ticket_options.length > 0 ? (
            <>
              <Text style={{color: t.text.tertiary, fontSize: 11, fontWeight: '600', letterSpacing: 1}}>FROM</Text>
              <Text style={{color: t.text.primary, fontSize: 22, fontWeight: '800'}}>
                ${event.ticket_options[0].price}
              </Text>
            </>
          ) : (
            <Text style={{color: t.text.primary, fontSize: 16, fontWeight: '700'}}>
              {event.cover_charge === 0 ? 'Free Entry' : `$${event.cover_charge} at door`}
            </Text>
          )}
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.cta, {backgroundColor: t.accents.aurora.base}]}>
          <Text style={{color: t.text.inverse, fontSize: 15, fontWeight: '700', letterSpacing: 0.3}}>
            {event.ticket_options.length > 0 ? 'Get Tickets' : 'RSVP'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

const DetailsTab: React.FC<{event: any; t: any}> = ({event, t}) => (
  <View style={{gap: 18}}>
    <HostStack hosts={event.hosts} size={32} />
    <Text style={{color: t.text.secondary, fontSize: 15, lineHeight: 22}}>
      {event.description}
    </Text>
    <View style={{flexDirection: 'row', gap: 18}}>
      <View style={{flex: 1}}>
        <Text style={{color: t.text.tertiary, fontSize: 11, fontWeight: '700', letterSpacing: 1}}>GOING</Text>
        <Text style={{color: t.text.primary, fontSize: 24, fontWeight: '800', marginTop: 4}}>
          {event.going_count}
        </Text>
      </View>
      <View style={{flex: 1}}>
        <Text style={{color: t.text.tertiary, fontSize: 11, fontWeight: '700', letterSpacing: 1}}>INTERESTED</Text>
        <Text style={{color: t.text.primary, fontSize: 24, fontWeight: '800', marginTop: 4}}>
          {event.interested_count}
        </Text>
      </View>
    </View>
  </View>
);

const VibeTab: React.FC<{event: any; t: any}> = ({event, t}) => (
  <View style={{gap: 18}}>
    <View>
      <Text style={{color: t.text.tertiary, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10}}>
        VIBE
      </Text>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
        {event.vibe_tags.map((tag: string) => (
          <Pill key={tag} label={tag} accent="aurora" />
        ))}
      </View>
    </View>
    {event.music_tags.length > 0 && (
      <View>
        <Text style={{color: t.text.tertiary, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10}}>
          MUSIC
        </Text>
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
          {event.music_tags.map((tag: string) => (
            <Pill key={tag} label={tag} accent="beam" />
          ))}
        </View>
      </View>
    )}
  </View>
);

const TicketTab: React.FC<{event: any; t: any}> = ({event, t}) => (
  <View style={{gap: 12}}>
    {event.ticket_options.length === 0 ? (
      <Text style={{color: t.text.secondary}}>
        {event.cover_charge === 0 ? 'Free entry — no tickets needed.' : `$${event.cover_charge} cash at door.`}
      </Text>
    ) : (
      event.ticket_options.map((opt: any) => (
        <View
          key={opt.id}
          style={{
            backgroundColor: t.bg.secondary,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: t.border.subtle,
          }}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
            <View style={{flex: 1}}>
              <Text style={{color: t.text.primary, fontSize: 17, fontWeight: '700'}}>{opt.name}</Text>
              <Text style={{color: t.text.secondary, marginTop: 4, fontSize: 13}}>{opt.description}</Text>
            </View>
            <Text style={{color: t.text.primary, fontSize: 22, fontWeight: '800'}}>${opt.price}</Text>
          </View>
          {opt.perks.length > 0 && (
            <View style={{marginTop: 12, gap: 4}}>
              {opt.perks.map((p: string) => (
                <Text key={p} style={{color: t.text.secondary, fontSize: 13}}>· {p}</Text>
              ))}
            </View>
          )}
          {opt.remaining && opt.remaining < 25 && (
            <Pill label={`Only ${opt.remaining} left`} accent="glow" size="sm" style={{marginTop: 10}} />
          )}
        </View>
      ))
    )}
  </View>
);

const DealTab: React.FC<{event: any; t: any}> = ({event, t}) => (
  <View style={{gap: 12}}>
    {event.deals.length === 0 ? (
      <Text style={{color: t.text.secondary}}>No deals tonight.</Text>
    ) : (
      event.deals.map((d: any) => (
        <View
          key={d.id}
          style={{
            backgroundColor: t.accents.deal.bg,
            borderColor: t.accents.deal.base,
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
          }}>
          <Text style={{color: t.accents.deal.base, fontSize: 11, fontWeight: '700', letterSpacing: 1.2}}>
            DEAL
          </Text>
          <Text style={{color: t.text.primary, fontSize: 17, fontWeight: '700', marginTop: 6}}>{d.title}</Text>
          <Text style={{color: t.text.secondary, marginTop: 4, fontSize: 13}}>{d.description}</Text>
        </View>
      ))
    )}
  </View>
);

const InfoTab: React.FC<{event: any; t: any}> = ({event, t}) => (
  <View style={{gap: 14}}>
    <InfoRow label="Venue" value={event.venue.display_name} t={t} />
    <InfoRow label="Neighborhood" value={event.venue.location?.neighborhood || '—'} t={t} />
    <InfoRow label="Start" value={event.start_time} t={t} />
    <InfoRow label="End" value={event.end_time || '—'} t={t} />
    <InfoRow label="Age" value={event.age_restriction || '—'} t={t} />
    <InfoRow
      label="Cover"
      value={event.cover_charge === 0 ? 'Free' : `$${event.cover_charge}`}
      t={t}
    />
  </View>
);

const InfoRow: React.FC<{label: string; value: string; t: any}> = ({label, value, t}) => (
  <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: t.border.subtle}}>
    <Text style={{color: t.text.tertiary, fontSize: 13, fontWeight: '600'}}>{label}</Text>
    <Text style={{color: t.text.primary, fontSize: 14, fontWeight: '600'}}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1},
  heroContainer: {height: HERO_H, width: W},
  hero: {...StyleSheet.absoluteFillObject, width: '100%', height: '100%', resizeMode: 'cover'},
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  heroDarkOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '60%',
    backgroundColor: 'transparent',
  },
  heroNav: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  navBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  heroBottom: {
    position: 'absolute',
    left: 20, right: 20, bottom: 24,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSubtitle: {color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4},
  tabStrip: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1, left: '30%', right: '30%',
    height: 2.4,
    borderRadius: 1,
  },
  ctaBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  cta: {
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 100,
  },
});
