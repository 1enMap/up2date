import { useCallback, useEffect, useRef, useState } from 'react';

import { getLanguage } from '@/data/languages';
import { BUDGET, translateHeadlines } from '@/lib/ai';
import { editionFor, loadFeed, type FeedSpec } from '@/lib/news';
import type { Article } from '@/lib/rss';
import { useStore } from '@/state/store';
import { currentAiConfig } from '@/state/useAiConfig';

type FeedState = {
  articles: Article[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  /** true while headlines are being machine-translated into a no-edition language */
  translating: boolean;
  refresh: () => void;
};

const memoryCache = new Map<string, { at: number; articles: Article[] }>();
const CACHE_MS = 5 * 60 * 1000;

export function useFeed(spec: FeedSpec | null): FeedState {
  const languageCode = useStore((s) => s.languageCode);
  const countryCode = useStore((s) => s.countryCode);
  const aiBaseUrl = useStore((s) => s.aiBaseUrl);
  const providerId = useStore((s) => s.providerId);

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(!!spec);
  const [refreshing, setRefreshing] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const key = spec ? `${JSON.stringify(spec)}|${languageCode}|${countryCode}` : '';

  const run = useCallback(
    async (force: boolean) => {
      if (!spec) return;
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;

      const cached = memoryCache.get(key);
      if (!force && cached && Date.now() - cached.at < CACHE_MS) {
        setArticles(cached.articles);
        setLoading(false);
        setError(null);
        return;
      }

      force ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const edition = editionFor(languageCode, countryCode);
        let items = await loadFeed(spec, edition, controller.signal);
        setArticles(items);
        memoryCache.set(key, { at: Date.now(), articles: items });
        setLoading(false);
        setRefreshing(false);

        // Languages without a Google News edition get their headlines translated.
        const language = getLanguage(languageCode);
        const ai = currentAiConfig();
        if (language.aiTranslateOnly && items.length && ai.ready) {
          setTranslating(true);
          try {
            const slice = items.slice(0, BUDGET.translate);
            const translated = await translateHeadlines(
              ai.config,
              slice.map((a) => a.title),
              languageCode,
              controller.signal,
            );
            items = items.map((a, i) => (i < translated.length ? { ...a, title: translated[i] } : a));
            setArticles(items);
            memoryCache.set(key, { at: Date.now(), articles: items });
          } catch {
            /* translation is a nicety — keep the original headlines */
          } finally {
            setTranslating(false);
          }
        }
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'Could not load the feed.');
        setLoading(false);
        setRefreshing(false);
      }
    },
    [key, languageCode, countryCode, aiBaseUrl, providerId, spec],
  );

  useEffect(() => {
    if (!spec) {
      setArticles([]);
      setLoading(false);
      return;
    }
    void run(false);
    return () => abort.current?.abort();
    // `key` captures every input that changes the feed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { articles, loading, refreshing, error, translating, refresh: () => void run(true) };
}
