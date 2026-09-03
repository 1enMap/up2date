import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { Button, Chip, SectionTitle } from '@/components/ui';
import {
  DEFAULT_VIEW,
  SORTS,
  WINDOWS,
  activeFilterCount,
  type ViewState,
} from '@/lib/articleView';
import { radius, space, useTheme } from '@/theme';

export function ArticleControls({
  view,
  onChange,
  sources,
  total,
  shown,
}: {
  view: ViewState;
  onChange: (next: ViewState) => void;
  /** Publishers present in the current feed, most frequent first. */
  sources: [string, number][];
  total: number;
  shown: number;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const filters = activeFilterCount(view);
  const sortLabel = SORTS.find((s) => s.key === view.sort)?.label ?? 'Newest first';

  const patch = (next: Partial<ViewState>) => onChange({ ...view, ...next });

  const toggleSource = (name: string) =>
    patch({
      sources: view.sources.includes(name)
        ? view.sources.filter((s) => s !== name)
        : [...view.sources, name],
    });

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space(2),
          paddingHorizontal: space(4),
          paddingBottom: space(2.5),
        }}
      >
        <Pressable
          onPress={() => setOpen(true)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: space(1.5),
            paddingHorizontal: space(3),
            paddingVertical: space(1.5),
            borderRadius: radius.pill,
            backgroundColor: t.surfaceAlt,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="swap-vertical-outline" size={13} color={t.textDim} />
          <Text style={{ color: t.text, fontSize: 12, fontWeight: '600' }}>{sortLabel}</Text>
        </Pressable>

        <Pressable
          onPress={() => setOpen(true)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: space(1.5),
            paddingHorizontal: space(3),
            paddingVertical: space(1.5),
            borderRadius: radius.pill,
            backgroundColor: filters ? t.accent : t.surfaceAlt,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="funnel-outline" size={13} color={filters ? '#fff' : t.textDim} />
          <Text style={{ color: filters ? '#fff' : t.text, fontSize: 12, fontWeight: '600' }}>
            {filters ? `${filters} filter${filters > 1 ? 's' : ''}` : 'Filter'}
          </Text>
        </Pressable>

        <View style={{ flex: 1 }} />
        {shown !== total ? (
          <Text style={{ color: t.textFaint, fontSize: 11 }}>
            {shown} of {total}
          </Text>
        ) : null}
      </View>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: '#0008' }} onPress={() => setOpen(false)} />
        <View
          style={{
            backgroundColor: t.bg,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            paddingTop: space(3),
            maxHeight: '82%',
          }}
        >
          <View style={{ alignItems: 'center', paddingBottom: space(2) }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.border }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: space(4), paddingBottom: space(6), gap: space(5) }}>
            <View>
              <SectionTitle>Sort by</SectionTitle>
              <View style={{ gap: space(1) }}>
                {SORTS.map((s) => (
                  <Pressable
                    key={s.key}
                    onPress={() => patch({ sort: s.key })}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: space(3),
                      paddingHorizontal: space(3),
                      borderRadius: radius.md,
                      backgroundColor: view.sort === s.key ? t.accentSoft : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        color: view.sort === s.key ? t.accent : t.text,
                        fontSize: 15,
                        fontWeight: view.sort === s.key ? '700' : '400',
                      }}
                    >
                      {s.label}
                    </Text>
                    {view.sort === s.key ? <Ionicons name="checkmark" size={17} color={t.accent} /> : null}
                  </Pressable>
                ))}
              </View>
            </View>

            <View>
              <SectionTitle>Published</SectionTitle>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
                {WINDOWS.map((w) => (
                  <Chip
                    key={w.key}
                    label={w.label}
                    selected={view.window === w.key}
                    onPress={() => patch({ window: w.key })}
                  />
                ))}
              </View>
            </View>

            <View>
              <SectionTitle>Minimum rating</SectionTitle>
              <View style={{ flexDirection: 'row', gap: space(2) }}>
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <Chip
                    key={n}
                    label={n === 0 ? 'Any' : `${n}★`}
                    selected={view.minRating === n}
                    onPress={() => patch({ minRating: n })}
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: space(3) }}>
              <Toggle label="Saved stories only" value={view.savedOnly} onChange={(v) => patch({ savedOnly: v })} />
              <Toggle label="Rated stories only" value={view.ratedOnly} onChange={(v) => patch({ ratedOnly: v })} />
            </View>

            {sources.length ? (
              <View>
                <SectionTitle
                  right={
                    view.sources.length ? (
                      <Pressable onPress={() => patch({ sources: [] })} hitSlop={10}>
                        <Text style={{ color: t.textFaint, fontSize: 12 }}>All</Text>
                      </Pressable>
                    ) : undefined
                  }
                >
                  Publishers in this feed
                </SectionTitle>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
                  {sources.map(([name, count]) => (
                    <Chip
                      key={name}
                      label={`${name} (${count})`}
                      selected={view.sources.includes(name)}
                      onPress={() => toggleSource(name)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: space(2) }}>
              <Button
                label="Reset"
                variant="ghost"
                onPress={() => onChange(DEFAULT_VIEW)}
                style={{ flex: 1 }}
              />
              <Button label="Show results" onPress={() => setOpen(false)} style={{ flex: 2 }} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ color: t.text, fontSize: 15 }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: t.accent, false: t.border }} />
    </View>
  );
}
