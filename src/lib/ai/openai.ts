import { QuotaError } from './limiter';
import { AiNotConfiguredError, type AiConfig, type Call, type CallResult } from './types';

/**
 * The OpenAI `/chat/completions` shape, which OpenRouter, DeepSeek, GLM, Groq,
 * Mistral, xAI, Together and most self-hosted runners all speak. One adapter
 * covers every one of them; only the base URL and model differ.
 */

type ChatResponse = {
  choices?: {
    message?: {
      content?: string | null;
      /** Reasoning models put their chain here and may leave `content` empty. */
      reasoning_content?: string | null;
      reasoning?: string | null;
    };
    finish_reason?: string;
  }[];
  /** xAI Live Search returns the pages it consulted. */
  citations?: string[];
  error?: { message?: string; type?: string; code?: string | number };
};

function endpoint(config: AiConfig, path: string) {
  const base = (config.baseUrl ?? '').replace(/\/+$/, '');
  if (!base) throw new AiNotConfiguredError();
  return `${base}${path}`;
}

function headers(config: AiConfig) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  // Self-hosted endpoints often accept no key at all.
  if (config.apiKey) h.Authorization = `Bearer ${config.apiKey}`;
  // OpenRouter attributes traffic with these; harmless everywhere else.
  h['HTTP-Referer'] = 'https://github.com/1enMap/up2date';
  h['X-Title'] = 'Up2Date';
  return h;
}

function quotaFrom(res: Response, body: ChatResponse, model: string): QuotaError {
  const retryAfter = Number(res.headers.get('retry-after'));
  const message = body.error?.message ?? '';
  const daily = /daily|per day|quota exceeded|insufficient|balance/i.test(message);
  return new QuotaError(
    daily ? `${model}: ${message || 'daily quota or credit exhausted'}` : `${model} hit a rate limit.`,
    Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    daily,
  );
}

/** xAI is the one OpenAI-compatible vendor that can search X and the web. */
function liveSearchFor(config: AiConfig, call: Call) {
  if (config.vendor !== 'xai' || !call.search) return undefined;
  return {
    mode: 'auto',
    return_citations: true,
    max_search_results: call.search.maxUses ?? 4,
    sources: [{ type: 'x' }, { type: 'web' }],
  };
}

async function post(config: AiConfig, payload: Record<string, unknown>, signal?: AbortSignal) {
  try {
    return await fetch(endpoint(config, '/chat/completions'), {
      method: 'POST',
      signal,
      headers: headers(config),
      body: JSON.stringify(payload),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Android blocks plain HTTP, and a phone's own localhost is the phone.
    if (/CLEARTEXT|cleartext/i.test(message)) {
      throw new Error(
        'Android blocked this plain-HTTP request. The endpoint must be https.',
      );
    }
    if (/Network request failed|Failed to fetch|ECONNREFUSED/i.test(message)) {
      throw new Error(`Could not reach ${config.baseUrl}. Check the phone is on the same network and the server is running.`);
    }
    throw e;
  }
}

export async function runOpenAiCompatible(
  config: AiConfig,
  call: Call,
  signal?: AbortSignal,
): Promise<CallResult> {
  const model = config.model;
  if (!model) throw new AiNotConfiguredError();

  const base: Record<string, unknown> = {
    model,
    max_tokens: call.maxTokens,
    temperature: 0.3,
    messages: [
      { role: 'system', content: call.system },
      ...call.messages.map((t) => ({ role: t.role, content: t.content })),
    ],
  };

  const search = liveSearchFor(config, call);
  const json = call.responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {};

  // Together and some OpenRouter routes reject one extra or the other, so
  // drop them one at a time rather than losing the answer entirely.
  const ladder: Record<string, unknown>[] = [
    { ...base, ...json, ...(search ? { search_parameters: search } : {}) },
    { ...base, ...(search ? { search_parameters: search } : {}) },
    { ...base, ...json },
    base,
  ];

  let res = await post(config, ladder[0], signal);
  for (let i = 1; i < ladder.length && !res.ok && (res.status === 400 || res.status === 422); i++) {
    res = await post(config, ladder[i], signal);
  }

  const body = (await res.json().catch(() => ({}))) as ChatResponse;

  if (res.status === 429) throw quotaFrom(res, body, model);
  if (res.status === 401 || res.status === 403) {
    throw new Error('That key was rejected. Check it, and that it can reach this model.');
  }
  if (!res.ok) {
    throw new Error(body.error?.message ?? `Request failed (${res.status}). Check the base URL and model id.`);
  }

  const choice = body.choices?.[0];
  const message = choice?.message;
  // Reasoning models sometimes answer in `reasoning_content` and leave `content` empty.
  const text = (message?.content || message?.reasoning_content || message?.reasoning || '').trim();

  if (!text) {
    if (choice?.finish_reason === 'length') {
      throw new Error(
        `${model} used its whole output budget before answering — typical of reasoning models. Pick a non-reasoning model, or raise the budget in lib/ai BUDGET.`,
      );
    }
    if (choice?.finish_reason === 'content_filter') {
      throw new Error(`${model} declined to answer this one.`);
    }
    throw new Error(`${model} returned an empty response (finish_reason: ${choice?.finish_reason ?? 'none'}).`);
  }

  const sources = (body.citations ?? []).map((url) => ({ title: url, url }));
  return { text, sources, truncated: choice?.finish_reason === 'length' };
}

/** `GET /models` — used to check a key and to populate the model picker. */
export async function listOpenAiModels(config: AiConfig, signal?: AbortSignal): Promise<string[]> {
  const res = await fetch(endpoint(config, '/models'), { headers: headers(config), signal });
  const body = (await res.json().catch(() => ({}))) as {
    data?: { id?: string }[];
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(body.error?.message ?? `Could not list models (${res.status}).`);
  return (body.data ?? [])
    .map((m) => m.id ?? '')
    .filter(Boolean)
    .sort();
}
