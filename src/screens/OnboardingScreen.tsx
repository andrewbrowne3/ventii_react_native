import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';

import {AppDispatch, RootState} from '../store/store';
import {registerUser} from '../store/slices/authSlice';
import {setOnboardingPrefs} from '../store/slices/socialSlice';
import {useTheme} from '../hooks/useTheme';
import AmbientBackground from '../components/AmbientBackground';
import GlassView from '../components/GlassView';

/**
 * Native port of OnboardingFlow.web.jsx (handoff §5.8 restructure):
 *   1. Profile — name, email, password, home city
 *   2. Vibe    — 3-question accordion (areas / vibes + custom / music)
 *   3. Plan    — free / pro / black tier selector
 *   4. Curating — brief transition, then registerUser() flips auth state
 * Skipping is allowed everywhere except name/email/password.
 */

const CITIES = [
  {id: 'atl', label: 'Atlanta'},
  {id: 'nyc', label: 'New York'},
  {id: 'mia', label: 'Miami'},
  {id: 'hou', label: 'Houston'},
];

const ATL_AREAS = [
  'Buckhead', 'West Midtown', 'Midtown', 'Virginia-Highland', 'Old Fourth Ward',
  'Inman Park', 'East Atlanta', 'Poncey-Highland', 'Decatur', 'The Beltline',
  'Downtown', 'Grant Park',
];

const VIBES = [
  '🍷 Date Nights', '🌆 Rooftops', '🍺 Dive Bars', '✨ Girls Night Out',
  '🏃 Fitness + Health', '🤝 Community + Nonprofits', '🎵 Live Music',
  '🧠 Networking', '🥂 Brunch', '☕ Coffee Shops', '🏈 Sports Bars',
  '🌙 Nightlife', '🌿 Outdoor Events', '🎨 Art + Culture', '🍽️ Food Deals',
  '🗓️ Private Events',
];

const MUSIC = [
  '🎧 EDM + House', '🎤 Hip-Hop', '🎶 R&B', '🎷 Jazz', '🎸 Rock + Alternative',
  '🤠 Country', '🌍 Afrobeats', '💃 Latin', '✨ Pop', '🎼 Indie',
  '🥁 Live Bands', '🎛️ DJs',
];

const TIERS: {id: 'free' | 'pro' | 'black'; label: string; blurb: string}[] = [
  {id: 'free', label: 'Free', blurb: 'The full feed, saves, RSVPs and tickets.'},
  {id: 'pro', label: 'VENTII+', blurb: 'Early access drops, member-only deals.'},
  {id: 'black', label: 'Black', blurb: 'Concierge access. Invitation tier.'},
];

type Step = 0 | 1 | 2 | 3;

export const OnboardingScreen: React.FC = () => {
  const t = useTheme();
  const nav = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const {isLoading, error} = useSelector((s: RootState) => s.auth);

  const [step, setStep] = useState<Step>(0);

  // Step 1 — profile
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('atl');

  // Step 2 — vibe accordion
  const [accordion, setAccordion] = useState(0);
  const [areas, setAreas] = useState<string[]>([]);
  const [vibes, setVibes] = useState<string[]>([]);
  const [music, setMusic] = useState<string[]>([]);
  const [custom, setCustom] = useState<string[]>([]);
  const [customDraft, setCustomDraft] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Step 3 — plan
  const [tier, setTier] = useState<'free' | 'pro' | 'black'>('free');

  const profileValid =
    name.trim().length > 0 && /\S+@\S+\.\S+/.test(email) && password.length >= 8;

  const toggleIn = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const addCustom = () => {
    const v = customDraft.trim();
    if (!v) return;
    const exists = [...custom, ...vibes].some(
      (x) => x.toLowerCase().replace(/^[^\w]*/, '') === v.toLowerCase(),
    );
    if (!exists) setCustom([...custom, v]);
    setCustomDraft('');
  };

  const finish = async () => {
    setStep(3); // "Curating your feed…"
    dispatch(
      setOnboardingPrefs({
        city,
        areas,
        interests: [...vibes, ...custom],
        music,
        tier,
      }),
    );
    // Register after a beat so the curating moment reads; auth success flips
    // the navigator to the main app automatically.
    setTimeout(() => {
      dispatch(
        registerUser({
          email: email.trim().toLowerCase(),
          password,
          display_name: name.trim(),
          city: CITIES.find((c) => c.id === city)?.label,
        }),
      );
    }, 1400);
  };

  // If registration failed while on the curating step, drop back to fix it.
  const showError = !!error && step === 3 && !isLoading;
  const stepForRender = showError ? 0 : step;

  const accordionSections = useMemo(
    () => [
      {
        title: 'What areas do you care about?',
        count: areas.length,
        summary: areas,
      },
      {
        title: 'What kind of plans are your vibe?',
        count: vibes.length + custom.length,
        summary: [...vibes, ...custom],
      },
      {
        title: 'What music are you into?',
        count: music.length,
        summary: music,
      },
    ],
    [areas, vibes, custom, music],
  );

  return (
    <AmbientBackground>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{flex: 1}}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Progress dots */}
          <View style={styles.dotsRow}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: i === stepForRender ? 20 : 5,
                    backgroundColor:
                      i <= stepForRender ? t.text.primary : t.border.strong,
                  },
                ]}
              />
            ))}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 24}}
            keyboardShouldPersistTaps="handled">
            {stepForRender === 0 && (
              <>
                <Text style={[styles.title, {color: t.text.primary}]}>Let’s set you up</Text>
                <Text style={[styles.subtitle, {color: t.text.secondary}]}>
                  Your name, a login, and your city.
                </Text>
                {showError && (
                  <Text style={{color: t.status.danger, fontSize: 13, marginBottom: 10, textAlign: 'center'}}>
                    {error}
                  </Text>
                )}
                <GlassView variant="panel" radius={16}>
                  <View style={{padding: 16, gap: 12}}>
                    <Field value={name} onChange={setName} placeholder="Your name" t={t} />
                    <Field
                      value={email}
                      onChange={setEmail}
                      placeholder="Email"
                      keyboardType="email-address"
                      t={t}
                    />
                    <Field
                      value={password}
                      onChange={setPassword}
                      placeholder="Password (8+ characters)"
                      secure
                      t={t}
                    />
                  </View>
                </GlassView>
                <Text style={[styles.sectionLabel, {color: t.text.tertiary}]}>HOME CITY</Text>
                <View style={styles.chipWrap}>
                  {CITIES.map((c) => (
                    <Chip
                      key={c.id}
                      label={c.label}
                      selected={city === c.id}
                      onPress={() => setCity(c.id)}
                      t={t}
                    />
                  ))}
                </View>
              </>
            )}

            {stepForRender === 1 && (
              <>
                <Text style={[styles.title, {color: t.text.primary}]}>Make it yours</Text>
                <Text style={[styles.subtitle, {color: t.text.secondary}]}>
                  Three quick questions. Skip anything.
                </Text>
                {accordionSections.map((s, idx) => {
                  const open = accordion === idx;
                  return (
                    <GlassView key={idx} variant="panel" radius={16} style={{marginBottom: 10}}>
                      <Pressable onPress={() => setAccordion(open ? -1 : idx)} style={styles.accHeader}>
                        <View
                          style={[
                            styles.accBadge,
                            {
                              backgroundColor: s.count > 0 ? t.accents.deal.bg : t.bg.tertiary,
                              borderColor: s.count > 0 ? t.accents.deal.base : t.border.subtle,
                            },
                          ]}>
                          <Text style={{color: s.count > 0 ? t.accents.deal.base : t.text.tertiary, fontSize: 11, fontWeight: '800'}}>
                            {s.count > 0 ? '✓' : idx + 1}
                          </Text>
                        </View>
                        <View style={{flex: 1}}>
                          <Text style={{color: t.text.primary, fontSize: 14.5, fontWeight: '700'}}>
                            {s.title}
                          </Text>
                          {!open && (
                            <Text style={{color: t.text.tertiary, fontSize: 12, marginTop: 2}} numberOfLines={1}>
                              {s.summary.length > 0
                                ? `${s.summary.slice(0, 2).join(', ')}${s.summary.length > 2 ? `  +${s.summary.length - 2}` : ''}`
                                : 'Tap to choose'}
                            </Text>
                          )}
                        </View>
                        <Text style={{color: t.text.tertiary, fontSize: 13}}>{open ? '⌄' : '›'}</Text>
                      </Pressable>
                      {open && (
                        <View style={{paddingHorizontal: 14, paddingBottom: 14}}>
                          {idx === 0 &&
                            (city === 'atl' ? (
                              <View style={styles.chipWrap}>
                                {ATL_AREAS.map((a) => (
                                  <Chip key={a} label={a} selected={areas.includes(a)} onPress={() => toggleIn(areas, setAreas, a)} t={t} />
                                ))}
                              </View>
                            ) : (
                              <Text style={{color: t.text.secondary, fontSize: 13}}>
                                We’re still dialing in neighborhoods for your city — skip for now.
                              </Text>
                            ))}
                          {idx === 1 && (
                            <>
                              <View style={styles.chipWrap}>
                                {VIBES.map((v) => (
                                  <Chip key={v} label={v} selected={vibes.includes(v)} onPress={() => toggleIn(vibes, setVibes, v)} t={t} />
                                ))}
                                {custom.map((cu) => (
                                  <Chip key={cu} label={`${cu}  ×`} selected onPress={() => setCustom(custom.filter((x) => x !== cu))} t={t} />
                                ))}
                                {!showCustomInput && (
                                  <Pressable
                                    onPress={() => setShowCustomInput(true)}
                                    style={[styles.chip, styles.chipDashed, {borderColor: t.border.strong}]}>
                                    <Text style={{color: t.text.tertiary, fontSize: 12, fontWeight: '600'}}>
                                      + Add your own
                                    </Text>
                                  </Pressable>
                                )}
                              </View>
                              {showCustomInput && (
                                <View style={{flexDirection: 'row', gap: 8, marginTop: 10}}>
                                  <TextInput
                                    value={customDraft}
                                    onChangeText={setCustomDraft}
                                    onSubmitEditing={addCustom}
                                    placeholder="Your interest…"
                                    placeholderTextColor={t.text.tertiary}
                                    style={[styles.input, {flex: 1, color: t.text.primary, backgroundColor: t.bg.secondary, borderColor: t.border.subtle}]}
                                  />
                                  <TouchableOpacity
                                    onPress={addCustom}
                                    style={[styles.addBtn, {backgroundColor: t.accents.aurora.base}]}>
                                    <Text style={{color: t.text.inverse, fontWeight: '700', fontSize: 13}}>Add</Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </>
                          )}
                          {idx === 2 && (
                            <View style={styles.chipWrap}>
                              {MUSIC.map((m) => (
                                <Chip key={m} label={m} selected={music.includes(m)} onPress={() => toggleIn(music, setMusic, m)} t={t} />
                              ))}
                            </View>
                          )}
                        </View>
                      )}
                    </GlassView>
                  );
                })}
              </>
            )}

            {stepForRender === 2 && (
              <>
                <Text style={[styles.title, {color: t.text.primary}]}>Pick your plan</Text>
                <Text style={[styles.subtitle, {color: t.text.secondary}]}>
                  Start free — upgrade whenever.
                </Text>
                <View style={{flexDirection: 'row', gap: 6, marginBottom: 16}}>
                  {TIERS.map((tr) => {
                    const active = tier === tr.id;
                    const accent =
                      tr.id === 'black' ? t.accents.glow.deep : tr.id === 'pro' ? t.accents.beam.base : t.text.primary;
                    return (
                      <Pressable
                        key={tr.id}
                        onPress={() => setTier(tr.id)}
                        style={[
                          styles.tierBtn,
                          {
                            backgroundColor: active ? accent : 'transparent',
                            borderColor: active ? accent : t.border.strong,
                          },
                        ]}>
                        <Text style={{color: active ? t.bg.primary : t.text.secondary, fontWeight: '700', fontSize: 13}}>
                          {tr.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <GlassView variant="panel" radius={16}>
                  <View style={{padding: 18}}>
                    <Text style={{color: t.text.primary, fontSize: 16, fontWeight: '800'}}>
                      {TIERS.find((x) => x.id === tier)?.label}
                    </Text>
                    <Text style={{color: t.text.secondary, fontSize: 13.5, marginTop: 6, lineHeight: 19}}>
                      {TIERS.find((x) => x.id === tier)?.blurb}
                    </Text>
                    {tier !== 'free' && (
                      <Text style={{color: t.text.tertiary, fontSize: 12, marginTop: 10}}>
                        Billing arrives with a later build — you’ll start on Free either way.
                      </Text>
                    )}
                  </View>
                </GlassView>
              </>
            )}

            {stepForRender === 3 && (
              <View style={{alignItems: 'center', paddingTop: 120, gap: 18}}>
                <ActivityIndicator size="large" color={t.accents.glow.base} />
                <Text style={{color: t.text.primary, fontSize: 18, fontWeight: '800'}}>
                  Curating your feed…
                </Text>
                <Text style={{color: t.text.secondary, fontSize: 13.5}}>
                  Matching {CITIES.find((c) => c.id === city)?.label} to your vibe.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer controls */}
          {stepForRender < 3 && (
            <View style={styles.footer}>
              <Pressable
                onPress={() => (stepForRender === 0 ? nav.goBack() : setStep((stepForRender - 1) as Step))}
                style={{padding: 10}}>
                <Text style={{color: t.text.tertiary, fontWeight: '600', fontSize: 13}}>
                  {stepForRender === 0 ? 'I have an account' : 'Back'}
                </Text>
              </Pressable>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={stepForRender === 0 && !profileValid}
                onPress={() =>
                  stepForRender === 2 ? finish() : setStep((stepForRender + 1) as Step)
                }
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor:
                      stepForRender === 0 && !profileValid ? t.bg.tertiary : t.accents.aurora.base,
                  },
                ]}>
                <Text
                  style={{
                    color: stepForRender === 0 && !profileValid ? t.text.tertiary : t.text.inverse,
                    fontWeight: '700',
                    fontSize: 15,
                  }}>
                  {stepForRender === 2 ? 'Finish' : 'Continue'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AmbientBackground>
  );
};

// ───── bits ─────────────────────────────────────────────────────────────────

const Field: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  secure?: boolean;
  keyboardType?: 'email-address';
  t: any;
}> = ({value, onChange, placeholder, secure, keyboardType, t}) => (
  <TextInput
    value={value}
    onChangeText={onChange}
    placeholder={placeholder}
    placeholderTextColor={t.text.tertiary}
    secureTextEntry={secure}
    keyboardType={keyboardType}
    autoCapitalize={keyboardType === 'email-address' || secure ? 'none' : 'words'}
    autoCorrect={false}
    style={[styles.input, {color: t.text.primary, backgroundColor: t.bg.secondary, borderColor: t.border.subtle}]}
  />
);

const Chip: React.FC<{label: string; selected: boolean; onPress: () => void; t: any}> = ({
  label,
  selected,
  onPress,
  t,
}) => (
  <Pressable
    onPress={onPress}
    style={[
      styles.chip,
      {
        backgroundColor: selected ? t.accents.beam.bg : t.bg.secondary,
        borderColor: selected ? t.accents.beam.base : t.border.subtle,
      },
    ]}>
    <Text
      style={{
        color: selected ? t.accents.beam.base : t.text.secondary,
        fontSize: 12,
        fontWeight: '600',
      }}>
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: {flex: 1},
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 14,
  },
  dot: {height: 5, borderRadius: 2.5},
  title: {fontSize: 22, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center'},
  subtitle: {fontSize: 12.5, textAlign: 'center', marginTop: 4, marginBottom: 16},
  sectionLabel: {fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginTop: 18, marginBottom: 10},
  chipWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  chip: {paddingVertical: 6, paddingHorizontal: 11, borderRadius: 50, borderWidth: 1},
  chipDashed: {borderStyle: 'dashed', backgroundColor: 'transparent'},
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14.5,
  },
  addBtn: {
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  accBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1.2,
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  primaryBtn: {
    paddingHorizontal: 32,
    paddingVertical: 13,
    borderRadius: 100,
    minWidth: 150,
    alignItems: 'center',
  },
});
