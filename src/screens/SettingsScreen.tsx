import React from 'react';
import {View, Text, Pressable, Switch, StyleSheet, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../hooks/useTheme';
import {RootState} from '../store/store';
import {toggleMode} from '../store/slices/themeSlice';
import {logoutUser} from '../store/slices/authSlice';

export const SettingsScreen: React.FC = () => {
  const t = useTheme();
  const nav = useNavigation();
  const dispatch = useDispatch();
  const mode = useSelector((s: RootState) => s.theme.mode);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: t.bg.primary}]} edges={['top']}>
      <View style={styles.nav}>
        <Pressable
          onPress={() => nav.goBack()}
          style={[styles.navBtn, {backgroundColor: t.bg.secondary}]}>
          <Text style={{color: t.text.primary, fontSize: 18, fontWeight: '700'}}>‹</Text>
        </Pressable>
        <Text style={{color: t.text.primary, fontSize: 17, fontWeight: '700'}}>Settings</Text>
        <View style={{width: 38}} />
      </View>

      <ScrollView contentContainerStyle={{padding: 20, paddingBottom: 60}}>
        <Section title="Appearance" t={t}>
          <Row label="Dark Mode" t={t}>
            <Switch
              value={mode === 'dark'}
              onValueChange={() => dispatch(toggleMode())}
              trackColor={{false: t.bg.tertiary, true: t.accents.aurora.deep}}
              thumbColor={t.accents.aurora.tint}
            />
          </Row>
        </Section>

        <Section title="Notifications" t={t}>
          <Row label="Event Reminders" t={t}>
            <Switch value={true} trackColor={{false: t.bg.tertiary, true: t.accents.aurora.deep}} />
          </Row>
          <Row label="Friends going to events" t={t}>
            <Switch value={true} trackColor={{false: t.bg.tertiary, true: t.accents.aurora.deep}} />
          </Row>
          <Row label="Partner messages" t={t}>
            <Switch value={false} trackColor={{false: t.bg.tertiary, true: t.accents.aurora.deep}} />
          </Row>
        </Section>

        <Section title="Privacy" t={t}>
          <Row label="Show me in friend lists" t={t}>
            <Switch value={true} trackColor={{false: t.bg.tertiary, true: t.accents.aurora.deep}} />
          </Row>
          <Row label="Public profile" t={t}>
            <Switch value={false} trackColor={{false: t.bg.tertiary, true: t.accents.aurora.deep}} />
          </Row>
        </Section>

        <Section title="Account" t={t}>
          <Row label="Email" t={t}>
            <Text style={{color: t.text.secondary}}>demo@ventii.app</Text>
          </Row>
          <Pressable
            onPress={() => {
              dispatch(logoutUser());
            }}
            style={[styles.logoutBtn, {borderColor: t.status.danger}]}>
            <Text style={{color: t.status.danger, fontWeight: '700'}}>Sign Out</Text>
          </Pressable>
        </Section>

        <Text style={{color: t.text.tertiary, textAlign: 'center', fontSize: 11, marginTop: 30, letterSpacing: 1}}>
          VENTII v0.1 · DEMO
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const Section: React.FC<{title: string; children: React.ReactNode; t: any}> = ({title, children, t}) => (
  <View style={{marginBottom: 28}}>
    <Text style={{color: t.text.tertiary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10, marginLeft: 4}}>
      {title.toUpperCase()}
    </Text>
    <View style={{backgroundColor: t.bg.secondary, borderRadius: 16, borderWidth: 1, borderColor: t.border.subtle}}>
      {children}
    </View>
  </View>
);

const Row: React.FC<{label: string; t: any; children: React.ReactNode}> = ({label, t, children}) => (
  <View style={[styles.row, {borderBottomColor: t.border.subtle}]}>
    <Text style={{color: t.text.primary, fontSize: 15}}>{label}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1},
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  navBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logoutBtn: {
    margin: 12,
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    borderWidth: 1.4,
  },
});
