import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { ALL_LANGUAGES } from '@/data/languages';
import { useStore } from '@/state/store';
import { radius, space, useTheme } from '@/theme';

export default function LanguagePicker() {
  const t = useTheme();
  const router = useRouter();
  const languageCode = useStore((s) => s.languageCode);
  const set = useStore((s) => s.set);
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return ALL_LANGUAGES;
    return ALL_LANGUAGES.filter(
      (l) => l.name.toLowerCase().includes(needle) || l.nativeName.includes(q.trim()),
    );
  }, [q]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ padding: space(4), gap: space(2) }}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search languages"
          placeholderTextColor={t.textFaint}
          style={{
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: radius.md,
            color: t.text,
            paddingHorizontal: space(3),
            paddingVertical: space(3),
            fontSize: 15,
          }}
        />
        <Text style={{ color: t.textFaint, fontSize: 12, lineHeight: 18 }}>
          All 22 languages of the Eighth Schedule, plus English. Languages marked “AI translated” have no native
          Google News edition — Claude translates them on the device.
        </Text>
      </View>

      <FlatList
        data={results}
        keyExtractor={(l) => l.code}
        contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(8) }}
        renderItem={({ item }) => {
          const selected = item.code === languageCode;
          return (
            <Pressable
              onPress={() => {
                set('languageCode', item.code);
                router.back();
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: space(3),
                paddingVertical: space(3.5),
                paddingHorizontal: space(3.5),
                borderRadius: radius.md,
                backgroundColor: selected ? t.accentSoft : 'transparent',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontSize: 17, fontWeight: '600' }}>{item.nativeName}</Text>
                <Text style={{ color: t.textFaint, fontSize: 12, marginTop: 2 }}>
                  {item.name}
                  {item.aiTranslateOnly ? ' · AI translated' : ''}
                </Text>
              </View>
              {selected ? <Ionicons name="checkmark-circle" size={20} color={t.accent} /> : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}
