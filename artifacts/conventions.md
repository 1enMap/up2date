# Conventions

## Code

- **TypeScript strict.** `npx tsc --noEmit` must be clean before a commit. It is the only
  automated gate in the repo today (see `progress.md` § Unverified).
- **Path alias `@/` → `src/`.** Screens live in `app/`, everything else in `src/`.
- **Screens hold no source logic.** A screen composes hooks and components. Anything that
  fetches, parses or decides belongs in `src/lib`.
- **No provider names outside `src/lib/ai`.** Screens use `useAiConfig()` and the exported
  feature functions.
- **Every external call can fail.** Wrap it, degrade visibly, and tell the reader which source
  was unreachable. Never swallow a failure into an empty list.
- **Comments explain why.** The regex that decodes a Google News id needs a reason, not a
  restatement. No comment is better than a narrating one.

## Copy

Plain, factual, lower-drama. "Could not load the feed" beats "Oops! Something went wrong."
When the app is uncertain — a scrape blocked, a source unreachable, a claim uncorroborated —
say so in the UI rather than presenting a confident-looking blank.

## Verification

Claims about behaviour are earned by exercising the thing:

- Source changes → run them against the live endpoint before believing them.
- Pure logic (the limiter, sort/filter) → a throwaway `tsx` script is enough.
- UI → `npx expo export --platform ios` catches build breaks; a real phone catches the rest.

State plainly what was *not* verified. `progress.md` § Unverified is the standing list.

## Commits

Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`), one concern each. Update the file
in `artifacts/` that the change makes stale, in the same commit.
