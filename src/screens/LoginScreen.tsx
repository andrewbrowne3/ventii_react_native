import React, {useState} from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import {useTheme} from '../hooks/useTheme';
import {RootState, AppDispatch} from '../store/store';
import {loginUser} from '../store/slices/authSlice';

export const LoginScreen: React.FC = () => {
  const t = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const isLoading = useSelector((s: RootState) => s.auth.isLoading);
  const error = useSelector((s: RootState) => s.auth.error);
  const [email, setEmail] = useState('demo@ventii.app');
  const [password, setPassword] = useState('demo12345');

  const handle = () => dispatch(loginUser({email, password}));

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: t.bg.primary}]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{flex: 1, justifyContent: 'center', padding: 28}}>
        <View style={{marginBottom: 48}}>
          <Text style={[styles.brand, {color: t.text.tertiary}]}>VENTII</Text>
          <Text style={[styles.headline, {color: t.text.primary}]}>
            Atlanta after dark.
          </Text>
          <Text style={[styles.subhead, {color: t.text.secondary}]}>
            Sign in to see what's tonight.
          </Text>
        </View>

        <View style={{gap: 14}}>
          <View>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={t.text.tertiary}
              style={[styles.input, {color: t.text.primary, backgroundColor: t.bg.secondary, borderColor: t.border.subtle}]}
            />
          </View>
          <View>
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={t.text.tertiary}
              style={[styles.input, {color: t.text.primary, backgroundColor: t.bg.secondary, borderColor: t.border.subtle}]}
            />
          </View>

          {error && (
            <Text style={{color: t.status.danger, fontSize: 13}}>
              {error}
            </Text>
          )}

          <Pressable
            onPress={handle}
            disabled={isLoading}
            style={[styles.cta, {backgroundColor: t.accents.aurora.base}]}>
            {isLoading
              ? <ActivityIndicator color={t.text.inverse} />
              : <Text style={{color: t.text.inverse, fontWeight: '700', fontSize: 15, letterSpacing: 0.3}}>
                  Sign In
                </Text>
            }
          </Pressable>

          <Text style={{color: t.text.tertiary, fontSize: 12, textAlign: 'center', marginTop: 14}}>
            Demo · demo@ventii.app / demo12345
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  brand: {fontSize: 12, fontWeight: '700', letterSpacing: 4, marginBottom: 18},
  headline: {fontSize: 36, fontWeight: '800', letterSpacing: -0.6, lineHeight: 42},
  subhead: {fontSize: 14, marginTop: 8},
  label: {fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: '#6E6E80', marginBottom: 6},
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  cta: {
    marginTop: 14,
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
  },
});
