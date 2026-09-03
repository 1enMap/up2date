# artifacts/

What Up2Date *is*, why it got that way, and what is next. `README.md` at the root is for
someone who wants to run it; these files are for whoever changes it next — a person or an
agent — so they do not have to re-derive decisions from the diff.

Borrowed from [smaran](https://github.com/ethicks-x/smaran/tree/main/artifacts), which does
this well.

| File | Answers | Write to it when |
|---|---|---|
| `progress.md` | What exists, what's a stub, what's missing | You change what exists |
| `architecture.md` | How the pieces fit; where does this change go | The shape of the system changes |
| `decisions.md` | Why is it like this; what must not be undone | You make a reversible-by-accident choice |
| `conventions.md` | How code is written here | A convention is established or changes |

## Rules for these files

1. **Present tense, factual.** "There is no test suite." Not "we will add tests." Aspirations
   go in `progress.md` § Next, marked as such.
2. **Date the deltas.** Decisions carry a date; progress carries one at the top.
3. **Never let a file lie.** A stale `progress.md` is worse than none — it makes the next
   contributor write code against functions that do not exist.
4. **Link, don't duplicate.** One fact, one home.
5. **Verified means verified.** If a claim here was not exercised against the real thing, say
   so and say why (see `progress.md` § Unverified).

Last reviewed: 2026-09-04
