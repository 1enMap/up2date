import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Button, Card } from '@/components/ui';
import { getProvider } from '@/data/providers';
import { verifyKey } from '@/lib/ai';
import { saveApiKey } from '@/state/apiKey';
import { useStore } from '@/state/store';
import { radius, space, useTheme } from '@/theme';

// The three worth offering on first run: free, best, and widest choice.
const FIRST_RUN = ['gemini', 'openrouter', 'anthropic'];

/**
 * First run. The news itself needs nothing, so this screen never blocks — but the
 * summaries, fact checks and social read-outs run on the reader's own key, and
 * that has to be said plainly rather than discovered later.
 */
export default function WelcomeScreen() {
  const t = useTheme();
  const router = useRouter();
  const store = useStore();

  const [providerId, setProviderId] = useState('gemini');
  const [key, setKey] = useState('');
  const [state, setState] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const meta = getProvider(providerId);

  const finish = () => {
    store.set('onboarded', true);
    router.replace('/(tabs)');
  };

  const saveAndFinish = async () => {
    const trimmed = key.trim();
    if (!trimmed) return finish();

    setState('checking');
    setError(null);
    try {
      await verifyKey({ kind: meta.kind, apiKey: trimmed, baseUrl: meta.baseUrl || undefined, model: meta.defaultModel });
      await saveApiKey(providerId, trimmed);
      store.set('providerId', providerId);
      setState('ok');
      finish();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That key did not work.');
      setState('error');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: space(6), paddingTop: space(12), gap: space(5) }}>
        <View style={{ alignItems: 'center', gap: space(3) }}>
          <Image
            source={require('../assets/icon.png')}
            style={{ width: 76, height: 76, borderRadius: radius.lg }}
            contentFit="cover"
          />
          <Text style={{ color: t.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>Up2Date</Text>
          <Text style={{ color: t.textDim, fontSize: 15, lineHeight: 22, textAlign: 'center' }}>
            News from every corner of the web, in 23 languages. No ads, no tracking, no engagement ranking.
          </Text>
        </View>

        <Card>
          <View style={{ flexDirection: 'row', gap: space(3), alignItems: 'flex-start' }}>
            <Ionicons name="key-outline" size={20} color={t.accent} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontSize: 15, fontWeight: '700' }}>You bring your own AI key</Text>
              <Text style={{ color: t.textDim, fontSize: 13, lineHeight: 20, marginTop: space(2) }}>
                Summaries, fact checks and the social read-out run on your own provider account. The key is stored
                in this phone's keychain, is sent only to the provider you pick, and reaches no one else — not the
                developer, not a server in between.
              </Text>
              <Text style={{ color: t.textFaint, fontSize: 12, lineHeight: 18, marginTop: space(2) }}>
                Reading the news needs no key at all. You can skip this — Settings has eight more providers,
                including DeepSeek, GLM, Groq, a local Ollama, or any OpenAI-compatible endpoint.
              </Text>
            </View>
          </View>
        </Card>

        <View style={{ gap: space(2) }}>
          {FIRST_RUN.map(getProvider).map((p) => {
            const on = p.id === providerId;
            return (
              <Pressable
                key={p.id}
                onPress={() => setProviderId(p.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space(3),
                  padding: space(4),
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: on ? t.accent : t.border,
                  backgroundColor: on ? t.accentSoft : t.surface,
                }}
              >
                <Ionicons
                  name={on ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={on ? t.accent : t.textFaint}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>{p.label}</Text>
                  <Text style={{ color: t.textFaint, fontSize: 12, marginTop: 2 }}>{p.blurb}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: space(3) }}>
          <Button
            label={`Get a key at ${meta.console}`}
            variant="ghost"
            icon="open-outline"
            onPress={() => WebBrowser.openBrowserAsync(meta.consoleUrl)}
          />

          <TextInput
            value={key}
            onChangeText={(v) => {
              setKey(v);
              setState('idle');
            }}
            placeholder={`Paste your ${meta.label} key (${meta.keyHint})`}
            placeholderTextColor={t.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={{
              color: t.text,
              backgroundColor: t.surfaceAlt,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: state === 'error' ? t.bad : t.border,
              paddingHorizontal: space(3.5),
              paddingVertical: space(3.5),
              fontSize: 15,
            }}
          />

          {error ? <Text style={{ color: t.bad, fontSize: 13, lineHeight: 19 }}>{error}</Text> : null}

          <Button
            label={key.trim() ? 'Check key and continue' : 'Continue without a key'}
            busy={state === 'checking'}
            onPress={saveAndFinish}
          />
        </View>

        <Text style={{ color: t.textFaint, fontSize: 11, lineHeight: 17, textAlign: 'center' }}>
          Whatever a provider charges for your usage is billed to your account, at their rates. Up2Date adds
          nothing and sees nothing.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
