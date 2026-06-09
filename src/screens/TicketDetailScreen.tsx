import React from 'react';
import {View, Text, Image, ScrollView, StyleSheet, Pressable} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import {RootStackParamList} from '../types/navigation';
import {useTheme} from '../hooks/useTheme';
import {Pill} from '../components/Pill';

export const TicketDetailScreen: React.FC = () => {
  const t = useTheme();
  const nav = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'TicketDetail'>>();
  const {ticket} = route.params;
  const e = ticket.event;

  return (
    <View style={[styles.container, {backgroundColor: t.bg.primary}]}>
      <SafeAreaView edges={['top']} style={styles.nav}>
        <Pressable
          onPress={() => nav.goBack()}
          style={[styles.navBtn, {backgroundColor: t.bg.secondary}]}>
          <Text style={{color: t.text.primary, fontSize: 18, fontWeight: '700'}}>‹</Text>
        </Pressable>
        <Text style={{color: t.text.primary, fontWeight: '700', fontSize: 15}}>Pass</Text>
        <View style={{width: 38}} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={{padding: 20, paddingBottom: 60}}>
        {/* The pass */}
        <View style={[styles.pass, {backgroundColor: t.bg.elevated, borderColor: t.border.subtle}]}>
          <Image source={{uri: e.flyer_url}} style={styles.passHero} />
          <View style={styles.passHeroOverlay} />

          <View style={styles.passTopInfo}>
            <Text style={[styles.passTitle, {color: '#fff'}]}>{e.title}</Text>
            <Text style={{color: 'rgba(255,255,255,0.85)', marginTop: 4, fontSize: 13}}>
              {e.venue.display_name} · {e.start_time}
            </Text>
          </View>

          {/* Perforation */}
          <View style={[styles.perfRow]}>
            <View style={[styles.perfNotch, {backgroundColor: t.bg.primary, left: -10}]} />
            <View style={[styles.perfDash, {borderColor: t.border.subtle}]} />
            <View style={[styles.perfNotch, {backgroundColor: t.bg.primary, right: -10}]} />
          </View>

          {/* QR — real signed token if present, placeholder while pending */}
          <View style={styles.qrSection}>
            <View style={[styles.qrBox, {backgroundColor: '#fff', borderColor: t.border.strong}]}>
              {ticket.qr_value ? (
                <QRCode value={ticket.qr_value} size={216} backgroundColor="#fff" color="#000" />
              ) : (
                <>
                  <QRPlaceholder color={t.text.primary} bg={t.bg.secondary} />
                  <Text style={{color: t.text.tertiary, fontSize: 9, marginTop: 8, fontWeight: '600', letterSpacing: 1.2}}>
                    PENDING · PASS NOT YET ACTIVE
                  </Text>
                </>
              )}
            </View>
            {!!ticket.confirmation_code && (
              <Text style={{color: t.text.tertiary, fontSize: 12, marginTop: 10, fontWeight: '700', letterSpacing: 2}}>
                {ticket.confirmation_code}
              </Text>
            )}

            <View style={{marginTop: 18, gap: 12}}>
              <KV
                label="Pass Type"
                value={ticket.option ? `${ticket.quantity}× ${ticket.option.name}` : 'RSVP'}
                t={t}
              />
              <KV label="Order" value={(ticket.order_id || ticket.confirmation_code || '—').toUpperCase()} t={t} />
              <KV label="Date" value={e.date} t={t} />
              <KV label="Doors" value={e.start_time} t={t} />
              <KV label="Status" value={ticket.status.toUpperCase()} t={t} accent={t.accents.deal.base} />
            </View>

            <View style={{marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
              <Pill label="Show QR at entry" accent="aurora" size="sm" />
              {(ticket.option?.perks ?? []).slice(0, 2).map((p) => (
                <Pill key={p} label={p} accent="beam" size="sm" />
              ))}
            </View>
          </View>
        </View>

        <Text style={{color: t.text.tertiary, fontSize: 11, marginTop: 18, textAlign: 'center', paddingHorizontal: 20, lineHeight: 16}}>
          {ticket.qr_value
            ? ticket.entry_instructions || 'Show this pass at the door for entry.'
            : 'This pass activates once your payment is confirmed.'}
        </Text>
      </ScrollView>
    </View>
  );
};

const KV: React.FC<{label: string; value: string; t: any; accent?: string}> = ({label, value, t, accent}) => (
  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
    <Text style={{color: t.text.tertiary, fontSize: 12, fontWeight: '600', letterSpacing: 0.5}}>
      {label.toUpperCase()}
    </Text>
    <Text style={{color: accent || t.text.primary, fontSize: 13, fontWeight: '700'}}>{value}</Text>
  </View>
);

// QR-ish placeholder pattern. Not a real QR.
const QRPlaceholder: React.FC<{color: string; bg: string}> = ({color}) => {
  const cells = Array.from({length: 16}, () => Array.from({length: 16}, () => Math.random() > 0.5));
  return (
    <View style={{width: 220, height: 220, padding: 12}}>
      <View style={{flex: 1, flexDirection: 'column'}}>
        {cells.map((row, i) => (
          <View key={i} style={{flex: 1, flexDirection: 'row'}}>
            {row.map((on, j) => (
              <View key={j} style={{flex: 1, backgroundColor: on ? color : 'transparent', margin: 0.6}} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4, paddingBottom: 10,
  },
  navBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  pass: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
  },
  passHero: {height: 200, width: '100%'},
  passHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    height: 200,
  },
  passTopInfo: {position: 'absolute', left: 18, right: 18, top: 130},
  passTitle: {fontSize: 22, fontWeight: '800', letterSpacing: -0.3},
  perfRow: {
    height: 20,
    position: 'relative',
    justifyContent: 'center',
    marginTop: -1,
  },
  perfNotch: {
    position: 'absolute',
    width: 20, height: 20, borderRadius: 10,
    top: 0,
  },
  perfDash: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    marginHorizontal: 14,
  },
  qrSection: {
    paddingHorizontal: 22, paddingBottom: 22, paddingTop: 18,
    alignItems: 'center',
  },
  qrBox: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    alignSelf: 'center',
  },
});
