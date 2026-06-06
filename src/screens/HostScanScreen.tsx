import React, {useState} from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Pressable, ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../hooks/useTheme';
import {scanPass} from '../services/api';

type Result = {ok: boolean; reason: string; pass?: any} | null;

// Reason -> human copy for the door UI.
const REASON_COPY: Record<string, string> = {
  valid: 'Checked in ✓',
  already_checked_in: 'Already checked in',
  not_yet_issued: 'Payment not completed',
  refunded: 'Refunded — not valid',
  voided: 'Voided — not valid',
  no_qr: 'No QR provided',
  invalid_signature: 'Invalid / tampered code',
  not_found: 'Pass not found',
  not_authorized: 'You can’t scan this event',
};

export const HostScanScreen: React.FC = () => {
  const t = useTheme();
  const nav = useNavigation();
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);

  const doScan = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await scanPass(token.trim());
      setResult(res);
    } catch (e: any) {
      setResult(e?.response?.data ?? {ok: false, reason: 'error'});
    } finally {
      setBusy(false);
    }
  };

  const ok = result?.ok;
  const accent = result ? (ok ? t.accents.deal.base : '#EF4444') : t.text.primary;

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: t.bg.primary}]} edges={['top']}>
      <View style={styles.nav}>
        <Pressable onPress={() => nav.goBack()} style={[styles.navBtn, {backgroundColor: t.bg.secondary}]}>
          <Text style={{color: t.text.primary, fontSize: 18, fontWeight: '700'}}>‹</Text>
        </Pressable>
        <Text style={{color: t.text.primary, fontWeight: '700', fontSize: 15}}>Scan · Door Check-in</Text>
        <View style={{width: 38}} />
      </View>

      <View style={{padding: 20, gap: 16}}>
        <Text style={{color: t.text.secondary, fontSize: 13, lineHeight: 19}}>
          Paste a guest’s pass code to verify and check them in. (Camera scanning
          coming soon.)
        </Text>

        <TextInput
          value={token}
          onChangeText={setToken}
          placeholder="Paste pass QR value"
          placeholderTextColor={t.text.tertiary}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          style={[styles.input, {color: t.text.primary, backgroundColor: t.bg.secondary, borderColor: t.border.subtle}]}
        />

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={busy || !token.trim()}
          onPress={doScan}
          style={[styles.scanBtn, {backgroundColor: token.trim() ? t.accents.aurora.base : t.bg.secondary}]}>
          {busy ? (
            <ActivityIndicator color={t.text.inverse} />
          ) : (
            <Text style={{color: token.trim() ? t.text.inverse : t.text.tertiary, fontWeight: '700', fontSize: 15}}>
              Verify & Check In
            </Text>
          )}
        </TouchableOpacity>

        {result && (
          <View style={[styles.resultCard, {backgroundColor: t.bg.elevated, borderColor: accent}]}>
            <Text style={{color: accent, fontSize: 20, fontWeight: '800'}}>
              {ok ? '✓ Admit' : '✕ Reject'}
            </Text>
            <Text style={{color: t.text.primary, fontSize: 15, fontWeight: '600', marginTop: 4}}>
              {REASON_COPY[result.reason] ?? result.reason}
            </Text>
            {result.pass && (
              <View style={{marginTop: 12, gap: 4}}>
                <Text style={{color: t.text.secondary}}>{result.pass.holder_name}</Text>
                <Text style={{color: t.text.secondary}}>
                  {result.pass.ticket_type} · {result.pass.event_title}
                </Text>
                <Text style={{color: t.text.tertiary, fontSize: 12, letterSpacing: 1}}>
                  {result.pass.confirmation_code}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10,
  },
  navBtn: {width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center'},
  input: {
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 13, minHeight: 90, textAlignVertical: 'top',
  },
  scanBtn: {paddingVertical: 15, borderRadius: 100, alignItems: 'center'},
  resultCard: {borderRadius: 18, borderWidth: 1.5, padding: 18, marginTop: 6},
});
