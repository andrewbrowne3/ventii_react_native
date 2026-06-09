import React, {useState} from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, Dimensions, TouchableOpacity, Pressable,
  Alert, Linking, Modal, TextInput, ActivityIndicator, Share,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {RootStackParamList} from '../types/navigation';
import {AppDispatch, RootState} from '../store/store';
import {useTheme} from '../hooks/useTheme';
import {Pill} from '../components/Pill';
import {HostStack} from '../components/HostStack';
import {CommitCTA, Deal, DealOffer, TicketOption} from '../types';
import {rsvpToEvent, checkoutEvent, redeemDeal} from '../services/api';
import {fetchTickets} from '../store/slices/walletSlice';
import {toggleSaved} from '../store/slices/feedSlice';

const {width: W} = Dimensions.get('window');
const HERO_H = 380;

type Tab = 'Details' | 'Vibe' | 'Ticket' | 'Deal' | 'Info';
const TABS: Tab[] = ['Details', 'Vibe', 'Ticket', 'Deal', 'Info'];

// Maps the server-resolved CTA to the bottom button's label + whether it's live.
const CTA_LABEL: Record<CommitCTA, string> = {
  rsvp: 'RSVP',
  checkout: 'Get Tickets',
  save_only: 'Save to Calendar',
  open_external: 'Get Tickets ↗',
  locked_member: 'Gold Members Only',
  sold_out: 'Sold Out',
};

export const EventDetailScreen: React.FC = () => {
  const t = useTheme();
  const nav = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const route = useRoute<RouteProp<RootStackParamList, 'EventDetail'>>();
  const {event} = route.params;
  const [tab, setTab] = useState<Tab>('Details');
  const [busy, setBusy] = useState(false);
  const saved = useSelector((s: RootState) => s.feed.saved.includes(event.id));

  // Staff-code modal state for deal redemption.
  const [redeemTarget, setRedeemTarget] = useState<{deal: Deal; offer: DealOffer} | null>(null);

  // Server tells us which action to show; fall back if the field isn't present.
  const cta: CommitCTA = event.cta ?? (event.ticket_options.length > 0 ? 'checkout' : 'rsvp');
  const ctaDisabled = cta === 'sold_out' || busy;

  const onRsvp = async () => {
    setBusy(true);
    try {
      await rsvpToEvent(event.id);
      dispatch(fetchTickets());
      Alert.alert('You’re in 🎟️', 'Your pass is in the Wallet.', [
        {text: 'View Wallet', onPress: () => nav.navigate('Wallet')},
        {text: 'OK'},
      ]);
    } catch (e: any) {
      const cta2 = e?.response?.data?.cta;
      Alert.alert('Couldn’t RSVP', cta2 ? `(${cta2})` : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onBuy = async (opt: TicketOption) => {
    setBusy(true);
    try {
      const res = await checkoutEvent(event.id, opt.id, 1);
      dispatch(fetchTickets());
      Alert.alert('Checkout started', `Ready to pay for ${opt.name}.\n(Payment sheet coming soon.)`);
      // When Stripe is configured this returns res.client_secret for the
      // payment sheet — wired in a later pass.
      void res;
    } catch (e: any) {
      if (e?.response?.status === 503) {
        Alert.alert('Coming soon', 'Payment integration is being set up.');
      } else {
        Alert.alert('Couldn’t start checkout', 'Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const onCta = () => {
    switch (cta) {
      case 'rsvp':
        return onRsvp();
      case 'checkout':
        return setTab('Ticket');
      case 'save_only':
        dispatch(toggleSaved(event.id));
        return Alert.alert('Saved', 'Added to your calendar.');
      case 'open_external':
        return event.external_url
          ? Linking.openURL(event.external_url)
          : Alert.alert('Unavailable', 'No external link provided.');
      case 'locked_member':
        return Alert.alert('Gold members only', 'Upgrade to VENTII Gold to unlock. (Coming soon.)');
      case 'sold_out':
        return undefined;
    }
  };

  const onRedeem = async (staffCode: string) => {
    if (!redeemTarget) return;
    setBusy(true);
    try {
      await redeemDeal(redeemTarget.deal.id, redeemTarget.offer.id, staffCode);
      setRedeemTarget(null);
      Alert.alert('Redeemed ✅', redeemTarget.deal.success_message || 'Show this to staff.');
    } catch (e: any) {
      const msg = e?.response?.data?.detail || (e?.response?.data?.cta
        ? `Can’t redeem (${e.response.data.cta}).`
        : 'Invalid or expired code.');
      Alert.alert('Couldn’t redeem', msg);
    } finally {
      setBusy(false);
    }
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `${event.title} — ${event.venue.display_name}`,
        ...(event.external_url ? {url: event.external_url} : {}),
      });
    } catch {
      // user dismissed the share sheet
    }
  };

  return (
    <View style={[styles.container, {backgroundColor: t.bg.primary}]}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* Cinematic hero */}
        <View style={styles.heroContainer}>
          <Image source={{uri: event.flyer_url}} style={[styles.hero, {backgroundColor: t.bg.elevated}]} />
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
                onPress={() => dispatch(toggleSaved(event.id))}
                style={[styles.navBtn, {backgroundColor: 'rgba(0,0,0,0.4)'}]}>
                <Text style={{color: saved ? '#F472B6' : '#fff', fontSize: 14}}>{saved ? '♥' : '♡'}</Text>
              </Pressable>
              <Pressable
                onPress={onShare}
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
          {tab === 'Ticket' && <TicketTab event={event} t={t} onBuy={onBuy} busy={busy} />}
          {tab === 'Deal' && <DealTab event={event} t={t} onRedeem={(deal, offer) => setRedeemTarget({deal, offer})} />}
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
          disabled={ctaDisabled}
          onPress={onCta}
          style={[
            styles.cta,
            {backgroundColor: ctaDisabled ? t.bg.secondary : t.accents.aurora.base},
          ]}>
          {busy ? (
            <ActivityIndicator color={t.text.inverse} />
          ) : (
            <Text style={{
              color: ctaDisabled ? t.text.tertiary : t.text.inverse,
              fontSize: 15, fontWeight: '700', letterSpacing: 0.3,
            }}>
              {CTA_LABEL[cta]}
            </Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>

      <StaffCodeModal
        target={redeemTarget}
        busy={busy}
        t={t}
        onClose={() => setRedeemTarget(null)}
        onSubmit={onRedeem}
      />
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

const TicketTab: React.FC<{event: any; t: any; onBuy: (o: TicketOption) => void; busy: boolean}> = ({event, t, onBuy, busy}) => (
  <View style={{gap: 12}}>
    {event.ticket_options.length === 0 ? (
      <Text style={{color: t.text.secondary}}>
        {event.cover_charge === 0 ? 'Free entry — no tickets needed.' : `$${event.cover_charge} cash at door.`}
      </Text>
    ) : (
      event.ticket_options.map((opt: TicketOption) => (
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
          {!!opt.remaining && opt.remaining < 25 && (
            <Pill label={`Only ${opt.remaining} left`} accent="glow" size="sm" style={{marginTop: 10}} />
          )}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={busy || opt.locked}
            onPress={() => onBuy(opt)}
            style={{
              marginTop: 14,
              paddingVertical: 12,
              borderRadius: 100,
              alignItems: 'center',
              backgroundColor: opt.locked ? t.bg.elevated : t.accents.aurora.base,
            }}>
            <Text style={{
              color: opt.locked ? t.text.tertiary : t.text.inverse,
              fontWeight: '700', fontSize: 14,
            }}>
              {opt.locked ? 'Gold members only' : `Buy · $${opt.price}`}
            </Text>
          </TouchableOpacity>
        </View>
      ))
    )}
  </View>
);

const DealTab: React.FC<{event: any; t: any; onRedeem: (deal: Deal, offer: DealOffer) => void}> = ({event, t, onRedeem}) => (
  <View style={{gap: 12}}>
    {event.deals.length === 0 ? (
      <Text style={{color: t.text.secondary}}>No deals tonight.</Text>
    ) : (
      event.deals.map((d: Deal) => (
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

          {/* Per-offer redeem buttons (from the deals contract). */}
          {(d.offers ?? []).map((offer) => {
            const locked = offer.cta && offer.cta !== 'redeem';
            return (
              <TouchableOpacity
                key={offer.id}
                activeOpacity={0.85}
                disabled={!!locked}
                onPress={() => onRedeem(d, offer)}
                style={{
                  marginTop: 12,
                  paddingVertical: 11,
                  paddingHorizontal: 14,
                  borderRadius: 100,
                  backgroundColor: locked ? t.bg.elevated : t.accents.deal.base,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                <Text style={{color: locked ? t.text.tertiary : t.text.inverse, fontWeight: '700', fontSize: 13}}>
                  {offer.title}
                </Text>
                <Text style={{color: locked ? t.text.tertiary : t.text.inverse, fontWeight: '700', fontSize: 12}}>
                  {locked ? offer.cta?.replace('_', ' ') : 'Redeem ›'}
                </Text>
              </TouchableOpacity>
            );
          })}
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

// Bottom-sheet-ish modal to enter the venue staff code for a deal redemption.
const StaffCodeModal: React.FC<{
  target: {deal: Deal; offer: DealOffer} | null;
  busy: boolean;
  t: any;
  onClose: () => void;
  onSubmit: (code: string) => void;
}> = ({target, busy, t, onClose, onSubmit}) => {
  const [code, setCode] = useState('');
  return (
    <Modal visible={!!target} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.modalCard, {backgroundColor: t.bg.elevated, borderColor: t.border.subtle}]}
          onPress={() => {}}>
          <Text style={{color: t.text.primary, fontSize: 18, fontWeight: '800'}}>
            {target?.offer.title}
          </Text>
          <Text style={{color: t.text.secondary, marginTop: 4, fontSize: 13}}>
            Ask venue staff for today’s code, then enter it to redeem.
          </Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Staff code"
            placeholderTextColor={t.text.tertiary}
            autoCapitalize="characters"
            style={[styles.input, {color: t.text.primary, backgroundColor: t.bg.secondary, borderColor: t.border.subtle}]}
          />
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={busy || !code.trim()}
            onPress={() => onSubmit(code.trim())}
            style={{
              marginTop: 14, paddingVertical: 13, borderRadius: 100, alignItems: 'center',
              backgroundColor: code.trim() ? t.accents.deal.base : t.bg.secondary,
            }}>
            {busy ? (
              <ActivityIndicator color={t.text.inverse} />
            ) : (
              <Text style={{color: code.trim() ? t.text.inverse : t.text.tertiary, fontWeight: '700'}}>
                Redeem
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
    minWidth: 130,
    alignItems: 'center',
  },
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
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    letterSpacing: 2,
  },
});
