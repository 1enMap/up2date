import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';

import { ArticleCard } from '@/components/ArticleCard';
import { ArticleControls } from '@/components/ArticleControls';
import { SocialSection } from '@/components/SocialSection';
import { Chip, EmptyState, Loading, SectionTitle } from '@/components/ui';
import { useArticleView } from '@/lib/articleView';
import { useFeed } from '@/lib/useFeed';
import { useStore } from '@/state/store';
import { radius, space, useTheme } from '@/theme';

const SUGGESTIONS = ['Elections', 'ISRO', 'Monsoon', 'RBI policy', 'Cricket', 'AI regulation', 'Startups', 'Cyclone'];

export default function SearchScreen() {
  const t = useTheme();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'news' | 'social'>('news');
  const recent = useStore((s) => s.recentSearches);
  const addSearch = useStore((s) => s.addSearch);
  const clearSearches = useStore((s) => s.clearSearches);

  const feed = useFeed(query ? { kind: 'search', query } : null);
  const { items, view, setView, sources, hidden } = useArticleView(feed.articles);

  const submit = (value: string) => {
    const q = value.trim();
    if (!q) return;
    setText(q);
    setQuery(q);
    setTab('news');
    addSearch(q);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: space(4), paddingBottom: space(3) }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space(2),
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: radius.md,
            paddingHorizontal: space(3),
          }}
        >
          <Ionicons name="search" size={17} color={t.textFaint} />
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={(e) => submit(e.nativeEvent.text)}
            placeholder="Search any topic, place or person"
            placeholderTextColor={t.textFaint}
            returnKeyType="search"
            autoCorrect={false}
            style={{ flex: 1, color: t.text, fontSize: 15, paddingVertical: space(3) }}
          />
          {text ? (
            <Pressable
              hitSlop={10}
              onPress={() => {
                setText('');
                setQuery('');
              }}
            >
              <Ionicons name="close-circle" size={17} color={t.textFaint} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {query ? (
        <View style={{ flexDirection: 'row', gap: space(2), paddingHorizontal: space(4), paddingBottom: space(3) }}>
          <Chip label="News" icon="newspaper-outline" selected={tab === 'news'} onPress={() => setTab('news')} />
          <Chip label="Social" icon="chatbubbles-outline" selected={tab === 'social'} onPress={() => setTab('social')} />
        </View>
      ) : null}

      {!query ? (
        <ScrollView contentContainerStyle={{ padding: space(4), paddingTop: 0 }}>
          {recent.length ? (
            <View style={{ marginBottom: space(6) }}>
              <SectionTitle
                right={
                  <Pressable onPress={clearSearches} hitSlop={10}>
                    <Text style={{ color: t.textFaint, fontSize: 12 }}>Clear</Text>
                  </Pressable>
                }
              >
                Recent
              </SectionTitle>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
                {recent.map((q) => (
                  <Chip key={q} label={q} icon="time-outline" onPress={() => submit(q)} />
                ))}
              </View>
            </View>
          ) : null}

          <SectionTitle>Try</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
            {SUGGESTIONS.map((q) => (
              <Chip key={q} label={q} onPress={() => submit(q)} />
            ))}
          </View>

          <Text style={{ color: t.textFaint, fontSize: 12, marginTop: space(6), lineHeight: 18 }}>
            Tip: search operators work here too — try {'"site:thehindu.com budget"'} to search one outlet, or a
            place name for local coverage. Hashtags and campaign names are searched with and without the “#”,
            and the Social tab covers what the press has not written up yet.
          </Text>
        </ScrollView>
      ) : tab === 'social' ? (
        <ScrollView contentContainerStyle={{ padding: space(4), paddingTop: 0, paddingBottom: space(10) }}>
          <SocialSection
            subject={{ query }}
            postQuery={query}
            cacheId={`search:${query.toLowerCase()}`}
            title={`What people are saying about “${query}”`}
          />
        </ScrollView>
      ) : feed.loading ? (
        <Loading label={`Searching for “${query}”`} />
      ) : feed.error ? (
        <EmptyState icon="cloud-offline-outline" title="Search failed" body={feed.error} action={{ label: 'Retry', onPress: feed.refresh }} />
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
          refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} tintColor={t.accent} />}
          ListHeaderComponent={
            <Text style={{ color: t.textFaint, fontSize: 12, marginBottom: space(3) }}>
              {items.length} results for “{query}”
            </Text>
          }
          ListEmptyComponent={
            <EmptyState
              icon={hidden ? 'funnel-outline' : 'search-outline'}
              title={hidden ? 'Everything is filtered out' : 'No results'}
              body={
                hidden
                  ? `${hidden} results are hidden by the current filters.`
                  : `Nothing matched “${query}” in this edition.`
              }
            />
          }
        />
        </>
      )}
    </View>
  );
}
