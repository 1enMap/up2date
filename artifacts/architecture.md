# Architecture

## 1. Shape

```
┌───────────────────────── the phone, and nothing else ─────────────────────────┐
│                                                                               │
│  Google News RSS ──▶ rss.ts ──▶ Article[] ──▶ articleView.ts ──▶ feed screens │
│       (no key)                     │            (sort/filter)                 │
│                                    │                                          │
│  publisher page ──▶ extract.ts ────┤                                          │
│       (no key)      resolve+scrape │                                          │
│                                    ▼                                          │
│  Reddit · Bluesky · HN       ai/index.ts ──▶ limiter ──▶ anthropic | gemini   │
│  Mastodon · Lemmy  ──▶ social.ts        summary · fact check · pulse · Q&A    │
│       (no key)                             │                                  │
│                                            │  reader's own key,               │
│  AsyncStorage: settings, saved,            │  from expo-secure-store          │
│  ratings, AI output cache  ◀───────────────┘                                  │
└───────────────────────────────────────────┼───────────────────────────────────┘
                                            ▼
                              api.anthropic.com | generativelanguage.googleapis.com
```

**There is no backend.** Nothing this app does passes through a server the project owns. That
is the property that makes it distributable as a bare APK and that keeps anyone's usage off
the maintainer's bill. A feature that needs a server of ours is a change to the shape of the
project, not a feature — see `decisions.md` D-04.

## 2. Stack

Expo SDK 57 · React Native 0.86 · expo-router (file routes) · TypeScript strict · zustand +
AsyncStorage for state · expo-secure-store for keys · `@anthropic-ai/sdk` for Claude · plain
`fetch` for Gemini.

## 3. Layers

| Layer | Files | Owns |
|---|---|---|
| Sources | `lib/rss.ts`, `lib/news.ts`, `lib/social.ts`, `lib/extract.ts`, `lib/geo.ts` | Talking to the outside world. No React, no store. |
| AI | `lib/ai/*` | One provider-agnostic `Call`, two adapters, one limiter. Screens never see a provider. |
| View model | `lib/articleView.ts`, `lib/useFeed.ts` | Sorting, filtering, caching, loading state. |
| State | `state/*` | Persisted settings, saved, ratings, key storage, article registry. |
| Screens | `app/**` | Layout and interaction only. |

## 4. The AI boundary

Every feature builds a `Call` (`system`, `messages`, `effort`, `maxTokens`, optional
`search`) and hands it to `run()`. `run()` puts it through `schedule()` — one request at a
time, 1.2s apart — and dispatches to `runAnthropic` or `runGemini`. Adding a third provider is
one file plus one line in the dispatch; adding a feature never touches provider code.

Rate limits are typed (`QuotaError`), not strings: per-minute bursts get one automatic retry
after the delay the provider asked for, per-day caps are surfaced immediately because waiting
will not help.

## 5. Degradation

Every external source is allowed to fail without taking a screen with it. Publisher blocks the
scrape → the summary says so and works from the headline plus the coverage cluster. Reddit
403s → the section names the source it could not reach. GPS will not lock → IP lookup. No AI
key → everything except the AI panels still works. This is deliberate: the app aggregates
sources it does not control.
