import { getCountry } from '@/data/countries';
import { getLanguage } from '@/data/languages';
import { TOPICS } from '@/data/topics';
import { fetchFeed, geoUrl, searchUrl, sectionUrl, topHeadlinesUrl, type Article, type Edition } from '@/lib/rss';

export type FeedSpec =
  | { kind: 'topic'; topic: string }
  | { kind: 'search'; query: string }
  | { kind: 'place'; place: string }
  | { kind: 'source'; source: string };

/**
 * Google News wants a language + country pair. The reader's language wins when it has
 * a native edition; otherwise we take the country's default and translate later.
 */
export function editionFor(languageCode: string, countryCode: string): Edition {
  const language = getLanguage(languageCode);
  const country = getCountry(countryCode);
  const hl = language.aiTranslateOnly || language.code === 'en' ? country.hl : language.hl;
  return { hl, gl: country.code };
}

export function feedUrl(spec: FeedSpec, edition: Edition): string {
  switch (spec.kind) {
    case 'search':
      return searchUrl(spec.query, edition);
    case 'place':
      return geoUrl(spec.place, edition);
    case 'source':
      return searchUrl(`site:${spec.source}`, edition);
    case 'topic': {
      const topic = TOPICS.find((t) => t.key === spec.topic);
      if (!topic || topic.key === 'top') return topHeadlinesUrl(edition);
      if (topic.section) return sectionUrl(topic.section, edition);
      return searchUrl(topic.query ?? topic.label, edition, { withinHours: 48 });
    }
  }
}

/**
 * Google News treats "#Tag" as a literal, so a hashtag query returns a thin feed.
 * Searching the bare word alongside it, and merging, recovers the coverage.
 */
function searchVariants(query: string): string[] {
  const variants = [query];
  const bare = query.replace(/#/g, '').trim();
  if (bare && bare !== query) variants.push(bare, `"${bare}"`);
  return variants;
}

function merge(feeds: Article[][]): Article[] {
  const seen = new Set<string>();
  const out: Article[] = [];
  for (const feed of feeds) {
    for (const article of feed) {
      const key = article.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '').slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(article);
    }
  }
  return out.sort((a, b) => b.publishedAt - a.publishedAt);
}

export async function loadFeed(spec: FeedSpec, edition: Edition, signal?: AbortSignal): Promise<Article[]> {
  if (spec.kind === 'search') {
    const feeds = await Promise.all(
      searchVariants(spec.query).map((q) => fetchFeed(searchUrl(q, edition), signal).catch(() => [] as Article[])),
    );
    const merged = merge(feeds);
    // Every variant failing is a real error, not an empty result set.
    if (!merged.length && feeds.every((f) => !f.length)) return fetchFeed(searchUrl(spec.query, edition), signal);
    return merged;
  }
  return fetchFeed(feedUrl(spec, edition), signal);
}
