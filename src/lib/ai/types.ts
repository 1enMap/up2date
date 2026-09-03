export type Provider = 'anthropic' | 'gemini';

export type AiConfig = {
  provider: Provider;
  /** Provider API key. Fine for personal builds; use `baseUrl` for a shipped app. */
  apiKey?: string;
  /** Optional proxy that injects the key server-side (recommended for distribution). */
  baseUrl?: string;
  /** Overrides the provider default, e.g. a specific Gemini model id. */
  model?: string;
};

export class AiNotConfiguredError extends Error {
  constructor() {
    super('Add an API key in Settings to use the AI features.');
    this.name = 'AiNotConfiguredError';
  }
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export type Effort = 'low' | 'medium' | 'high';

/** One provider-agnostic request. Each provider maps this onto its own API. */
export type Call = {
  system: string;
  messages: ChatTurn[];
  effort: Effort;
  maxTokens: number;
  /** Ask the provider to search the web; `domains` narrows it where supported. */
  search?: { domains?: string[]; maxUses?: number };
};

export type CallResult = {
  text: string;
  /** Pages the model actually consulted, when the provider reports them. */
  sources: { title: string; url: string }[];
};

export type ArticleContext = {
  title: string;
  source: string;
  url: string;
  publishedAt?: number;
  body?: string;
  related?: { title: string; source: string }[];
};

export type Summary = {
  headline: string;
  tldr: string;
  bullets: string[];
  context: string;
  /** What the piece does not establish — kept short and concrete. */
  unknowns: string[];
  readingTimeSec: number;
};

export type FactCheck = {
  verdict: 'supported' | 'mixed' | 'unsupported' | 'unverifiable';
  confidence: 'low' | 'medium' | 'high';
  summary: string;
  claims: { claim: string; assessment: 'supported' | 'disputed' | 'unverified'; note: string }[];
  sources: { title: string; url: string }[];
};

export type SocialPulse = {
  summary: string;
  themes: { label: string; detail: string; platforms: string[] }[];
  /** Specific posts or accounts the model found, with links back. */
  voices: { platform: string; handle: string; gist: string; url: string }[];
  /** Claims circulating socially that reporting has not established. */
  unverified: string[];
  sources: { title: string; url: string }[];
};
