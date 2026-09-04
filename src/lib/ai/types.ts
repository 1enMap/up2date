import type { ProviderKind } from '@/data/providers';

export type { ProviderKind };
/** @deprecated kept so older imports keep compiling; use ProviderKind. */
export type Provider = ProviderKind;

export type AiConfig = {
  /** Which wire protocol to speak. */
  kind: ProviderKind;
  /** Provider API key. Fine for personal builds; use `baseUrl` for a shipped app. */
  apiKey?: string;
  /** Optional proxy that injects the key server-side (recommended for distribution). */
  baseUrl?: string;
  /** Model id. Required for the OpenAI-compatible adapter. */
  model?: string;
  /** Provider id, so an adapter can opt into vendor extras (xAI Live Search). */
  vendor?: string;
};

export class AiNotConfiguredError extends Error {
  constructor() {
    super('Add an API key in Settings to use the AI features.');
    this.name = 'AiNotConfiguredError';
  }
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export type Effort = 'low' | 'medium' | 'high';

/** Raised instead of inventing a verdict the provider could not actually reach. */
export class SearchUnavailableError extends Error {
  constructor(
    readonly providerLabel: string,
    readonly reason: string,
  ) {
    super(reason);
    this.name = 'SearchUnavailableError';
  }
}

/** Raised when the reply could not be read as a fact check, carrying the raw text. */
export class FactCheckParseError extends Error {
  constructor(
    readonly problem: string,
    readonly raw: string,
  ) {
    super(`Could not read the fact check — ${problem}.`);
    this.name = 'FactCheckParseError';
  }
}

/** One provider-agnostic request. Each provider maps this onto its own API. */
export type Call = {
  system: string;
  messages: ChatTurn[];
  effort: Effort;
  maxTokens: number;
  /** Ask the provider to search the web; `domains` narrows it where supported. */
  search?: { domains?: string[]; maxUses?: number };
  /** Ask the provider to emit JSON, where it supports being told so. */
  responseFormat?: 'json';
};

export type CallResult = {
  text: string;
  /** Pages the model actually consulted, when the provider reports them. */
  sources: { title: string; url: string }[];
  /** The reply hit the output cap, so the payload is probably cut off. */
  truncated?: boolean;
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
  /** 'web' = sources were searched. 'coverage' = compared against sibling headlines only. */
  grounding: 'web' | 'coverage';
  /** 'partial' when the reply was truncated and had to be repaired. */
  status: 'ok' | 'partial';
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
