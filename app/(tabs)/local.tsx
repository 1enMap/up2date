import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';

import { ArticleCard } from '@/components/ArticleCard';
import { ArticleControls } from '@/components/ArticleControls';
import { Button, Chip, EmptyState, Loading } from '@/components/ui';
import { LocationError, resolveCurrentPlace } from '@/lib/geo';
import { useArticleView } from '@/lib/articleView';
import { useFeed } from '@/lib/useFeed';
import { useStore } from '@/state/store';
import { radius, space, useTheme } from '@/theme';

export default function LocalScreen() {
  const t = useTheme();
  const place = useStore((s) => s.place);
  const setSetting = useStore((s) => s.set);

  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [approximate, setApproximate] = useState(false);
  const [manual, setManual] = useState('');

  const feed = useFeed(place ? { kind: 'place', place: place.query } : null);
  const { items, view, setView, sources } = useArticleView(feed.articles);

  const useMyLocation = async () => {
    setLocating(true);
    setLocationError(null);
    try {
      const fix = await resolveCurrentPlace();
      setSetting('place', fix.place);
      setApproximate(fix.approximate);
    } catch (e) {
      setLocationError(
        e instanceof LocationError || e instanceof Error
          ? e.message
          : 'Location lookup failed. Type a place below instead.',
      );
    } finally {
      setLocating(false);
    }
  };

  const setManualPlace = (value: string) => {
    const label = value.trim();
    if (!label) return;
    setSetting('place', { label, query: label });
    setApproximate(false);
    setManual('');
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: space(4), paddingBottom: space(3), gap: space(3) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
          <Ionicons name="location" size={15} color={t.accent} />
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '700', flex: 1 }}>
            {place ? place.label : 'No place set'}
          </Text>
          <Pressable onPress={useMyLocation} hitSlop={10} disabled={locating}>
            <Text style={{ color: t.accent, fontSize: 13, fontWeight: '600' }}>
              {locating ? 'Locating…' : 'Use my location'}
            </Text>
          </Pressable>
        </View>

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
          <Ionicons name="map-outline" size={16} color={t.textFaint} />
          <TextInput
            value={manual}
            onChangeText={setManual}
            onSubmitEditing={(e) => setManualPlace(e.nativeEvent.text)}
            placeholder="Or type a city, district or state"
            placeholderTextColor={t.textFaint}
            returnKeyType="done"
            style={{ flex: 1, color: t.text, fontSize: 14, paddingVertical: space(2.5) }}
          />
        </View>

        {locationError ? <Text style={{ color: t.warn, fontSize: 12 }}>{locationError}</Text> : null}
        {approximate && place && !locationError ? (
          <Text style={{ color: t.textFaint, fontSize: 12 }}>
            GPS did not lock, so this is your approximate location from the network. Type a place above to be exact.
          </Text>
        ) : null}
      </View>

      {!place ? (
        <EmptyState
          icon="location-outline"
          title="News from where you are"
          body="Share your location once, or type any city, district or state to follow its coverage."
          action={{ label: locating ? 'Locating…' : 'Use my location', onPress: useMyLocation }}
        />
      ) : feed.loading ? (
        <Loading label={`Local news for ${place.label}`} />
      ) : feed.error ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load local news" body={feed.error} action={{ label: 'Retry', onPress: feed.refresh }} />
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
          ListEmptyComponent={
            <View style={{ gap: space(4) }}>
              <EmptyState
                icon="map-outline"
                title={`No dedicated feed for ${place.label}`}
                body="Google News does not publish a local edition for every place. Searching the place name usually works."
              />
              <View style={{ alignItems: 'center' }}>
                <Chip
                  label={`Search “${place.label}” instead`}
                  icon="search-outline"
                  onPress={() => setSetting('place', { ...place, query: `${place.label} news` })}
                />
              </View>
            </View>
          }
        />
        </>
      )}

      {place ? (
        <View style={{ padding: space(4), paddingTop: 0 }}>
          <Button label="Clear place" variant="ghost" icon="close-outline" onPress={() => setSetting('place', null)} />
        </View>
      ) : null}
    </View>
  );
}
