import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { Button, Card, Divider, SectionTitle } from '@/components/ui';
import { UpdatesCard } from '@/components/UpdatesCard';
import { getCountry } from '@/data/countries';
import { getLanguage } from '@/data/languages';
import { TOPICS } from '@/data/topics';
import { getProvider } from '@/data/providers';
import { cooldownRemaining } from '@/lib/ai';
import { appVersion } from '@/lib/updates';
import { useApiKey } from '@/state/apiKey';
import { useStore } from '@/state/store';
import { radius, space, useTheme, type ThemeMode } from '@/theme';

const THEME_MODES: { key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export default function SettingsScreen() {
  const t = useTheme();
  const router = useRouter();
  const store = useStore();
  const preset = getProvider(store.providerId);
  const apiKey = useApiKey(store.providerId);
  const [cooldown, setCooldown] = useState(cooldownRemaining());

  // Surface an active rate-limit cooldown while the user is looking at this screen.
  useEffect(() => {
    const timer = setInterval(() => setCooldown(cooldownRemaining()), 1000);
    return () => clearInterval(timer);
  }, []);
  const language = getLanguage(store.languageCode);
  const country = getCountry(store.countryCode);

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
        <Card style={{ padding: 0 }}>
          <Row
            icon="sparkles-outline"
            label="Provider"
            value={preset.label}
            onPress={() => router.push('/settings/ai')}
          />
          <Row
            icon="cube-outline"
            label="Model"
            value={store.aiModel || preset.defaultModel || '—'}
            onPress={() => router.push('/settings/ai')}
          />
          <Row
            icon="key-outline"
            label="API key"
            value={apiKey ? 'Saved' : preset.kind === 'openai' && !preset.consoleUrl ? 'Not needed' : 'Not set'}
            onPress={() => router.push('/settings/ai')}
            last
          />
        </Card>

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
              Requests are queued one at a time and retried automatically. If this keeps happening, switch model or
              provider.
            </Text>
          </View>
        ) : null}

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
        <SectionTitle>Updates</SectionTitle>
        <UpdatesCard />
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
              <Text style={{ color: t.textFaint, fontSize: 12 }}>Version {appVersion}</Text>
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
