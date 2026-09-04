import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button, Card, Divider, SectionTitle } from '@/components/ui';
import { PROVIDERS, getProvider } from '@/data/providers';
import { verifyKey } from '@/lib/ai';
import { saveApiKey, useApiKey } from '@/state/apiKey';
import { useStore } from '@/state/store';
import { radius, space, useTheme } from '@/theme';

/**
 * Settings → AI provider. Everything is edited on a draft and only written to the
 * store on Save, so backing out cannot half-apply a provider switch.
 */
export default function AiProviderScreen() {
  const t = useTheme();
  const router = useRouter();
  const store = useStore();

  const [providerId, setProviderId] = useState(store.providerId);
  const preset = getProvider(providerId);
  const savedKey = useApiKey(providerId);

  const [keyDraft, setKeyDraft] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const [busy, setBusy] = useState(false);
  const [models, setModels] = useState<string[] | null>(null);
  const [status, setStatus] = useState<{ tone: 'good' | 'bad' | 'dim'; text: string } | null>(null);

  // Overrides only belong to the provider that is currently selected.
  useEffect(() => {
    const isCurrent = providerId === store.providerId;
    setBaseUrl(isCurrent ? store.aiBaseUrl : '');
    setModel(isCurrent ? store.aiModel : '');
    setKeyDraft('');
    setModels(null);
    setStatus(null);
  }, [providerId, store.providerId, store.aiBaseUrl, store.aiModel]);

  const effective = useMemo(
    () => ({
      kind: preset.kind,
      apiKey: (keyDraft.trim() || savedKey) ?? undefined,
      baseUrl: (baseUrl.trim() || preset.baseUrl) || undefined,
      model: (model.trim() || preset.defaultModel) || undefined,
    }),
    [preset, keyDraft, savedKey, baseUrl, model],
  );

  const test = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const list = await verifyKey(effective);
      setModels(list);
      setStatus({ tone: 'good', text: `Connected. ${list.length} models available.` });
    } catch (e) {
      setStatus({ tone: 'bad', text: e instanceof Error ? e.message : 'Could not connect.' });
    } finally {
      setBusy(false);
    }
  };

  /** localhost on a phone is the phone, which is never where the model runs. */
  const localhostTrap =
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(baseUrl.trim() || preset.baseUrl);

  const save = async () => {
    if (localhostTrap) {
      setStatus({
        tone: 'bad',
        text: 'On the phone, localhost is the phone. Use an https address the phone can reach — Android blocks plain HTTP.',
      });
      return;
    }
    if (keyDraft.trim()) await saveApiKey(providerId, keyDraft.trim());
    store.set('providerId', providerId);
    store.set('aiBaseUrl', baseUrl.trim());
    store.set('aiModel', model.trim());
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: space(4), paddingBottom: space(12), gap: space(5) }}>
        <View>
          <SectionTitle>Provider</SectionTitle>
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: space(3),
              padding: space(4),
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: t.border,
              backgroundColor: t.surface,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
                <Text style={{ color: t.text, fontSize: 16, fontWeight: '700' }}>{preset.label}</Text>
                {preset.free ? <Tag text="FREE TIER" tone={t.good} /> : null}
                {savedKey ? <Tag text="KEY SAVED" tone={t.textFaint} /> : null}
              </View>
              <Text style={{ color: t.textFaint, fontSize: 12, marginTop: 2 }}>{preset.blurb}</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={t.textFaint} />
          </Pressable>
        </View>

        <Card>
          {preset.consoleUrl ? (
            <Button
              label={`Get a key at ${preset.console}`}
              variant="ghost"
              icon="open-outline"
              onPress={() => WebBrowser.openBrowserAsync(preset.consoleUrl)}
            />
          ) : null}

          <Field label={`API KEY${savedKey ? ' · SAVED' : ''}`}>
            <TextInput
              value={keyDraft}
              onChangeText={setKeyDraft}
              placeholder={savedKey ? '•••••••••••••• (stored in keychain)' : preset.keyHint}
              placeholderTextColor={t.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={input(t)}
            />
          </Field>

          <Field label="BASE URL" hint={preset.editableBaseUrl ? 'Ends with /v1 for OpenAI-compatible APIs.' : undefined}>
            <TextInput
              value={baseUrl}
              onChangeText={setBaseUrl}
              placeholder={preset.baseUrl || 'https://api.example.com/v1'}
              placeholderTextColor={t.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={input(t)}
            />
          </Field>

          <Field label="MODEL">
            <TextInput
              value={model}
              onChangeText={setModel}
              placeholder={preset.defaultModel || 'model id'}
              placeholderTextColor={t.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              style={input(t)}
            />
          </Field>

          <View style={{ flexDirection: 'row', gap: space(2), marginTop: space(3) }}>
            <Button label="Test connection" variant="ghost" icon="pulse-outline" busy={busy} onPress={test} style={{ flex: 1 }} />
          </View>

          {status ? (
            <Text
              style={{
                color: status.tone === 'good' ? t.good : status.tone === 'bad' ? t.bad : t.textDim,
                fontSize: 12,
                lineHeight: 18,
                marginTop: space(3),
              }}
            >
              {status.text}
            </Text>
          ) : null}

          {models?.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginTop: space(3) }}>
              {models.slice(0, 40).map((m) => {
                const on = (model || preset.defaultModel) === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setModel(m)}
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
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', gap: space(3) }}>
            <Ionicons name={preset.search ? 'globe-outline' : 'alert-circle-outline'} size={18} color={preset.search ? t.good : t.warn} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontSize: 14, fontWeight: '600' }}>
                {preset.search ? 'Fact checks can search the web' : 'Fact checks cannot search the web'}
              </Text>
              <Text style={{ color: t.textDim, fontSize: 12, lineHeight: 18, marginTop: space(1) }}>
                {preset.search
                  ? 'Claims are checked against sources the model retrieves live, and the sources are listed.'
                  : "This provider has no search tool, so fact checks and the social read-out rely on what the model already knows. Treat them as weaker, and expect “could not verify” more often."}
              </Text>
            </View>
          </View>
          {preset.note ? (
            <>
              <Divider />
              <Text style={{ color: t.textFaint, fontSize: 12, lineHeight: 18 }}>{preset.note}</Text>
            </>
          ) : null}
        </Card>

        {localhostTrap ? (
          <Text style={{ color: t.warn, fontSize: 12, lineHeight: 18 }}>
            This base URL points at the phone itself. A local server needs an https address the phone can
            reach — Android blocks plain HTTP, so a LAN address will not work.
          </Text>
        ) : null}

        <Button label="Save" icon="checkmark" onPress={save} />

        <Text style={{ color: t.textFaint, fontSize: 11, lineHeight: 17, textAlign: 'center' }}>
          Keys are kept in this phone's keychain, one per provider, and sent only to the provider you select.
        </Text>
      </ScrollView>

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: '#0008' }} onPress={() => setPickerOpen(false)} />
        <View
          style={{
            backgroundColor: t.bg,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            maxHeight: '80%',
            paddingTop: space(3),
          }}
        >
          <View style={{ alignItems: 'center', paddingBottom: space(2) }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.border }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: space(4), paddingBottom: space(8), gap: space(2) }}>
            {PROVIDERS.map((p) => {
              const on = p.id === providerId;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    setProviderId(p.id);
                    setPickerOpen(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space(3),
                    padding: space(3.5),
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2), flexWrap: 'wrap' }}>
                      <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>{p.label}</Text>
                      {p.free ? <Tag text="FREE" tone={t.good} /> : null}
                      {p.search ? <Tag text="WEB SEARCH" tone={t.textFaint} /> : null}
                    </View>
                    <Text style={{ color: t.textFaint, fontSize: 12, marginTop: 2 }}>{p.blurb}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ marginTop: space(4) }}>
      <Text style={{ color: t.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: space(2) }}>
        {label}
      </Text>
      {children}
      {hint ? <Text style={{ color: t.textFaint, fontSize: 11, marginTop: space(1.5) }}>{hint}</Text> : null}
    </View>
  );
}

function Tag({ text, tone }: { text: string; tone: string }) {
  const t = useTheme();
  return (
    <Text
      style={{
        color: tone,
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
        backgroundColor: t.surfaceAlt,
        paddingHorizontal: space(1.5),
        paddingVertical: 2,
        borderRadius: radius.sm,
        overflow: 'hidden',
      }}
    >
      {text}
    </Text>
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
