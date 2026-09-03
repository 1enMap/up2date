import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { ArticleCard } from '@/components/ArticleCard';
import { ArticleControls } from '@/components/ArticleControls';
import { Chip, EmptyState, Loading } from '@/components/ui';
import { getCountry } from '@/data/countries';
import { getLanguage } from '@/data/languages';
import { TOPICS } from '@/data/topics';
import { useArticleView } from '@/lib/articleView';
import { useFeed } from '@/lib/useFeed';
import { useStore } from '@/state/store';
import { radius, space, useTheme } from '@/theme';

export default function TodayScreen() {
  const t = useTheme();
  const router = useRouter();
  const followedTopics = useStore((s) => s.followedTopics);
  const languageCode = useStore((s) => s.languageCode);
  const countryCode = useStore((s) => s.countryCode);

  const topics = useMemo(
    () => TOPICS.filter((topic) => followedTopics.includes(topic.key)),
    [followedTopics],
  );
  const [active, setActive] = useState(topics[0]?.key ?? 'top');
  const current = topics.some((x) => x.key === active) ? active : topics[0]?.key ?? 'top';

  const feed = useFeed({ kind: 'topic', topic: current });
  const { items, view, setView, sources, hidden } = useArticleView(feed.articles);
  const language = getLanguage(languageCode);
  const country = getCountry(countryCode);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: space(4), paddingBottom: space(2) }}>
        <View style={{ flexDirection: 'row', gap: space(2) }}>
          <EditionPill
            icon="globe-outline"
            label={`${country.flag} ${country.name}`}
            onPress={() => router.push('/picker/country')}
          />
          <EditionPill
            icon="language-outline"
            label={language.nativeName}
            onPress={() => router.push('/picker/language')}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: space(4),
          gap: space(2),
          alignItems: 'center',
        }}
        // A horizontal ScrollView in a flex column will otherwise shrink and clip its chips.
        style={{ flexGrow: 0, flexShrink: 0, marginBottom: space(3) }}
      >
        {topics.map((topic) => (
          <Chip
            key={topic.key}
            label={topic.label}
            icon={topic.icon as never}
            selected={topic.key === current}
            onPress={() => setActive(topic.key)}
          />
        ))}
        <Chip label="Edit" icon="options-outline" onPress={() => router.push('/(tabs)/settings')} />
      </ScrollView>

      {feed.translating ? (
        <Text style={{ color: t.textFaint, fontSize: 12, paddingHorizontal: space(4), paddingBottom: space(2) }}>
          Translating headlines into {language.nativeName}…
        </Text>
      ) : null}

      {feed.loading ? (
        <Loading label="Gathering the day's news" />
      ) : feed.error ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load the feed"
          body={feed.error}
          action={{ label: 'Try again', onPress: feed.refresh }}
        />
      ) : (
        <>
        <ArticleControls
          view={view}
          onChange={setView}
          sources={sources}
          total={feed.articles.length}
          shown={items.length}
        />
        <FlatList
          data={items}
          keyExtractor={(a) => a.id}
          renderItem={({ item, index }) => <ArticleCard article={item} index={index} />}
          contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(8) }}
          refreshControl={
            <RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} tintColor={t.accent} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={hidden ? 'funnel-outline' : 'newspaper-outline'}
              title={hidden ? 'Everything is filtered out' : 'Nothing here yet'}
              body={
                hidden
                  ? `${hidden} stories are hidden by the current filters.`
                  : 'This edition returned no stories. Try another region or topic.'
              }
            />
          }
        />
        </>
      )}
    </View>
  );
}

function EditionPill({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space(1.5),
        paddingHorizontal: space(3),
        paddingVertical: space(2),
        borderRadius: radius.md,
        backgroundColor: t.surfaceAlt,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={13} color={t.textDim} />
      <Text style={{ color: t.text, fontSize: 12, fontWeight: '600' }}>{label}</Text>
      <Ionicons name="chevron-down" size={12} color={t.textFaint} />
    </Pressable>
  );
}
