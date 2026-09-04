import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { hostOf, lookupSource, type Signal, type SignalKind, type SourceEntry } from '@/data/sources';
import { useStore } from '@/state/store';
import { radius, space, useTheme } from '@/theme';

const ICONS: Record<SignalKind, keyof typeof Ionicons.glyphMap> = {
  wire: 'radio-outline',
  'public-broadcaster': 'business-outline',
  'state-funded': 'flag-outline',
  nonprofit: 'heart-outline',
  'reader-funded': 'people-outline',
  ifcn: 'shield-checkmark-outline',
  ownership: 'briefcase-outline',
};

const SHORT: Record<SignalKind, string> = {
  wire: 'Wire service',
  'public-broadcaster': 'Public broadcaster',
  'state-funded': 'State funded',
  nonprofit: 'Non-profit',
  'reader-funded': 'Reader funded',
  ifcn: 'IFCN certified',
  ownership: 'Ownership',
};

/** The key a reader's own mute/trust preference is stored under. */
export function sourceKey(article: { source: string; sourceUrl?: string }) {
  return hostOf(article.sourceUrl) ?? `name:${article.source.trim().toLowerCase()}`;
}

export function SourceBadges({
  article,
  compact,
}: {
  article: { source: string; sourceUrl?: string };
  compact?: boolean;
}) {
  const t = useTheme();
  const countryCode = useStore((s) => s.countryCode);
  const pref = useStore((s) => s.sourcePrefs[sourceKey(article)]);
  const [open, setOpen] = useState(false);

  const found = lookupSource(article, countryCode);
  const signals = found?.entry.signals ?? [];
  if (!signals.length && !pref) return null;

  // Ownership is the least interesting chip when there are stronger ones.
  const shown = compact
    ? signals.filter((s) => s.kind !== 'ownership').slice(0, 1)
    : signals.slice(0, 3);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={6}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space(1) }}
      >
        {shown.map((signal) => (
          <Chip key={signal.kind} icon={ICONS[signal.kind]} label={SHORT[signal.kind]} tone={t.textDim} />
        ))}
        {/* A reader's own mark is an outline, never styled like a cited one. */}
        {pref ? (
          <Chip
            icon="person-outline"
            label={pref === 'trusted' ? 'Your mark' : 'Muted'}
            tone={pref === 'trusted' ? t.accent : t.textFaint}
            outline
          />
        ) : null}
      </Pressable>

      {found ? (
        <WhyTheseMarks entry={found.entry} match={found.match} visible={open} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function Chip({
  icon,
  label,
  tone,
  outline,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone: string;
  outline?: boolean;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space(1),
        paddingHorizontal: space(1.5),
        paddingVertical: 2,
        borderRadius: radius.sm,
        backgroundColor: outline ? 'transparent' : t.surfaceAlt,
        borderWidth: outline ? 1 : 0,
        borderColor: tone,
      }}
    >
      <Ionicons name={icon} size={10} color={tone} />
      <Text style={{ color: tone, fontSize: 10, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function WhyTheseMarks({
  entry,
  match,
  visible,
  onClose,
}: {
  entry: SourceEntry;
  match: 'host' | 'display-name';
  visible: boolean;
  onClose: () => void;
}) {
  const t = useTheme();
  const key = entry.host;
  const pref = useStore((s) => s.sourcePrefs[key]);
  const setSourcePref = useStore((s) => s.setSourcePref);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#0008' }} onPress={onClose} />
      <View
        style={{
          backgroundColor: t.bg,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          maxHeight: '85%',
          paddingTop: space(3),
        }}
      >
        <View style={{ alignItems: 'center', paddingBottom: space(2) }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.border }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: space(4), paddingBottom: space(8) }}>
          <Text style={{ color: t.text, fontSize: 20, fontWeight: '800' }}>{entry.name}</Text>
          <Text style={{ color: t.textFaint, fontSize: 12, marginTop: space(1) }}>
            {entry.host}
            {match === 'display-name' ? ' · matched by name' : ''}
          </Text>

          <Text style={{ color: t.textDim, fontSize: 13, lineHeight: 20, marginTop: space(4) }}>
            These are facts about the publisher with a link to where each one comes from. They are not a rating,
            a score, or an endorsement of any particular article.
          </Text>

          {entry.signals.map((signal, i) => (
            <SignalRow key={i} signal={signal} />
          ))}

          <View style={{ marginTop: space(6), gap: space(2) }}>
            <Text style={{ color: t.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 }}>YOUR OWN MARK</Text>
            <View style={{ flexDirection: 'row', gap: space(2) }}>
              <Button
                label={pref === 'trusted' ? 'Trusted ✓' : 'Trust'}
                variant={pref === 'trusted' ? 'primary' : 'ghost'}
                onPress={() => setSourcePref(key, pref === 'trusted' ? null : 'trusted')}
                style={{ flex: 1 }}
              />
              <Button
                label={pref === 'muted' ? 'Muted ✓' : 'Mute'}
                variant={pref === 'muted' ? 'danger' : 'ghost'}
                onPress={() => setSourcePref(key, pref === 'muted' ? null : 'muted')}
                style={{ flex: 1 }}
              />
            </View>
            <Text style={{ color: t.textFaint, fontSize: 11, lineHeight: 17 }}>
              Your own marks are private to this phone and are shown as outlines, so they never look like a
              sourced fact.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function SignalRow({ signal }: { signal: Signal }) {
  const t = useTheme();
  return (
    <View style={{ marginTop: space(4), paddingLeft: space(3), borderLeftWidth: 2, borderLeftColor: t.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
        <Ionicons name={ICONS[signal.kind]} size={14} color={t.textDim} />
        <Text style={{ color: t.text, fontSize: 14, fontWeight: '600', flex: 1 }}>{signal.label}</Text>
      </View>
      {signal.detail ? (
        <Text style={{ color: t.textDim, fontSize: 12, lineHeight: 18, marginTop: space(1.5) }}>{signal.detail}</Text>
      ) : null}
      <Pressable onPress={() => WebBrowser.openBrowserAsync(signal.sourceUrl)} style={{ marginTop: space(2) }}>
        <Text style={{ color: t.accent, fontSize: 12 }} numberOfLines={1}>
          {signal.sourceUrl}
        </Text>
      </Pressable>
      <Text style={{ color: t.textFaint, fontSize: 11, marginTop: space(1) }}>Link checked {signal.checkedOn}</Text>
    </View>
  );
}
