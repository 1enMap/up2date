import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { COUNTRIES } from '@/data/countries';
import { useStore } from '@/state/store';
import { radius, space, useTheme } from '@/theme';

export default function CountryPicker() {
  const t = useTheme();
  const router = useRouter();
  const countryCode = useStore((s) => s.countryCode);
  const set = useStore((s) => s.set);
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(needle)) : COUNTRIES;
  }, [q]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ padding: space(4) }}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search regions"
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
      </View>

      <FlatList
        data={results}
        keyExtractor={(c) => c.code}
        contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(8) }}
        renderItem={({ item }) => {
          const selected = item.code === countryCode;
          return (
            <Pressable
              onPress={() => {
                set('countryCode', item.code);
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
              <Text style={{ fontSize: 22 }}>{item.flag}</Text>
              <Text style={{ color: t.text, fontSize: 16, fontWeight: '600', flex: 1 }}>{item.name}</Text>
              {selected ? <Ionicons name="checkmark-circle" size={20} color={t.accent} /> : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}
