import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CoveragePill } from '@/components/CoveragePill';
import { SourceBadges } from '@/components/SourceBadges';
import { Stars } from '@/components/Stars';
import type { Article } from '@/lib/rss';
import { rememberArticle } from '@/state/articles';
import { useStore } from '@/state/store';
import { radius, space, timeAgo, useTheme } from '@/theme';

function ArticleCardImpl({ article, index }: { article: Article; index?: number }) {
  const t = useTheme();
  const router = useRouter();
  const saved = useStore((s) => s.saved.some((a) => a.id === article.id));
  const toggleSaved = useStore((s) => s.toggleSaved);
  const lead = index === 0;

  const open = () => {
    rememberArticle(article);
    router.push({ pathname: '/article/[id]', params: { id: article.id } });
  };

  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => ({
        backgroundColor: t.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: t.border,
        padding: space(4),
        marginBottom: space(3),
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2), marginBottom: space(2.5) }}>
        {article.imageUrl ? (
          <Image
            source={{ uri: article.imageUrl }}
            style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: t.surfaceAlt }}
            contentFit="contain"
            transition={150}
          />
        ) : null}
        <Text style={{ color: t.textDim, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
          {article.source}
        </Text>
        <Text style={{ color: t.textFaint, fontSize: 12 }}>· {timeAgo(article.publishedAt)}</Text>
        <SourceBadges article={article} compact />
      </View>

      <Text
        style={{
          color: t.text,
          fontSize: lead ? 21 : 17,
          lineHeight: lead ? 28 : 24,
          fontWeight: '700',
          letterSpacing: -0.3,
        }}
        numberOfLines={4}
      >
        {article.title}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space(3), gap: space(3) }}>
        <CoveragePill article={article} />
        <Stars articleId={article.id} size={13} />
        <View style={{ flex: 1 }} />
        <Pressable
          hitSlop={12}
          onPress={() => toggleSaved(article)}
          style={{ padding: space(1) }}
        >
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={saved ? t.accent : t.textFaint}
          />
        </Pressable>
      </View>
    </Pressable>
  );
}

export const ArticleCard = memo(ArticleCardImpl);
