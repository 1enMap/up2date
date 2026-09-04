/**
 * Publisher provenance.
 *
 * This file deliberately contains NO quality score, no bias rating and no
 * ranking. Every entry states a checkable attribute — who owns it, how it is
 * funded, whether a body has certified its fact-checking unit — and every one
 * carries a link to the primary source for that claim plus the date a person
 * last opened it.
 *
 * Rules, which are enforceable in review:
 *   1. A signal without a `sourceUrl` does not ship.
 *   2. Nothing here is an endorsement. `state-funded` is a disclosure, not a
 *      demerit, and renders in a neutral colour.
 *   3. Absence from this list means "not listed", never "untrustworthy". Most
 *      publishers in a Google News feed will not be here.
 *   4. An `ifcn` signal names the certified fact-checking unit, not its parent
 *      newsroom — IFCN accredits the unit.
 *
 * Licensing: NewsGuard, Media Bias/Fact Check, Ad Fontes and AllSides ratings
 * are commercially licensed and are NOT used here, in whole or in derived form.
 * The sources cited below are publishers' own disclosures, statutes, and the
 * public signatory lists of the IFCN and the RSF Journalism Trust Initiative.
 *
 * The most load-bearing data here is `ownerId`: it is what stops three titles
 * from one group counting as three independent newsrooms in `corroboration.ts`.
 */

export type SignalKind =
  | 'wire'
  | 'public-broadcaster'
  | 'state-funded'
  | 'nonprofit'
  | 'reader-funded'
  | 'ifcn'
  | 'ownership';

export type Signal = {
  kind: SignalKind;
  /** States a fact. Never a rating. */
  label: string;
  /** Primary source for this exact claim. Required. */
  sourceUrl: string;
  /** ISO date the cited page was last confirmed to resolve. */
  checkedOn: string;
  detail?: string;
};

export type Owner = { id: string; name: string; url: string };

export type SourceEntry = {
  /** Registrable domain, lowercase, no leading www. The primary key. */
  host: string;
  aliases?: string[];
  name: string;
  /** Display names Google News uses for this publisher, lowercased. */
  displayNames?: string[];
  /** ISO country code, used to disambiguate a display-name-only match. */
  country?: string;
  ownerId?: string;
  signals: Signal[];
};

const CHECKED = '2026-09-04';

export const OWNERS: Owner[] = [
  { id: 'bennett-coleman', name: 'Bennett, Coleman & Co. (The Times Group)', url: 'https://www.timesgroup.com/' },
  { id: 'network18', name: 'Network18 Media & Investments', url: 'https://www.nw18.com/' },
  { id: 'ht-media', name: 'HT Media', url: 'https://www.htmedia.in/' },
  { id: 'kasturi-sons', name: 'Kasturi & Sons (The Hindu Group)', url: 'https://www.thehindugroup.com/' },
  { id: 'indian-express', name: 'The Indian Express Group', url: 'https://indianexpressgroup.com/' },
  { id: 'living-media', name: 'Living Media India (India Today Group)', url: 'https://www.indiatodaygroup.com/' },
  { id: 'abp', name: 'ABP Group', url: 'https://www.abp.in/' },
  { id: 'zee-media', name: 'Zee Media Corporation', url: 'https://www.zeemedia.in/' },
  { id: 'amg-media', name: 'AMG Media Networks (Adani Group)', url: 'https://www.adani.com/businesses/media' },
  { id: 'thomson-reuters', name: 'Thomson Reuters', url: 'https://www.thomsonreuters.com/' },
];

export const SOURCES: SourceEntry[] = [
  // ---------------------------------------------------------------- wires
  {
    host: 'reuters.com',
    name: 'Reuters',
    displayNames: ['reuters'],
    ownerId: 'thomson-reuters',
    signals: [
      {
        kind: 'wire',
        label: 'International wire service',
        detail: 'Other outlets republish its copy, so several of them carrying a story is one report, not several.',
        sourceUrl: 'https://www.reutersagency.com/about/',
        checkedOn: CHECKED,
      },
      {
        kind: 'ownership',
        label: 'Owned by Thomson Reuters, bound by the Trust Principles',
        sourceUrl: 'https://www.thomsonreuters.com/en/about-us/trust-principles.html',
        checkedOn: CHECKED,
      },
    ],
  },
  {
    host: 'apnews.com',
    name: 'The Associated Press',
    displayNames: ['associated press', 'ap news', 'the associated press'],
    signals: [
      {
        kind: 'wire',
        label: 'International wire service',
        sourceUrl: 'https://www.ap.org/about/',
        checkedOn: CHECKED,
      },
      {
        kind: 'nonprofit',
        label: 'Not-for-profit news cooperative owned by its member outlets',
        sourceUrl: 'https://www.ap.org/about/',
        checkedOn: CHECKED,
      },
    ],
  },
  {
    host: 'afp.com',
    name: 'Agence France-Presse',
    displayNames: ['afp', 'agence france-presse'],
    signals: [
      { kind: 'wire', label: 'International wire service', sourceUrl: 'https://www.afp.com/en/agency', checkedOn: CHECKED },
    ],
  },
  {
    host: 'ptinews.com',
    name: 'Press Trust of India',
    displayNames: ['pti', 'press trust of india'],
    country: 'IN',
    signals: [
      {
        kind: 'wire',
        label: 'Indian wire service, a non-profit cooperative of newspapers',
        sourceUrl: 'https://www.ptinews.com/aboutus',
        checkedOn: CHECKED,
      },
    ],
  },

  // ------------------------------------------------------ public broadcasters
  {
    host: 'bbc.com',
    aliases: ['bbc.co.uk'],
    name: 'BBC',
    displayNames: ['bbc', 'bbc news'],
    country: 'GB',
    signals: [
      {
        kind: 'public-broadcaster',
        label: 'Public service broadcaster, independence required by Royal Charter',
        sourceUrl: 'https://www.bbc.com/aboutthebbc/governance/charter',
        checkedOn: CHECKED,
      },
    ],
  },
  {
    host: 'npr.org',
    name: 'NPR',
    displayNames: ['npr'],
    country: 'US',
    signals: [
      {
        kind: 'nonprofit',
        label: 'Non-profit member organisation; finances published annually',
        sourceUrl: 'https://www.npr.org/about-npr/178660742/public-radio-finances',
        checkedOn: CHECKED,
      },
    ],
  },
  {
    host: 'abc.net.au',
    name: 'ABC (Australia)',
    displayNames: ['abc.net.au'],
    country: 'AU',
    signals: [
      {
        kind: 'public-broadcaster',
        label: 'Public broadcaster established by the ABC Act 1983',
        sourceUrl: 'https://about.abc.net.au/how-the-abc-is-run/what-guides-us/abc-charter/',
        checkedOn: CHECKED,
      },
    ],
  },
  {
    host: 'dw.com',
    name: 'Deutsche Welle',
    displayNames: ['dw', 'deutsche welle'],
    signals: [
      {
        kind: 'public-broadcaster',
        label: "Germany's international broadcaster, funded by federal tax revenue",
        sourceUrl: 'https://corporate.dw.com/en/about-dw/s-3325',
        checkedOn: CHECKED,
      },
    ],
  },

  // ------------------------------------------- IFCN-certified fact-checkers
  {
    host: 'boomlive.in',
    name: 'BOOM',
    displayNames: ['boom', 'boom live'],
    country: 'IN',
    signals: [
      {
        kind: 'ifcn',
        label: 'Its fact-checking unit is a verified IFCN signatory',
        detail: 'IFCN certifies the fact-checking operation against a code of principles, not the wider newsroom.',
        sourceUrl: 'https://ifcncodeofprinciples.poynter.org/signatories',
        checkedOn: CHECKED,
      },
    ],
  },
  {
    host: 'altnews.in',
    name: 'Alt News',
    displayNames: ['alt news'],
    country: 'IN',
    signals: [
      {
        kind: 'ifcn',
        label: 'Its fact-checking unit is a verified IFCN signatory',
        sourceUrl: 'https://ifcncodeofprinciples.poynter.org/signatories',
        checkedOn: CHECKED,
      },
      {
        kind: 'nonprofit',
        label: 'Run by the non-profit Pravda Media Foundation, funded by donations',
        sourceUrl: 'https://www.altnews.in/about/',
        checkedOn: CHECKED,
      },
    ],
  },
  {
    host: 'factly.in',
    name: 'Factly',
    displayNames: ['factly'],
    country: 'IN',
    signals: [
      {
        kind: 'ifcn',
        label: 'Its fact-checking unit is a verified IFCN signatory',
        sourceUrl: 'https://ifcncodeofprinciples.poynter.org/signatories',
        checkedOn: CHECKED,
      },
    ],
  },

  // ----------------------------------------- non-profit / reader-funded news
  {
    host: 'thewire.in',
    name: 'The Wire',
    displayNames: ['the wire'],
    country: 'IN',
    signals: [
      {
        kind: 'nonprofit',
        label: 'Published by the Foundation for Independent Journalism, a non-profit',
        sourceUrl: 'https://thewire.in/about-us',
        checkedOn: CHECKED,
      },
    ],
  },
  {
    host: 'newslaundry.com',
    name: 'Newslaundry',
    displayNames: ['newslaundry'],
    country: 'IN',
    signals: [
      {
        kind: 'reader-funded',
        label: 'Subscriber-funded; does not take advertising',
        sourceUrl: 'https://www.newslaundry.com/about-us',
        checkedOn: CHECKED,
      },
    ],
  },
  {
    host: 'thenewsminute.com',
    name: 'The News Minute',
    displayNames: ['the news minute'],
    country: 'IN',
    signals: [
      {
        kind: 'reader-funded',
        label: 'Member-funded newsroom',
        sourceUrl: 'https://www.thenewsminute.com/about-us',
        checkedOn: CHECKED,
      },
    ],
  },
  {
    host: 'propublica.org',
    name: 'ProPublica',
    displayNames: ['propublica'],
    country: 'US',
    signals: [
      {
        kind: 'nonprofit',
        label: 'Non-profit newsroom; donors disclosed publicly',
        sourceUrl: 'https://www.propublica.org/about/',
        checkedOn: CHECKED,
      },
    ],
  },
  {
    host: 'theguardian.com',
    name: 'The Guardian',
    displayNames: ['the guardian'],
    country: 'GB',
    signals: [
      {
        kind: 'ownership',
        label: 'Owned by the Scott Trust, which exists to keep it editorially independent',
        sourceUrl: 'https://www.theguardian.com/the-scott-trust/2015/jul/26/the-scott-trust',
        checkedOn: CHECKED,
      },
      {
        kind: 'reader-funded',
        label: 'Majority of revenue comes from reader contributions',
        sourceUrl: 'https://www.theguardian.com/about',
        checkedOn: CHECKED,
      },
    ],
  },

  // ------------------------------------------------- Indian ownership groups
  // These exist mainly so sibling titles collapse in the corroboration count.
  {
    host: 'indiatimes.com',
    aliases: ['timesofindia.indiatimes.com', 'economictimes.indiatimes.com', 'navbharattimes.indiatimes.com'],
    name: 'The Times Group',
    displayNames: ['the times of india', 'times of india', 'the economic times', 'navbharat times'],
    country: 'IN',
    ownerId: 'bennett-coleman',
    signals: [
      {
        kind: 'ownership',
        label: 'Bennett, Coleman & Co. — also publishes The Economic Times and Navbharat Times',
        sourceUrl: 'https://www.timesgroup.com/',
        checkedOn: CHECKED,
      },
    ],
  },
  {
    host: 'timesnownews.com',
    name: 'Times Now',
    displayNames: ['times now'],
    country: 'IN',
    ownerId: 'bennett-coleman',
    signals: [
      {
        kind: 'ownership',
        label: 'Times Network, part of the Bennett, Coleman & Co. group',
        sourceUrl: 'https://www.timesgroup.com/',
        checkedOn: CHECKED,
      },
    ],
  },
  {
    host: 'news18.com',
    name: 'News18',
    displayNames: ['news18', 'cnn-news18'],
    country: 'IN',
    ownerId: 'network18',
    signals: [
      {
        kind: 'ownership',
        label: 'Network18 — also publishes CNBC-TV18, Moneycontrol and Firstpost',
        sourceUrl: 'https://www.nw18.com/',
        checkedOn: CHECKED,
      },
    ],
  },
  {
    host: 'moneycontrol.com',
    name: 'Moneycontrol',
    displayNames: ['moneycontrol'],
    country: 'IN',
    ownerId: 'network18',
    signals: [
      { kind: 'ownership', label: 'Part of Network18', sourceUrl: 'https://www.nw18.com/', checkedOn: CHECKED },
    ],
  },
  {
    host: 'firstpost.com',
    name: 'Firstpost',
    displayNames: ['firstpost'],
    country: 'IN',
    ownerId: 'network18',
    signals: [
      { kind: 'ownership', label: 'Part of Network18', sourceUrl: 'https://www.nw18.com/', checkedOn: CHECKED },
    ],
  },
  {
    host: 'cnbctv18.com',
    name: 'CNBC-TV18',
    displayNames: ['cnbctv18', 'cnbc-tv18'],
    country: 'IN',
    ownerId: 'network18',
    signals: [
      { kind: 'ownership', label: 'Part of Network18', sourceUrl: 'https://www.nw18.com/', checkedOn: CHECKED },
    ],
  },
  {
    host: 'hindustantimes.com',
    name: 'Hindustan Times',
    displayNames: ['hindustan times'],
    country: 'IN',
    ownerId: 'ht-media',
    signals: [
      {
        kind: 'ownership',
        label: 'HT Media — also publishes Mint and Hindustan',
        sourceUrl: 'https://www.htmedia.in/',
        checkedOn: CHECKED,
      },
    ],
  },
  {
    host: 'livemint.com',
    name: 'Mint',
    displayNames: ['mint', 'livemint'],
    country: 'IN',
    ownerId: 'ht-media',
    signals: [
      { kind: 'ownership', label: 'Part of HT Media', sourceUrl: 'https://www.htmedia.in/', checkedOn: CHECKED },
    ],
  },
  {
    host: 'thehindu.com',
    name: 'The Hindu',
    displayNames: ['the hindu'],
    country: 'IN',
    ownerId: 'kasturi-sons',
    signals: [
      {
        kind: 'ownership',
        label: 'Kasturi & Sons — also publishes BusinessLine and Frontline',
        sourceUrl: 'https://www.thehindugroup.com/',
        checkedOn: CHECKED,
      },
    ],
  },
  {
    host: 'thehindubusinessline.com',
    name: 'BusinessLine',
    displayNames: ['businessline', 'the hindu businessline'],
    country: 'IN',
    ownerId: 'kasturi-sons',
    signals: [
      { kind: 'ownership', label: 'Part of the Kasturi & Sons group', sourceUrl: 'https://www.thehindugroup.com/', checkedOn: CHECKED },
    ],
  },
  {
    host: 'indianexpress.com',
    name: 'The Indian Express',
    displayNames: ['the indian express', 'indian express'],
    country: 'IN',
    ownerId: 'indian-express',
    signals: [
      {
        kind: 'ownership',
        label: 'The Indian Express Group — also publishes The Financial Express and Loksatta',
        sourceUrl: 'https://indianexpressgroup.com/',
        checkedOn: CHECKED,
      },
    ],
  },
  {
    host: 'financialexpress.com',
    name: 'The Financial Express',
    displayNames: ['the financial express', 'financial express'],
    country: 'IN',
    ownerId: 'indian-express',
    signals: [
      { kind: 'ownership', label: 'Part of The Indian Express Group', sourceUrl: 'https://indianexpressgroup.com/', checkedOn: CHECKED },
    ],
  },
  {
    host: 'indiatoday.in',
    name: 'India Today',
    displayNames: ['india today'],
    country: 'IN',
    ownerId: 'living-media',
    signals: [
      {
        kind: 'ownership',
        label: 'Living Media India — also publishes Business Today and Aaj Tak',
        sourceUrl: 'https://www.indiatodaygroup.com/',
        checkedOn: CHECKED,
      },
    ],
  },
  {
    host: 'businesstoday.in',
    name: 'Business Today',
    displayNames: ['business today'],
    country: 'IN',
    ownerId: 'living-media',
    signals: [
      { kind: 'ownership', label: 'Part of the India Today Group', sourceUrl: 'https://www.indiatodaygroup.com/', checkedOn: CHECKED },
    ],
  },
  {
    host: 'ndtv.com',
    name: 'NDTV',
    displayNames: ['ndtv'],
    country: 'IN',
    ownerId: 'amg-media',
    signals: [
      {
        kind: 'ownership',
        label: 'Majority-owned by AMG Media Networks, part of the Adani Group',
        detail: 'A disclosure about who owns the outlet, not a judgement about its reporting.',
        sourceUrl: 'https://www.adani.com/businesses/media',
        checkedOn: CHECKED,
      },
    ],
  },
  {
    host: 'zeenews.india.com',
    name: 'Zee News',
    displayNames: ['zee news'],
    country: 'IN',
    ownerId: 'zee-media',
    signals: [
      {
        kind: 'ownership',
        label: 'Zee Media Corporation — also publishes WION',
        sourceUrl: 'https://www.zeemedia.in/',
        checkedOn: CHECKED,
      },
    ],
  },
  {
    host: 'wionews.com',
    name: 'WION',
    displayNames: ['wion'],
    country: 'IN',
    ownerId: 'zee-media',
    signals: [
      { kind: 'ownership', label: 'Part of Zee Media Corporation', sourceUrl: 'https://www.zeemedia.in/', checkedOn: CHECKED },
    ],
  },
  {
    host: 'telegraphindia.com',
    name: 'The Telegraph (India)',
    displayNames: ['the telegraph india', 'telegraph india'],
    country: 'IN',
    ownerId: 'abp',
    signals: [
      {
        kind: 'ownership',
        label: 'ABP Group — also publishes Anandabazar Patrika',
        sourceUrl: 'https://www.abp.in/',
        checkedOn: CHECKED,
      },
    ],
  },
  {
    host: 'anandabazar.com',
    name: 'Anandabazar Patrika',
    displayNames: ['anandabazar patrika', 'anandabazar'],
    country: 'IN',
    ownerId: 'abp',
    signals: [
      { kind: 'ownership', label: 'Part of the ABP Group', sourceUrl: 'https://www.abp.in/', checkedOn: CHECKED },
    ],
  },
];

/**
 * Multi-part public suffixes we care about. This is a hand-maintained shortlist,
 * not the full public suffix list — an unusual ccTLD will key on the wrong label
 * and simply produce no badge, which is the safe direction.
 */
const MULTI_PART_SUFFIXES = new Set([
  'co.uk', 'co.in', 'com.au', 'co.za', 'com.br', 'co.jp', 'ne.jp', 'or.jp',
  'com.pk', 'com.bd', 'co.nz', 'com.sg', 'com.ng', 'co.ke', 'com.my', 'net.au',
  'org.uk', 'ac.uk', 'gov.in', 'nic.in', 'org.in', 'net.in',
]);

/** Normalises a URL to a registrable domain. Returns null for anything unparseable. */
export function hostOf(url?: string): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^(www|m|amp)\./, '');
    const parts = host.split('.');
    if (parts.length <= 2) return host;

    const lastTwo = parts.slice(-2).join('.');
    const keep = MULTI_PART_SUFFIXES.has(lastTwo) ? 3 : 2;
    return parts.slice(-keep).join('.');
  } catch {
    return null;
  }
}

const BY_HOST = new Map<string, SourceEntry>();
for (const entry of SOURCES) {
  BY_HOST.set(entry.host, entry);
  for (const alias of entry.aliases ?? []) BY_HOST.set(alias, entry);
}

export function sourceByHost(host: string): SourceEntry | null {
  if (BY_HOST.has(host)) return BY_HOST.get(host) ?? null;
  // An alias may itself be a subdomain of a listed host.
  const parts = host.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    const suffix = parts.slice(i).join('.');
    if (BY_HOST.has(suffix)) return BY_HOST.get(suffix) ?? null;
  }
  return null;
}

export function ownerById(id?: string): Owner | null {
  return OWNERS.find((o) => o.id === id) ?? null;
}

/**
 * Host first. A display-name match only counts when it is unambiguous — "ABC
 * News" is both American and Australian, "The Sun" both British and Malaysian —
 * so a contested name with no matching reader country yields nothing rather than
 * a wrong badge.
 */
export function lookupSource(
  article: { source: string; sourceUrl?: string },
  readerCountry?: string,
): { entry: SourceEntry; match: 'host' | 'display-name' } | null {
  const host = hostOf(article.sourceUrl);
  if (host) {
    const byHost = sourceByHost(host);
    if (byHost) return { entry: byHost, match: 'host' };
  }

  const name = article.source.trim().toLowerCase();
  if (!name) return null;

  const claimants = SOURCES.filter((s) => s.displayNames?.includes(name));
  if (claimants.length === 1) return { entry: claimants[0], match: 'display-name' };
  if (claimants.length > 1 && readerCountry) {
    const local = claimants.filter((s) => s.country === readerCountry);
    if (local.length === 1) return { entry: local[0], match: 'display-name' };
  }
  return null;
}
