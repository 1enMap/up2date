import { useMemo, useState } from 'react';

import { sourceKey } from '@/components/SourceBadges';
import type { Article } from '@/lib/rss';
import { useStore } from '@/state/store';

export type SortKey = 'newest' | 'oldest' | 'coverage' | 'rating' | 'source';
export type WindowKey = 'all' | '1h' | '6h' | '24h' | '7d';

export type ViewState = {
  sort: SortKey;
  window: WindowKey;
  /** Empty means every source; otherwise an allow-list of publisher names. */
  sources: string[];
  minRating: number;
  savedOnly: boolean;
  ratedOnly: boolean;
  /** Hide outlets the reader muted. */
  hideMuted: boolean;
  /** Show only outlets the reader marked trusted. */
  trustedOnly: boolean;
};

export const DEFAULT_VIEW: ViewState = {
  sort: 'newest',
  window: 'all',
  sources: [],
  minRating: 0,
  savedOnly: false,
  ratedOnly: false,
  hideMuted: true,
  trustedOnly: false,
};

export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'coverage', label: 'Most outlets covering' },
  { key: 'rating', label: 'Highest rated' },
  { key: 'source', label: 'Publisher A–Z' },
];

export const WINDOWS: { key: WindowKey; label: string; ms: number }[] = [
  { key: 'all', label: 'Any time', ms: Infinity },
  { key: '1h', label: 'Past hour', ms: 3600_000 },
  { key: '6h', label: 'Past 6 hours', ms: 6 * 3600_000 },
  { key: '24h', label: 'Past 24 hours', ms: 24 * 3600_000 },
  { key: '7d', label: 'Past week', ms: 7 * 24 * 3600_000 },
];

export function activeFilterCount(view: ViewState) {
  return (
    (view.window !== 'all' ? 1 : 0) +
    (view.sources.length ? 1 : 0) +
    (view.minRating > 0 ? 1 : 0) +
    (view.savedOnly ? 1 : 0) +
    (view.ratedOnly ? 1 : 0) +
    (view.trustedOnly ? 1 : 0)
  );
}

/**
 * Applies the reader's sort and filters to a feed. Ratings and saves live in the
 * store, so the result recomputes when either changes.
 */
export function useArticleView(articles: Article[]) {
  const [view, setView] = useState<ViewState>(DEFAULT_VIEW);
  const ratings = useStore((s) => s.ratings);
  const saved = useStore((s) => s.saved);
  const sourcePrefs = useStore((s) => s.sourcePrefs);

  const sources = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of articles) counts.set(a.source, (counts.get(a.source) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [articles]);

  const items = useMemo(() => {
    const savedIds = new Set(saved.map((a) => a.id));
    const cutoff = WINDOWS.find((w) => w.key === view.window)?.ms ?? Infinity;
    const allowed = new Set(view.sources);

    const filtered = articles.filter((a) => {
      const pref = sourcePrefs[sourceKey(a)];
      if (view.hideMuted && pref === 'muted') return false;
      if (view.trustedOnly && pref !== 'trusted') return false;
      if (cutoff !== Infinity && Date.now() - a.publishedAt > cutoff) return false;
      if (allowed.size && !allowed.has(a.source)) return false;
      if (view.savedOnly && !savedIds.has(a.id)) return false;
      const rating = ratings[a.id] ?? 0;
      if (view.ratedOnly && !rating) return false;
      if (view.minRating && rating < view.minRating) return false;
      return true;
    });

    const sorted = [...filtered];
    switch (view.sort) {
      case 'oldest':
        sorted.sort((a, b) => a.publishedAt - b.publishedAt);
        break;
      case 'coverage':
        sorted.sort((a, b) => b.related.length - a.related.length || b.publishedAt - a.publishedAt);
        break;
      case 'rating':
        sorted.sort(
          (a, b) => (ratings[b.id] ?? 0) - (ratings[a.id] ?? 0) || b.publishedAt - a.publishedAt,
        );
        break;
      case 'source':
        sorted.sort((a, b) => a.source.localeCompare(b.source) || b.publishedAt - a.publishedAt);
        break;
      default:
        sorted.sort((a, b) => b.publishedAt - a.publishedAt);
    }
    return sorted;
  }, [articles, view, ratings, saved, sourcePrefs]);

  return { items, view, setView, sources, hidden: articles.length - items.length };
}
