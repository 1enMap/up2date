# Up2Date

A news reader for Expo Go: world-wide headlines, region and language editions, local news,
search, and Claude-powered summaries, follow-up answers and fact checks. No ads, no tracking,
no engagement ranking — stories are ordered by recency.

**Bring your own key.** Reading the news needs nothing. Summaries, fact checks and the social
read-out run on the reader's own AI provider account, stored in their phone's keychain and sent
only to that provider — there is no shared key and no backend.

## Sharing it with other people

See [DISTRIBUTION.md](DISTRIBUTION.md). Short version: tag a version and
[the release workflow](.github/workflows/release.yml) publishes an installable APK plus its
checksum to a GitHub Release. iPhone needs Apple's $99/year for TestFlight, or Expo Go.

## For whoever changes this next

[`artifacts/`](artifacts/) is the knowledge base — what exists, how it fits together, why each
load-bearing choice was made, and a standing list of what has *not* been verified. Read
[`artifacts/progress.md`](artifacts/progress.md) before trusting any claim about behaviour.

## Run it

```bash
npm install --legacy-peer-deps
npx expo start
```

Scan the QR code with **Expo Go** (iOS: Camera app; Android: the Expo Go scanner).

## What's inside

| Feature | Where | How it works |
| --- | --- | --- |
| Global + topic feeds | `app/(tabs)/index.tsx`, `src/lib/news.ts` | Google News RSS — top stories, eight canonical sections, and query-backed topics like AI or Climate |
| Country editions | `src/data/countries.ts` | 30 editions; the `gl`/`hl`/`ceid` triple picks the edition |
| 22 Indian languages | `src/data/languages.ts` | Every Eighth Schedule language plus English (see the note below) |
| Location news | `app/(tabs)/local.tsx`, `src/lib/geo.ts` | Cached fix → low-accuracy GPS → OpenStreetMap reverse geocode → IP lookup, so it resolves indoors too; a place can also be typed by hand |
| Search | `app/(tabs)/search.tsx` | Full Google News search, operators included (`site:`, quotes, `when:`). Hashtag queries are also run without the “#” and merged, and every search has a Social tab |
| Social lookups | `src/lib/social.ts`, `src/components/SocialSection.tsx` | Reddit, Bluesky, Mastodon, Lemmy and Hacker News fetched directly; X / Instagram / Threads / YouTube read through the AI provider's web search |
| Summaries | `src/lib/ai/index.ts` → `summarizeArticle` | TL;DR, bullets, background, and what the piece does *not* establish |
| Follow-up Q&A | `src/lib/ai/index.ts` → `askFollowUp` | Grounded in the article, with web search for anything beyond it |
| Fact check | `src/lib/ai/index.ts` → `factCheckArticle` | Pulls the load-bearing claims and checks them against independent sources via the web-search tool |
| Ratings | `src/components/Stars.tsx` | Your own 1-5 stars on any story, on the card and the article page; tap the same star again to clear |
| Sort & filter | `src/lib/articleView.ts`, `src/components/ArticleControls.tsx` | Sort by newest, oldest, most outlets covering, highest rated or publisher; filter by time window, publisher, minimum rating, saved-only or rated-only. Available on Today, Search, Local and Saved |
| Dark mode | `src/theme.ts`, Settings → Appearance | System, Light or Dark; the choice is remembered |
| Saved stories | `app/(tabs)/saved.tsx` | Persisted with AsyncStorage; readable offline |

### The 22 languages

Google News publishes native editions in Hindi, Bengali, Tamil, Telugu, Malayalam, Marathi,
Gujarati, Kannada and Urdu — those feeds arrive already in-language. The other thirteen
scheduled languages (Assamese, Bodo, Dogri, Kashmiri, Konkani, Maithili, Manipuri, Nepali,
Odia, Punjabi, Sanskrit, Santali, Sindhi) have no edition, so the feed is fetched in the
region's language and headlines, summaries, answers and fact checks are produced in the chosen
language by the AI provider. They are flagged "AI translated" in the picker.

## AI setup

Open **Settings → AI provider**, pick **Claude** or **Gemini**, and paste that provider's key
(<https://console.anthropic.com/settings/keys> or <https://aistudio.google.com/apikey>). Each
provider keeps its own key in the device keychain (`expo-secure-store`); keys are sent only to
the provider you selected. Both keys can be stored at once and switched between freely.

- **Claude** — `claude-opus-5`, adaptive thinking, `web_search` with domain filtering. Effort is
  `low` for summaries and translation, `medium` for follow-ups, `high` for fact checks and social
  read-outs.
- **Gemini** — defaults to `gemini-2.5-flash` with Google Search grounding. **Load models from my
  key** lists the models your key can actually call, so the id is never a guess. Gemini has no
  per-domain search restriction, so the social lookup asks for those domains in the prompt.

A key inside an app you distribute can be extracted from it. For anything beyond personal use,
stand up a small proxy that holds the key server-side and set **Proxy URL** instead.

Summaries, fact checks and social read-outs are cached per article; "Summarise on open" can be
turned off to cut spend.

### Staying inside a free tier

Provider calls are serialised through `src/lib/ai/limiter.ts` — one at a time, with a 1.2s gap —
so a burst of screens cannot trip a per-minute limit. A rate-limit response is parsed into a
typed `QuotaError`: Gemini's `RetryInfo` delay and `QuotaFailure` violations tell the app whether
it hit a per-minute burst (retried once automatically, after the delay the provider asked for) or
a per-day cap (surfaced immediately, since waiting a minute will not help). While a cooldown is
open, auto-summarise stands down and Settings shows a live countdown.

If a free-tier Gemini key stops after a few requests, the model is usually the cause: pro and
preview models carry very small daily caps. Stay on a `flash` or `flash-lite` model, and consider
turning off "Summarise on open" — that alone roughly halves the request count.

## Social sources

Reddit, Bluesky, Mastodon, Lemmy and Hacker News are queried directly, with no key. Reddit and
Bluesky refuse unauthenticated clients from some networks — when that happens the section says
which source was unreachable rather than silently showing less.

X and Instagram have no free read API and forbid scraping, so they are covered through the AI
provider's web search instead: "The discussion" reports what is being said there, with links
back to the posts, and keeps circulating-but-unestablished claims in a separate block.

## Icons

`assets/icon.png` and friends are generated from the source logo:

```bash
node scripts/make-icons.mjs assets/logo-source.png
```

It crops the icon card off its page, repaints the antialiased corners so no white halo survives
the resize, lifts the globe onto transparency for the Android adaptive foreground and splash,
and writes every size Expo asks for.

## Article text

Google News hands out redirect links, so `src/lib/extract.ts` resolves the publisher URL
(`garturlreq` RPC, with a base64 fallback for older ids) and pulls the readable paragraphs.
Some publishers block this; when they do, the summary says so and works from the headline plus
the cluster of other outlets covering the story. "Read full article" always opens the
publisher's own page.
