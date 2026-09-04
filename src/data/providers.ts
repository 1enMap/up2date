/**
 * Provider catalogue.
 *
 * Three wire protocols cover everything here: Anthropic's Messages API, Google's
 * generateContent, and the OpenAI `/chat/completions` shape that OpenRouter,
 * DeepSeek, GLM, Groq, Mistral, xAI, Together and every local runner speak. So a
 * "provider" is a preset — a base URL, a default model and a key — over one of
 * those three adapters.
 */
export type ProviderKind = 'anthropic' | 'gemini' | 'openai';

export type ProviderPreset = {
  id: string;
  label: string;
  kind: ProviderKind;
  /** Empty for the native SDKs, which know their own host. */
  baseUrl: string;
  defaultModel: string;
  keyHint: string;
  /** Where to get a key. */
  console: string;
  consoleUrl: string;
  blurb: string;
  /** true when the provider can search the web during a fact check. */
  search: boolean;
  /** Shown on the config page when there is something specific worth knowing. */
  note?: string;
  free?: boolean;
  /** The base URL is the point of this preset, so let the reader edit it. */
  editableBaseUrl?: boolean;
};

export const PROVIDERS: ProviderPreset[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    kind: 'gemini',
    baseUrl: '',
    defaultModel: 'gemini-2.5-flash',
    keyHint: 'AIza…',
    console: 'aistudio.google.com/apikey',
    consoleUrl: 'https://aistudio.google.com/apikey',
    blurb: 'Free tier, no card. Grounded in Google Search.',
    search: true,
    free: true,
    note: 'Stay on a flash or flash-lite model. Pro and preview models have very small free daily caps.',
  },
  {
    id: 'anthropic',
    label: 'Claude',
    kind: 'anthropic',
    baseUrl: '',
    defaultModel: 'claude-opus-5',
    keyHint: 'sk-ant-…',
    console: 'console.anthropic.com',
    consoleUrl: 'https://console.anthropic.com/settings/keys',
    blurb: 'Best summaries and fact checks. Pay as you go.',
    search: true,
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    kind: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-chat',
    keyHint: 'sk-or-…',
    console: 'openrouter.ai/keys',
    consoleUrl: 'https://openrouter.ai/keys',
    blurb: 'One key, hundreds of models. Several are free.',
    search: false,
    note: 'Models with a ":free" suffix cost nothing. Appending ":online" to a model id turns on OpenRouter\'s own web search, which fact checks can use.',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    kind: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    keyHint: 'sk-…',
    console: 'platform.deepseek.com',
    consoleUrl: 'https://platform.deepseek.com/api_keys',
    blurb: 'Cheap and strong at summarising.',
    search: false,
  },
  {
    id: 'glm',
    label: 'GLM (Z.ai)',
    kind: 'openai',
    baseUrl: 'https://api.z.ai/api/paas/v4',
    defaultModel: 'glm-4-flash',
    keyHint: 'your Z.ai key',
    console: 'z.ai',
    consoleUrl: 'https://z.ai/manage-apikey/apikey-list',
    blurb: 'Zhipu GLM. glm-4-flash is free.',
    search: false,
    free: true,
    note: 'Mainland China accounts use https://open.bigmodel.cn/api/paas/v4 instead — edit the base URL below.',
    editableBaseUrl: true,
  },
  {
    id: 'groq',
    label: 'Groq',
    kind: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    keyHint: 'gsk_…',
    console: 'console.groq.com',
    consoleUrl: 'https://console.groq.com/keys',
    blurb: 'Very fast, generous free tier.',
    search: false,
    free: true,
  },
  {
    id: 'mistral',
    label: 'Mistral',
    kind: 'openai',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-latest',
    keyHint: 'your Mistral key',
    console: 'console.mistral.ai',
    consoleUrl: 'https://console.mistral.ai/api-keys',
    blurb: 'European, has a free tier.',
    search: false,
    free: true,
  },
  {
    id: 'xai',
    label: 'xAI Grok',
    kind: 'openai',
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-3-mini',
    keyHint: 'xai-…',
    console: 'console.x.ai',
    consoleUrl: 'https://console.x.ai',
    blurb: 'Grok models. Can search X itself.',
    search: true,
    note: 'Uses xAI Live Search, which reads X posts as well as the web — the one provider here that sees X directly. Each search result is billed on top of tokens. If your account has Live Search disabled the request still succeeds, just without search.',
  },
  {
    id: 'together',
    label: 'Together AI',
    kind: 'openai',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    keyHint: 'your Together key',
    console: 'api.together.ai',
    consoleUrl: 'https://api.together.ai/settings/api-keys',
    blurb: 'Open models, pay as you go.',
    search: false,
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    kind: 'openai',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    keyHint: 'not needed',
    console: 'ollama.com',
    consoleUrl: 'https://ollama.com/download',
    blurb: 'Runs on your own machine. No key, no cost.',
    search: false,
    free: true,
    note: 'localhost means the phone itself, so it will not work — use the LAN address of the machine running Ollama (e.g. http://192.168.1.5:11434/v1), start it with OLLAMA_HOST=0.0.0.0, and keep both on the same Wi-Fi. Android also blocks plain HTTP unless the build allows it.',
    editableBaseUrl: true,
  },
  {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    kind: 'openai',
    baseUrl: '',
    defaultModel: '',
    keyHint: 'your key',
    console: '',
    consoleUrl: '',
    blurb: 'Any endpoint that speaks /chat/completions.',
    search: false,
    note: 'Enter the base URL up to and including /v1. The app appends /chat/completions and /models.',
    editableBaseUrl: true,
  },
];

export const DEFAULT_PROVIDER_ID = 'gemini';

export function getProvider(id: string): ProviderPreset {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}
