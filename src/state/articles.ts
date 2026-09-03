import type { Article } from '@/lib/rss';

/**
 * Articles are handed to the detail route through this registry rather than through
 * route params — a full article does not belong in a URL.
 */
const registry = new Map<string, Article>();

export function rememberArticle(article: Article) {
  registry.set(article.id, article);
  if (registry.size > 500) registry.delete(registry.keys().next().value as string);
}

export function recallArticle(id: string) {
  return registry.get(id);
}
