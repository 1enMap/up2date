/**
 * Turns a Google News item into something the AI layer can reason about:
 * the publisher URL, a hero image, and the readable body text.
 * Every step degrades gracefully — publishers block scrapers often.
 */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64ToBytes(input: string): Uint8Array {
  const clean = input.replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/]/g, '');
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (B64.indexOf(clean[i]) << 18) |
      (B64.indexOf(clean[i + 1]) << 12) |
      ((B64.indexOf(clean[i + 2]) & 63) << 6) |
      (B64.indexOf(clean[i + 3]) & 63);
    out.push((n >> 16) & 255);
    if (clean[i + 2]) out.push((n >> 8) & 255);
    if (clean[i + 3]) out.push(n & 255);
  }
  return Uint8Array.from(out);
}

function bytesToLatin1(bytes: Uint8Array) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

/** Older Google News article ids embed the publisher URL in their protobuf payload. */
function decodeGoogleNewsId(link: string): string | null {
  const m = link.match(/\/articles\/([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try {
    const decoded = bytesToLatin1(base64ToBytes(m[1]));
    const url = decoded.match(/https?:\/\/[\x21-\x7e]+/);
    if (!url) return null;
    // The payload continues with binary framing right after the URL.
    return url[0].replace(/[^\x21-\x7e].*$/, '');
  } catch {
    return null;
  }
}

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

/**
 * Current Google News ids are opaque. The article page carries a signature and
 * timestamp that its own `garturlreq` RPC exchanges for the publisher URL.
 */
async function resolveViaGoogleRpc(link: string, signal?: AbortSignal): Promise<string | null> {
  const id = link.match(/\/(?:rss\/)?articles\/([^?/]+)/)?.[1];
  if (!id) return null;

  const page = await (await fetch(link, { signal, headers: { 'User-Agent': BROWSER_UA } })).text();
  const signature = page.match(/data-n-a-sg="([^"]+)"/)?.[1];
  const timestamp = page.match(/data-n-a-ts="([^"]+)"/)?.[1];
  if (!signature || !timestamp) return null;

  const payload = JSON.stringify([
    'garturlreq',
    [
      ['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1],
      'X',
      'X',
      1,
      [1, 1, 1],
      1,
      1,
      null,
      0,
      0,
      null,
      0,
    ],
    id,
    Number(timestamp),
    signature,
  ]);

  const res = await fetch(
    'https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je&source-path=/&rt=c',
    {
      signal,
      method: 'POST',
      headers: { 'User-Agent': BROWSER_UA, 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: `f.req=${encodeURIComponent(JSON.stringify([[['Fbv4je', payload, null, 'generic']]]))}`,
    },
  );
  const body = await res.text();
  return body.match(/garturlres\\",\\"(https?:[^\\"]+)/)?.[1] ?? null;
}

const resolved = new Map<string, string>();

export async function resolveArticleUrl(link: string, signal?: AbortSignal): Promise<string> {
  if (!link.includes('news.google.com')) return link;
  const hit = resolved.get(link);
  if (hit) return hit;

  const decoded = decodeGoogleNewsId(link);
  if (decoded && /^https?:\/\/[^/]+\./.test(decoded)) {
    resolved.set(link, decoded);
    return decoded;
  }

  try {
    const url = await resolveViaGoogleRpc(link, signal);
    if (url) {
      resolved.set(link, url);
      return url;
    }
  } catch {
    /* fall through to the Google link, which redirects fine in a browser */
  }
  return link;
}

export type PageContent = { url: string; text: string; imageUrl?: string; title?: string };

const BLOCK = /<(script|style|noscript|svg|iframe|form|nav|footer|header|aside)[^>]*>[\s\S]*?<\/\1>/gi;

function decodeEntities(s: string) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

function meta(html: string, prop: string) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']` +
      `|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
    'i',
  );
  const m = html.match(re);
  return m ? decodeEntities(m[1] ?? m[2]) : undefined;
}

export async function fetchPageContent(rawLink: string, signal?: AbortSignal): Promise<PageContent> {
  const url = await resolveArticleUrl(rawLink, signal);
  try {
    const res = await fetch(url, {
      signal,
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html',
      },
    });
    const html = await res.text();
    const cleaned = html.replace(BLOCK, ' ');

    const paragraphs = [...cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m) => decodeEntities(m[1].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim())
      .filter((p) => p.length > 60);

    return {
      url,
      title: meta(html, 'og:title') ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim(),
      imageUrl: meta(html, 'og:image') ?? meta(html, 'twitter:image'),
      text: paragraphs.join('\n\n').slice(0, 12000),
    };
  } catch {
    return { url, text: '' };
  }
}
