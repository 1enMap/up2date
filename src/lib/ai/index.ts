import { getLanguage } from '@/data/languages';
import { getProvider } from '@/data/providers';

import { listAnthropicModels as listAnthropicModelsImpl, runAnthropic } from './anthropic';
import { listGeminiModels as listGeminiModelsImpl, runGemini } from './gemini';
import { listOpenAiModels as listOpenAiModelsImpl, runOpenAiCompatible } from './openai';
import { capabilitiesFor } from './capabilities';
import { parseJson, parseJsonLoose } from './json';
import { coerceFactCheck } from './schema';
import { schedule } from './limiter';
import {
  FactCheckParseError,
  SearchUnavailableError,
} from './types';
import type {
  AiConfig,
  ArticleContext,
  Call,
  CallResult,
  ChatTurn,
  FactCheck,
  SocialPulse,
  Summary,
} from './types';

export * from './types';
export { listGeminiModels, GEMINI_DEFAULT_MODEL } from './gemini';
export { listAnthropicModels } from './anthropic';
export { listOpenAiModels } from './openai';
export { QuotaError, cooldownRemaining, lastQuotaError, clearCooldown } from './limiter';
export { capabilitiesFor, type Capabilities } from './capabilities';
export { BUDGET };

/**
 * Confirms a key works before the reader leaves the settings screen. Uses each
 * provider's model-list endpoint, which does not bill and does not spend quota.
 */
export async function verifyKey(config: AiConfig, signal?: AbortSignal): Promise<string[]> {
  if (config.kind === 'gemini') return listGeminiModelsImpl(config, signal);
  if (config.kind === 'openai') return listOpenAiModelsImpl(config, signal);
  return listAnthropicModelsImpl(config, signal);
}

/** Every provider call goes through the limiter, so free-tier keys are not hammered. */
function run(config: AiConfig, call: Call, signal?: AbortSignal): Promise<CallResult> {
  return schedule(() => {
    const caps = capabilitiesFor(config);
    const search = caps.search ? call.search : undefined;
    const request: Call = {
      ...call,
      search,
      // Structured output and web search cannot be combined on some providers.
      responseFormat: search && caps.jsonConflictsWithSearch ? undefined : call.responseFormat,
    };
    if (config.kind === 'gemini') return runGemini(config, request, signal);
    if (config.kind === 'openai') return runOpenAiCompatible(config, request, signal);
    return runAnthropic(config, request, signal);
  });
}

function languageInstruction(languageCode: string) {
  const lang = getLanguage(languageCode);
  return lang.code === 'en'
    ? 'Write in clear English.'
    : `Write entirely in ${lang.name} (${lang.nativeName}). Use natural, everyday ${lang.name} — not a word-for-word translation. Keep proper nouns and technical terms in their commonly used form.`;
}

/**
 * Token budget. Every number here is a cost lever, so they live together and are
 * deliberately mean — a news summary does not need a 12k-character article or a
 * 2000-token answer, and the reader pays for both.
 */
const BUDGET = {
  /** Characters of article body sent to the model. ~1k tokens. */
  body: 4000,
  /** Fact checks reason over claims, not prose, so they need less of the body. */
  factCheckBody: 2500,
  /** Sibling headlines included as coverage context. */
  related: 4,
  /** Turns of follow-up history replayed. Older turns fall off. */
  history: 6,
  maxTokens: { summary: 900, factCheck: 2600, social: 1800, followUp: 700, translate: 1200 },
  searchUses: { factCheck: 3, social: 4, followUp: 2 },
  /** Headlines translated per feed load. */
  translate: 15,
};

/**
 * Non-Latin scripts cost roughly 1.6x the output tokens for the same content on
 * these vendors' tokenizers, and a JSON object that cannot close is unreadable.
 * This is an estimate — worth tuning against real usage figures.
 */
export function tokenBudget(task: keyof typeof BUDGET.maxTokens, languageCode: string): number {
  const base = BUDGET.maxTokens[task];
  return getLanguage(languageCode).script === 'non-latin' ? Math.round(base * 1.6) : base;
}

function contextBlock(article: ArticleContext, bodyChars: number = BUDGET.body) {
  return [
    `HEADLINE: ${article.title}`,
    `PUBLISHER: ${article.source}`,
    `URL: ${article.url}`,
    article.publishedAt ? `PUBLISHED: ${new Date(article.publishedAt).toISOString()}` : '',
    article.related?.length
      ? `OTHER OUTLETS COVERING THIS:\n${article.related
          .slice(0, BUDGET.related)
          .map((r) => `- ${r.title} (${r.source})`)
          .join('\n')}`
      : '',
    article.body
      ? `ARTICLE TEXT:\n${article.body.slice(0, bodyChars)}`
      : 'ARTICLE TEXT: (could not be retrieved — reason from the headline and the coverage list, and say so.)',
  ]
    .filter(Boolean)
    .join('\n\n');
}

// ---------------------------------------------------------------- summarize

const SUMMARY_SYSTEM = `You summarise news for a reader who wants the substance without the padding.

Rules:
- Report only what the source material supports. Never invent numbers, names, quotes or dates.
- If the article text is missing, say what is known from the headline and coverage list, and keep it short.
- Neutral register. No editorialising, no hype, no "in a stunning turn of events".
- Attribute contested claims ("the ministry said", "according to Reuters").
- Be brief. Every field has a length limit below; treat them as maximums, not targets.

Reply with ONLY a JSON object:
{"headline": string (<=12 words, plain),
 "tldr": string (2-3 sentences),
 "bullets": string[] (3-5 items, each one fact, <=22 words),
 "context": string (1-2 sentences of background a newcomer needs),
 "unknowns": string[] (0-3 items: what is not yet established)}`;

export async function summarizeArticle(
  config: AiConfig,
  article: ArticleContext,
  languageCode: string,
  signal?: AbortSignal,
): Promise<Summary> {
  const { text } = await run(
    config,
    {
      system: `${SUMMARY_SYSTEM}\n\n${languageInstruction(languageCode)}`,
      messages: [{ role: 'user', content: contextBlock(article) }],
      effort: 'low',
      maxTokens: tokenBudget('summary', languageCode),
      responseFormat: 'json',
    },
    signal,
  );

  const parsed = parseJsonLoose<Omit<Summary, 'readingTimeSec'>>(text);
  if (!parsed?.tldr) {
    return {
      headline: article.title,
      tldr: text || 'Could not summarise this article.',
      bullets: [],
      context: '',
      unknowns: [],
      readingTimeSec: 20,
    };
  }
  const words = `${parsed.tldr} ${parsed.bullets?.join(' ') ?? ''}`.split(/\s+/).length;
  return {
    headline: parsed.headline || article.title,
    tldr: parsed.tldr,
    bullets: parsed.bullets ?? [],
    context: parsed.context ?? '',
    unknowns: parsed.unknowns ?? [],
    readingTimeSec: Math.max(15, Math.round((words / 200) * 60)),
  };
}

// --------------------------------------------------------------- fact check

const FACT_CHECK_SYSTEM = `You are a careful fact checker. Use web search to corroborate the central claims of a news item against independent, reputable sources.

Method:
- Pull out the 2-4 load-bearing factual claims (who, what, when, how many).
- Search for each. Prefer primary sources, wire services and established outlets. Note when the only sourcing traces back to a single outlet.
- Distinguish "no corroboration found" from "contradicted". Recency matters: a claim may simply be too new.
- Never assert a claim is false without a source that contradicts it.

Reply with ONLY a JSON object:
{"verdict": "supported" | "mixed" | "unsupported" | "unverifiable",
 "confidence": "low" | "medium" | "high",
 "summary": string (2-3 sentences on how well the story holds up),
 "claims": [{"claim": string, "assessment": "supported"|"disputed"|"unverified", "note": string}],
 "sources": [{"title": string, "url": string}]}`;

const COVERAGE_CHECK_SYSTEM = `You are checking a news item WITHOUT web access. You cannot search, and you must not pretend otherwise.

What you can do:
- Read the article text for internal consistency: do its own numbers, dates, names and quotes agree with each other?
- Compare it against the headlines other outlets published about the same story, which are supplied below.
- Say where those headlines agree with the article, where they differ in substance, and where they are simply too thin to tell.

Rules:
- Never claim something is corroborated. You have consulted no sources. The most you can say is that other coverage is consistent with it.
- If the supplied headlines are too thin to say anything useful, answer "unverifiable". That is the expected answer here, not a failure.
- Return an empty sources array. You have no sources.

Reply with ONLY a JSON object:
{"verdict": "supported" | "mixed" | "unsupported" | "unverifiable",
 "confidence": "low" | "medium" | "high",
 "summary": string (2-3 sentences on how the story holds together),
 "claims": [{"claim": string, "assessment": "supported"|"disputed"|"unverified", "note": string}],
 "sources": []}`;

export type FactCheckMode = 'web' | 'coverage';

/**
 * `web` searches for corroboration and cites what it found. `coverage` is the
 * honest fallback for a provider that cannot search: it compares the article
 * against the sibling headlines and says plainly that it consulted nothing.
 */
export async function factCheckArticle(
  config: AiConfig,
  article: ArticleContext,
  languageCode: string,
  opts: { mode?: FactCheckMode; signal?: AbortSignal } = {},
): Promise<FactCheck> {
  const mode: FactCheckMode = opts.mode ?? 'web';
  const caps = capabilitiesFor(config);

  if (mode === 'web' && !caps.search) {
    throw new SearchUnavailableError(getProvider(config.vendor ?? '').label, caps.searchReason);
  }

  const grounding: FactCheck['grounding'] = mode === 'web' ? 'web' : 'coverage';
  const system = mode === 'web' ? FACT_CHECK_SYSTEM : COVERAGE_CHECK_SYSTEM;

  const { text, sources, truncated } = await run(
    config,
    {
      system: `${system}\n\nThe "summary", "claim" and "note" fields must be written in the reader's language. ${languageInstruction(
        languageCode,
      )} Keep source titles in their original language.`,
      messages: [{ role: 'user', content: contextBlock(article, BUDGET.factCheckBody) }],
      effort: 'medium',
      maxTokens: tokenBudget('factCheck', languageCode),
      responseFormat: 'json',
      ...(mode === 'web' ? { search: { maxUses: BUDGET.searchUses.factCheck } } : {}),
    },
    opts.signal,
  );

  const parsed = parseJson<unknown>(text);
  if (!parsed.ok) {
    const problem =
      parsed.reason === 'no-json'
        ? 'the model answered in prose instead of JSON'
        : parsed.reason === 'truncated'
          ? 'the reply was cut off before it finished'
          : 'the JSON was malformed';
    throw new FactCheckParseError(problem, text);
  }

  const coerced = coerceFactCheck(parsed.value, {
    grounding,
    status: parsed.repaired || truncated ? 'partial' : 'ok',
    fallbackSources: sources,
  });
  if (!coerced.ok) throw new FactCheckParseError(coerced.problem, text);

  return coerced.value;
}

// ------------------------------------------------------------- social pulse

const SOCIAL_DOMAINS = [
  'x.com',
  'twitter.com',
  'reddit.com',
  'instagram.com',
  'threads.net',
  'youtube.com',
  'facebook.com',
  'news.ycombinator.com',
];

const SOCIAL_SYSTEM = `You report what people are actually saying about a story on social platforms — X, Reddit, Instagram, Threads, YouTube, Hacker News.

Method:
- Search those platforms for the story, the people involved, and any hashtag or slogan attached to it.
- Report the substance the news write-ups leave out: first-hand accounts, footage, documents, local reporting, organiser statements, counter-claims, and what the argument is actually about.
- Separate what is evidenced from what is merely circulating. Rumours go in "unverified" — never in the themes.
- Quote or paraphrase specific posts and name the account when it is a public figure, organisation or outlet. Do not name or profile private individuals.
- If you find little, say so plainly rather than padding. An empty themes list is a valid answer.

Reply with ONLY a JSON object:
{"summary": string (2-4 sentences on the state of the conversation),
 "themes": [{"label": string (<=6 words), "detail": string (1-2 sentences), "platforms": string[]}],
 "voices": [{"platform": string, "handle": string, "gist": string, "url": string}],
 "unverified": string[] (claims circulating without established sourcing),
 "sources": [{"title": string, "url": string}]}`;

export async function socialPulse(
  config: AiConfig,
  subject: ArticleContext | { query: string },
  languageCode: string,
  signal?: AbortSignal,
): Promise<SocialPulse> {
  const prompt =
    'query' in subject
      ? `TOPIC: ${subject.query}\n\nThis may be a hashtag, campaign or movement rather than a headline. Find out what it is, who is behind it, what they are demanding, and where it stands now.`
      : contextBlock(subject);

  const { text, sources } = await run(
    config,
    {
      system: `${SOCIAL_SYSTEM}\n\nThe "summary", "label", "detail", "gist" and "unverified" fields must be written in the reader's language. ${languageInstruction(
        languageCode,
      )} Keep handles, URLs and hashtags as they are.`,
      messages: [{ role: 'user', content: prompt }],
      effort: 'medium',
      maxTokens: tokenBudget('social', languageCode),
      responseFormat: 'json',
      search: { domains: SOCIAL_DOMAINS, maxUses: BUDGET.searchUses.social },
    },
    signal,
  );

  const parsed = parseJsonLoose<SocialPulse>(text);
  if (!parsed?.summary) {
    return {
      summary: text || 'Could not read the social conversation for this story.',
      themes: [],
      voices: [],
      unverified: [],
      sources,
    };
  }
  return {
    ...parsed,
    themes: parsed.themes ?? [],
    voices: parsed.voices ?? [],
    unverified: parsed.unverified ?? [],
    sources: parsed.sources?.length ? parsed.sources : sources,
  };
}

// ------------------------------------------------------------- follow-up Q&A

const FOLLOW_UP_SYSTEM = `You answer follow-up questions about a news story the reader is looking at.

- Ground answers in the supplied article. When the answer is not in it, say so plainly and answer from general knowledge or a search, labelled as such.
- Use web search when the question needs facts newer or wider than the article, including what people are saying about it on social platforms.
- Be direct and brief — three sentences at most unless explicitly asked for more. No preamble, no restating the question, no summary of what you just said.
- Do not take political sides. Where a question is contested, lay out the positions.`;

export async function askFollowUp(
  config: AiConfig,
  article: ArticleContext,
  history: ChatTurn[],
  languageCode: string,
  signal?: AbortSignal,
): Promise<string> {
  const { text } = await run(
    config,
    {
      system: `${FOLLOW_UP_SYSTEM}\n\n${languageInstruction(languageCode)}\n\nTHE ARTICLE:\n${contextBlock(article)}`,
      // Only the recent turns are replayed; the article is in the system prompt.
      messages: history.slice(-BUDGET.history),
      effort: 'low',
      maxTokens: BUDGET.maxTokens.followUp,
      search: { maxUses: BUDGET.searchUses.followUp },
    },
    signal,
  );
  return text || 'No answer came back — try rephrasing the question.';
}

// -------------------------------------------------------------- translation

/**
 * Google News has no edition in several scheduled languages, so those feeds arrive
 * in English and headlines are translated on the client instead.
 */
export async function translateHeadlines(
  config: AiConfig,
  headlines: string[],
  languageCode: string,
  signal?: AbortSignal,
): Promise<string[]> {
  if (!headlines.length || languageCode === 'en') return headlines;
  const { text } = await run(
    config,
    {
      system: `Translate each news headline. ${languageInstruction(
        languageCode,
      )} Keep names, places and organisations recognisable. Reply with ONLY a JSON array of strings, same length and order as the input.`,
      messages: [{ role: 'user', content: JSON.stringify(headlines) }],
      effort: 'low',
      maxTokens: BUDGET.maxTokens.translate,
    },
    signal,
  );
  const parsed = parseJsonLoose<string[]>(text, 'array');
  return Array.isArray(parsed) && parsed.length === headlines.length ? parsed : headlines;
}
