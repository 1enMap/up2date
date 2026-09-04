# Progress

Last updated: 2026-09-04

## What exists

| Area | State | Notes |
|---|---|---|
| Feeds (top, 15 topics, 30 country editions) | ✅ | `lib/rss.ts`, `lib/news.ts`. Verified against live English, Tamil, search and geo feeds |
| Search | ✅ | Hashtag queries run with and without the `#` and merge — `#SCHOOLTHIKKARO` returns 70 results where the single query returned 6 |
| Local news | ✅ | Cached fix → low-accuracy GPS → OSM reverse geocode → IP lookup. Only the OSM and IP legs are verified from a machine |
| 23 languages | 🟡 | Nine native editions verified. Thirteen depend on AI translation (D-03) and are unverified end to end |
| Social — Reddit, Bluesky, HN, Mastodon, Lemmy | 🟡 | Code verified. HN, Mastodon and Lemmy return data; Reddit and Bluesky return 403 to unauthenticated clients from the dev machine's IP and may behave differently on a phone |
| Social — X, Instagram, Threads, YouTube | 🟡 | Via AI web search (D-05). Unverified — no key available here |
| Summary · fact check · follow-up Q&A (manual, budgeted) | 🟡 | Typechecked against both providers' SDK/API shapes; **never run against a live API** |
| Ratings, sort, filter | ✅ | `lib/articleView.ts`, on Today, Search, Local and Saved |
| Dark mode | ✅ | System / Light / Dark, persisted |
| Source provenance + corroboration | ✅ | `src/data/sources.ts` (37 publishers, 10 owner groups), `src/lib/corroboration.ts`. All 27 cited URLs verified to resolve; the *claims* behind them are from research, not per-claim verification |
| Fact check grounding | ✅ | Providers without search are gated out of web mode and offered a coverage comparison instead; verified per provider |
| Rate limiting | ✅ | `lib/ai/limiter.ts`. All four behaviours verified in isolation: gap enforcement, burst retry, no-retry on daily cap, fail-fast during cooldown |
| Bring-your-own-key onboarding | ✅ | `app/welcome.tsx`, key checked with a free model-list call before it is saved |
| Icons | ✅ | Generated from the logo by `scripts/make-icons.mjs` |
| Release pipeline | 🟡 | `.github/workflows/release.yml` written; **never run** — needs `EXPO_TOKEN` and a tag |

## Unverified

Standing list. Do not describe any of these as working without exercising them first.

1. **Every live AI call.** No API key has ever been present in the development environment.
   The first real summary is what confirms the request shapes, the JSON parsing, and the
   Gemini 429 handling against a real response.
2. **The release workflow.** Not run once. `eas init` has not been run either, so
   `expo.extra.eas.projectId` is absent.
3. **Anything on a real device.** No full Xcode on the dev machine, so the iOS simulator was
   never available; no Android emulator either. Layout, GPS and the keychain are all
   bundle-verified only.
4. **Reddit and Bluesky from a phone.** Blocked from this IP; unknown on mobile networks.
5. **The proxy against real providers.** Routing is verified against a stubbed upstream only.

## Next

Ordered.

1. Put a key in and walk the article screen end to end — summary, fact check, social read-out,
   follow-up. This retires most of § Unverified and is the cheapest high-value step.
2. `npx eas-cli@latest init`, then tag a release and let the workflow run. Install the APK on a phone.
3. Walk first launch as a stranger: welcome → key → feed → location → a summary.
4. Decide Reddit/Bluesky: if they stay blocked on mobile, either drop them from the source
   list or add optional OAuth rather than leaving a permanently failing row.
5. There is no test suite. The limiter and `articleView` are pure and worth real tests; the
   source adapters want fixture-based parsing tests so a Google News format change surfaces
   as a red test rather than an empty feed.
