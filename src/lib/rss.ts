import { XMLParser } from 'fast-xml-parser';

export type Article = {
  id: string;
  title: string;
  link: string;
  source: string;
  sourceUrl?: string;
  publishedAt: number;
  snippet: string;
  imageUrl?: string;
  /** Other outlets covering the same story, from Google News' clustered description. */
  related: { title: string; source: string; link: string }[];
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
});

const BASE = 'https://news.google.com/rss';

export type Edition = { hl: string; gl: string };

function ceid({ hl, gl }: Edition) {
  return `${gl}:${hl.split('-')[0]}`;
}

function withEdition(url: string, edition: Edition) {
  const sep = url.includes('?') ? '&' : '?';
  const q = new URLSearchParams({ hl: edition.hl, gl: edition.gl, ceid: ceid(edition) });
  return `${url}${sep}${q.toString()}`;
}

export function topHeadlinesUrl(edition: Edition) {
  return withEdition(BASE, edition);
}

export function sectionUrl(section: string, edition: Edition) {
  return withEdition(`${BASE}/headlines/section/topic/${section}`, edition);
}

export function searchUrl(query: string, edition: Edition, opts?: { withinHours?: number }) {
  const q = opts?.withinHours ? `${query} when:${opts.withinHours}h` : query;
  return withEdition(`${BASE}/search?q=${encodeURIComponent(q)}`, edition);
}

export function geoUrl(place: string, edition: Edition) {
  return withEdition(`${BASE}/headlines/section/geo/${encodeURIComponent(place)}`, edition);
}

function decodeEntities(input: string) {
  return input
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

function stripTags(html: string) {
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** Google News packs sibling coverage into an HTML <ol> inside <description>. */
function parseRelated(description: string) {
  const out: { title: string; source: string; link: string }[] = [];
  const re = /<a href="([^"]+)"[^>]*>(.*?)<\/a>(?:&nbsp;&nbsp;)?<font[^>]*>(.*?)<\/font>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(description))) {
    out.push({ link: decodeEntities(m[1]), title: stripTags(m[2]), source: stripTags(m[3]) });
  }
  return out;
}

function text(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (typeof node === 'object' && '#text' in (node as object)) {
    return String((node as Record<string, unknown>)['#text'] ?? '');
  }
  return '';
}

export function faviconFor(url?: string) {
  if (!url) return undefined;
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=128&domain=${host}`;
  } catch {
    return undefined;
  }
}

export async function fetchFeed(url: string, signal?: AbortSignal): Promise<Article[]> {
  const res = await fetch(url, {
    signal,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Up2Date/1.0)', Accept: 'application/rss+xml, application/xml' },
  });
  if (!res.ok) throw new Error(`Feed request failed (${res.status})`);
  const xml = await res.text();
  const doc = parser.parse(xml);
  const rawItems = doc?.rss?.channel?.item;
  if (!rawItems) return [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  const seen = new Set<string>();
  const articles: Article[] = [];

  for (const item of items) {
    const rawTitle = stripTags(text(item.title));
    if (!rawTitle) continue;
    const link = text(item.link).trim();
    const sourceNode = item.source;
    const source = stripTags(text(sourceNode)) || rawTitle.split(' - ').pop() || 'Unknown';
    const sourceUrl = typeof sourceNode === 'object' ? (sourceNode as any)['@_url'] : undefined;
    // Google appends " - Source" to headlines; drop it when it matches the source.
    const title = rawTitle.endsWith(` - ${source}`) ? rawTitle.slice(0, -(source.length + 3)) : rawTitle;
    const descriptionHtml = text(item.description);
    const related = parseRelated(descriptionHtml).filter((r) => r.title !== title).slice(0, 6);

    const key = title.toLowerCase().replace(/[^a-z0-9ऀ-෿]+/g, '').slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);

    articles.push({
      id: text(item.guid) || link || key,
      title,
      link,
      source,
      sourceUrl,
      publishedAt: item.pubDate ? new Date(text(item.pubDate)).getTime() : Date.now(),
      snippet: related.length ? `${related.length + 1} outlets covering this story` : '',
      imageUrl: faviconFor(sourceUrl ?? related[0]?.link),
      related,
    });
  }

  return articles.sort((a, b) => b.publishedAt - a.publishedAt);
}
