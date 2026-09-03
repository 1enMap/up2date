/**
 * Up2Date AI proxy — a Cloudflare Worker.
 *
 * The app can talk to Anthropic and Google directly with a key the reader pastes
 * in Settings. That is fine for your own phone; it does not work for a build you
 * hand to other people, because a key inside a distributed app can be extracted.
 *
 * Point the app's "Proxy URL" at this worker instead. It holds the keys as
 * secrets, forwards the request, and never lets the key reach the device.
 *
 * Routes (they match exactly what the app sends):
 *   POST /v1/messages          → api.anthropic.com          (Claude)
 *   POST /models/<model>:...   → generativelanguage...      (Gemini)
 *   GET  /models               → generativelanguage...      (model list)
 *
 * Deploy:
 *   cd server
 *   npx wrangler secret put ANTHROPIC_API_KEY     # optional
 *   npx wrangler secret put GEMINI_API_KEY        # optional
 *   npx wrangler deploy
 */

const ANTHROPIC = 'https://api.anthropic.com';
const GEMINI = 'https://generativelanguage.googleapis.com/v1beta';

/** Per-IP budget, so one person cannot burn the whole key. Tune to your spend. */
const LIMIT = { requests: 40, windowSec: 3600 };

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Counts requests per IP in a KV namespace. Without a KV binding the proxy still
 * works — it just does not rate limit, which is fine while you are the only user.
 */
async function overBudget(env, ip) {
  if (!env.RATE_LIMIT) return false;
  const key = `rl:${ip}:${Math.floor(Date.now() / 1000 / LIMIT.windowSec)}`;
  const used = Number((await env.RATE_LIMIT.get(key)) ?? 0);
  if (used >= LIMIT.requests) return true;
  await env.RATE_LIMIT.put(key, String(used + 1), { expirationTtl: LIMIT.windowSec * 2 });
  return false;
}

async function forward(request, url, headers) {
  const upstream = await fetch(url, {
    method: request.method,
    headers,
    body: request.method === 'GET' ? undefined : await request.text(),
  });

  // Pass the provider's own status and body through untouched — the app reads
  // Gemini's RetryInfo and Anthropic's retry-after to pace itself.
  const out = new Headers(upstream.headers);
  out.delete('content-encoding');
  out.set('access-control-allow-origin', '*');
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': '*',
        },
      });
    }

    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    if (await overBudget(env, ip)) {
      return json({ error: { message: 'This proxy has hit its hourly limit. Try again later.' } }, 429);
    }

    // ---- Claude ------------------------------------------------------------
    if (url.pathname.startsWith('/v1/')) {
      if (!env.ANTHROPIC_API_KEY) return json({ error: { message: 'Claude is not configured on this proxy.' } }, 501);
      return forward(request, `${ANTHROPIC}${url.pathname}${url.search}`, {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': request.headers.get('anthropic-version') ?? '2023-06-01',
        ...(request.headers.get('anthropic-beta') ? { 'anthropic-beta': request.headers.get('anthropic-beta') } : {}),
      });
    }

    // ---- Gemini ------------------------------------------------------------
    if (url.pathname.startsWith('/models')) {
      if (!env.GEMINI_API_KEY) return json({ error: { message: 'Gemini is not configured on this proxy.' } }, 501);
      return forward(request, `${GEMINI}${url.pathname}${url.search}`, {
        'content-type': 'application/json',
        'x-goog-api-key': env.GEMINI_API_KEY,
      });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return json({
        ok: true,
        claude: !!env.ANTHROPIC_API_KEY,
        gemini: !!env.GEMINI_API_KEY,
        rateLimited: !!env.RATE_LIMIT,
      });
    }

    return json({ error: { message: `Unknown path ${url.pathname}` } }, 404);
  },
};
