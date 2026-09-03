# Decisions

Choices already made, with the reasoning, so a later change does not reverse one by accident.

Format: `D-nn` · date · decision · why · what would change it.

---

## D-01 · 2026-09-03 · News comes from Google News RSS, not a news API

**Decision.** All headlines come from `news.google.com/rss` — top stories, topic sections,
search, and the `geo` section for local news.

**Why.** No key, no quota, no per-request cost, and thousands of publishers. It is also the
only source that expresses language × country × place × query in one URL shape, which is
exactly the product. NewsAPI and friends need a key, cap the free tier hard, and cover fewer
Indian outlets.

**Consequences.** Article links are Google redirects (see D-02), items carry no images (source
favicons stand in), and there is no category taxonomy beyond the eight canonical sections.

**What would change it.** Google closing the RSS endpoints, or a need for full-text search
across archives.

## D-02 · 2026-09-03 · Publisher URLs are resolved through Google's own RPC

**Decision.** `extract.ts` resolves a Google News link by reading the article page's signature
and timestamp and posting them to `batchexecute`'s `garturlreq`, with base64 decoding of older
ids as a fallback.

**Why.** Current Google News ids are opaque; the old base64-embedded-URL trick fails on them.
Following the redirect does not work either — the page is a JS shim. Verified working against
live feeds; without it there is no article text, so no real summary.

**What would change it.** Google changing the RPC. The failure mode is already handled: the
Google link is kept, "Read full article" still works, and summaries fall back to the headline
plus the coverage cluster.

## D-03 · 2026-09-03 · 13 of the 22 scheduled languages are AI-translated, not native feeds

**Decision.** Google News has editions for Hindi, Bengali, Tamil, Telugu, Malayalam, Marathi,
Gujarati, Kannada and Urdu. The other thirteen are fetched in the region's language and
translated on the client, and are labelled "AI translated" in the picker.

**Why.** Claiming 22 languages while silently serving English in thirteen of them would be a
lie to the reader. The label is the honest version.

**Consequences.** Those thirteen need an AI key for headlines to appear translated; without
one they read in English. Acceptable — the alternative is not offering them.

## D-04 · 2026-09-04 · Bring your own key; the project runs no server

**Decision.** AI features use a key the reader supplies, held in `expo-secure-store`. Published
builds ship with `expo.extra.defaultAiBaseUrl` empty. `server/` exists only for the
maintainer's own devices.

**Why.** A shared key means every reader's summaries land on the maintainer's bill, and a key
inside a distributed APK can be extracted anyway. It also means there is nothing to host,
which is why an APK on a GitHub Release is a complete distribution story.

**Consequences.** First run has to explain this rather than hide it (`app/welcome.tsx`), and
some readers will never add a key — so no feature may assume one exists. Reading the news does
not.

**What would change it.** Nothing short of the project acquiring a funded backend, which would
be a different project.

## D-05 · 2026-09-04 · X and Instagram are read through the AI's web search, not scraped

**Decision.** Reddit, Bluesky, Mastodon, Lemmy and Hacker News are fetched directly.
X and Instagram are covered by an AI web-search lookup restricted to social domains.

**Why.** Neither has a free read API and both forbid scraping. The search route is lawful,
returns links back to the posts, and degrades to "nothing found" instead of breaking.

**Consequences.** That half of the social panel needs a key, and reports what is publicly
indexed rather than a live timeline. Reddit and Bluesky also refuse unauthenticated clients
from some networks; the UI names the source it could not reach rather than showing less
silently.

## D-06 · 2026-09-04 · Provider calls are serialised and rate limits are typed

**Decision.** `lib/ai/limiter.ts` runs one call at a time with a 1.2s gap. A 429 becomes a
`QuotaError` carrying the provider's retry delay and whether the cap is per-day.

**Why.** A free-tier Gemini key was exhausted after two or three summaries because
auto-summarise fired a request per article opened with nothing pacing it.

**What must not be undone.** Do not call a provider adapter directly from a screen — it
bypasses the limiter. Go through `lib/ai/index.ts`.

## D-07 · 2026-09-04 · Feed order is recency, and ranking stays out

**Decision.** The feed is sorted newest-first. The reader can re-sort and filter; nothing
scores or personalises on their behalf, and there are no ads.

**Why.** It is the product claim. An engagement signal is the kind of thing that arrives as a
"small improvement" and changes what the app is.
