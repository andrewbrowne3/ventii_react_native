import React, {useState} from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTheme} from '../hooks/useTheme';
import {Pill} from '../components/Pill';

interface Msg {id: string; role: 'user' | 'assistant'; text: string}

const STARTERS = [
  'Something low-key tonight',
  'Best rooftop this weekend',
  'Sober-friendly Friday',
  'Cheap eats + dancing',
];

const SEED_MESSAGES: Msg[] = [
  {
    id: 'm1', role: 'assistant',
    text: "Hey, I'm VENTII AI. Tell me what you're looking for tonight — vibe, budget, neighborhood, who you're with — and I'll pull the right events.",
  },
];

export const AIConciergeScreen: React.FC = () => {
  const t = useTheme();
  const [messages, setMessages] = useState<Msg[]>(SEED_MESSAGES);
  const [input, setInput] = useState('');

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Msg = {id: `u${Date.now()}`, role: 'user', text};
    const reply: Msg = {
      id: `a${Date.now()}`,
      role: 'assistant',
      text: 'Pulling that now... (mock reply — real AI wires up once the backend is connected.)',
    };
    setMessages((prev) => [...prev, userMsg, reply]);
    setInput('');
  };

  const pulse = t.accents.pulse;

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: t.bg.primary}]} edges={['top']}>
      <View style={styles.header}>
        <View style={[styles.aiDot, {backgroundColor: pulse.bg, borderColor: pulse.base}]}>
          <Text style={{color: pulse.base, fontSize: 14, fontWeight: '800'}}>✦</Text>
        </View>
        <View style={{flex: 1}}>
          <Text style={[styles.title, {color: t.text.primary}]}>VENTII AI</Text>
          <Text style={[styles.sub, {color: pulse.base}]}>Your concierge</Text>
        </View>
      </View>

      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={{padding: 20, gap: 14, paddingBottom: 40}}
        showsVerticalScrollIndicator={false}>
        {messages.map((m) =>
          m.role === 'assistant' ? (
            <View
              key={m.id}
              style={{
                alignSelf: 'flex-start',
                maxWidth: '88%',
                backgroundColor: pulse.bg,
                borderColor: pulse.base,
                borderWidth: 0.7,
                borderRadius: 18,
                borderTopLeftRadius: 4,
                padding: 14,
              }}>
              <Text style={{color: t.text.primary, fontSize: 15, lineHeight: 21}}>{m.text}</Text>
            </View>
          ) : (
            <View
              key={m.id}
              style={{
                alignSelf: 'flex-end',
                maxWidth: '88%',
                backgroundColor: t.bg.elevated,
                borderRadius: 18,
                borderTopRightRadius: 4,
                padding: 14,
              }}>
              <Text style={{color: t.text.primary, fontSize: 15}}>{m.text}</Text>
            </View>
          )
        )}

        {messages.length <= 1 && (
          <View style={{marginTop: 6}}>
            <Text style={{color: t.text.tertiary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10}}>
              TRY ASKING
            </Text>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
              {STARTERS.map((s) => (
                <Pressable key={s} onPress={() => send(s)}>
                  <Pill label={s} accent="pulse" />
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.inputBar, {backgroundColor: t.bg.elevated, borderTopColor: t.border.subtle}]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask me anything..."
            placeholderTextColor={t.text.tertiary}
            style={{flex: 1, color: t.text.primary, fontSize: 15, padding: 12}}
            onSubmitEditing={() => send(input)}
          />
          <Pressable
            onPress={() => send(input)}
            style={{
              backgroundColor: pulse.base,
              borderRadius: 100,
              paddingHorizontal: 18,
              paddingVertical: 11,
            }}>
            <Text style={{color: t.text.inverse, fontWeight: '700', fontSize: 14}}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 6, paddingBottom: 12,
  },
  aiDot: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1.2,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {fontSize: 22, fontWeight: '800', letterSpacing: -0.3},
  sub: {fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 1},
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
