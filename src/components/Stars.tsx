import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { useStore } from '@/state/store';
import { space, useTheme } from '@/theme';

/**
 * The reader's own 1-5 rating for a story. Tapping the current value clears it,
 * so a rating is never a one-way door.
 */
export function Stars({
  articleId,
  size = 16,
  showLabel,
}: {
  articleId: string;
  size?: number;
  showLabel?: boolean;
}) {
  const t = useTheme();
  const rating = useStore((s) => s.ratings[articleId] ?? 0);
  const rate = useStore((s) => s.rate);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(0.5) }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          hitSlop={6}
          onPress={() => rate(articleId, star)}
          accessibilityLabel={`Rate ${star} out of 5`}
          style={{ padding: space(0.5) }}
        >
          <Ionicons
            name={star <= rating ? 'star' : 'star-outline'}
            size={size}
            color={star <= rating ? t.warn : t.textFaint}
          />
        </Pressable>
      ))}
      {showLabel ? (
        <Text style={{ color: t.textFaint, fontSize: 12, marginLeft: space(1.5) }}>
          {rating ? `${rating}/5 — tap again to clear` : 'Rate this story'}
        </Text>
      ) : null}
    </View>
  );
}
