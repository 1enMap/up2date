/**
 * Posts from platforms that answer without an API key.
 *
 * Reddit and Bluesky are attempted directly and often refuse unauthenticated
 * clients (HTTP 403) depending on the network the phone is on. X and Instagram
 * have no free read API at all. Every source is isolated, and whatever a source
 * cannot supply is covered by the AI social lookup in `src/lib/ai` instead.
 */

export type SocialPost = {
  id: string;
  platform: 'reddit' | 'bluesky' | 'hackernews' | 'mastodon' | 'lemmy';
  author: string;
  /** Subreddit, community or instance — whatever names the room. */
  group?: string;
  text: string;
  url: string;
  createdAt: number;
  score?: number;
  comments?: number;
};

export type SocialResult = {
  posts: SocialPost[];
  /** Sources that failed or refused, so the UI can be honest about coverage. */
  unavailable: { platform: string; reason: string }[];
};

const UA = 'Up2Date/1.0 (personal news reader)';

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, {
    signal,
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(res.status === 403 ? 'blocked this network' : `HTTP ${res.status}`);
  return res.json();
}

/** Reddit, HN and Lemmy index words, not hashtags. */
function unhash(query: string) {
  return query.replace(/#/g, '').trim();
}

function stripHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function reddit(query: string, signal?: AbortSignal): Promise<SocialPost[]> {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(unhash(query))}&sort=relevance&t=year&limit=25&raw_json=1`;
  const body = (await getJson(url, signal)) as {
    data?: { children?: { data?: Record<string, unknown> }[] };
  };
  return (body.data?.children ?? []).flatMap((child) => {
    const d = child.data as Record<string, any> | undefined;
    if (!d?.id) return [];
    return [
      {
        id: `rd_${d.id}`,
        platform: 'reddit' as const,
        author: `u/${d.author}`,
        group: d.subreddit_name_prefixed ?? undefined,
        text: [d.title, d.selftext].filter(Boolean).join(' — ').slice(0, 600),
        url: `https://www.reddit.com${d.permalink}`,
        createdAt: (d.created_utc ?? 0) * 1000,
        score: d.ups,
        comments: d.num_comments,
      },
    ];
  });
}

async function bluesky(query: string, signal?: AbortSignal): Promise<SocialPost[]> {
  const url = `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(query)}&limit=25&sort=top`;
  const body = (await getJson(url, signal)) as { posts?: Record<string, any>[] };
  return (body.posts ?? []).flatMap((p) => {
    const rkey = String(p.uri ?? '').split('/').pop();
    if (!rkey || !p.author?.handle) return [];
    return [
      {
        id: `bs_${p.cid ?? rkey}`,
        platform: 'bluesky' as const,
        author: `@${p.author.handle}`,
        text: String(p.record?.text ?? '').slice(0, 600),
        url: `https://bsky.app/profile/${p.author.handle}/post/${rkey}`,
        createdAt: p.record?.createdAt ? new Date(p.record.createdAt).getTime() : Date.now(),
        score: p.likeCount,
        comments: p.replyCount,
      },
    ];
  });
}

async function hackerNews(query: string, signal?: AbortSignal): Promise<SocialPost[]> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(unhash(query))}&tags=(story,comment)&hitsPerPage=20`;
  const body = (await getJson(url, signal)) as { hits?: Record<string, any>[] };
  return (body.hits ?? []).flatMap((h) => {
    const text = h.title ?? (h.comment_text ? stripHtml(h.comment_text) : '');
    if (!text) return [];
    return [
      {
        id: `hn_${h.objectID}`,
        platform: 'hackernews' as const,
        author: h.author ? `${h.author}` : 'unknown',
        text: String(text).slice(0, 600),
        url: `https://news.ycombinator.com/item?id=${h.objectID}`,
        createdAt: (h.created_at_i ?? 0) * 1000,
        score: h.points ?? undefined,
        comments: h.num_comments ?? undefined,
      },
    ];
  });
}

async function mastodon(query: string, signal?: AbortSignal): Promise<SocialPost[]> {
  const url = `https://mastodon.social/api/v2/search?q=${encodeURIComponent(query)}&type=statuses&limit=20`;
  const body = (await getJson(url, signal)) as { statuses?: Record<string, any>[] };
  return (body.statuses ?? []).flatMap((s) => {
    if (!s.id || !s.account?.acct) return [];
    return [
      {
        id: `ms_${s.id}`,
        platform: 'mastodon' as const,
        author: `@${s.account.acct}`,
        text: stripHtml(String(s.content ?? '')).slice(0, 600),
        url: s.url ?? s.uri,
        createdAt: s.created_at ? new Date(s.created_at).getTime() : Date.now(),
        score: s.favourites_count,
        comments: s.replies_count,
      },
    ];
  });
}

async function lemmy(query: string, signal?: AbortSignal): Promise<SocialPost[]> {
  const url = `https://lemmy.world/api/v3/search?q=${encodeURIComponent(unhash(query))}&type_=Posts&sort=TopMonth&limit=20`;
  const body = (await getJson(url, signal)) as { posts?: Record<string, any>[] };
  return (body.posts ?? []).flatMap((entry) => {
    const p = entry.post;
    if (!p?.id) return [];
    return [
      {
        id: `lm_${p.id}`,
        platform: 'lemmy' as const,
        author: entry.creator?.name ? `@${entry.creator.name}` : 'unknown',
        group: entry.community?.name ? `c/${entry.community.name}` : undefined,
        text: [p.name, p.body].filter(Boolean).join(' — ').slice(0, 600),
        url: p.ap_id ?? `https://lemmy.world/post/${p.id}`,
        createdAt: p.published ? new Date(p.published).getTime() : Date.now(),
        score: entry.counts?.score,
        comments: entry.counts?.comments,
      },
    ];
  });
}

const SOURCES: { name: string; load: (q: string, s?: AbortSignal) => Promise<SocialPost[]> }[] = [
  { name: 'Reddit', load: reddit },
  { name: 'Bluesky', load: bluesky },
  { name: 'Hacker News', load: hackerNews },
  { name: 'Mastodon', load: mastodon },
  { name: 'Lemmy', load: lemmy },
];

export async function fetchSocialPosts(query: string, signal?: AbortSignal): Promise<SocialResult> {
  const settled = await Promise.allSettled(SOURCES.map((s) => s.load(query, signal)));

  const posts: SocialPost[] = [];
  const unavailable: SocialResult['unavailable'] = [];

  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') posts.push(...result.value);
    else unavailable.push({ platform: SOURCES[i].name, reason: describe(result.reason) });
  });

  // Interleave by engagement, then recency, so one chatty source cannot dominate.
  posts.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.createdAt - a.createdAt);
  return { posts, unavailable };
}

/** Social platforms index hashtags and names, not sentences. */
export function socialQueryFor(title: string) {
  const hashtags = title.match(/#[\wऀ-෿]+/g);
  if (hashtags?.length) return hashtags.join(' ');
  return title
    .replace(/[“”"'’]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 8)
    .join(' ');
}

function describe(error: unknown) {
  return error instanceof Error ? error.message : 'unavailable';
}
