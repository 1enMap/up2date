# Up2Date AI proxy

Holds a provider key so **your own** devices do not each need one pasted in. Deploy it, then
put its URL in the app under **Settings → AI provider → Proxy URL** and leave the key box empty.

> **Not for published builds.** Everything a reader does through this proxy is billed to the
> key it holds — yours. Up2Date is distributed bring-your-own-key (`artifacts/decisions.md`
> D-04), and `expo.extra.defaultAiBaseUrl` stays empty in anything you release. Point a public
> build at this and you are paying for every stranger's summaries.

```bash
cd server
npx wrangler login
npx wrangler secret put GEMINI_API_KEY      # and/or ANTHROPIC_API_KEY
npx wrangler deploy
```

Wrangler prints a URL like `https://up2date-ai-proxy.<you>.workers.dev` — that is the
Proxy URL. Check it with `curl https://.../health`.

Cloudflare's free plan covers 100k requests a day, which is far more than this app will
make. To cap what any one person can spend, create a KV namespace and uncomment the
binding in `wrangler.toml`:

```bash
npx wrangler kv namespace create RATE_LIMIT
```

Anything else that can run a small HTTP handler works too — the worker is ~100 lines with
no Cloudflare-specific APIs beyond the optional KV counter.
