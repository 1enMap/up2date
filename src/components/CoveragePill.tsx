import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { corroborationFor } from '@/lib/corroboration';
import type { Article } from '@/lib/rss';
import { useStore } from '@/state/store';
import { radius, space, useTheme } from '@/theme';

/**
 * How many independent newsrooms carry this story, not how many URLs Google
 * clustered. Titles under one owner collapse; wire copy is flagged.
 */
export function CoveragePill({ article }: { article: Article }) {
  const t = useTheme();
  const countryCode = useStore((s) => s.countryCode);
  const c = useMemo(() => corroborationFor(article, countryCode), [article, countryCode]);

  if (c.outlets <= 1) return null;

  const tone = c.level === 'broad' ? t.good : c.level === 'thin' ? t.textDim : t.textFaint;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space(1.5),
        backgroundColor: t.surfaceAlt,
        paddingHorizontal: space(2.5),
        paddingVertical: space(1),
        borderRadius: radius.pill,
      }}
    >
      <Ionicons name={c.wireCount ? 'radio-outline' : 'layers-outline'} size={12} color={tone} />
      <Text style={{ color: tone, fontSize: 11, fontWeight: '600' }}>
        {c.independentOutlets < c.outlets
          ? `${c.independentOutlets} of ${c.outlets} independent`
          : `${c.independentOutlets} newsrooms`}
      </Text>
    </View>
  );
}

/** The full read-out, for the article screen. */
export function CoverageDetail({ article }: { article: Article }) {
  const t = useTheme();
  const countryCode = useStore((s) => s.countryCode);
  const c = useMemo(() => corroborationFor(article, countryCode), [article, countryCode]);

  return (
    <View
      style={{
        padding: space(3.5),
        borderRadius: radius.md,
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
        <Ionicons name="layers-outline" size={15} color={t.accent} />
        <Text style={{ color: t.text, fontSize: 14, fontWeight: '700' }}>Who else is carrying this</Text>
      </View>

      <Text style={{ color: t.textDim, fontSize: 13, lineHeight: 20, marginTop: space(2) }}>{c.explanation}</Text>

      <Text style={{ color: t.textFaint, fontSize: 11, lineHeight: 17, marginTop: space(3) }}>
        Counted from the outlets Google News grouped with this story, so it is a floor rather than a full count.
        Several outlets carrying one wire report is distribution, not confirmation.
      </Text>
    </View>
  );
}
