import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { Button, Card, Divider, SectionTitle } from '@/components/ui';
import { getCountry } from '@/data/countries';
import { getLanguage } from '@/data/languages';
import { TOPICS } from '@/data/topics';
import { GEMINI_DEFAULT_MODEL, cooldownRemaining, listGeminiModels, type Provider } from '@/lib/ai';
import { saveApiKey, useApiKey } from '@/state/apiKey';
import { builtInProxy } from '@/state/useAiConfig';
import { useStore } from '@/state/store';
import { radius, space, useTheme, type ThemeMode } from '@/theme';

const THEME_MODES: { key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
];

/**
 * Free-tier Gemini keys are limited per minute and per day, and the limits differ
 * sharply by model — the lite and flash models are the ones that survive real use.
 */
const GEMINI_FREE_TIER_ADVICE =
  'On the free tier, stay on a flash or flash-lite model — pro and preview models have very small daily caps and will stop after a handful of requests. Turning off "Summarise on open" also cuts request count roughly in half.';

const PROVIDERS: { key: Provider; label: string; hint: string; keyHint: string; console: string }[] = [
  {
    key: 'anthropic',
    label: 'Claude',
    hint: 'claude-opus-5 with web search',
    keyHint: 'sk-ant-…',
    console: 'console.anthropic.com',
  },
  {
    key: 'gemini',
    label: 'Gemini',
    hint: 'Google AI Studio key, with Google Search grounding',
    keyHint: 'AIza…',
    console: 'aistudio.google.com/apikey',
  },
];

export default function SettingsScreen() {
  const t = useTheme();
  const router = useRouter();
  const store = useStore();
  const provider = store.aiProvider;
  const apiKey = useApiKey(provider);
  const meta = PROVIDERS.find((p) => p.key === provider)!;

  const [keyDraft, setKeyDraft] = useState('');
  const [baseUrlDraft, setBaseUrlDraft] = useState(store.aiBaseUrl);
  const [savedNote, setSavedNote] = useState(false);
  const [models, setModels] = useState<string[] | null>(null);
  const [cooldown, setCooldown] = useState(cooldownRemaining());
  const [modelsBusy, setModelsBusy] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  useEffect(() => setBaseUrlDraft(store.aiBaseUrl), [store.aiBaseUrl]);
  // Surface an active rate-limit cooldown while the user is looking at this screen.
  useEffect(() => {
    const timer = setInterval(() => setCooldown(cooldownRemaining()), 1000);
    return () => clearInterval(timer);
  }, []);
  // Each provider carries its own key and model, so drafts reset on a switch.
  useEffect(() => {
    setKeyDraft('');
    setModels(null);
    setModelsError(null);
  }, [provider]);

  const language = getLanguage(store.languageCode);
  const country = getCountry(store.countryCode);

  const saveAi = async () => {
    if (keyDraft.trim()) await saveApiKey(provider, keyDraft.trim());
    store.set('aiBaseUrl', baseUrlDraft.trim());
    setKeyDraft('');
    setSavedNote(true);
    setTimeout(() => setSavedNote(false), 2000);
  };

  const loadModels = async () => {
    setModelsBusy(true);
    setModelsError(null);
    try {
      const key = keyDraft.trim() || apiKey;
      setModels(
        await listGeminiModels({
          provider: 'gemini',
          apiKey: key ?? undefined,
          baseUrl: baseUrlDraft.trim() || undefined,
        }),
      );
    } catch (e) {
      setModelsError(e instanceof Error ? e.message : 'Could not list models.');
    } finally {
      setModelsBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: space(4), paddingBottom: space(12), gap: space(6) }}>
      <View>
        <SectionTitle>Appearance</SectionTitle>
        <View style={{ flexDirection: 'row', gap: space(2) }}>
          {THEME_MODES.map((m) => {
            const on = store.themeMode === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => store.set('themeMode', m.key)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  gap: space(1.5),
                  paddingVertical: space(3.5),
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: on ? t.accent : t.border,
                  backgroundColor: on ? t.accentSoft : t.surface,
                }}
              >
                <Ionicons name={m.icon} size={18} color={on ? t.accent : t.textDim} />
                <Text style={{ color: on ? t.accent : t.textDim, fontSize: 13, fontWeight: '600' }}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <SectionTitle>Edition</SectionTitle>
        <Card style={{ padding: 0 }}>
          <Row
            icon="language-outline"
            label="Language"
            value={`${language.nativeName}${language.aiTranslateOnly ? ' · AI translated' : ''}`}
            onPress={() => router.push('/picker/language')}
          />
          <Row
            icon="globe-outline"
            label="Region"
            value={`${country.flag}  ${country.name}`}
            onPress={() => router.push('/picker/country')}
            last
          />
        </Card>
        {language.aiTranslateOnly ? (
          <Text style={{ color: t.textFaint, fontSize: 12, marginTop: space(2), lineHeight: 18 }}>
            {language.name} has no Google News edition. Stories arrive in the region's language and headlines,
            summaries and answers are translated into {language.nativeName} by the AI provider.
          </Text>
        ) : null}
      </View>

      <View>
        <SectionTitle>Topics in your feed</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
          {TOPICS.map((topic) => {
            const on = store.followedTopics.includes(topic.key);
            return (
              <Pressable
                key={topic.key}
                onPress={() => store.toggleTopic(topic.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space(1.5),
                  paddingHorizontal: space(3.5),
                  paddingVertical: space(2),
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: on ? t.accent : t.border,
                  backgroundColor: on ? t.accent : t.surface,
                }}
              >
                <Ionicons name={on ? 'checkmark' : 'add'} size={13} color={on ? '#fff' : t.textDim} />
                <Text style={{ color: on ? '#fff' : t.textDim, fontSize: 13, fontWeight: '600' }}>{topic.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <SectionTitle>AI provider</SectionTitle>
        <Card>
          <View style={{ flexDirection: 'row', gap: space(2) }}>
            {PROVIDERS.map((p) => {
              const on = p.key === provider;
              return (
                <Pressable
                  key={p.key}
                  onPress={() => store.set('aiProvider', p.key)}
                  style={{
                    flex: 1,
                    padding: space(3),
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: on ? t.accent : t.border,
                    backgroundColor: on ? t.accentSoft : 'transparent',
                  }}
                >
                  <Text style={{ color: on ? t.accent : t.text, fontSize: 15, fontWeight: '700' }}>{p.label}</Text>
                  <Text style={{ color: t.textFaint, fontSize: 11, marginTop: space(1), lineHeight: 16 }}>{p.hint}</Text>
                </Pressable>
              );
            })}
          </View>

          <Divider />

          <Text style={{ color: t.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: space(2) }}>
            {meta.label.toUpperCase()} API KEY {apiKey ? '· SAVED' : ''}
          </Text>
          <TextInput
            value={keyDraft}
            onChangeText={setKeyDraft}
            placeholder={apiKey ? '•••••••••••••••••••• (stored in keychain)' : meta.keyHint}
            placeholderTextColor={t.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={input(t)}
          />
          <Text style={{ color: t.textFaint, fontSize: 11, marginTop: space(2) }}>Get one at {meta.console}</Text>

          {cooldown > 0 ? (
            <View
              style={{
                marginTop: space(3),
                padding: space(3),
                borderRadius: radius.sm,
                backgroundColor: t.surfaceAlt,
                borderLeftWidth: 3,
                borderLeftColor: t.warn,
              }}
            >
              <Text style={{ color: t.warn, fontSize: 12, fontWeight: '700' }}>
                Rate limited — pausing requests for {cooldown}s
              </Text>
              <Text style={{ color: t.textDim, fontSize: 12, lineHeight: 18, marginTop: space(1) }}>
                Requests are queued one at a time and retried automatically. If this keeps happening, switch model
                or provider below.
              </Text>
            </View>
          ) : null}

          {provider === 'gemini' ? (
            <View style={{ marginTop: space(4) }}>
              <Text style={{ color: t.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: space(2) }}>
                MODEL
              </Text>
              <TextInput
                value={store.aiModel}
                onChangeText={(v) => store.set('aiModel', v)}
                placeholder={GEMINI_DEFAULT_MODEL}
                placeholderTextColor={t.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
                style={input(t)}
              />
              <Text style={{ color: t.textFaint, fontSize: 11, lineHeight: 17, marginTop: space(2) }}>
                {GEMINI_FREE_TIER_ADVICE}
              </Text>
              <Button
                label={models ? 'Reload models' : 'Load models from my key'}
                variant="ghost"
                icon="list-outline"
                busy={modelsBusy}
                onPress={loadModels}
                style={{ marginTop: space(2) }}
              />
              {modelsError ? (
                <Text style={{ color: t.bad, fontSize: 12, marginTop: space(2) }}>{modelsError}</Text>
              ) : null}
              {models ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginTop: space(3) }}>
                  {models.map((m) => {
                    const on = (store.aiModel || GEMINI_DEFAULT_MODEL) === m;
                    return (
                      <Pressable
                        key={m}
                        onPress={() => store.set('aiModel', m)}
                        style={{
                          paddingHorizontal: space(3),
                          paddingVertical: space(2),
                          borderRadius: radius.pill,
                          borderWidth: 1,
                          borderColor: on ? t.accent : t.border,
                          backgroundColor: on ? t.accent : t.surface,
                        }}
                      >
                        <Text style={{ color: on ? '#fff' : t.textDim, fontSize: 12, fontWeight: '600' }}>{m}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : null}

          <Text style={{ color: t.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginTop: space(4), marginBottom: space(2) }}>
            PROXY URL (OPTIONAL)
          </Text>
          <TextInput
            value={baseUrlDraft}
            onChangeText={setBaseUrlDraft}
            placeholder={builtInProxy() || 'https://your-proxy.example.com'}
            placeholderTextColor={t.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={input(t)}
          />

          <View style={{ flexDirection: 'row', gap: space(2), marginTop: space(4), alignItems: 'center' }}>
            <Button label={savedNote ? 'Saved' : 'Save'} icon={savedNote ? 'checkmark' : 'save-outline'} onPress={saveAi} />
            {apiKey ? (
              <Button
                label="Remove key"
                variant="danger"
                onPress={() =>
                  Alert.alert(`Remove the ${meta.label} key?`, 'AI features will stop working until you add one again.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => void saveApiKey(provider, '') },
                  ])
                }
              />
            ) : null}
          </View>

          {builtInProxy() && !baseUrlDraft ? (
            <Text style={{ color: t.textFaint, fontSize: 11, marginTop: space(2), lineHeight: 17 }}>
              This build ships with a proxy, so AI features already work without a key of your own. Add one here
              to use your own quota instead.
            </Text>
          ) : null}

          <Text style={{ color: t.textFaint, fontSize: 11, marginTop: space(3), lineHeight: 17 }}>
            Your key is kept in this phone's keychain and sent only to the provider you pick. It goes to no
            server of ours — there isn't one. The proxy field is for pointing your own devices at your own
            proxy; leave it empty otherwise.
          </Text>
        </Card>

        <Card style={{ marginTop: space(3) }}>
          <Toggle
            title="Summarise on open"
            body="Generate the summary as soon as you open a story. Turn off to save API spend."
            value={store.autoSummarize}
            onChange={(v) => store.set('autoSummarize', v)}
          />
          <Divider />
          <Toggle
            title="Social lookups"
            body="Show posts from Reddit, Bluesky, Mastodon, Lemmy and Hacker News, and read the X / Instagram / YouTube conversation through the AI provider."
            value={store.socialEnabled}
            onChange={(v) => store.set('socialEnabled', v)}
          />
        </Card>
      </View>

      <View>
        <SectionTitle>Storage</SectionTitle>
        <Card style={{ padding: 0 }}>
          <Row icon="bookmark-outline" label="Saved stories" value={String(store.saved.length)} />
          <Row
            icon="sparkles-outline"
            label="Cached AI output"
            value={String(
              Object.keys(store.summaries).length + Object.keys(store.factChecks).length + Object.keys(store.pulses).length,
            )}
            onPress={() =>
              Alert.alert('Clear cached AI output?', 'Summaries, fact checks and social read-outs will be regenerated on demand.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear',
                  style: 'destructive',
                  onPress: () => useStore.setState({ summaries: {}, factChecks: {}, pulses: {} }),
                },
              ])
            }
            last
          />
        </Card>
      </View>

      <View>
        <SectionTitle>About</SectionTitle>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
            <Image
              source={require('../../assets/icon.png')}
              style={{ width: 44, height: 44, borderRadius: radius.md }}
              contentFit="cover"
            />
            <View>
              <Text style={{ color: t.text, fontSize: 15, fontWeight: '700' }}>Up2Date</Text>
              <Text style={{ color: t.textFaint, fontSize: 12 }}>Version 1.0.0</Text>
            </View>
          </View>
          <Text style={{ color: t.textDim, fontSize: 13, lineHeight: 20, marginTop: space(3) }}>
            Headlines are aggregated from Google News across thousands of publishers. No ads, no tracking, no
            engagement scoring — the feed is ordered by recency, nothing else. Full articles open on the
            publisher's own site so their reporting keeps its traffic.
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}

function input(t: ReturnType<typeof useTheme>) {
  return {
    color: t.text,
    backgroundColor: t.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: space(3),
    paddingVertical: space(3),
    fontSize: 14,
  } as const;
}

function Toggle({
  title,
  body,
  value,
  onChange,
}: {
  title: string;
  body: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1, paddingRight: space(4) }}>
        <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: t.textFaint, fontSize: 12, marginTop: space(1), lineHeight: 17 }}>{body}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: t.accent, false: t.border }} />
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space(3),
        paddingHorizontal: space(4),
        paddingVertical: space(4),
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.border,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={17} color={t.textDim} />
      <Text style={{ color: t.text, fontSize: 15, flex: 1 }}>{label}</Text>
      {value ? <Text style={{ color: t.textDim, fontSize: 14 }}>{value}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={15} color={t.textFaint} /> : null}
    </Pressable>
  );
}
