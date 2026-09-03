import { FlatList, View } from 'react-native';

import { ArticleCard } from '@/components/ArticleCard';
import { ArticleControls } from '@/components/ArticleControls';
import { EmptyState } from '@/components/ui';
import { useArticleView } from '@/lib/articleView';
import { useStore } from '@/state/store';
import { space } from '@/theme';

export default function SavedScreen() {
  const saved = useStore((s) => s.saved);
  const { items, view, setView, sources, hidden } = useArticleView(saved);

  if (!saved.length) {
    return (
      <EmptyState
        icon="bookmark-outline"
        title="Nothing saved yet"
        body="Tap the bookmark on any story to keep it here. Saved stories stay on the device and work offline."
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ArticleControls view={view} onChange={setView} sources={sources} total={saved.length} shown={items.length} />
      <FlatList
        data={items}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <ArticleCard article={item} />}
        contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(8) }}
        ListEmptyComponent={
          <EmptyState
            icon="funnel-outline"
            title="Everything is filtered out"
            body={`${hidden} saved stories are hidden by the current filters.`}
          />
        }
      />
    </View>
  );
}
