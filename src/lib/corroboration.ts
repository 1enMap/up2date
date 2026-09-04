import { hostOf, lookupSource, ownerById, type SourceEntry } from '@/data/sources';
import type { Article } from '@/lib/rss';

/**
 * How many genuinely independent newsrooms are carrying this story.
 *
 * Computed entirely on-device from the cluster Google News already gives us — no
 * key, no network, works offline. This is the most honest signal the app has,
 * because it is arithmetic rather than a judgement.
 *
 * Two things it must never overstate:
 *   - Google caps the sibling list at 6 and its clustering is opaque, so every
 *     count is a FLOOR. The copy says "at least".
 *   - Outlets republishing one wire story is evidence of distribution, not of
 *     verification. Syndicated copy is detected and called out.
 */

export type Carrier = {
  name: string;
  host: string | null;
  entry: SourceEntry | null;
  title: string;
};

export type Corroboration = {
  /** Distinct newsrooms, lead article included. */
  outlets: number;
  /** After collapsing titles that share a corporate owner. */
  independentOutlets: number;
  wireCount: number;
  /** Groups of carriers running near-identical headlines. */
  syndicated: Carrier[][];
  sharedOwners: { owner: string; titles: string[] }[];
  level: 'single' | 'thin' | 'broad';
  /** The sentence shown to the reader. */
  explanation: string;
  carriers: Carrier[];
};

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'in', 'on', 'to', 'for', 'and', 'as', 'at', 'by',
  'is', 'are', 'was', 'were', 'be', 'after', 'over', 'with', 'from', 'says',
  'said', 'new', 'his', 'her', 'its', 'it',
]);

/** Unicode-aware so Devanagari and Tamil headlines tokenise properly. */
function tokens(title: string): Set<string> {
  return new Set(
    (title.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

/** Jaccard overlap of headline tokens, 0–1. */
export function titleSimilarity(a: string, b: string): number {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared++;
  return shared / (left.size + right.size - shared);
}

/**
 * Threshold for "these are the same copy". A false positive under-counts
 * independent coverage — the error direction that makes a story look weaker than
 * it is — so this is set deliberately high.
 */
const SYNDICATION_THRESHOLD = 0.8;

function groupSyndicated(carriers: Carrier[]): Carrier[][] {
  const parent = carriers.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));

  for (let i = 0; i < carriers.length; i++) {
    for (let j = i + 1; j < carriers.length; j++) {
      if (titleSimilarity(carriers[i].title, carriers[j].title) >= SYNDICATION_THRESHOLD) {
        parent[find(j)] = find(i);
      }
    }
  }

  const groups = new Map<number, Carrier[]>();
  carriers.forEach((carrier, i) => {
    const root = find(i);
    groups.set(root, [...(groups.get(root) ?? []), carrier]);
  });

  return [...groups.values()].filter((g) => g.length > 1);
}

function describe(c: Omit<Corroboration, 'explanation'>): string {
  if (c.independentOutlets <= 1) {
    const only = c.carriers[0]?.name ?? 'One outlet';
    return c.wireCount > 0
      ? `Only ${only} is carrying this so far — and it is a wire service, so expect it to be republished widely.`
      : `Only ${only} is carrying this so far.`;
  }

  const parts = [`At least ${c.independentOutlets} independent newsrooms are carrying this`];

  if (c.sharedOwners.length) {
    const owner = c.sharedOwners[0];
    parts.push(`${owner.titles.length} of the ${c.outlets} titles belong to ${owner.owner}`);
  }
  if (c.syndicated.length) {
    const biggest = c.syndicated.reduce((a, b) => (a.length >= b.length ? a : b));
    parts.push(`${biggest.length} are running near-identical copy`);
  }
  if (c.wireCount > 0) {
    parts.push('a wire service is among them, so some of this is one report redistributed');
  }

  return `${parts.join('; ')}.`;
}

export function corroborationFor(article: Article, readerCountry?: string): Corroboration {
  const raw: Carrier[] = [
    {
      name: article.source,
      host: hostOf(article.sourceUrl),
      entry: lookupSource(article, readerCountry)?.entry ?? null,
      title: article.title,
    },
    ...article.related.map((r) => {
      const host = hostOf(r.link);
      return {
        name: r.source,
        host,
        entry: lookupSource({ source: r.source, sourceUrl: r.link }, readerCountry)?.entry ?? null,
        title: r.title,
      };
    }),
  ];

  // One newsroom, however many times it appears in the cluster.
  const seen = new Set<string>();
  const carriers = raw.filter((c) => {
    const key = c.host ?? c.name.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Titles under one corporate owner are one voice, not several.
  const ownerGroups = new Map<string, Carrier[]>();
  for (const carrier of carriers) {
    const key = carrier.entry?.ownerId ?? carrier.host ?? carrier.name.toLowerCase();
    ownerGroups.set(key, [...(ownerGroups.get(key) ?? []), carrier]);
  }

  const sharedOwners = [...ownerGroups.entries()]
    .filter(([key, group]) => group.length > 1 && group[0].entry?.ownerId === key)
    .map(([key, group]) => ({
      owner: ownerById(key)?.name ?? key,
      titles: group.map((c) => c.name),
    }));

  const wireCount = carriers.filter((c) => c.entry?.signals.some((s) => s.kind === 'wire')).length;
  const syndicated = groupSyndicated(carriers);

  const base = {
    outlets: carriers.length,
    independentOutlets: ownerGroups.size,
    wireCount,
    syndicated,
    sharedOwners,
    carriers,
    level:
      ownerGroups.size <= 1
        ? ('single' as const)
        : ownerGroups.size >= 4 && !syndicated.length
          ? ('broad' as const)
          : ('thin' as const),
  };

  return { ...base, explanation: describe(base) };
}
