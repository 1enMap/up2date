import { QuotaError } from './limiter';
import { AiNotConfiguredError, type AiConfig, type Call, type CallResult } from './types';

export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';
const HOST = 'https://generativelanguage.googleapis.com/v1beta';

type GeminiPart = { text?: string };
type GeminiError = {
  error?: {
    message?: string;
    status?: string;
    code?: number;
    details?: {
      '@type'?: string;
      retryDelay?: string;
      violations?: { quotaMetric?: string; quotaId?: string }[];
    }[];
  };
};

type GeminiResponse = {
  candidates?: {
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
    groundingMetadata?: {
      groundingChunks?: { web?: { uri?: string; title?: string } }[];
    };
  }[];
  promptFeedback?: { blockReason?: string };
} & GeminiError;

/**
 * A Gemini 429 carries a RetryInfo delay and QuotaFailure violations naming the
 * limit that was hit — "PerDay" quotas will not clear by waiting a minute.
 */
function quotaErrorFrom(body: GeminiError, model: string): QuotaError {
  const details = body.error?.details ?? [];
  const retryInfo = details.find((d) => d['@type']?.includes('RetryInfo'))?.retryDelay;
  const retryAfterSec = retryInfo ? Math.ceil(Number(retryInfo.replace(/s$/, ''))) || undefined : undefined;

  const violations = details.flatMap((d) => d.violations ?? []);
  const ids = violations.map((v) => `${v.quotaId ?? ''} ${v.quotaMetric ?? ''}`).join(' ');
  const daily = /PerDay|per day/i.test(ids) || /per day/i.test(body.error?.message ?? '');

  const scope = daily ? 'daily free-tier quota' : 'per-minute rate limit';
  return new QuotaError(
    `${model} hit its ${scope}.${daily ? ' It resets at midnight Pacific time.' : ''}`,
    retryAfterSec,
    daily,
  );
}

function endpoint(config: AiConfig, path: string) {
  const base = config.baseUrl?.replace(/\/$/, '') || HOST;
  return `${base}${path}`;
}

function headers(config: AiConfig) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  // A proxy is expected to attach the key itself.
  if (config.apiKey) h['x-goog-api-key'] = config.apiKey;
  return h;
}

/**
 * Gemini has no direct equivalent of Anthropic's `allowed_domains`, so a domain
 * restriction is expressed to the model in the prompt instead.
 */
export async function runGemini(config: AiConfig, call: Call, signal?: AbortSignal): Promise<CallResult> {
  if (!config.apiKey && !config.baseUrl) throw new AiNotConfiguredError();
  const model = config.model || GEMINI_DEFAULT_MODEL;

  const system = call.search?.domains
    ? `${call.system}\n\nWhen you search, concentrate on these domains: ${call.search.domains.join(', ')}.`
    : call.system;

  const res = await fetch(endpoint(config, `/models/${encodeURIComponent(model)}:generateContent`), {
    method: 'POST',
    signal,
    headers: headers(config),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: call.messages.map((t) => ({
        role: t.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: t.content }],
      })),
      ...(call.search ? { tools: [{ google_search: {} }] } : {}),
      generationConfig: { maxOutputTokens: call.maxTokens, temperature: 0.3 },
    }),
  });

  const body = (await res.json().catch(() => ({}))) as GeminiResponse;
  if (res.status === 429 || body.error?.status === 'RESOURCE_EXHAUSTED') throw quotaErrorFrom(body, model);
  if (!res.ok) {
    throw new Error(body.error?.message ?? `Gemini request failed (${res.status}). Check the key and model id.`);
  }

  const candidate = body.candidates?.[0];
  if (!candidate) {
    const reason = body.promptFeedback?.blockReason;
    throw new Error(reason ? `Gemini declined this request (${reason}).` : 'Gemini returned no content.');
  }

  const text = (candidate.content?.parts ?? [])
    .map((p) => p.text ?? '')
    .join('')
    .trim();

  const sources = (candidate.groundingMetadata?.groundingChunks ?? [])
    .map((c) => ({ title: c.web?.title ?? c.web?.uri ?? '', url: c.web?.uri ?? '' }))
    .filter((s) => s.url);

  return { text, sources };
}

/** Lists the models this key can actually use, so Settings never guesses an id. */
export async function listGeminiModels(config: AiConfig, signal?: AbortSignal): Promise<string[]> {
  if (!config.apiKey && !config.baseUrl) throw new AiNotConfiguredError();
  const res = await fetch(endpoint(config, '/models?pageSize=200'), { headers: headers(config), signal });
  const body = (await res.json().catch(() => ({}))) as {
    models?: { name?: string; supportedGenerationMethods?: string[] }[];
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(body.error?.message ?? `Could not list models (${res.status}).`);

  return (body.models ?? [])
    .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
    .map((m) => (m.name ?? '').replace(/^models\//, ''))
    .filter((name) => name && !name.includes('embedding'))
    .sort();
}
